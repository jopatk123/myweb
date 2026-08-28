import { ref, computed, watch } from 'vue';

export function useNotebookFilters(notes, displayLimit, resetDisplayLimit) {
  const searchQuery = ref('');
  const filterStatus = ref('all');
  const filterCategory = ref('all');

  const normalizedSearchQuery = computed(() =>
    searchQuery.value.trim().toLowerCase()
  );

  function getNoteTimestamp(note) {
    return (
      note.updatedAt ||
      note.updated_at ||
      note.createdAt ||
      note.created_at ||
      0
    );
  }

  // 从现有笔记中提取分类选项（保持出现顺序去重），
  // 并始终包含当前已选中的分类，避免选中后选项消失
  const availableCategories = computed(() => {
    const seen = new Set();
    for (const note of notes.value) {
      const category = note.category?.trim();
      if (category) seen.add(category);
    }
    if (filterCategory.value !== 'all') {
      seen.add(filterCategory.value);
    }
    return [...seen];
  });

  // 过滤 + 排序只计算一次，filteredNotes / hasMoreNotes / filteredTotal
  // 均从该结果派生，避免同一依赖变化触发两遍完整计算
  const allFilteredNotes = computed(() => {
    let result = [...notes.value];

    if (filterStatus.value !== 'all') {
      const isCompleted = filterStatus.value === 'completed';
      result = result.filter(note => note.completed === isCompleted);
    }

    if (filterCategory.value !== 'all') {
      result = result.filter(note => note.category === filterCategory.value);
    }

    if (normalizedSearchQuery.value) {
      result = result.filter(note => {
        const title = note.title?.toLowerCase() || '';
        const description = note.description?.toLowerCase() || '';

        return (
          title.includes(normalizedSearchQuery.value) ||
          description.includes(normalizedSearchQuery.value)
        );
      });
    }

    return result.sort((left, right) => {
      if (left.completed !== right.completed) {
        return left.completed ? 1 : -1;
      }

      return (
        new Date(getNoteTimestamp(right)) - new Date(getNoteTimestamp(left))
      );
    });
  });

  const filteredNotes = computed(() => {
    return allFilteredNotes.value.slice(0, displayLimit.value);
  });

  const filteredTotal = computed(() => allFilteredNotes.value.length);

  const hasMoreNotes = computed(() => {
    return allFilteredNotes.value.length > displayLimit.value;
  });

  watch([searchQuery, filterStatus, filterCategory], () => {
    if (typeof resetDisplayLimit === 'function') {
      resetDisplayLimit();
    }
  });

  return {
    searchQuery,
    filterStatus,
    filterCategory,
    availableCategories,
    filteredNotes,
    filteredTotal,
    hasMoreNotes,
  };
}
