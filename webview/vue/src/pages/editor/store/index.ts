import { CompletedTodo, Todo, TodoLists } from '@/types/editor'
import { defineStore } from 'pinia'

enum CompletedType {
  NoCompleted = 0,
  Completed = 1,
}
export const useTodoStore = defineStore('todo', {
  state: () => ({
    isDev: import.meta.env.VITE_APP_ENV === 'development',

    todoLists: null as TodoLists | null,
    todoList: [] as Todo[],
    completedTodoList: [] as CompletedTodo[],
    curViewId: null as number | null,
    curViewType: CompletedType.NoCompleted as CompletedType,
    todo: null as Todo | CompletedTodo | null,

    delayedSaveTime: 500 as number,
  }),

  actions: {
    sortCompletedTodoList() {
      this.completedTodoList = this.completedTodoList.sort((a, b) => {
        return (b.completionTime ?? 0) - (a.completionTime ?? 0);
      });
    }
  }
})