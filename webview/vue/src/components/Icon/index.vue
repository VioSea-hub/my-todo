<template>
  <Tooltip :delay="{ show: 500, hide: 100 }" :distance="11" :disabled="!tooltipContent">
    <div class="f-c-c rounded-4 p-y-3 p-l-3 p-r-1 hover:bg-[var(--vscode-toolbar-hoverBackground)] cursor-pointer" v-if="isClickable"
      @click.stop="emit('click')" :class="{ 'high-border': props.border }">
      <i class="text-16 color-[var(--vscode-icon-foreground)]"
        :class="{ [`${props.prefix}${props.iconClass}`]: true, ...props.otherClass }"></i>
    </div>
    <div class="f-c-c rounded-4 p-3 p-r-1" v-else>
      <i class="text-16 color-[var(--vscode-icon-foreground)]"
        :class="{ [`${props.prefix}${props.iconClass}`]: true, ...props.otherClass }"></i>
    </div>
    <template #popper>
      {{ tooltipContent }}
    </template>
  </Tooltip>
</template>

<script setup lang="ts">
import { Tooltip } from 'floating-vue'
import 'floating-vue/dist/style.css'
const props = defineProps({
  prefix: {
    type: String,
    default: 'i-',
  },
  iconClass: {
    required: true,
    type: String,
    default: '',
  },
  otherClass: {
    type: Object,
    default: null,
  },
  border: {
    type: Boolean,
    default: true,
  },
  isClickable: {
    type: Boolean,
    default: true,
  },
  tooltipContent: {
    type: String,
    default: '',
  },
})
const emit = defineEmits(['click'])
</script>

<style scoped></style>