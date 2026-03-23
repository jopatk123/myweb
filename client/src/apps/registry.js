// 内部应用注册表：slug -> 组件与元信息
// 后续新增应用时在此处注册

import { defineAsyncComponent } from 'vue';
import { BUILTIN_APP_DEFINITIONS } from '@shared/builtin-apps.js';

const appComponentLoaders = {
  calculator: () => import('./calculator/CalculatorApp.vue'),
  notebook: () => import('./notebook/NotebookApp.vue'),
  'work-timer': () => import('./work-timer/WorkTimerApp.vue'),
  'message-board': () =>
    import('../components/message-board/MessageBoardWindow.vue'),
};

export const internalApps = BUILTIN_APP_DEFINITIONS.map(app => ({
  ...app,
  component: defineAsyncComponent(appComponentLoaders[app.slug]),
}));

export function getAppComponentBySlug(slug) {
  const app = internalApps.find(a => a.slug === slug);
  return app ? app.component : null;
}

export function getAppMetaBySlug(slug) {
  return internalApps.find(a => a.slug === slug) || null;
}
