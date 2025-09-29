import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { LastOpenTodo, PositionArr, SaveFileInfo, WarningMessage } from './types/editor';
import { getPluginSettings, savePluginSettings } from './utils'

export class TodoEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'my-todo.todoEditor';
  public fileFolderPath = "";
  public webview: vscode.Webview | undefined;

  constructor(private readonly context: vscode.ExtensionContext) { }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const saveFolder = vscode.workspace.getConfiguration('my-todo').get<string>('saveFolder') || null;
    // console.log('saveFolder::: ', saveFolder);
    if (!saveFolder) {
      vscode.window.showErrorMessage('请配置保存文件夹');
      return;
    }
    const saveFolderUri = vscode.Uri.file(saveFolder);
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, saveFolderUri]
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    // 获取文件所在的文件夹路径
    this.fileFolderPath = path.dirname(document.uri.fsPath);
    this.webview = webviewPanel.webview;

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'loadTodoList':
          webviewPanel.webview.postMessage({
            type: 'loadTodoList',
            text: document.getText(),
            isInit: message.isInit,
          });
          return;
        case 'getOpenLastOpenTodo':
          const openLastOpenTodo = vscode.workspace.getConfiguration('my-todo').get<boolean>('openLastOpenTodo') || false;
          if (openLastOpenTodo) {
            const positionArr: PositionArr | undefined = this.context.globalState.get('LastOpenTodo');
            if (positionArr !== undefined && positionArr !== null) {
              webviewPanel.webview.postMessage({
                type: 'openTodo',
                value: positionArr || null,
              });
              return;
            }
          }
          webviewPanel.webview.postMessage({type: 'noOpenLastOpenTodo',});
          return;
        case 'getDelayedSaveTime':
          const delayedSaveTime = vscode.workspace.getConfiguration('my-todo').get<number>('delayedSaveTime') || 100;
          webviewPanel.webview.postMessage({
            type: 'getDelayedSaveTime',
            value: delayedSaveTime,
          });
          return;
        case 'saveTodoList':
          await this.updateDocument(document, message.text);
          return;

        case 'showMessage':
          vscode.window.showInformationMessage(message.text);
          return;
        case 'showWarningMessage':
          const messageData:WarningMessage = {
            message: message.message,
            data: message.data,
          };
          console.log('showWarningMessage::: ', messageData);
          // vscode.window.showInformationMessage(message.text);
          const confirm = await vscode.window.showWarningMessage(
            messageData.message,
            { modal: true },
            '是'
          );
          if (confirm === '是') {
            webviewPanel.webview.postMessage({
              type: 'showWarningMessageYes',
              data: messageData.data,
            });
          }
          return;
        case 'showInformationMessage':
          vscode.window.showInformationMessage(message.message);
          return;

        case 'saveFile':
          await this.saveFile(webviewPanel.webview, message);
          return;
        case 'openFile':
          await this.openFile(document.uri, message.content);
          return;
        case 'delFile':
          await this.delFile(document.uri, message.filename);
          return;
        case 'updateGlobalState':
          this.updateGlobalState(message.value);
          return;
        case 'getGlobalState':
          this.getGlobalState(webviewPanel.webview, message);
          return;
        case 'saveTodoDetailPanelWidth':
          savePluginSettings('todoDetailPanelWidth', message.value);
          return;
        case 'getTodoDetailPanelWidth':
          webviewPanel.webview.postMessage({ type: 'getTodoDetailPanelWidth', value: getPluginSettings('todoDetailPanelWidth') });
          return;

        case 'asWebviewUri':
          const uri = vscode.Uri.file((this.fileFolderPath + '\\file\\' + message.filename).replace(/\//g, '\\'));
          webviewPanel.webview.postMessage({
            type: 'getWebviewUri',
            positionArr: message.positionArr,
            filename: message.filename,
            webviewUrl: webviewPanel.webview.asWebviewUri(uri).toString(),
          });
          return;
        /*case 'saveFile':
          await this.saveFile(document.uri, message.filename, message.base64Data);
          return;*/
      }
    });

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        webviewPanel.webview.postMessage({
          type: 'loadTodoList',
          text: document.getText(),
        });
      }
    });

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('my-todo.todoDetailPanelWidth')) {
        webviewPanel.webview.postMessage({ type: 'getTodoDetailPanelWidth', value: getPluginSettings('todoDetailPanelWidth') });
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview/vue/dist/src/pages/editor', 'main.js')
    );

    const globalJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview/vue/dist/assets', 'global.js')
    );

    const globalCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview/vue/dist/assets', 'style.css')
    );

    const myCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview/vue/dist/assets', 'editor.css')
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
        <link rel="stylesheet" crossorigin href="${myCssUri}">
      </head>
      <body>
        <div id="app"></div>
        <script>
          // const vscode = acquireVsCodeApi();
          // console.log('vscode', vscode);
        </script>

      </body>
      </html>`;
  }

  /**
   * 更新文档内容并保存
   * @param document 要更新的文档对象
   * @param text 要保存的新文本
   */
  private async updateDocument(document: vscode.TextDocument, text: string) {
    // console.log('text::: ', text);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);
    await vscode.workspace.applyEdit(edit);
    await document.save();
  }

  /**
   * 保存文件到指定目录
   * @param documentUri 文档 URI
   * @param filename 文件名
   * @param base64Data base64 编码的文件数据
   */
  private async saveFile(webview: vscode.Webview, message: any) {
    try {
      const data: {
        saveFileInfo: SaveFileInfo
        base64Data: string
      } = {
        saveFileInfo: {
          saveToPositionArr: message.saveToPositionArr,
          filename: message.filename
        },
        base64Data: message.base64Data
      };

      const imageBuffer = Buffer.from(data.base64Data, 'base64');
      const imagesFolder = path.join(this.fileFolderPath, 'file');
      await fs.promises.mkdir(imagesFolder, { recursive: true });

      // 保存图片文件
      // const fullFilename = `${data.saveFileInfo.filename}.png`;
      const filePath = path.join(imagesFolder, data.saveFileInfo.filename);
      fs.writeFileSync(filePath, imageBuffer);
      // vscode.window.showInformationMessage(`Image saved to ${filePath}`);
      // 通知 webview 图片保存路径
      webview.postMessage({ type: 'saveFileSuccess', ...data.saveFileInfo });
    } catch (error) {
      vscode.window.showErrorMessage(`无法上传文件: ${(error as Error).message}`);
    }
  }

  /**
   * 打开文件
   * @param documentUri 文档 URI
   * @param filename 文件名
   */
  private async openFile(documentUri: vscode.Uri, filename: string) {
    const fileTypes = vscode.workspace.getConfiguration('my-todo').get<string[]>('vscodeOpenFileType') || [];
    const dirPath = path.join(path.dirname(documentUri.fsPath), 'file');
    const filePath = path.join(dirPath, filename);
    const type = path.extname(filePath).slice(1).toLowerCase();
    if (fileTypes.includes(type)) {
      const uri = vscode.Uri.file(filePath);
      await vscode.commands.executeCommand('vscode.open', uri);
    } else {
      exec(`explorer /select,"${filePath.replace(/\//g, '\\')}"`, (err) => {
        // 错误无效已经打开还是会报错
        /*if (err) {
          console.log('error::: ', err);
          vscode.window.showErrorMessage(`无法打开目录: ${filePath}`);
        }*/
      });
    }
  }

  /**
   * 删除文件
   * @param documentUri 文档 URI
   * @param filename 文件名
   */
  private async delFile(documentUri: vscode.Uri, filename: string) {
    const dirPath = path.join(path.dirname(documentUri.fsPath), 'file');
    const filePath = path.join(dirPath, filename);

    fs.unlink(filePath, (err) => {
      if (err) {
        vscode.window.showErrorMessage(`删除 ${filename} 失败 ${err.message}`);
      } else {
        // vscode.window.showInformationMessage(`File deleted: ${filePath}`);
      }
    });
  }

  /**
   * 更新全局状态
   * @param message 消息对象
   */
  private updateGlobalState({ key, value }: { key: string; value: any }) {
    this.context.globalState.update(key, value);
  }
  /**
   * 获取全局状态
   * @param webview webview 对象
   * @param message 消息对象
   * */
  private getGlobalState(webview: vscode.Webview, message: any) {
    const { key } = message;
    const value = this.context.globalState.get(key);
    console.log('value::: ', value);
    webview.postMessage({ type: 'getGlobalState', value: { key, value } });
  }
}