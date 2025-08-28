import FilePreviewWindow from '@/components/file/FilePreviewWindow.vue';
import { useWindowManager } from '@/composables/useWindowManager.js';

const { createWindow } = useWindowManager();

export function openFilePreviewWindow(f) {
  if (!f) return null;
  try {
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
