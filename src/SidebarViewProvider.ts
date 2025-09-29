import * as vscode from 'vscode';
import * as fs from 'fs';
import type { Project } from './types/sidebar.d.ts';
import path from 'path';

enum ErrorType {
  NO_SAVEFOLDER, // 无保存文件夹
  NO_PROJECT, // 无项目
}

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'my-todo.sidebar';
  public static readonly editorViewId = 'my-todo.todoEditor';
  public webview: vscode.Webview | null = null;
  public currentOpenProjectName: string | null = null;
  public defaultProjectName: string | null = null;
  public projectList: Project[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    // 注意事项： 如果修改了保存文件夹，但是还是有打开了其他目录的任务，并且新增了附件保存的文件会存在路径问题
    vscode.commands.registerCommand('my-todo.saveFolder', async () => {
      if (this.webview) {
        const saveFolder = vscode.workspace.getConfiguration('my-todo').get<string>('saveFolder') || null;

        const buttonItem: vscode.QuickInputButton = { iconPath: new vscode.ThemeIcon('file-directory'), tooltip: '选择保存文件夹' };
        const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
        quickPick.buttons = [buttonItem];
        quickPick.value = saveFolder || '';
        quickPick.placeholder = '输入文件路径或点击选择文件夹按钮选择文件夹';

        let _this = this;
        async function uploadSaveFolder() {
          await saveToPluginSettings('saveFolder', quickPick.value);
          await saveToPluginSettings('defaultOpenProject', '');
          await vscode.commands.executeCommand("my-todo.refreshProject");

          // 设置第一项为默认项目
          if (_this.projectList.length > 0) {
            await _this.setDefaultOpenProject(_this.projectList[0].name);
            _this.getDefaultOpenProject((_this.webview as vscode.Webview));
          }
          if (_this.defaultProjectName) {
            _this.openProject((_this.webview as vscode.Webview), _this.defaultProjectName, SidebarViewProvider.editorViewId);
            return;
          }
        }
        // 关闭所有后缀是.todo的编辑器
        async function closeEditorsByType() {
          // 获取所有打开的编辑器
          const editors = vscode.window.tabGroups.all;
          console.log('editors::: ', editors);
          /*for (const editor of editors) {
            if (editor.document.uri.fsPath.endsWith('.todo')) {
              await vscode.window.showTextDocument(editor.document, editor.viewColumn);
              await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
          }*/
        }
        quickPick.onDidTriggerButton(async (button) => {
          if (button === buttonItem) {
            const folderUri = await vscode.window.showOpenDialog({
              defaultUri: saveFolder ? vscode.Uri.file(saveFolder) : undefined,
              canSelectFolders: true,
              canSelectFiles: false,
              canSelectMany: false,
              openLabel: '选择文件夹'
            });

            if (folderUri && folderUri[0]) {
              quickPick.value = folderUri[0].fsPath;
              // 关闭掉现在已经打开的任务窗口
              await closeEditorsByType();
              await uploadSaveFolder();
              return;
            }
            quickPick.show();
          }
        });

        quickPick.onDidAccept(async () => {
          await uploadSaveFolder();
          quickPick.hide();
        });

        quickPick.show();
      }
    });
    vscode.commands.registerCommand('my-todo.refreshProject', async () => {
      if (this.webview) {
        await this.getProjectList(this.webview);
        this.getDefaultOpenProject(this.webview);
      }
    });
    vscode.commands.registerCommand('my-todo.addProject', async () => {
      if (!this.webview) {
        vscode.window.showErrorMessage('vscode webview 未初始化');
        return new Error('vscode webview 未初始化');
      }
      this.addProject(this.webview);
    });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.webview = webviewView.webview;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'getProjectList':
          this.getProjectList(webviewView.webview);
          return;
        case 'getDefaultOpenProject':
          this.getDefaultOpenProject(webviewView.webview);
          return;
        case 'setDefaultOpenProject':
          this.setDefaultOpenProject(message.name);
          return;
        case 'alert':
          vscode.window.showInformationMessage(message.text);
          return;
        case 'openProject':
          this.openProject(webviewView.webview, message.name, SidebarViewProvider.editorViewId);
          return;
        case 'delProject':
          this.delProject(webviewView.webview, message.name);
          return;
        case 'selectSaveFolder':
          selectFolder().then(folderPath => {
            if (folderPath) {
              if (folderPath) { saveToPluginSettings('saveFolder', folderPath); }
            } else {
              console.log('No folder selected');
            }
          });
          return;
      }
    });
  }
  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview/vue/dist/src/pages/sidebar', 'main.js')
    );

    const globalJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview/vue/dist/assets', 'global.js')
    );

    const globalCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview/vue/dist/assets', 'style.css')
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vue Webview</title>
        <script type="module" crossorigin src="${scriptUri}"></script>
        <link rel="modulepreload" crossorigin href="${globalJsUri}">
        <link rel="stylesheet" crossorigin href="${globalCssUri}">
      </head>
      <body style="padding: 0">
        <div id="app"></div>
        <script>
          // const vscode = acquireVsCodeApi();
        </script>

      </body>
      </html>`;
  }

  async addProject(webview: vscode.Webview) {
    try {
      const saveFolder = vscode.workspace.getConfiguration('my-todo').get<string>('saveFolder') || null;
      if (!saveFolder) {
        vscode.window.showErrorMessage('请先选择保存位置');
        return;
      }
      const projectName = await vscode.window.showInputBox({
        placeHolder: '新的待办项目名称',
        prompt: '请输入新的待办项目名称，注意名称不可重复'
      });

      if (projectName !== undefined) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          const newFolderPath = path.join(saveFolder, projectName);
          const newFilePath = path.join(newFolderPath, 'index.todo');
          fs.mkdir(newFolderPath, { recursive: true }, (err) => {
            if (err) {
              vscode.window.showErrorMessage(`添加失败: ${err.message}`);
            } else {
              fs.writeFile(newFilePath, '', async (err) => {
                if (err) {
                  vscode.window.showErrorMessage(`初始化项目失败: ${err.message}`);
                } else {
                  vscode.window.showInformationMessage(`添加成功!`);
                  const defaultOpenProject = vscode.workspace.getConfiguration('my-todo').get<string>('defaultOpenProject') || null;
                  if (defaultOpenProject === null) {
                    await this.setDefaultOpenProject(projectName);
                    this.getDefaultOpenProject(webview);
                  }
                  this.openProject(webview, projectName, SidebarViewProvider.editorViewId);
                  this.getProjectList(webview);
                }
              });
            }
          });
        } else {
          vscode.window.showErrorMessage('No workspace folder is open.');
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`添加失败: ${error}`);
    }
  }

  async getProjectList(webview: vscode.Webview) {
    const saveFolder = vscode.workspace.getConfiguration('my-todo').get<string>('saveFolder') || null;
    if (!saveFolder) {
      webview.postMessage({ command: 'getProjectList', error: ErrorType.NO_SAVEFOLDER });
      return Promise.resolve([]);
    }
    const directories = await getDirectories(saveFolder);
    let list: Project[] = [];
    if (directories) {
      list = directories.map(item => {
        return { name: item } as Project;
      });
      this.projectList = list;
      webview.postMessage({ command: 'getProjectList', value: list });
    }
    return Promise.resolve(list);;
  }

  async getDefaultOpenProject(webview: vscode.Webview) {
    const defaultOpenProject = vscode.workspace.getConfiguration('my-todo').get<string>('defaultOpenProject') || null;
    webview.postMessage({ command: 'getDefaultOpenProject', value: defaultOpenProject });
  }
  async setDefaultOpenProject(projectName: string) {
    this.defaultProjectName = projectName;
    await saveToPluginSettings('defaultOpenProject', projectName);
    return Promise.resolve();
  }

  async openProject(webview: vscode.Webview, projectName: string, viewId = 'default') {
    const saveFolder = vscode.workspace.getConfiguration('my-todo').get<string>('saveFolder') || null;
    if (!saveFolder) {
      vscode.window.showErrorMessage('请先选择保存位置');
      return;
    }

    const filePath = `${saveFolder}\\${projectName}\\index.todo`;
    if (filePath) {
      const fileUri = vscode.Uri.file(filePath);
      try {
        await vscode.commands.executeCommand('vscode.openWith', fileUri, viewId);
        this.currentOpenProjectName = projectName;
        webview.postMessage({ command: 'getCurrentOpenProject', value: projectName });

      } catch (error) {
        vscode.window.showErrorMessage(`错误无法打开文件: ${(error as Error).message}`);
      }
    }
  }
  async delProject(webview: vscode.Webview, projectName: string) {
    const saveFolder = vscode.workspace.getConfiguration('my-todo').get<string>('saveFolder') || null;
    if (!saveFolder) {
      vscode.window.showErrorMessage('请先选择保存位置');
      return;
    }
    const filePath = `${saveFolder}\\${projectName}`;
    if (filePath) {
      vscode.window.showInformationMessage(`确定删除项目${projectName}吗？`, '确定', '取消').then((result) => {
        if (result === '确定') {
          fs.rm(filePath, { recursive: true }, (err) => {
            if (err) {
              vscode.window.showErrorMessage(`删除失败: ${err.message}`);
            } else {
              vscode.window.showInformationMessage(`删除成功！`);
              vscode.commands.executeCommand('my-todo.refreshProject');
              // 当前打开的文件被删除就打开默认的，如果默认的不存在就打开第一个
              if (this.defaultProjectName === projectName) {
                this.setDefaultOpenProject("");
                if (this.projectList.length > 0) {
                  this.setDefaultOpenProject(this.projectList[0].name);
                  webview.postMessage({ command: 'getDefaultOpenProject', value: this.projectList[0].name });
                }
              }
              if (this.currentOpenProjectName === projectName) {
                if (this.defaultProjectName) {
                  this.openProject(webview, this.defaultProjectName, SidebarViewProvider.editorViewId);
                  return;
                }
              }
            }
          });
        }
      });
    }
  }
}

/**
 * 保存数据到插件设置
 * @param {string} key - 设置项的键
 * @param {any} value - 设置项的值
 */
async function saveToPluginSettings(key: string, value: string) {
  // 获取插件的配置
  const config = vscode.workspace.getConfiguration('my-todo');
  // 更新配置项
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

/**
 * 选择文件夹并返回文件夹路径
 * @returns {Promise<string>} - 返回包含所选文件夹路径的 Promise
 */
async function selectFolder() {
  // 打开文件夹选择对话框
  const folderUri = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: '选择文件夹'
  });

  if (folderUri && folderUri.length > 0) {
    // 返回所选文件夹的路径
    return folderUri[0].fsPath;
  } else {
    // 如果没有选择文件夹，返回空字符串
    return '';
  }
}


/**
 * 读取指定目录下的所有文件夹
 * @param {string} dirPath - 目标目录路径
 * @returns {Promise<string[]>} - 返回一个包含所有文件夹名称的 Promise
 */
async function getDirectories(dirPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.access(dirPath, fs.constants.F_OK, (err) => {
      if (err) {
        return reject('找不到数据存放文件夹，请确认路径是否正确？');
      }
      fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) {
          return reject(err);
        }

        const directories = files
          .filter(file => file.isDirectory())
          .map(file => file.name);
        resolve(directories);
      });
    });

  });
}

