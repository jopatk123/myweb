// 内部应用注册表：slug -> 组件与元信息
// 后续新增应用时在此处注册

import { defineAsyncComponent } from 'vue';
import { BUILTIN_APP_DEFINITIONS } from '@shared/builtin-apps.js';
import AppLoadError from '../components/app/AppLoadError.vue';

/** 应用组件加载超时时间（ms） */
const APP_LOAD_TIMEOUT_MS = 15_000;

const appComponentLoaders = {
  calculator: () => import('./calculator/CalculatorApp.vue'),
  notebook: () => import('./notebook/NotebookApp.vue'),
  'work-timer': () => import('./work-timer/WorkTimerApp.vue'),
  'message-board': () =>
    import('../components/message-board/MessageBoardWindow.vue'),
};

/**
 * 将原始 loader 函数包装为带错误降级和超时的 AsyncComponent
 * @param {() => Promise<any>} loader
 */
function createSafeAsyncComponent(loader) {
  return defineAsyncComponent({
    loader,
    errorComponent: AppLoadError,
    timeout: APP_LOAD_TIMEOUT_MS,
    onError(error, retry, fail, attempts) {
      // 最多自动重试 1 次，之后直接显示错误组件
      if (attempts <= 1) {
        retry();
      } else {
        fail();
      }
    },
  });
}

export const internalApps = BUILTIN_APP_DEFINITIONS.map(app => {
  const loader = appComponentLoaders[app.slug];
  return {
    ...app,
    component: loader ? createSafeAsyncComponent(loader) : AppLoadError,
  };
});

export function getAppComponentBySlug(slug) {
  const app = internalApps.find(a => a.slug === slug);
  return app ? app.component : null;
}

export function getAppMetaBySlug(slug) {
  return internalApps.find(a => a.slug === slug) || null;
}
