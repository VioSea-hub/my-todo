import { createApp } from 'vue';
import App from './App.vue';
import 'virtual:uno.css'; // 引入 UnoCSS 的样式
import '@/styles/style.css';

const app = createApp(App);
app.mount('#app');

document.addEventListener('contextmenu', function (event) {
  event.preventDefault();
});