<template>
  <div class="min-w-400 h-full p-12 flex-col justify-between gap-8">
    <div class="flex-col">
      <div class="flex justify-end">
        <div class="w-full">
          <div class="flex items-center" v-if="todo?.exceedDeadline">
            <Icon iconClass="codicon:info" :is-clickable="false"
              :other-class="{ 'text-[var(--vscode-editorError-foreground)!important]': true }"></Icon>
            <span class="text-[var(--vscode-editorError-foreground)]">已逾期</span>
          </div>
        </div>
        <Icon iconClass="codicon:close" @click="closeTodoPanel()" tooltip-content="关闭子任务面板"></Icon>
      </div>
      <div class="flex-col m-t-12">
        <div class="flex-col border-bottom">
          <div
            class="flex w-full justify-between items-center gap-8 p-8 text-13 data-div-item rounded-lt-4 rounded-rt-4"
            :class="{ 'decoration-line-through': curViewType }">
            <div class="flex items-center w-full">
              <input type="checkbox" :checked="curViewType == CompletedType.Completed"
                @change="todoDetailCompletedChange()">
              <textarea class="text-18" v-model="todo.title" :rows="1" ref="title-textarea"
                :allowPositionUpload=true :uploadToPosition='[curViewType, todo?.id]' @input="saveTodoList()"
                @focus="emit('focus', $event.target as HTMLTextAreaElement)"></textarea>
            </div>
            <Icon iconClass="codicon:trash" @click="confirmDelTodo([curViewType, todo?.id])" tooltip-content="删除">
            </Icon>
          </div>
        </div>
        <!-- 子任务列表 -->
        <div class="flex-col data-div border-bottom">
          <VueDraggable v-model="todo.subItems" :animation="200" class="flex-col data-div-item" filter="textarea"
            :preventOnFilter="false" @update="saveTodoList()">
            <div v-for="(item, index) in todo.subItems" :key="index"
              :class="{ 'drag-class': focusSubItemIndex !== index && index != 1 }">
              <div class="flex justify-between items-center gap-8 p-x-8 p-y-3 text-13"
                :class="{ 'decoration-line-through': item.completed }">
                <div class="flex items-center w-full">
                  <input type="checkbox" :checked="item.completed" @change="subTodoCompletedChange(index, $event)">
                  <div class="wh-full relative">
                    <div class="wh-full absolute cursor-pointer" v-if="focusSubItemIndex !== index"
                      @click="subItemMackClick(index)"></div>
                    <textarea v-model="item.title" :rows="1" ref="subTodo-textarea" :allowPositionUpload=true
                      :uploadToPosition="[curViewType, todo?.id, index]" @blur="focusSubItemIndex = -1"
                      @input="saveTodoList()" @focus="emit('focus', $event.target as HTMLTextAreaElement)"></textarea>
                  </div>
                </div>
                <Icon iconClass="codicon:trash" @click="confirmDelTodo([curViewType, todo.id, index])"
                  tooltip-content="删除"></Icon>
              </div>
            </div>
          </VueDraggable>
          <div class="relative flex w-full data-div-item">
            <div class="f-c-c p-3 absolute h-full left-6">
              <Icon iconClass="codicon:add" :is-clickable="false"></Icon>
            </div>
            <input ref="addSubTodoInput" type="text" placeholder="新增任务" class="w-full p-l-34 " v-model="newSubTodoValue"
              @keyup.enter="handleAddSubTodo()" @focus="emit('focus', $event.target as HTMLInputElement)" />
          </div>
        </div>
      </div>

      <!-- 其他 -->
      <div class="flex-col gap-8">
        <div class="relative flex items-center justify-between w-full p-x-12 p-y-8 rd-4 data-div-item"
          ref="deadLineDiv">
          截止时间：
          <input ref="dateTimeSelect" class="h-auto" :class="{ 'dark-datetime-local-input': colorTheme == 'dark' }"
            type="datetime-local" v-model="deadlineFormat" />
        </div>

        <!-- 附件 -->
        <AttachmentsView></AttachmentsView>
      </div>
    </div>
    <div class="flex-col data-div">
      <div class="relative flex items-center justify-between w-full p-x-12 p-y-8 rd-4 data-div-item "
        v-if="todo.createTime">
        创建时间：
        <div>{{ formatDate(todo.createTime) }}</div>
      </div>
      <div class="relative flex items-center justify-between w-full p-x-12 p-y-8 rd-4 data-div-item"
        v-if="(todo as CompletedTodo)?.completionTime">
        完成时间：
        <div>{{ formatDate((todo as CompletedTodo)?.completionTime) }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Icon from '@/components/Icon/index.vue';
import { useTheme } from '@/pages/editor/hooks/useTheme';
import { formatDate } from '@/pages/editor/utils/index';
import { CompletedTodo, LastOpenTodo, SubTodo, Todo } from '@/types/editor';
import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useTodo } from '../../hooks/useTodo';
import { useVscode } from '../../hooks/useVscode';
import { useTodoStore } from '../../store';
import AttachmentsView from './components/AttachmentsView.vue';

const { postMessage } = useVscode()

