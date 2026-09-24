import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import {
  internalApps,
  getAppComponentBySlug,
  getAppMetaBySlug,
} from '@/apps/registry.js';
import { BUILTIN_APP_DEFINITIONS } from '@shared/builtin-apps.js';

// 让 calculator 的动态加载失败，用于验证 registry 的降级渲染路径
vi.mock('@/apps/calculator/CalculatorApp.vue', () => {
  throw new Error('模拟加载失败');
});

describe('builtin app registry', () => {
  it('keeps registry metadata aligned with shared builtin definitions', () => {
    expect(internalApps.map(app => app.slug)).toEqual(
      BUILTIN_APP_DEFINITIONS.map(app => app.slug)
    );

    for (const builtin of BUILTIN_APP_DEFINITIONS) {
      expect(getAppComponentBySlug(builtin.slug)).toBeTruthy();
      expect(getAppMetaBySlug(builtin.slug)).toMatchObject({
        slug: builtin.slug,
        name: builtin.name,
        preferredSize: builtin.preferredSize,
      });
    }
  });

  it('returns null for unknown slugs or missing input', () => {
    expect(getAppComponentBySlug('not-registered')).toBeNull();
    expect(getAppComponentBySlug(null)).toBeNull();
    expect(getAppMetaBySlug('not-registered')).toBeNull();
    expect(getAppMetaBySlug(undefined)).toBeNull();
  });

  it('carries builtin metadata (description/icon/visibility) onto internal apps', () => {
    for (const builtin of BUILTIN_APP_DEFINITIONS) {
      const entry = getAppMetaBySlug(builtin.slug);
      expect(entry).toEqual(expect.objectContaining(builtin));
      expect(entry).toHaveProperty('component');
    }
  });

  it('renders the error fallback component when an async app fails to load', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const AsyncComp = getAppComponentBySlug('calculator');
    expect(AsyncComp).toBeTruthy();

    // 异步组件加载失败时其内部实例不会就绪，需用宿主组件包裹挂载
    const Host = defineComponent({
      setup() {
        return () => h(AsyncComp);
      },
    });
    const wrapper = mount(Host);
    for (let i = 0; i < 8; i += 1) {
      await flushPromises();
    }

    expect(wrapper.find('.app-load-error__text').text()).toBe('应用加载失败');
    expect(wrapper.find('.app-load-error__icon').text()).toBe('⚠');

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
