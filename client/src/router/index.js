import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import WallpaperManagement from '@/views/WallpaperManagement.vue';
import AppManagement from '@/views/AppManagement.vue';
import FileManagement from '@/views/FileManagement.vue';
import GomokuTest from '@/views/GomokuTest.vue';
import AILogsView from '@/views/AILogsView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/wallpapers',
    name: 'WallpaperManagement',
    component: WallpaperManagement,
  },
  {
    path: '/myapps',
    name: 'AppManagement',
    component: AppManagement,
  },
  {
    path: '/files',
    name: 'FileManagement',
    component: FileManagement,
  },
  {
    path: '/gomoku-test',
    name: 'GomokuTest',
    component: GomokuTest,
  },
  {
    path: '/ai-logs',
    name: 'AILogs',
    component: AILogsView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
