import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/wallpapers',
    name: 'WallpaperManagement',
    component: () => import('@/views/WallpaperManagement.vue'),
  },
  {
    path: '/apps',
    name: 'AppManagement',
    component: () => import('@/views/AppManagement.vue'),
  },
  {
    path: '/files',
    name: 'FileManagement',
    component: () => import('@/views/FileManagement.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
