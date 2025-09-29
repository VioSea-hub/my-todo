<template>
  <div class="divider flex-shrink-0" :class="{ 'cursor-col-resize': props.drag, 'bg-[--vscode-sash-hoverBorder]': hover || dragging }"
    @mousedown="startDrag" @mouseenter="hover = true" @mouseleave="hover = false">
    <div class="wh-full bg-[--vscode-settings-headerBorder]"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'

const props = defineProps({
  drag: {
    type: Boolean,
    default: false,
  },
  leftWidth: {
    type: Number,
    default: 400
  },
  minLeftWidth: {
    type: Number,
    default: 400
  },
  rightWidth: {
    type: Number,
    default: 400
  },
  minRightWidth: {
    type: Number,
    default: 400
  }
})
// 左侧宽度
const leftWidth = ref<number>(props.leftWidth)
watch(() => props.leftWidth, (newVal) => {
  leftWidth.value = newVal
}, { immediate: true })
// 右侧宽度
const rightWidth = ref<number>(props.rightWidth)
watch(() => props.rightWidth, (newVal) => {
  rightWidth.value = newVal
}, { immediate: true })
// 是否正在拖动
const hover = ref<boolean>(false)

const emit = defineEmits(['update:leftWidth', 'update:rightWidth', 'drag', 'dragStart', 'dragEnd'])
watchEffect(() => {
  emit('update:leftWidth', leftWidth.value)
  emit('update:rightWidth', rightWidth.value)
})

// 拖拽起始点
let startX: number = 0
let startLeftWidth: number = 0
let startRightWidth = 0;

const dragging = ref<boolean>(false)
// 开始拖拽
function startDrag(e: MouseEvent): void {
  if (!props.drag) return
  dragging.value = true
  startX = e.clientX
  startLeftWidth = leftWidth.value
  startRightWidth = rightWidth.value
  document.body.style.cursor = 'col-resize'
  emit('dragStart')
}
// 拖拽中
function onDrag(e: MouseEvent): void {

  if (!dragging.value) return
  const delta: number = e.clientX - startX
  const newLeftWidth = startLeftWidth + delta
  const newRightWidth = startRightWidth - delta
  if (
    newLeftWidth <= props.minLeftWidth ||
    newRightWidth <= props.minRightWidth
  ) {
    return
  }
  leftWidth.value = newLeftWidth
  rightWidth.value = newRightWidth

  emit('drag')
}

// 拖拽结束
function stopDrag(): void {
  dragging.value = false
  document.body.style.cursor = ''
  emit('dragEnd')
}

// 监听全局拖拽和释放
onMounted(() => {
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.divider {
  width: 7px;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  z-index: 1;
  position: relative;
  transition: background 0.2s;
}
</style>