enum CompletedType {
  NoCompleted = 0,
  Completed = 1,
}
const todoStore = useTodoStore()
const {
  isDev,
  todoList,
  completedTodoList,
  curViewId,
  curViewType,
  todo: _todo
} = storeToRefs(todoStore)
const todo = _todo as Ref<Todo | CompletedTodo>


const { saveTodoList, confirmDelTodo } = useTodo()

const deadlineFormat = computed({
  get: () => {
    if (todo.value.deadline) {
      return formatDate(todo.value.deadline, 'yyyy-MM-ddTHH:mm')
    } else {
      return ''
    }
  },
  set: (newVal) => {
    const newValDate = new Date(newVal)
    todo.value.deadline = newValDate.getTime()
    todo.value.exceedDeadline = todo.value.deadline ? newValDate < new Date() : false
    saveTodoList()
  }
})

const deadLineDiv = useTemplateRef<HTMLDivElement | null>('deadLineDiv');
const { colorTheme } = useTheme(deadLineDiv)

const emit = defineEmits<{
  (e: 'closeSubTodoView'): void,
  (e: 'focus', value: HTMLInputElement | HTMLTextAreaElement): void,
}>()

const addSubTodoInputRef = useTemplateRef<HTMLInputElement>('addSubTodoInput')
defineExpose({ getAddSubTodoInputRef: () => addSubTodoInputRef.value, reSetTextareaHeightAll })

watch(() => curViewId, () => {
  nextTick(() => {
    addSubTodoInputRef.value?.focus()
  })
}, { immediate: true })

const todoTitleRef = useTemplateRef<HTMLTextAreaElement>('title-textarea')
watch(() => todo.value.title, () => {
  nextTick(() => {
    if (todoTitleRef.value) {
      reSetTextareaHeight([todoTitleRef.value])
    }
  })
}, { deep: true, immediate: true })

const subTodoTitleRef = useTemplateRef<HTMLTextAreaElement[]>('subTodo-textarea')
watch(() => todo.value.subItems, () => {
  nextTick(() => {
    if (subTodoTitleRef.value) {
      reSetTextareaHeight(subTodoTitleRef.value)
    }
  })
}, { deep: true, immediate: true })

const focusSubItemIndex: Ref<number> = ref(-1)
function subItemMackClick(index: number) {
  focusSubItemIndex.value = index
  if (subTodoTitleRef.value) {
    subTodoTitleRef.value[focusSubItemIndex.value].select()
  }
}

function reSetTextareaHeight(textareaElArr: HTMLTextAreaElement[]) {
  for (let i = 0; i < textareaElArr.length; i++) {
    const item = textareaElArr[i];
    item.style.height = 'auto'
    item.style.height = (item.scrollHeight) + 'px'
  }
}
function reSetTextareaHeightAll() {
  const tempArr: HTMLTextAreaElement[] = []
  if (todoTitleRef.value) {
    tempArr.push(todoTitleRef.value)
  }
  if (subTodoTitleRef.value) {
    tempArr.push(...subTodoTitleRef.value)
  }
  reSetTextareaHeight(tempArr)
}

function closeTodoPanel() {
  emit('closeSubTodoView')
  const lastOpenTodo: LastOpenTodo = {
    key: 'LastOpenTodo',
    value: null
  }
  postMessage({ command: 'updateGlobalState', value: lastOpenTodo });
}

function todoDetailCompletedChange() {
  let currentCompleted = curViewType.value === CompletedType.Completed
  if (!currentCompleted) {
    for (let i = 0; i < todoList.value.length; i++) {
      if (todoList.value[i].id == curViewId.value) {
        const todo = todoList.value[i]
        let completedTodo: CompletedTodo = {
          ...todo,
          completionTime: new Date().getTime(),
        }
        completedTodoList.value.unshift(completedTodo)
        todoList.value.splice(i, 1)
        curViewType.value = CompletedType.Completed
        break
      }
    }
  } else {
    for (let i = 0; i < completedTodoList.value.length; i++) {
      if (completedTodoList.value[i].id == curViewId.value) {
        const completedTodo = completedTodoList.value[i]
        const { completionTime, ...newTodo } = completedTodo
        todoList.value.unshift(newTodo)
        completedTodoList.value.splice(i, 1)
        curViewType.value = CompletedType.NoCompleted
        break
      }
    }
  }
  saveTodoList()
}

function subTodoCompletedChange(index: number, event: Event | boolean) {
  if (todo?.value == null) return
  const subTodo = todo.value.subItems[index]
  if (event instanceof Event) {
    const target = event?.target as HTMLInputElement
    subTodo.completed = target.checked
  } else {
    subTodo.completed = event
  }
  saveTodoList()
}

const newSubTodoValue: Ref<string> = ref('')
function handleAddSubTodo() {
  if (!newSubTodoValue.value) {
    if (!isDev.value) {
      postMessage({ command: 'showMessage', text: '请输入内容。' });
    }
    return
  }
  let newSubTodoItem: SubTodo = {
    title: newSubTodoValue.value,
    completed: false,
    attachments: [],
  }
  if (todo?.value != null) {
    todo.value.subItems.push(newSubTodoItem)
  }
  newSubTodoValue.value = ''
  saveTodoList()
}
</script>

<style lang="css" scoped></style>