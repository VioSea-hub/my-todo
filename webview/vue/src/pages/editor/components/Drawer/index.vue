<template>
  <div>
    <div
      class="flex justify-between items-center p-x-8 h-38 m-b-8 cursor-pointer hover:bg-[var(--vscode-toolbar-hoverBackground)!important]"
      @click="open = !open">
      <div class="flex items-center gap-8">
        <Icon :iconClass="open ? 'codicon:chevron-down' : 'codicon:chevron-right'" :border="false" :hoverAnimation="false"
          :is-clickable="false"></Icon>
        <text class="text-13">{{ props.title }}</text>
      </div>
      <div>
        <slot name="title-before"></slot>
      </div>
    </div>
    <div class="flex-col" v-show="open">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon/index.vue';
import { ref, watch } from 'vue';

const props = defineProps({
  title: {
    required: true,
    type: String,
    default: '标题'
  },
  open: {
    type: Boolean,
    default: false
  }
})
const open = ref(false)
watch(() => props.open, (newVal) => {
  open.value = newVal
}, { immediate: true })
const emit = defineEmits(['update:open'])
watch(open, (newVal) => {
  emit('update:open', newVal)
})
</script>

<style scoped></style>