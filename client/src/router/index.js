import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import WallpaperManagement from '@/views/WallpaperManagement.vue';
import AppManagement from '@/views/AppManagement.vue';

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
  ,
  {
    path: '/apps',
    name: 'AppManagement',
    component: AppManagement
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;