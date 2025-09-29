<template>
  <div class="wh-full" id="mainDiv" ref='mainDiv' :class="{'select-none': dragging}">
    <div class="flex h-full p-y-14 p-r-48 relative">
      <!-- 任务区域 -->
      <div class="wh-full absolute z-2 ground-glass" :style="{ width: leftWidth + 'px' }" v-show="dragging"></div>
      <div class="relative wh-full p-x-24 flex-1 min-w-400" id="leftDiv" ref="leftDiv">
        <TodoList @openSubTodoView="openSubTodoView"></TodoList>
        <!-- 新增任务 -->
        <AddTodo ref="addTodo" @focus="onFocus" @success="addTodoSuccess"></AddTodo>
      </div>
      <Dividing v-if="curViewId != null" drag v-model:left-width="leftWidth" v-model:right-width="rightWidth"
        @drag-start="dragging = true" @drag-end="dragEnd()"></Dividing>
      <!-- 任务信息面板 -->
      <div class="flex f-c-c relative" ref="rightDiv">
        <div class="wh-full absolute z-2 ground-glass" v-show="dragging"></div>
        <TodoDetail v-if="curViewId != null" :style="{ width: rightWidth + 'px' }" ref="todoDetail"
          @closeSubTodoView="closeSubTodoView" @focus="onFocus">
        </TodoDetail>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CompletedTodo, LastOpenTodo, Todo } from '@/types/editor';
import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import AddTodo from './components/AddTodo/index.vue';
import Dividing from './components/Dividing/index.vue';
import TodoDetail from './components/TodoDetail/index.vue';
import TodoList from './components/TodoList/index.vue';
import { useVscode } from './hooks/useVscode';
import { useTodoStore } from './store';

enum CompletedType {
  NoCompleted = 0,
  Completed = 1,
}

const todoStore = useTodoStore()
const {
  isDev,
  todoLists,
  todoList,
  completedTodoList,
  curViewId,
  curViewType,
  todo,
  delayedSaveTime,
} = storeToRefs(todoStore)

const { postMessage } = useVscode()

watch(todoLists, () => {
  if (!todoLists.value) {
    curViewId.value = null
    todoLists.value = {
      noCompleted: [],
      completed: []
    }
    return
  }
  todoList.value = todoLists.value.noCompleted
  completedTodoList.value = todoLists.value.completed
  todo.value = getTodoDetailByTypeAndId() as Todo | CompletedTodo | null
  if (!todo.value) {
    curViewId.value = null
  }
}, {deep: true})

function openSubTodoView(id: number, type: CompletedType) {
  if (curViewId.value === id && curViewType.value === type) {
    curViewId.value = null
    return
  }
  curViewId.value = id
  curViewType.value = type
  todo.value = getTodoDetailByTypeAndId() as Todo | CompletedTodo
  const lastOpenTodo: LastOpenTodo = {
    key: 'LastOpenTodo',
    value: [type, id]
  }

  nextTick(() => {
    leftWidth.value = leftDivRef?.value?.scrollWidth || 0;
    rightWidth.value = rightDivRef?.value?.scrollWidth || 0;
  });
  if (isDev.value) {
    return
  }
  postMessage({ command: 'updateGlobalState', value: lastOpenTodo.value });
}

function getTodoDetailByTypeAndId() {
  if (!curViewId.value || !todoLists.value) {
    return null
  }
  if (curViewType.value === CompletedType.Completed) {
    return completedTodoList.value.find(item => item.id === curViewId.value)
  }
  return todoList.value.find(item => item.id === curViewId.value)
}


function closeSubTodoView() {
  curViewId.value = null
  todo.value = null
  addTodoRef.value?.focus()
}

const addTodoRef = useTemplateRef('addTodo')
function messageEventListener(event: MessageEvent) {
  const message = event.data;
  switch (message.type) {
    case 'noOpenLastOpenTodo':
      addTodoRef.value?.focus()
      break;
    case 'getDelayedSaveTime':
      delayedSaveTime.value = message.value
      break;
    case 'getTodoDetailPanelWidth':
      const { value } = message
      rightWidth.value = value
      break;
  }
}

onMounted(() => {
  window.addEventListener('message', messageEventListener);
  if (isDev.value) {
    return
  }
  postMessage({ command: 'getDelayedSaveTime' });
});

window.addEventListener('focus', focusListener);
const curFocusInputRef: Ref<null | HTMLInputElement | HTMLTextAreaElement> = ref(null)
function focusListener() {
  if (curFocusInputRef.value !== null) {
    curFocusInputRef.value?.focus()
  }
}
function onFocus(target: HTMLInputElement | HTMLTextAreaElement) {
  curFocusInputRef.value = target
}

onBeforeUnmount(() => {
  window.removeEventListener('message', messageEventListener);
  window.removeEventListener('focus', focusListener);
});

function addTodoSuccess(todo: Todo) {
  nextTick(() => openSubTodoView(todo.id, CompletedType.NoCompleted))
}

const dragging = ref<boolean>(false)

// 左侧宽度
const leftWidth = ref<number>(400)
// 右侧宽度
const rightWidth = ref<number>(400)

const mainDivRef = useTemplateRef<HTMLDivElement>('mainDiv')
const leftDivRef = useTemplateRef<HTMLDivElement>('leftDiv')
const rightDivRef = useTemplateRef<HTMLDivElement>('rightDiv')

let resizeObserver = null;
onMounted(() => {
  resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (entry.target.id === 'mainDiv' && mainDivRef?.value?.scrollWidth) {
        leftWidth.value = leftDivRef?.value?.scrollWidth || 0;
        rightWidth.value = rightDivRef?.value?.scrollWidth || 0;
      }
    }
  });
  if (mainDivRef.value) {
    resizeObserver.observe(mainDivRef.value);
  }
});

const todoDetailRef = useTemplateRef('todoDetail')
function dragEnd() {
  dragging.value = false
  todoDetailRef.value?.reSetTextareaHeightAll()
  if (!isDev.value) {
    postMessage({ command: 'saveTodoDetailPanelWidth', value: rightWidth.value });
  }
}
</script>

<style lang="css" scoped>
.ground-glass {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.01);
  box-shadow: 2px 2px 10px 2px var(--vscode-editor-background) inset
}
</style>