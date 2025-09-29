import { CompletedTodo, SubTodo, Todo, TodoLists } from "@/types/editor";
import { Ref } from "vue";

// CompletedType 枚举无法从 .d.ts中导出，疑似有问题，哪天我重新弄一个vite的模版然后设置导出一个枚举看看
enum CompletedType {
  NoCompleted = 0,
  Completed = 1,
}

type searchResultList = undefined | null | Todo[] | CompletedTodo[]
type searchResultTodo = undefined | null | Todo | CompletedTodo
type searchResultSubTodo = undefined | null | SubTodo
export function useSearchTodoLists(todoLists: Ref<TodoLists | null>, positionArr: [CompletedType, number?, number?],
  callback?: (data: { list: searchResultList, todo: searchResultTodo, subTodo: searchResultSubTodo }, index: number) => void): null | Todo[] | CompletedTodo[] | Todo | CompletedTodo | SubTodo {
  let list: searchResultList = void 0;
  let todo: searchResultTodo = void 0;
  let subTodo: searchResultSubTodo = void 0;
  let todoIndex = -1;
  function returnData(): null | Todo[] | CompletedTodo[] | Todo | CompletedTodo | SubTodo {
    function getNestedValue(): null | Todo[] | CompletedTodo[] | Todo | CompletedTodo | SubTodo {
      if (subTodo !== void 0) {
        return subTodo;
      }
      if (todo !== void 0) {
        return todo;
      }
      if (list !== void 0) {
        return list;
      }
      return null;
    }
    if (callback) {callback({ list, todo, subTodo }, todoIndex);}
    return getNestedValue();
  }
  if (todoLists.value === null) {
    list = null;
    return returnData();
  }
  for (let index = 0; index < positionArr.length; index++) {
    const position = positionArr[index];
    if (index === 0) {
      const tempTodoLists = (todoLists.value as TodoLists);
      if (position === CompletedType.Completed) {
        list = tempTodoLists.completed || null;
      } else if (position === CompletedType.NoCompleted) {
        list = tempTodoLists.noCompleted || null;
      }
      if (list === null) {return returnData();}
    } else if (index === 1) {
      const tempResultIndex = (list as Todo[] | CompletedTodo[]).findIndex(todo => todo.id === position);
      todo = (list as Todo[] | CompletedTodo[])[tempResultIndex] || null;
      if (todo === null) {return returnData();}
      todoIndex = tempResultIndex;
    } else if (index === 2) {
      subTodo = (todo as Todo | CompletedTodo)?.subItems[Number(position)] || null;
      if (todo === null) {return returnData();}
      todoIndex = Number(position);
    }
  }
  return returnData();
}