import { createApp } from 'vue';
import App from './App.vue';
import 'virtual:uno.css'; // 引入 UnoCSS 的样式
import '@/styles/editor.css';
import '@/styles/style.css';
import { createPinia } from 'pinia';

const app = createApp(App);
const pinia = createPinia()
app.use(pinia)

app.mount('#app');

document.addEventListener('contextmenu', function (event) {
  event.preventDefault();
});