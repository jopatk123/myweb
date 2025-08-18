import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import WallpaperManagement from '@/views/WallpaperManagement.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/wallpapers',
    name: 'WallpaperManagement',
    component: WallpaperManagement
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;