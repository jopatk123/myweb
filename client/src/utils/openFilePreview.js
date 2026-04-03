import FilePreviewWindow from '@/components/file/FilePreviewWindow.vue';
import { useWindowManager } from '@/composables/useWindowManager.js';

/**
 * 在桌面窗口系统中打开文件预览窗口。
 * 注意：此函数在调用时才执行 useWindowManager()，不在模块顶层调用，
 * 避免在 Vue 生命周期外使用 composable 导致的运行时警告。
 */
export function openFilePreviewWindow(f) {
  if (!f) return null;
  try {
    const { createWindow } = useWindowManager({ autoCleanup: false });
    return createWindow({
      component: FilePreviewWindow,
      title: f.originalName || f.original_name || '文件预览',
      appSlug: 'filePreview',
      width: Math.min(1200, window.innerWidth * 0.9),
      height: Math.min(800, window.innerHeight * 0.9),
      props: { file: f },
      storageKey: `previewPos:${f.id}`,
    });
  } catch (e) {
    console.warn('openFilePreviewWindow failed', e);
    return null;
  }
}
