// todo 列表
export interface TodoLists {
  noCompleted: Todo[],            // 未完成的 todo
  completed: CompletedTodo[],     // 已完成的 todo
}

// todo 数据结构
export interface Todo {
  id: number,                     // 唯一标识
  title: string,                  // 标题
  deadline: number | null,        // 截止时间
  createTime?: number,            // 创建时间
  exceedDeadline?: boolean,       // 是否超过截止时间
  subItems: SubTodo[],            // 子项
  attachments: Attachments[],     // 附件
}

// 已完成的 todo
export interface CompletedTodo extends Todo {
  completionTime: number | null,  // 完成时间
}

// 子项
export interface SubTodo {
  title: string,                  // 标题
  completed: boolean,             // 是否完成
  attachments: Attachments[]      // 附件
}

// 附件
export interface Attachments {
  type: string,                   // 类型
  content: string,                // 路径
  webviewUrl?: string,            // webviewUrl 转换后的路径
}

// 保存到的位置 [是否完成, 父级索引, 子级索引]
export type PositionArr = [CompletedType, number?, number?]

// 保存文件信息
export interface SaveFileInfo {
  filename: string,               // 文件名
  saveToPositionArr: PositionArr  // 保存到的位置
}

// 完成类型枚举
export enum CompletedType {
  NoCompleted = 0,                // 未完成
  Completed = 1,                  // 已完成
}

// 警告信息
export interface WarningMessage {
  message: string,                // 警告信息
  data: unknown,                  // 携带
}

// 最后打开的 todo
export interface LastOpenTodo {
  key: 'LastOpenTodo',           // 类型
  value: PositionArr|null   // 位置
}