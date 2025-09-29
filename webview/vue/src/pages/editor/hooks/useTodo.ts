import { PositionArr, Todo, WarningMessage } from "@/types/editor";
import { storeToRefs } from 'pinia';
import { useTodoStore } from '../store';
import { useSearchTodoLists } from './useSearchTodoLists';
import { useVscode } from './useVscode';


let timer: any = null
export function useTodo() {
  const { postMessage } = useVscode()
  
  const todoStore = useTodoStore()
  const {
    isDev,
    todoLists,
    todoList,
    delayedSaveTime,
  } = storeToRefs(todoStore)

  function saveTodoList(saveBeforeSort = true) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (saveBeforeSort) {
        todoStore.sortCompletedTodoList()
      }
      if (isDev.value) {
        return
      }
      postMessage({ command: 'saveTodoList', text: JSON.stringify(todoLists.value) });
    }, delayedSaveTime.value);
  }

  function addTodo(addTodoValue: string, callback: (newTodo: Todo) => void) {
    if (!addTodoValue) {
      if (!isDev.value) {
        postMessage({ command: 'showMessage', text: '请输入内容。' });
      }
      return
    }
    let newTodo: Todo = {
      id: new Date().getTime(),
      title: addTodoValue,
      createTime: Date.now(),
      deadline: null,
      subItems: [],
      attachments: [],
    }
    todoList.value.unshift(newTodo)
    callback(newTodo)
    setTimeout(() => {
      saveTodoList(false)
    }, 10);
  }

  function confirmDelTodo(positionArr: PositionArr) {
    let todoType = positionArr.length === 1 ? '待办' : '待办子项';
    let warningMessageData: WarningMessage = {
      message: `你确定要删除这个${todoType}吗？`, data: { type: 'delTodo', positionArr }
    }
    if (isDev.value) {
      delTodo(positionArr)
      return
    }
    postMessage({ command: 'showWarningMessage', ...warningMessageData });
  }
  function delTodo(positionArr: PositionArr) {
    useSearchTodoLists(todoLists, positionArr, ({ list, todo, subTodo }, index) => {
      if (subTodo !== void 0) {
        return todo?.subItems.splice(index, 1)
      }
      if (todo !== void 0) {
        return list?.splice(index, 1)
      }
    })
  }

  return {
    saveTodoList,
    addTodo,
    confirmDelTodo,
    delTodo
  }
}