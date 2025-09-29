import * as vscode from 'vscode';
/**
 * 保存数据到插件设置
 * @param {string} key - 设置项的键
 * @param {any} value - 设置项的值
 */
async function savePluginSettings(key: string, value: string) {
  // 获取插件的配置
  const config = vscode.workspace.getConfiguration('my-todo');
  // 更新配置项
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}
/**
 * 获取插件设置
 * @param {string} key - 设置项的键
 */
function getPluginSettings(key: string) {
  // 获取插件的配置
  const config = vscode.workspace.getConfiguration('my-todo');
  return config.get(key);
}

export {
  savePluginSettings,
  getPluginSettings
};