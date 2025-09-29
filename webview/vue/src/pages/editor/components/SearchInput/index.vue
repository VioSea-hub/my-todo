<template>
  <div @click.stop>
    <Icon v-if="!visible" iconClass="codicon:search" class="rotate--90" @click="open()"></Icon>
    <div class="flex items-center gap-8" v-else>
      <Tooltip :delay="{ show: 500, hide: 100 }" :distance="11">
        <input type="checkbox" @click.stop v-model="subTodoValue">
        <template #popper>
          包含子项
        </template>
      </Tooltip>
      <input ref="input" type="text" :placeholder="placeholder" autofocus class="w-full p-l-12 high-border input-show-border"
        v-model="value"/>
      <Icon iconClass="codicon:close" tooltipContent="关闭搜索" class="rotate--90"
        @click="close()"></Icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon/index.vue';
import { Tooltip } from 'floating-vue';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

const props = defineProps({
  value: {
    type: String,
    default: ''
  },
  subTodoValue: {
    type: Boolean,
    default: false
  },
})

const placeholder = computed(() => {
  return props.subTodoValue ? '搜索内容及其子项' : '搜索内容'
})


const visible = ref(false)
const value = ref(props.value)
const subTodoValue = ref(props.subTodoValue)
const inputRef = useTemplateRef<HTMLInputElement>('input')

function open() {
  visible.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function close() {
  visible.value = false
  value.value = ''
}

const emit = defineEmits(['update:value', 'update:subTodoValue'])
watch(value, (newVal) => {
  emit('update:value', newVal)
})
watch(subTodoValue, (newVal) => {
  emit('update:subTodoValue', newVal)
})
</script>

<style scoped></style>