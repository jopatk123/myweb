import { ref, computed, watch } from 'vue';

export function useNotebookFilters(notes, displayLimit, resetDisplayLimit) {
  const searchQuery = ref('');
  const filterStatus = ref('all');

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

  function applyFilters() {
    let result = [...notes.value];

    if (filterStatus.value !== 'all') {
      const isCompleted = filterStatus.value === 'completed';
      result = result.filter(note => note.completed === isCompleted);
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
  }

  const filteredNotes = computed(() => {
    return applyFilters().slice(0, displayLimit.value);
  });

  const hasMoreNotes = computed(() => {
    return applyFilters().length > displayLimit.value;
  });

  watch([searchQuery, filterStatus], () => {
    if (typeof resetDisplayLimit === 'function') {
      resetDisplayLimit();
    }
  });

  return {
    searchQuery,
    filterStatus,
    filteredNotes,
    hasMoreNotes,
  };
}
