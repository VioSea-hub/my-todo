<template>
  <div class="main">
    <div v-if="error === ErrorType.NO_SAVEFOLDER" class="p-24 whitespace-normal">
      <span>请先点击右上方</span>
      <Icon iconClass="codicon:folder" :hover-animation="false" class="inline-block"></Icon>
      <span>按钮选择保存文件夹</span>
    </div>
    <div v-else-if="error === ErrorType.NO_PROJECT" class="p-24 whitespace-normal">
      <span>请先点击上方</span>
      <Icon iconClass="codicon:add" :hover-animation="false" class="inline-block"></Icon>
      <span>按钮新增项目</span>
    </div>
    <div v-else-if="projectList && projectList.length > 0" class="flex-col">
      <template v-for="item in projectList" :key="item.name">
        <div class="hover:bg-[var(--vscode-list-hoverBackground)] p-l-24 p-r-8 gap-14 flex items-center justify-between"
          @click="openProject(item)" @mousemove="hoverProject = item" @mouseout="hoverProject = null">
          <div class="p-y-5.5">
            <text>{{ item.name }}</text>
            <text v-if="item.name === defaultProject" class="opacity-70">
              (默认项目)
            </text>
            <text v-if="item.name === currentOpenProject" class="opacity-70">
              (当前项目)
            </text>
          </div>
          <div class="flex" v-if="(item.name === defaultProject || item === hoverProject)">
            <Icon iconClass="codicon:book" tooltip-content="设置为默认项目" @click="setDefaultProject(item.name)"
              @mousemove="hoverProject = item" @mouseout="hoverProject = null"></Icon>
            <Icon iconClass="codicon:trash" tooltip-content="删除项目"
              v-if="(item.name === defaultProject || item === hoverProject)" @click="delProject(item.name)"
              @mousemove="hoverProject = item" @mouseout="hoverProject = null"></Icon>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Ref } from 'vue'
import type { Project } from '@/types/sidebar'
import Icon from '@/components/Icon/index.vue';

const projectList: Ref<Array<Project>> = ref([]);
const defaultProject: Ref<string> = ref('')
const currentOpenProject: Ref<string> = ref('')
const hoverProject: Ref<Project | null> = ref(null)

const isDev = ref(import.meta.env.VITE_APP_ENV === 'development')
init()
function init() {
  if (!isDev.value && typeof window.vscode === 'undefined') {
    try {
      console.log('sidebar 加载vscode::: ');
      window.vscode = acquireVsCodeApi();
      window.vscode.postMessage({ command: 'getProjectList', });
    } catch (error) {
      console.error('sidebar Error', error)
    }
  }
}

enum ErrorType {
  NO_SAVEFOLDER, // 无保存文件夹
  NO_PROJECT, // 无项目
}
const error: Ref<ErrorType | undefined> = ref(undefined)
onMounted(() => {
  // window.vscode.postMessage({ command: 'init' });
  if (isDev.value) {
    projectList.value = [
      { name: '项目1' },
      { name: '项目2' },
      { name: '项目3' },
    ]
    return
  }

  window.vscode.postMessage({ command: 'getDefaultOpenProject', });
  window.addEventListener('message', (event) => {
    const message = event.data;
    // console.log('message::: ', message)
    if (message.command === 'getProjectList') {
      error.value = undefined
      if (message.error !== undefined) {
        error.value = message.error
        return
      }
      if (message.value.length === 0) {
        error.value = ErrorType.NO_PROJECT
        return
      }
      projectList.value = message.value;
    }
    if (message.command === 'getDefaultOpenProject') {
      defaultProject.value = message.value;
      if (defaultProject.value) openProject({ name: defaultProject.value })
    }
    if (message.command === 'getCurrentOpenProject') {
      currentOpenProject.value = message.value;
    }
  });
});


function openProject({ name }: { name: string }) {
  window.vscode.postMessage({
    command: 'openProject',
    name: name,
  });
}

function delProject(name: string) {
  window.vscode.postMessage({
    command: 'delProject',
    name: name,
  });
}

function setDefaultProject(name: string) {
  defaultProject.value = name;
  window.vscode.postMessage({
    command: 'setDefaultOpenProject',
    name: name,
  });
}
</script>

<style lang="scss" scoped></style>