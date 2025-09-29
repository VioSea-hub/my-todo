<template>
  <div class="absolute h-60 bottom-0 left-0 p-x-24 p-y-14 w-full flex bg-[var(--vscode-editor-background)]">
    <div class="relative flex w-full bg-[var(--vscode-tab-inactiveBackground)] rounded-4">
      <div class="f-c-c p-3 absolute h-full left-6">
        <Icon iconClass="codicon:add" :is-clickable="false"></Icon>
      </div>
      <input ref="addTodoInput" type="text" placeholder="新增任务" class="w-full p-l-34 high-border" v-model="addTodoValue"
        @keyup.enter="handleAddTodo()" @focus="emit('focus', $event.target as HTMLInputElement)" autofocus />
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon/index.vue';
import { nextTick, ref, useTemplateRef } from 'vue'
import { useTodo } from '../../hooks/useTodo'
import { Todo } from '@/types/editor';

const addTodoValue = ref('')
const { addTodo } = useTodo()

const emit = defineEmits<{
  (e: 'focus', value: HTMLInputElement | HTMLTextAreaElement): void,
  (e: 'success', value: Todo): void,
}>()

function handleAddTodo() {
  addTodo(addTodoValue.value, (newTodo) => {
    addTodoValue.value = ''
    nextTick(() => emit('success', newTodo))
  })
}

const addTodoInput = useTemplateRef<HTMLInputElement>('addTodoInput')
function focus() {
  nextTick(() => {
    addTodoInput.value?.focus()
  })
}

defineExpose({
  focus
})
</script>

<style lang="scss" scoped></style>