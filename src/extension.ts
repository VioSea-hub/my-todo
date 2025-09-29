import * as vscode from 'vscode';
import { SidebarViewProvider  } from './SidebarViewProvider';
import { TodoEditorProvider } from './TodoEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	// 注册侧边栏提供者
  const sidebarProvider = new SidebarViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewType, sidebarProvider)
  );

  // 注册自定义编辑器提供者
  const todoEditorProvider = new TodoEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      TodoEditorProvider.viewType,
      todoEditorProvider,
      {
        webviewOptions: {
          // 在 Webview 隐藏时保留上下文
          retainContextWhenHidden: true,
        },
        // 支持每个文档的多个编辑器
        supportsMultipleEditorsPerDocument: true,
      }
    )
  );
}
export function deactivate() {}
