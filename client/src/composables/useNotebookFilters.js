import { ref, computed, watch } from 'vue';

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };

export function useNotebookFilters(notes, displayLimit, resetDisplayLimit) {
  const searchQuery = ref('');
  const filterStatus = ref('all');
  const filterCategory = ref('all');
  const filterPriority = ref('all');
  const sortBy = ref('updated');

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

    if (filterPriority.value !== 'all') {
      result = result.filter(note => note.priority === filterPriority.value);
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
      // 已完成笔记始终沉底，不随排序方式变化
      if (left.completed !== right.completed) {
        return left.completed ? 1 : -1;
      }

      if (sortBy.value === 'priority') {
        const diff =
          (PRIORITY_WEIGHT[left.priority] ?? 1) -
          (PRIORITY_WEIGHT[right.priority] ?? 1);
        if (diff !== 0) return diff;
      } else if (sortBy.value === 'title') {
        const diff = (left.title || '').localeCompare(
          right.title || '',
          'zh-Hans-CN'
        );
        if (diff !== 0) return diff;
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

  const hasActiveFilters = computed(
    () =>
      normalizedSearchQuery.value !== '' ||
      filterStatus.value !== 'all' ||
      filterCategory.value !== 'all' ||
      filterPriority.value !== 'all'
  );

  function clearFilters() {
    searchQuery.value = '';
    filterStatus.value = 'all';
    filterCategory.value = 'all';
    filterPriority.value = 'all';
  }

  watch(
    [searchQuery, filterStatus, filterCategory, filterPriority, sortBy],
    () => {
      if (typeof resetDisplayLimit === 'function') {
        resetDisplayLimit();
      }
    }
  );

  return {
    searchQuery,
    filterStatus,
    filterCategory,
    filterPriority,
    sortBy,
    availableCategories,
    filteredNotes,
    filteredTotal,
    hasMoreNotes,
    hasActiveFilters,
    clearFilters,
  };
}
