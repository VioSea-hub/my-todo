const vscode = acquireVsCodeApi();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 请求加载所有的 Todo 项目
    vscode.postMessage({ command: 'loadTodos' });

    document.addEventListener('paste', event => {
        const items = event.clipboardData.items;
        console.log('event.target::: ', event);
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Data = reader.result.split(',')[1];
                    vscode.postMessage({ command: 'saveFileByData', parentNodeId: event.target.parentNode.id, base64Data, filename: new Date().getTime() });
                };
                reader.readAsDataURL(blob);
            }
        }
    });
});

// 监听从 Webview 发送的消息
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'update':
            // loadTodos(JSON.parse(message.text));
            break;
        case 'load':
            loadTodos(JSON.parse(message.text));
            break;
        case 'getWebviewUri':
            document.getElementById(message.id).src = message.src;
            console.log('message::: ', message);
            break;
        case 'saveFileByDataSuccess':
            const parentNode = document.getElementById(message.parentNodeId);
            console.log('parentNode::: ', parentNode);
            let attachment;
            attachment = document.createElement('img');
            attachment.className = 'img-level-2';
            attachment.id = message.fullFilename;
            vscode.postMessage({ command: 'asWebviewUri', filename: message.fullFilename });
            attachment.onclick = () => vscode.postMessage({ command: 'openFile', filename: message.fullFilename, type: 'png' });
            parentNode.appendChild(attachment);

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.onclick = () => {
                attachment.remove();
                removeButton.remove();
                saveTodos();
            };
            parentNode.appendChild(removeButton);
            setTimeout(() => {
                saveTodos();
            }, 10);
            break;

    }
});

let currentTarget = null;

/**
 * 添加新的 Todo 项目
 */
function addTodo() {
    const title = document.getElementById('todo-title').value;
    let deadline = document.getElementById('todo-deadline').value;
    if (title.trim() === '') { return; }

    // 如果未指定截止日期，则使用当前时间
    if (!deadline) {
        deadline = new Date().toISOString().slice(0, 16);
    }

    const todoItem = createTodoItem(title, deadline);
    document.getElementById('todo-list').appendChild(todoItem);

    document.getElementById('todo-title').value = '';
    document.getElementById('todo-deadline').value = '';

    saveTodos();
}

/**
 * 创建新的 Todo 项目元素
 * @param title Todo 项目的标题
 * @param deadline Todo 项目的截止日期
 * @returns 创建的 Todo 项目元素
 */
function createTodoItem(title, deadline) {
    const todoItem = document.createElement('div');
    todoItem.id = genId();
    todoItem.className = 'todo-item';
    todoItem.draggable = true;
    todoItem.ondragstart = dragStart;
    todoItem.ondragover = dragOver;
    todoItem.ondrop = drop;

    // 创建复选框，用于标记任务完成状态
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.onchange = () => {
        toggleComplete(todoItem);
        saveTodos();
    };
    todoItem.appendChild(checkbox);

    // 创建标题输入框
    const todoTitle = document.createElement('input');
    todoTitle.type = 'text';
    todoTitle.value = title;
    todoTitle.oninput = saveTodos;
    todoItem.appendChild(todoTitle);

    // 创建截止日期输入框
    if (deadline) {
        const todoDeadline = document.createElement('input');
        todoDeadline.type = 'datetime-local';
        todoDeadline.value = deadline;
        todoDeadline.oninput = saveTodos;
        todoItem.appendChild(todoDeadline);

        setReminder(deadline, title);
    }

    todoItem.appendChild(genActionsNode(checkbox, todoItem));

    // 创建子项输入框
    const subItemInput = document.createElement('input');
    subItemInput.type = 'text';
    subItemInput.placeholder = 'New Sub-item';
    subItemInput.onfocus = () => currentTarget = todoItem;
    todoItem.appendChild(subItemInput);

    // 创建添加子项按钮
    const addSubItemButton = document.createElement('button');
    addSubItemButton.textContent = 'Add Sub-item';
    addSubItemButton.onclick = () => {
        addSubItem(todoItem, subItemInput);
        saveTodos();
    };
    todoItem.appendChild(addSubItemButton);

    // 创建子项列表容器
    const subItemList = document.createElement('div');
    subItemList.ondragover = dragOver;
    subItemList.ondrop = drop;
    todoItem.appendChild(subItemList);

    return todoItem;
}

/**
 * 添加新的子项到 Todo 项目
 * @param todoItem 要添加子项的 Todo 项目
 * @param subItemInput 子项的输入框元素
 */
