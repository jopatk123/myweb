import { ref, computed, watch } from 'vue';

export function useNotebookFilters(notes, displayLimit, resetDisplayLimit) {
  const searchQuery = ref('');
  const filterStatus = ref('all'); // all, pending, completed
  const selectedCategory = ref('all');

  const filteredNotes = computed(() => {
    let filtered = notes.value;

    // 按状态筛选
    if (filterStatus.value === 'pending') {
      filtered = filtered.filter(note => !note.completed);
    } else if (filterStatus.value === 'completed') {
      filtered = filtered.filter(note => note.completed);
    }

    // 按分类筛选
    if (selectedCategory.value !== 'all') {
      filtered = filtered.filter(
        note => note.category === selectedCategory.value
      );
    }

    // 按搜索关键词筛选
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          (note.description && note.description.toLowerCase().includes(query))
      );
    }

    // 按状态和创建时间排序
    const sorted = filtered.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // 未完成的在前
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // 新创建的在前
    });

    // 限制显示数量
    return sorted.slice(0, displayLimit.value);
  });

  const hasMoreNotes = computed(() => {
    let filtered = notes.value;

    // 应用相同的筛选逻辑
    if (filterStatus.value === 'pending') {
      filtered = filtered.filter(note => !note.completed);
    } else if (filterStatus.value === 'completed') {
      filtered = filtered.filter(note => note.completed);
    }

    if (selectedCategory.value !== 'all') {
      filtered = filtered.filter(
        note => note.category === selectedCategory.value
      );
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          (note.description && note.description.toLowerCase().includes(query))
      );
    }

    return filtered.length > displayLimit.value;
  });

  // 监听筛选条件变化，重置显示限制
  watch([searchQuery, filterStatus, selectedCategory], () => {
    resetDisplayLimit();
  });

  return {
    searchQuery,
    filterStatus,
    selectedCategory,
    filteredNotes,
    hasMoreNotes,
  };
}
