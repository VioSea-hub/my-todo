<template>
  <div class="flex-col h-[calc(100%-60px)] gap-14 overflow-x-auto">
    <Drawer title="未完成" v-model:open="openNoCompletedTodoView">
      <template #title-before>
        <SearchInput v-model:value="searchData[CompletedType.NoCompleted].value"
          v-model:subTodoValue="searchData[CompletedType.NoCompleted].searchSubTodo" />
      </template>
      <div class="gap-8  min-w-100 data-div" v-if="filterBySearch(CompletedType.NoCompleted).length > 0">
        <VueDraggable v-model="todoList" :animation="200" class="flex-col gap-y-8 data-div"
          :disabled="searchData[CompletedType.NoCompleted].value.length > 0" @change="todoDraggableChange()">
          <div v-for="(item, index) in filterBySearch(CompletedType.NoCompleted)" :key="item.id || item.title"
            @click.stop="openSubTodoView(item.id, CompletedType.NoCompleted)">
            <div class="flex justify-between gap-8 p-x-14 p-y-8 rd-4 cursor-pointer high-border data-div-item">
              <div class="overflow-hidden">
                <div class="flex items-center gap-8">
                  <input type="checkbox" @click.stop @change="todoCompletedChange(index, true)">
                  <span class="overflow-hidden text-ellipsis line-height-[1.5]">{{ item.title }}</span>
                </div>
              </div>
              <div class="flex items-center gap-8">
                <div class="flex items-center" v-if="checkDate(item)">
                  <Icon iconClass="codicon:info" :hover-animation="false" :is-clickable="false"
                    :other-class="{ 'text-[var(--vscode-editorError-foreground)!important]': true }"></Icon>
                  <span class="text-[var(--vscode-editorError-foreground)] whitespace-nowrap">已逾期</span>
                </div>
                <Icon iconClass="codicon:trash" tooltip-content="删除"
                  @click="confirmDelTodo([CompletedType.NoCompleted, filterBySearch(CompletedType.NoCompleted)[index].id])">
                </Icon>
              </div>
            </div>
          </div>
        </VueDraggable>
      </div>
      <div class="f-c-c" v-else>
        <text>暂无数据</text>
      </div>
    </Drawer>
    <Drawer title="已完成" v-model:open="openCompletedTodoView">
      <template #title-before>
        <SearchInput v-model:value="searchData[CompletedType.Completed].value"
          v-model:subTodoValue="searchData[CompletedType.Completed].searchSubTodo" />
      </template>
      <div class="flex-col gap-8 data-div" v-if="filterBySearch(CompletedType.Completed).length > 0">
        <div v-for="(item, index) in filterBySearch(CompletedType.Completed)" :key="item.id || item.title"
          @click.stop="openSubTodoView(item.id, CompletedType.Completed)">
          <div class="flex justify-between gap-8 p-x-14 p-y-8 rd-4 cursor-pointer high-border data-div-item">
            <div class="overflow-hidden">
              <div class="flex items-center gap-8">
                <input type="checkbox" checked @click.stop @change="todoCompletedChange(index, false)">
                <span class="overflow-hidden text-ellipsis line-height-[1.5]">{{ item.title }}</span>
              </div>
            </div>
            <div class="flex items-center gap-8">
              <Icon iconClass="codicon:trash" tooltip-content="删除"
                @click="confirmDelTodo([CompletedType.Completed, completedTodoList[index].id])"></Icon>
            </div>
          </div>
        </div>
      </div>
      <div class="f-c-c" v-else>
        <text>暂无数据</text>
      </div>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon/index.vue';
import { CompletedTodo, PositionArr, SubTodo, Todo } from '@/types/editor';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useTodo } from '../../hooks/useTodo';
import { useVscode } from '../../hooks/useVscode';
import { useTodoStore } from '../../store';
import Drawer from '../Drawer/index.vue';
import SearchInput from '../SearchInput/index.vue';

const { postMessage } = useVscode()

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
  delayedSaveTime,
} = storeToRefs(todoStore)

const openNoCompletedTodoView = ref(true)
const openCompletedTodoView = ref(false)

const searchData = ref({
  [CompletedType.NoCompleted]: {
    value: '',
    searchSubTodo: false
  },
  [CompletedType.Completed]: {
    value: '',
    searchSubTodo: false
  },
})

function filterBySearch(type: CompletedType) {
  const tempSearchData = searchData.value[type];
  if (type === CompletedType.NoCompleted) {
    return todoSearch(todoList.value, tempSearchData.value)
  } else {
    return todoSearch(completedTodoList.value, tempSearchData.value)
  }

  function todoSearch(list: Todo[] | CompletedTodo[], value: string) {
    return list.filter(item => {
      return item.title.includes(value)
        || (tempSearchData.searchSubTodo && subTodoSearch(item.subItems, value))
    })
  }

  function subTodoSearch(list: SubTodo[], value: string) {
    return list.filter(item => item.title.includes(tempSearchData.value)).length > 0
  }
}
const { saveTodoList, confirmDelTodo, delTodo } = useTodo()