function addSubItem(todoItem, subItemInput) {
    const subItemText = subItemInput.value;
    if (subItemText.trim() === '') { return; }

    const subItem = document.createElement('div');
    subItem.id = genId();
    subItem.className = 'sub-item';
    subItem.draggable = true;
    subItem.ondragstart = dragStart;
    subItem.ondragover = dragOver;
    subItem.ondrop = drop;

    // 创建复选框，用于标记子项完成状态
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.onchange = () => {
        subItem.classList.toggle('completed');
        saveTodos();
    };
    subItem.appendChild(checkbox);

    // 创建子项标题输入框
    const subItemTitle = document.createElement('input');
    subItemTitle.type = 'text';
    subItemTitle.value = subItemText;
    subItemTitle.oninput = saveTodos;
    subItem.appendChild(subItemTitle);

    subItem.appendChild(genActionsNode(checkbox, subItem));

    todoItem.querySelector('div').appendChild(subItem);

    subItemInput.value = '';
}

/**
 * 添加附件到指定项
 * @param item 要添加附件的项
 * @param fileInput 文件输入框元素
 */
function addAttachment(item, fileInput, level, cb) {
    const file = fileInput.files[0];
    if (!file) { resolve(); }

    const reader = new FileReader();
    reader.onload = function (e) {
        let attachment;
        const filename = new Date().getTime() + (file.name.indexOf('.') > -1 ? file.name.substring(file.name.indexOf('.')) : '');
        if (file.type.startsWith('image/')) {
            attachment = document.createElement('img');
            attachment.className = 'img-level-'+level;
            attachment.id = filename;
            vscode.postMessage({ command: 'asWebviewUri', filename: filename });
        } else {
            attachment = document.createElement('div');
            attachment.textContent = filename;
            attachment.className = 'file-level-'+level;
            attachment.style.backgroundImage = 'url(placeholder.png)';
        }
        attachment.onclick = () => vscode.postMessage({ command: 'openFile', filename: filename, type: attachment.type });

        item.appendChild(attachment);

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => {
            attachment.remove();
            removeButton.remove();
            saveTodos();
        };
        item.appendChild(removeButton);
        vscode.postMessage({ command: 'saveFile', filename: filename, base64Data: e.target.result.split(',')[1] });
    };

    reader.readAsDataURL(file);
    cb();
}

/**
 * 切换项的完成状态
 * @param item 要切换状态的项
 */
function toggleComplete(item) {
    item.classList.toggle('completed');
}

/**
 * 删除 Todo 项目
 * @param todoItem 要删除的 Todo 项目
 */
function deleteTodoItem(todoItem) {
    todoItem.remove();
}

/**
 * 设置提醒
 * @param deadline 截止日期
 * @param title 标题
 */
function setReminder(deadline, title) {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const timeUntilDeadline = deadlineDate.getTime() - now.getTime();

    if (timeUntilDeadline > 0) {
        setTimeout(() => {
            alert(`Reminder: ${title} is due!`);
        }, timeUntilDeadline);
    }
}

/**
 * 处理拖动开始事件
 * @param event 拖动开始事件
 */
function dragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.id);
}

/**
 * 处理拖动经过事件
 * @param event 拖动经过事件
 */
function dragOver(event) {
    event.preventDefault();
}

/**
 * 处理放下事件
 * @param event 放下事件
 */
function drop(event) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text');
    const draggableElement = document.getElementById(id);
    const dropzone = event.target.closest('.todo-item, .sub-item');
    if (dropzone && dropzone !== draggableElement) {
        dropzone.parentNode.insertBefore(draggableElement, dropzone.nextSibling);
        saveTodos();
    }
}

/**
 * 保存当前的 Todo 列表状态
 */
