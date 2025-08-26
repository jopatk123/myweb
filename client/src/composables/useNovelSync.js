import { ref } from 'vue';
import { filesApi } from '@/api/files.js';
import { useNovelParser } from './useNovelParser.js';

export function useNovelSync() {
  const loading = ref(false);
  const { parseChapters, generateId } = useNovelParser();

  // 从后端同步小说列表（按需合并到本地）
  async function syncServerNovels(books, readingProgress, saveBooks) {
    try {
      loading.value = true;
      const resp = await filesApi.list({ type: 'novel', page: 1, limit: 1000 });
      const serverFiles =
        resp && resp.data && Array.isArray(resp.data.files)
          ? resp.data.files
          : [];

      // 先构建后端现存的小说文件ID集合
      const serverIdSet = new Set(
        serverFiles.map(f => f.id || f.ID).filter(Boolean)
      );

      const existingIds = new Set(
        books.value.map(b => b.fileId || b.file_id).filter(Boolean)
      );

      for (const f of serverFiles) {
        const id = f.id || f.ID;
        if (!id || existingIds.has(id)) continue;
        const downloadUrl = filesApi.downloadUrl(id);
        const titleRaw = f.original_name || f.originalName || '未命名';
        const title = titleRaw.replace(/\.[^/.]+$/, '');
        const format = titleRaw.split('.').pop()?.toLowerCase?.() || '';

        const bookMeta = {
          id: generateId(),
          title,
          author: '未知作者',
          size: f.file_size || f.fileSize || 0,
          format,
          content: null,
          chapters: [],
          addedAt: new Date().toISOString(),
          lastRead: null,
          fileId: id,
          fileUrl: f.file_url || downloadUrl,
        };
        books.value.push(bookMeta);
      }

      // 清理：若本地存在 fileId 但服务器已不存在，对应条目应被移除
      const removedLocalBookIds = [];
      books.value = books.value.filter(b => {
        const fid = b.fileId || b.file_id;
        if (!fid) return true; // 纯本地书籍保留
        if (serverIdSet.has(fid)) return true;
        removedLocalBookIds.push(b.id);
        return false;
      });

      // 同步移除这些书籍的阅读进度
      for (const bid of removedLocalBookIds) {
        if (readingProgress.value[bid]) delete readingProgress.value[bid];
      }

      saveBooks(books.value);
    } catch (err) {
      console.error('同步后端小说列表失败:', err);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    syncServerNovels,
  };
}
