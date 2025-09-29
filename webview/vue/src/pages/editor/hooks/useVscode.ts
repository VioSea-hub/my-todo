
import { storeToRefs } from 'pinia';
import { useTodoStore } from '../store';


export function useVscode() {
  const todoStore = useTodoStore();
  const { isDev } = storeToRefs(todoStore)

  try {
    if (!isDev.value && typeof window.vscode === 'undefined') {
      window.vscode = acquireVsCodeApi();
      window.vscode.postMessage({ command: 'getTodoDetailPanelWidth' });
    }
  } catch (error) {
    console.error('editor init() 错误', error)
  }

  function postMessage(obj: {command: string, [key: string]: any}) {
    if (typeof window !== 'undefined' && window.vscode && !isDev.value) {
      window.vscode.postMessage(obj);
    }
  }

  return {
    postMessage
  };
}
