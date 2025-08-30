import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import '@/styles/admin.css';
import '@/styles/gomoku-shared.css';

const app = createApp(App);

app.use(router);

app.mount('#app');
