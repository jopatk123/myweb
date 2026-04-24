/**
 * App.vue 单元测试
 * 覆盖：密码验证、本地认证缓存、路由渲染等核心逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import App from '@/App.vue';

// ── 全局 mock ──────────────────────────────────────────────────
vi.mock('@/utils/passwordGate.js', () => ({
  clearAuth: vi.fn(),
  saveAuth: vi.fn(),
  validatePasswordRemote: vi.fn(),
  getPasswordStatus: vi.fn(),
}));

vi.mock('@/api/httpClient.js', () => ({
  buildApiUrl: vi.fn(p => `/api/${p}`),
  getApiBase: vi.fn(() => '/api'),
}));

import {
  clearAuth,
  saveAuth,
  validatePasswordRemote,
  getPasswordStatus,
} from '@/utils/passwordGate.js';

// ── 辅助函数 ──────────────────────────────────────────────────
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<div data-testid="home">Home</div>' },
      },
    ],
  });
}

// ── 测试套件 ──────────────────────────────────────────────────
describe('App.vue — 密码验证门控', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('服务端已认证时直接显示路由视图，不显示验证界面', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: true,
    });

    const { queryByRole, findByTestId } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    await findByTestId('home');
    expect(queryByRole('form')).toBeNull();
    expect(saveAuth).toHaveBeenCalledTimes(1);
  });

  it('未认证且后端需要密码时，显示密码表单', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: false,
    });

    const { findByPlaceholderText, findByText } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    await findByPlaceholderText('访问密码');
    await findByText('访问验证');
  });

  it('后端不需要密码时，自动保存认证并显示路由视图', async () => {
    getPasswordStatus.mockResolvedValue({
      required: false,
      configured: false,
      authenticated: false,
    });

    const { findByTestId } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    await findByTestId('home');
    expect(saveAuth).toHaveBeenCalledTimes(1);
  });

  it('密码正确时认证成功，关闭验证界面并进入页面', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: false,
    });
    validatePasswordRemote.mockResolvedValue(true);

    const { findByPlaceholderText, getByRole, findByTestId } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    const input = await findByPlaceholderText('访问密码');
    await fireEvent.update(input, 'correct-password');
    await fireEvent.submit(
      getByRole('button', { name: '进入' }).closest('form')
    );

    await waitFor(() =>
      expect(validatePasswordRemote).toHaveBeenCalledWith('correct-password')
    );
    await waitFor(() => expect(saveAuth).toHaveBeenCalledTimes(1));
    await findByTestId('home');
  });

  it('密码错误时显示错误消息', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: false,
    });
    validatePasswordRemote.mockResolvedValue(false);

    const { findByPlaceholderText, getByRole, findByText } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    const input = await findByPlaceholderText('访问密码');
    await fireEvent.update(input, 'wrong-password');
    await fireEvent.click(getByRole('button', { name: '进入' }));

    await findByText('密码错误，请重试。');
    expect(saveAuth).not.toHaveBeenCalled();
  });

  it('验证服务异常时显示服务错误提示', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: false,
    });
    validatePasswordRemote.mockRejectedValue(new Error('Network error'));

    const { findByPlaceholderText, getByRole, findByText } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    const input = await findByPlaceholderText('访问密码');
    await fireEvent.update(input, 'some-password');
    await fireEvent.click(getByRole('button', { name: '进入' }));

    await findByText('验证服务异常，请稍后重试。');
  });

  it('提交时按钮禁用，防止重复提交', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: false,
    });
    // 返回一个永远 pending 的 promise，模拟提交中状态
    validatePasswordRemote.mockImplementation(() => new Promise(() => {}));

    const { findByPlaceholderText, getByRole } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    const input = await findByPlaceholderText('访问密码');
    await fireEvent.update(input, 'test');
    const btn = getByRole('button', { name: '进入' });
    await fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
  });

  it('无输入时提交按钮禁用', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: false,
    });

    const { findByRole } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    const btn = await findByRole('button', { name: '进入' });
    expect(btn).toBeDisabled();
  });

  it('后端未配置密码时显示配置错误并禁用提交', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: false,
      authenticated: false,
    });

    const { findByText, getByRole } = render(App, {
      global: { plugins: [makeRouter()] },
    });

    await findByText('系统尚未配置访问密码，请联系管理员。');
    expect(getByRole('button', { name: '进入' })).toBeDisabled();
  });

  it('服务端未认证时会清理本地缓存标记', async () => {
    getPasswordStatus.mockResolvedValue({
      required: true,
      configured: true,
      authenticated: false,
    });

    render(App, {
      global: { plugins: [makeRouter()] },
    });

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalledTimes(1);
    });
  });
});
