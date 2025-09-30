import { ref, computed, watch } from 'vue';

function defaultConfirm(message) {
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm(message);
  }
  return true;
}

export function useReaderMenu(props, emit, options = {}) {
  const confirm = options.confirm ?? defaultConfirm;

  const showAddBookmark = ref(false);
  const bookmarkTitle = ref('');

  const chapters = computed(() => props.book?.chapters ?? []);
  const bookmarks = computed(() => props.book?.bookmarks ?? []);

  watch(
    () => [props.book?.id, props.book?.fileId],
    () => {
      syncBookmarks();
    },
    { immediate: true }
  );

  function syncBookmarks() {
    if (!props.book?.id || !props.book?.fileId) return;
    try {
      emit('force-sync-bookmarks', props.book.id, props.book.fileId);
    } catch (error) {
      console.error('强制同步书签失败:', error);
    }
  }

  function selectChapter(index) {
    emit('chapter-select', index);
  }

  function navigateToBookmark(bookmark) {
    if (bookmark?.chapterIndex == null) return;
    emit('chapter-select', bookmark.chapterIndex);
    emit('close');
  }

  function openAddDialog() {
    showAddBookmark.value = true;
  }

  function cancelAddBookmark() {
    showAddBookmark.value = false;
    bookmarkTitle.value = '';
  }

  function confirmAddBookmark(title) {
    if (!title?.trim()) return;

    const bookmark = {
      title: title.trim(),
      chapterIndex: props.currentChapter ?? 0,
      createdAt: new Date().toISOString(),
    };

    emit('bookmark-add', bookmark);
    cancelAddBookmark();
  }

  function deleteBookmark(bookmark) {
    if (!bookmark?.id || !props.book?.id) return;
    const ok = confirm('确定要删除这个书签吗？');
    if (!ok) return;
    emit('bookmark-delete', props.book.id, bookmark.id);
  }

  return {
    showAddBookmark,
    bookmarkTitle,
    chapters,
    bookmarks,
    selectChapter,
    navigateToBookmark,
    openAddDialog,
    cancelAddBookmark,
    confirmAddBookmark,
    deleteBookmark,
  };
}
