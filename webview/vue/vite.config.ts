import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import UnoCSS from 'unocss/vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS()
  ],
  define: {
    'process.env': process.env,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
 
  },
  build: {
    rollupOptions: {
      input: {
        editor: path.resolve(__dirname, 'src/pages/editor/index.html'),
        sidebar: path.resolve(__dirname, 'src/pages/sidebar/index.html')
      },
      output: {
        entryFileNames: ({ name }) => {
          if (name === 'editor') {
            return 'src/pages/editor/main.js';
          } else if (name === 'sidebar') {
            return 'src/pages/sidebar/main.js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/global.js',
        assetFileNames: 'assets/[name].[ext]',
      },
      plugins: [
        {
          name: 'inspect-icons',
          generateBundle(_, bundle) {
            console.log('Icons used in the project:', Object.keys(bundle).filter((fileName) => fileName.includes('icon-')));
          },
        },
      ],
    },
    outDir: 'dist',
  },
});