let draggableTimer: any = null
function todoDraggableChange() {
  clearTimeout(draggableTimer)
  draggableTimer = setTimeout(() => {
    if (todoLists.value) {
      todoLists.value.noCompleted = todoList.value
      saveTodoList()
    }
    if (isDev.value) {
      return
    }
    saveTodoList()
  }, delayedSaveTime.value);
}

const emit = defineEmits<{
  (e: 'openSubTodoView', id: number, type: CompletedType): void,
}>()
function openSubTodoView(id: number, type: CompletedType) {
  emit('openSubTodoView', id, type)
}

function todoCompletedChange(index: number, completed: boolean) {
  if (completed) {
    const todo = todoList.value[index]
    let newTodo: CompletedTodo = {
      ...todo,
      completionTime: new Date().getTime(),
    }
    completedTodoList.value.unshift(newTodo)
    todoList.value.splice(index, 1)
  } else {
    const completedTodo = completedTodoList.value[index]
    const { completionTime, ...newTodo } = completedTodo
    todoList.value.unshift(newTodo)
    completedTodoList.value.splice(index, 1)
  }
  saveTodoList()
}

let intervalId: number | undefined;
onMounted(() => {
  intervalId = window.setInterval(() => {
    now.value = new Date()
  }, 1000);

  if (isDev.value) {
    todoLists.value = {
      noCompleted: [
        {
          id: 1, title: '测试文本测试文本测试文本测试文本', deadline: Date.now(),
          createTime: Date.now(),
          subItems: [
            { title: '测测试文本测测试文本测测试文本测', completed: false, attachments: [] },
            { title: '测测试文本测测试文本测测试文本测', completed: false, attachments: [] },
            { title: '一', completed: false, attachments: [] },
            { title: '二', completed: false, attachments: [] }
          ],
          attachments: [{ type: 'img', content: '1212212.png' }, { type: 'xls', content: '1212212.xls' }]
        },
        { id: 2, title: '2', deadline: null, subItems: [{ title: '1', completed: false, attachments: [] }], attachments: [] },
        { id: 3, title: '3', deadline: null, subItems: [{ title: '1', completed: false, attachments: [] }], attachments: [] },
        { id: 4, title: '4-1', deadline: null, subItems: [{ title: '14', completed: false, attachments: [] }], attachments: [] },
        { id: 5, title: '4-2', deadline: null, subItems: [{ title: '14', completed: false, attachments: [] }], attachments: [] },
        { id: 6, title: '4-3', deadline: null, subItems: [{ title: '15', completed: false, attachments: [] }], attachments: [] },
        { id: 7, title: '14', deadline: null, subItems: [{ title: '15', completed: false, attachments: [] }], attachments: [] },
        { id: 8, title: '144', deadline: null, subItems: [{ title: '15', completed: false, attachments: [] }], attachments: [] },
      ],
      completed: [
        { id: 7, title: '14', deadline: null, completionTime: null, subItems: [{ title: '15', completed: false, attachments: [] }], attachments: [] },
        { id: 8, title: '144', deadline: null, completionTime: null, subItems: [{ title: '15', completed: false, attachments: [] }], attachments: [] },
      ]
    }
    return
  }
  // 请求加载所有的 Todo 项目
  postMessage({ command: 'loadTodoList', isInit: true });
  window.addEventListener('message', messageEventListener);
});

onBeforeUnmount(() => {
  // 清除定时器和其他监听
  if (intervalId !== undefined) {
    clearInterval(intervalId);
  }
  window.removeEventListener('message', messageEventListener);
});

function messageEventListener(event: MessageEvent) {
  const message = event.data;
  switch (message.type) {
    case 'loadTodoList':
      if (message.isInit) {
        if (isDev.value) {
          return
        }
        postMessage({ command: 'getOpenLastOpenTodo' });
      }
      loadTodoList(message.text)
      break;
    case 'openTodo':
      function openTodo({ value: positionArr }: { value: PositionArr | null }) {
        if (positionArr !== null && positionArr.length === 2 && positionArr[1] !== undefined) {
          openSubTodoView(positionArr[1], positionArr[0])
        }
      }
      openTodo(message)
      break;
    case 'showWarningMessageYes':
      const type: string = message.data.type
      switch (type) {
        case 'delTodo':
          delTodo((message.data.positionArr as PositionArr))
          saveTodoList()
          break;
      }
      break;
  }
}

function loadTodoList(text: string) {
  if (!text) {
    todoLists.value = {
      noCompleted: [],
      completed: []
    }
  } else {
    todoLists.value = JSON.parse(text)
  }
  todoStore.sortCompletedTodoList()
}

const now = ref(new Date())
function checkDate(todo: Todo) {
  if (!todo.deadline) {
    return false
  }
  if (todo.exceedDeadline) {
    return true
  }
  const deadlineDate = new Date(todo.deadline)
  const temp = deadlineDate < now.value
  if (temp) {
    todo.exceedDeadline = temp
    saveTodoList()
  }
  return temp
}
</script>

<style scoped></style>