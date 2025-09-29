<template>
  <div class="relative flex-col items-center w-full rd-4 data-div">
    <div v-if="todo.attachments.length > 0" class="w-full cursor-pointer">
      <template v-for="(item, index) in todo.attachments">
        <div class="flex items-center gap-8 p-8 w-full p-y-8 border-bottom data-div-item">
          <div class="flex-1" @click="openFile(item)">
            <div v-if="item.type === 'img'" class="w-full flex items-center gap-8">
              <div class="h-32 w-32 f-c-c" v-if="item.webviewUrl">
                <img :src="item.webviewUrl" alt="" height="100%" width="auto" />
              </div>
              <template v-else>{{ asWebviewUri([curViewType, todo?.id], item.content, item.type) }}</template>
              <text>{{ item.content }}</text>
            </div>
            <text v-else>{{ item.content }}</text>
          </div>
          <Icon iconClass="codicon:trash" @click="confirmDelFile(index)" tooltip-content="删除"></Icon>
        </div>
      </template>
    </div>
    <div class="relative flex w-full flex items-center p-8 hover:bg-[var(--vscode-toolbar-hoverBackground)] 
      cursor-pointer data-div-item" @click="selectFile()">
      <Icon iconClass="codicon:attach" :border="false" :is-clickable="false"></Icon>
      <text>添加附件</text>
      <input type="file" ref="fileInput" style="display: none;" @change="selectFileChange()" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon/index.vue';
import { useTodoStore } from '@/pages/editor/store';
import { Attachments, CompletedTodo, PositionArr, SaveFileInfo, Todo, WarningMessage } from '@/types/editor';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, Ref, useTemplateRef } from 'vue';
import { useTodo } from '../../../hooks/useTodo';


const todoStore = useTodoStore()
const {
  isDev,
  curViewType,
  todo: _todo
} = storeToRefs(todoStore)
const todo = _todo as Ref<Todo | CompletedTodo>

const { saveTodoList } = useTodo()

function asWebviewUri(positionArr: PositionArr, filename: string, type: string) {
  if (isDev.value) return
  if (type !== 'img') return
  window.vscode.postMessage({ command: 'asWebviewUri', positionArr, filename });
}

function saveFileSuccess(message: any) {
  const saveFileSuccessMessage: SaveFileInfo = {
    saveToPositionArr: message.saveToPositionArr,
    filename: message.filename,
  }
  const { saveToPositionArr, filename } = saveFileSuccessMessage
  const attachmentsList: Attachments[] | undefined = todo.value.attachments
  if (!attachmentsList) {
    return
  }
  const fileType = filename.substring(filename.lastIndexOf('.') + 1)
  attachmentsList.push({
    type: fileType == 'png' ? 'img' : '',
    content: filename
  })
  asWebviewUri(saveToPositionArr, filename, fileType)
  saveTodoList()
}

// TODO 是否允许每个子项增加附件待定
const enableSubTodoUploadFile = false
function pasteEventListener(event: ClipboardEvent) {
  const items = event?.clipboardData?.items;
  if (!items) return
  let saveToPositionArr: PositionArr = [curViewType.value, todo.value.id]
  if (enableSubTodoUploadFile) {
    const targetElement = event.target as HTMLElement;
    if (!targetElement.attributes.getNamedItem('allowPositionUpload')) return
    const uploadToPosition = targetElement.attributes.getNamedItem('uploadToPosition')
    if (!uploadToPosition || !uploadToPosition.nodeValue) return
    saveToPositionArr = (uploadToPosition?.nodeValue.split(',').map((item) => Number(item)) as PositionArr)
  }

  const itemsArray = Array.from(items);
  for (const item of itemsArray) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      if (blob) {
        const reader = new FileReader();
        reader.onload = () => {
          if (!reader.result) {
            return
          }
          const base64Data = (reader.result as string).split(',')[1];
          if (isDev.value) {
            saveFileSuccess({ saveToPositionArr, filename: new Date().getTime() + '.png' })
            return
          }
          window.vscode.postMessage({
            command: 'saveFile',
            saveToPositionArr,
            filename: new Date().getTime() + '.png',
            base64Data,
          });
        };
        reader.readAsDataURL(blob);
      }
    }
  }
}

function getWebviewUri(filename: string, webviewUrl: string) {
  const attachmentsList: Attachments[] | undefined = todo.value.attachments
  if (!attachmentsList) {
    return
  }
  const data = attachmentsList.find((item) => item.content === filename)
  if (!data) {
    return
  }
  data.webviewUrl = webviewUrl
}
function messageEventListener(event: MessageEvent) {
  const message = event.data;
  switch (message.type) {
    case 'getWebviewUri':
      getWebviewUri(message.filename, message.webviewUrl)
      saveTodoList()
      break;

    case 'saveFileSuccess':
      saveFileSuccess(message)
      break;

    case 'showWarningMessageYes':
      const type: string = message.data.type
      switch (type) {
        case 'delFile':
          delFile((message.data.index as number))
          saveTodoList()
          break;
      }
      break;
  }
}
onMounted(() => {
  document.addEventListener('paste', pasteEventListener);
  window.addEventListener('message', messageEventListener);
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', pasteEventListener)
  window.removeEventListener('message', messageEventListener)
})

function openFile(attachments: Attachments) {
  window.vscode.postMessage({ command: 'openFile', content: attachments.content });
}
function confirmDelFile(index: number) {
  let warningMessageData: WarningMessage = {
    message: '你确定要删除这个文件吗？', data: { type: 'delFile', index }
  }
  if (isDev.value) {
    delFile(index)
    return
  }
  window.vscode.postMessage({ command: 'showWarningMessage', ...warningMessageData });
}

function delFile(index: number) {
  if (curViewType.value == null) return
  if (todo == null) return
  const { content } = JSON.parse(JSON.stringify(todo.value.attachments[index]))
  todo.value.attachments.splice(index, 1)
  if (isDev.value) return
  window.vscode.postMessage({ command: 'delFile', filename: content });
}

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
function selectFile() {
  fileInput.value?.click()
}

function selectFileChange() {
  if (!fileInput.value || !fileInput.value.files || !fileInput.value.files[0]) return
  const file = fileInput.value.files[0];

  const reader = new FileReader();
  reader.onload = function (e) {
    const filename = new Date().getTime() + (file.name.indexOf('.') > -1 ? file.name.substring(file.name.indexOf('.')) : '');
    if (e && e.target && e.target.result && typeof e.target.result == 'string') {
      window.vscode.postMessage({ command: 'saveFile', saveToPositionArr: [curViewType.value, todo.value.id], filename: filename, base64Data: e.target.result.split(',')[1] });
    }

  };
  reader.readAsDataURL(file);
}
</script>

<style lang="css" scoped></style>