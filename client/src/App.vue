<template>
  <div id="app">
    <div v-if="!isAuthorized" class="password-gate">
      <div class="password-gate__card">
        <div class="password-gate__header">
          <h1>访问验证</h1>
          <p>请输入访问密码以进入页面</p>
        </div>
        <form class="password-gate__form" @submit.prevent="handleSubmit">
          <input
            v-model.trim="passwordInput"
            type="password"
            autocomplete="current-password"
            placeholder="访问密码"
          />
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!passwordInput"
          >
            进入
          </button>
        </form>
        <p v-if="errorMessage" class="password-gate__error">
          {{ errorMessage }}
        </p>
        <p class="password-gate__hint">验证通过后本地有效期 30 天</p>
      </div>
    </div>
    <router-view v-else />
  </div>
</template>

<script setup>
  import { onMounted, ref } from 'vue';
  import { DEFAULT_APP_PASSWORD } from '@/constants/auth.js';
  import {
    isAuthValid,
    saveAuth,
    validatePassword,
  } from '@/utils/passwordGate.js';

  const isAuthorized = ref(false);
  const passwordInput = ref('');
  const errorMessage = ref('');

  function refreshAuthState() {
    isAuthorized.value = isAuthValid();
  }

  function handleSubmit() {
    if (!validatePassword(passwordInput.value, DEFAULT_APP_PASSWORD)) {
      errorMessage.value = '密码错误，请重试。';
      return;
    }
    saveAuth();
    errorMessage.value = '';
    passwordInput.value = '';
    isAuthorized.value = true;
  }

  onMounted(() => {
    refreshAuthState();
  });
</script>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
      Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f5f5f5;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  #app {
    min-height: 100vh;
    width: 100%;
  }

  .password-gate {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at top, #f5f7ff, #e6ecf6 60%, #dde5f3);
    padding: 24px;
  }

  .password-gate__card {
    width: min(420px, 100%);
    background: #fff;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .password-gate__header h1 {
    font-size: 22px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 6px;
  }

  .password-gate__header p {
    color: #6b7280;
    font-size: 14px;
  }

  .password-gate__form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .password-gate__form input {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 14px;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .password-gate__form input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    outline: none;
  }

  .password-gate__error {
    color: #dc2626;
    font-size: 13px;
  }

  .password-gate__hint {
    color: #94a3b8;
    font-size: 12px;
  }

  /* 全局样式 */
  .btn {
    display: inline-block;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    transition: all 0.3s ease;
    user-select: none;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #545b62;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  /* 响应式工具类 */
  @media (max-width: 768px) {
    .container {
      padding: 0 15px;
    }
  }
</style>
