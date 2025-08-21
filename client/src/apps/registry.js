// 内部应用注册表：slug -> 组件与元信息
// 后续新增应用时在此处注册

import { defineAsyncComponent } from 'vue';

export const internalApps = [
  {
    slug: 'snake',
    name: '贪吃蛇',
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(() => import('./snake/SnakeApp.vue'))
  },
  {
    slug: 'calculator',
    name: '计算器',
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(() => import('./calculator/CalculatorApp.vue'))
  }
];

export function getAppComponentBySlug(slug) {
  const app = internalApps.find(a => a.slug === slug);
  return app ? app.component : null;
}

export function getAppMetaBySlug(slug) {
  return internalApps.find(a => a.slug === slug) || null;
}


