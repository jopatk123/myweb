// 内部应用注册表：slug -> 组件与元信息
// 后续新增应用时在此处注册

import { defineAsyncComponent } from 'vue';

export const internalApps = [
  {
    slug: 'snake',
    name: '贪吃蛇',
    // 推荐窗口尺寸（宽 x 高），可被窗口管理器用于初始大小
    preferredSize: { width: 850, height: 1200 },
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(() => import('./snake/SnakeApp.vue')),
  },
  {
    slug: 'calculator',
    name: '计算器',
    preferredSize: { width: 450, height: 670 },
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(
      () => import('./calculator/CalculatorApp.vue')
    ),
  },
  {
    slug: 'notebook',
    name: '笔记本',
    preferredSize: { width: 500, height: 800 },
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(() => import('./notebook/NotebookApp.vue')),
  },
  {
    slug: 'work-timer',
    name: '下班计时器',
    preferredSize: { width: 400, height: 700 },
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(
      () => import('./work-timer/WorkTimerApp.vue')
    ),
  },
  {
    slug: 'novel-reader',
    name: '小说阅读器',
    preferredSize: { width: 900, height: 700 },
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(
      () => import('./novel-reader/NovelReaderApp.vue')
    ),
  },
  {
    slug: 'gomoku',
    name: '五子棋',
    preferredSize: { width: 600, height: 800 },
    // 异步加载，避免初次加载体积增长
    component: defineAsyncComponent(() => import('./gomoku/GomokuApp.vue')),
  },
];

export function getAppComponentBySlug(slug) {
  const app = internalApps.find(a => a.slug === slug);
  return app ? app.component : null;
}

export function getAppMetaBySlug(slug) {
  return internalApps.find(a => a.slug === slug) || null;
}