function saveTodos() {
    // return;
    const todoList = document.getElementById('todo-list');
    const todos = [];
    console.log('todos::: ', todoList);
    todoList.childNodes.forEach(todoItem => {
        const todo = {
            title: todoItem.querySelector('input[type="text"]').value,
            deadline: todoItem.querySelector('input[type="datetime-local"]') ? todoItem.querySelector('input[type="datetime-local"]').value : '',
            completed: todoItem.classList.contains('completed'),
            subItems: [],
            attachments: []
        };
        todoItem.querySelectorAll('.sub-item').forEach(subItem => {
            const level2Todo = {
                title: subItem.querySelector('input[type="text"]').value,
                completed: subItem.classList.contains('completed'),
                attachments: []
            };
            
            console.log('todoItem.querySelectorAll(attachment)::: ', todoItem, todoItem.querySelectorAll('.img'));
            subItem.querySelectorAll('.img-level-2').forEach(attachment => {
                const filename = attachment.src.substring(attachment.src.lastIndexOf('/') + 1);
                level2Todo.attachments.push({
                    type: attachment.tagName.toLowerCase(),
                    content: filename
                });
            });
            subItem.querySelectorAll('.file-level-2').forEach(attachment => {
                level2Todo.attachments.push({
                    type: attachment.tagName.toLowerCase(),
                    content: attachment.textContent
                });
            });
            
            todo.subItems.push(level2Todo);
        });
        console.log('todoItem.querySelectorAll(attachment)::: ', todoItem, todoItem.querySelectorAll('.img'));
        todoItem.querySelectorAll('.img-level-1').forEach(attachment => {
            const filename = attachment.src.substring(attachment.src.lastIndexOf('/') + 1);
            todo.attachments.push({
                type: attachment.tagName.toLowerCase(),
                content: filename
            });
        });
        todoItem.querySelectorAll('.file-level-1').forEach(attachment => {
            todo.attachments.push({
                type: attachment.tagName.toLowerCase(),
                content: attachment.textContent
            });
        });
        console.log('todo::: ', todo);
        todos.push(todo);
    });
    vscode.postMessage({ command: 'saveTodo', text: JSON.stringify(todos) });
}

/**
 * 加载 Todo 项目
 * @param todos 要加载的 Todo 项目
 */
function loadTodos(todos) {
    console.log('loadTodos::: ',);
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    todos.forEach(todo => {
        const todoItem = createTodoItem(todo.title, todo.deadline);
        if (todo.completed) {
            todoItem.classList.add('completed');
            todoItem.querySelector('input[type="checkbox"]').checked = true;
        }
        todo.subItems.forEach(subItem => {
            const subItemElement = document.createElement('div');
            subItemElement.id = genId();
            console.log('subItem::: ', new Date().getTime());
            console.log('subItemElement.id::: ', subItemElement.id);

            subItemElement.className = 'sub-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.onchange = () => {
                subItemElement.classList.toggle('completed');
                saveTodos();
            };
            subItemElement.appendChild(checkbox);

            const subItemTitle = document.createElement('input');
            subItemTitle.type = 'text';
            subItemTitle.value = subItem.title;
            subItemTitle.oninput = saveTodos;
            subItemElement.appendChild(subItemTitle);

            if (subItem.completed) {
                subItemElement.classList.add('completed');
                checkbox.checked = true;
            }
            subItemElement.appendChild(genActionsNode(checkbox, subItemElement, 2));

            subItem.attachments.forEach(attachment => {
                genFileDivNode(subItemElement, attachment, 2);
            });

            todoItem.querySelector('div').appendChild(subItemElement);
        });
        todo.attachments.forEach(attachment => {
            genFileDivNode(todoItem, attachment, 1);
        });
        todoList.appendChild(todoItem);
    });
}


function genActionsNode(checkbox, subItem, level = 1) {
    // 创建操作按钮容器
    const actions = document.createElement('div');
    actions.className = 'actions';

    // 创建完成按钮
    const completeButton = document.createElement('button');
    completeButton.textContent = 'Complete';
    completeButton.onclick = () => {
        checkbox.checked = !checkbox.checked;
        subItem.classList.toggle('completed');
        saveTodos();
    };
    actions.appendChild(completeButton);

    // 创建删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
        subItem.remove();
        saveTodos();
    };
    actions.appendChild(deleteButton);

    // 创建文件输入框，用于添加附件
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = () => {
        addAttachment(subItem, fileInput, level, () => {
            setTimeout(() => {
                saveTodos();
            }, 10);
        });
    };
    actions.appendChild(fileInput);
    return actions;
}


function genFileDivNode(todoItem, attachment, level) {
    let attachmentElement;
    // console.log('attachment.type::: ', attachment);
    if (attachment.type === 'img') {
        attachmentElement = document.createElement('img');
        attachmentElement.className = 'img-level-'+level;
        attachmentElement.id = attachment.content;
        attachmentElement.src = attachment.content;
        vscode.postMessage({ command: 'asWebviewUri', filename: attachment.content });
    } else {
        attachmentElement = document.createElement('div');
        attachmentElement.className = 'file-level-'+level;
        attachmentElement.textContent = attachment.content;
        attachmentElement.style.backgroundImage = 'url(placeholder.png)';
    }
    attachmentElement.onclick = () => vscode.postMessage({ command: 'openFile', filename: attachment.content, type: attachment.type });
    todoItem.appendChild(attachmentElement);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.onclick = () => {
        attachmentElement.remove();
        removeButton.remove();
        saveTodos();
    };
    todoItem.appendChild(removeButton);
    return todoItem;
}

function genId() {
    return nanoid();
}