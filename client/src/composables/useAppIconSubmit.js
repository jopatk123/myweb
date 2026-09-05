import { ref } from 'vue';
import { apiFetch } from '@/api/httpClient.js';
import { useGlobalToast } from '@/composables/useGlobalToast.js';

/**
 * 应用创建/编辑弹窗共用：URL 校验、延迟上传、提交锁、失败回滚未引用图标。
 */
export function useAppIconSubmit() {
  const pendingFile = ref(null);
  const submitting = ref(false);
  const { showError, showInfo } = useGlobalToast();

  function validateTargetUrl(targetUrl) {
    if (!targetUrl) {
      showInfo('请填写URL');
      return false;
    }
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        showInfo('URL 必须以 http:// 或 https:// 开头');
        return false;
      }
    } catch {
      showInfo('URL 格式不正确，请输入有效的 URL，例如：https://example.com');
      return false;
    }
    return true;
  }

  async function discardUnreferencedIcon(filename) {
    if (!filename) return;
    try {
      await apiFetch(`/apps/icons/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      void error;
    }
  }

  async function uploadPendingIcon() {
    const formData = new FormData();
    formData.append('file', pendingFile.value);
    const resp = await apiFetch('/apps/icons/upload', {
      method: 'POST',
      body: formData,
    });
    const json = await resp.json();
    if (resp.ok && json?.data?.filename) {
      return json.data.filename;
    }
    throw new Error(json?.message || '上传失败');
  }

  /**
   * 按当前选择解析图标字段。仅在存在 pendingFile 时访问网络。
   * @returns {Promise<{ iconFilename?: string, presetIcon?: string, uploadedFilename: string|null }>}
   */
  async function resolveIconFields({
    selectedIconPath,
    existingIconFilename,
  } = {}) {
    if (pendingFile.value) {
      const filename = await uploadPendingIcon();
      return { iconFilename: filename, uploadedFilename: filename };
    }
    if (selectedIconPath) {
      return {
        presetIcon: selectedIconPath.split('/').pop(),
        uploadedFilename: null,
      };
    }
    if (existingIconFilename) {
      return {
        iconFilename: existingIconFilename,
        uploadedFilename: null,
      };
    }
    return { uploadedFilename: null };
  }

  return {
    pendingFile,
    submitting,
    showError,
    showInfo,
    validateTargetUrl,
    discardUnreferencedIcon,
    resolveIconFields,
  };
}
