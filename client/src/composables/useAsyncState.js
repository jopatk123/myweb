/**
 * useAsyncState — 通用异步状态封装
 *
 * 消除各 composable 中重复的 loading/error/try-catch 模板代码。
 *
 * 用法：
 * ```js
 * const { loading, error, execute } = useAsyncState(async (id) => {
 *   const data = await api.fetchSomething(id);
 *   return data;
 * });
 *
 * // 调用时
 * const result = await execute(42);
 * ```
 */
import { ref } from 'vue';

/**
 * @template T
 * @param {(...args: any[]) => Promise<T>} asyncFn 要封装的异步函数
 * @returns {{ loading: import('vue').Ref<boolean>, error: import('vue').Ref<string>, lastError: import('vue').Ref<Error | null>, execute: (...args: any[]) => Promise<T> }}
 */
export function useAsyncState(asyncFn) {
  const loading = ref(false);
  const error = ref('');
  const lastError = ref(null);

  /**
   * 执行异步操作，自动管理 loading/error 状态
   * @param {...any} args 传递给 asyncFn 的参数
   * @returns {Promise<T>}
   */
  async function execute(...args) {
    loading.value = true;
    error.value = '';
    lastError.value = null;
    try {
      return await asyncFn(...args);
    } catch (e) {
      lastError.value = e instanceof Error ? e : new Error(String(e));
      error.value = e?.message || String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, lastError, execute };
}
