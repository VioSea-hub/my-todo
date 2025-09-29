import { defineConfig, presetAttributify, presetUno, presetIcons } from 'unocss';
import presetRemToPx from '@unocss/preset-rem-to-px'; 

export default defineConfig({
  exclude: ['node_modules', '.git', '.github', '.husky', '.vscode', 'build', 'dist', 'mock', 'public', './stats.html'],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({ scale: 1, warn: true }),
    presetRemToPx({ baseFontSize: 4 })
  ],
  shortcuts: [
    ['wh-full', 'w-full h-full'],
    ['f-c-c', 'flex justify-center items-center'],
    ['flex-col', 'flex flex-col'],
    ['text-ellipsis', 'truncate'],
  ],
  rules: [
  ],
  safelist: [
    'i-codicon:folder',
    'i-codicon:refresh',
    'i-codicon:add',
    'i-codicon:book',
    'i-codicon:trash',
    'i-codicon:chevron-down',
    'i-codicon:chevron-right',
    'i-codicon:close',
    'i-codicon:info',
    'i-codicon:attach',
    'i-codicon:search'
  ],
});
