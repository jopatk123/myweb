import { ref, computed } from 'vue';
import { filesApi } from '@/api/files.js';

export function useFiles() {
  const items = ref([]);
  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);
  const type = ref('');
  const search = ref('');
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const error = ref('');

  const totalPages = computed(() =>
    Math.ceil((total.value || 0) / (limit.value || 1))
  );

  function unwrap(resp) {
    let r = resp;
    while (
      r &&
      typeof r === 'object' &&
      Object.prototype.hasOwnProperty.call(r, 'data')
    ) {
      r = r.data;
    }
    return r;
  }

  async function fetchList() {
    try {
      const raw = await filesApi.list({
        page: page.value,
        limit: limit.value,
        type: type.value || undefined,
        search: search.value || undefined,
      });
      const data = unwrap(raw);
      items.value = data.files || [];
      total.value = data.pagination?.total || 0;
    } catch (e) {
      error.value = e.message || '加载失败';
    }
  }

  async function upload(files) {
    uploading.value = true;
    uploadProgress.value = 0;
    error.value = '';
    try {
      await filesApi.upload(files, p => (uploadProgress.value = p));
      await fetchList();
    } catch (e) {
      error.value = e.message || '上传失败';
      throw e;
    } finally {
      uploading.value = false;
    }
  }

  async function remove(id) {
    await filesApi.delete(id);
    await fetchList();
  }

  function getDownloadUrl(id) {
    return filesApi.downloadUrl(id);
  }

  return {
    items,
    page,
    limit,
    total,
    totalPages,
    type,
    search,
    uploading,
    uploadProgress,
    error,
    fetchList,
    upload,
    remove,
    getDownloadUrl,
    setPage: p => (page.value = Number(p) || 1),
    setLimit: l => (limit.value = Number(l) || 20),
  };
}
