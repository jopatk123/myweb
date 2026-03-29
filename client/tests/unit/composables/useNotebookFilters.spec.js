import { describe, expect, it, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useNotebookFilters } from '@/composables/useNotebookFilters.js';

function createNotes() {
  return ref([
    {
      id: 1,
      title: '买牛奶',
      description: '超市买无糖牛奶',
      completed: false,
      category: 'shopping',
      createdAt: '2025-06-01T10:00:00Z',
    },
    {
      id: 2,
      title: '写代码',
      description: '实现新功能',
      completed: false,
      category: 'work',
      createdAt: '2025-06-02T10:00:00Z',
    },
    {
      id: 3,
      title: '读书',
      description: '读完Vue3文档',
      completed: true,
      category: 'study',
      createdAt: '2025-06-03T10:00:00Z',
    },
    {
      id: 4,
      title: '买菜',
      description: '做晚饭',
      completed: true,
      category: 'shopping',
      createdAt: '2025-05-28T10:00:00Z',
    },
    {
      id: 5,
      title: '运动',
      description: null,
      completed: false,
      category: 'health',
      createdAt: '2025-06-04T10:00:00Z',
    },
  ]);
}

describe('useNotebookFilters', () => {
  function setup(displayLimitVal = 100) {
    const notes = createNotes();
    const displayLimit = ref(displayLimitVal);
    const resetDisplayLimit = vi.fn(() => {
      displayLimit.value = 100;
    });

    const result = useNotebookFilters(notes, displayLimit, resetDisplayLimit);
    return { notes, displayLimit, resetDisplayLimit, ...result };
  }

  describe('initial state', () => {
    it('initializes with default filters', () => {
      const { searchQuery, filterStatus, selectedCategory } = setup();

      expect(searchQuery.value).toBe('');
      expect(filterStatus.value).toBe('all');
      expect(selectedCategory.value).toBe('all');
    });
  });

  describe('filteredNotes', () => {
    it('returns all notes sorted (pending first, newest first) by default', () => {
      const { filteredNotes } = setup();

      // Pending notes come first, sorted by newest
      expect(filteredNotes.value.length).toBe(5);
      expect(filteredNotes.value[0].completed).toBe(false);
      // Completed ones at the end
      const lastTwo = filteredNotes.value.slice(-2);
      expect(lastTwo.every(n => n.completed)).toBe(true);
    });

    it('filters by pending status', async () => {
      const { filteredNotes, filterStatus } = setup();

      filterStatus.value = 'pending';
      await nextTick();

      expect(filteredNotes.value.length).toBe(3);
      expect(filteredNotes.value.every(n => !n.completed)).toBe(true);
    });

    it('filters by completed status', async () => {
      const { filteredNotes, filterStatus } = setup();

      filterStatus.value = 'completed';
      await nextTick();

      expect(filteredNotes.value.length).toBe(2);
      expect(filteredNotes.value.every(n => n.completed)).toBe(true);
    });

    it('filters by category', async () => {
      const { filteredNotes, selectedCategory } = setup();

      selectedCategory.value = 'shopping';
      await nextTick();

      expect(filteredNotes.value.length).toBe(2);
      expect(filteredNotes.value.every(n => n.category === 'shopping')).toBe(
        true
      );
    });

    it('filters by search keyword in title', async () => {
      const { filteredNotes, searchQuery } = setup();

      searchQuery.value = '买';
      await nextTick();

      expect(filteredNotes.value.length).toBe(2);
      expect(filteredNotes.value.map(n => n.title)).toContain('买牛奶');
      expect(filteredNotes.value.map(n => n.title)).toContain('买菜');
    });

    it('filters by search keyword in description', async () => {
      const { filteredNotes, searchQuery } = setup();

      searchQuery.value = 'vue3';
      await nextTick();

      expect(filteredNotes.value.length).toBe(1);
      expect(filteredNotes.value[0].title).toBe('读书');
    });

    it('combines status and category filters', async () => {
      const { filteredNotes, filterStatus, selectedCategory } = setup();

      filterStatus.value = 'completed';
      selectedCategory.value = 'shopping';
      await nextTick();

      expect(filteredNotes.value.length).toBe(1);
      expect(filteredNotes.value[0].title).toBe('买菜');
    });

    it('combines all filter types', async () => {
      const { filteredNotes, filterStatus, searchQuery, selectedCategory } =
        setup();

      filterStatus.value = 'pending';
      selectedCategory.value = 'shopping';
      searchQuery.value = '牛';
      await nextTick();

      expect(filteredNotes.value.length).toBe(1);
      expect(filteredNotes.value[0].title).toBe('买牛奶');
    });

    it('respects displayLimit', async () => {
      const { filteredNotes } = setup(2);

      expect(filteredNotes.value.length).toBe(2);
    });

    it('handles null description gracefully during search', async () => {
      const { filteredNotes, searchQuery } = setup();

      searchQuery.value = '运动';
      await nextTick();

      expect(filteredNotes.value.length).toBe(1);
      expect(filteredNotes.value[0].title).toBe('运动');
    });

    it('search is case insensitive', async () => {
      const { filteredNotes, searchQuery } = setup();

      searchQuery.value = 'VUE3';
      await nextTick();

      expect(filteredNotes.value.length).toBe(1);
    });

    it('empty search shows all notes', async () => {
      const { filteredNotes, searchQuery } = setup();

      searchQuery.value = '   ';
      await nextTick();

      // Whitespace-only search is treated as empty, showing all notes
      expect(filteredNotes.value.length).toBe(5);
    });
  });

  describe('hasMoreNotes', () => {
    it('is false when all notes fit within limit', () => {
      const { hasMoreNotes } = setup(100);
      expect(hasMoreNotes.value).toBe(false);
    });

    it('is true when notes exceed display limit', () => {
      const { hasMoreNotes } = setup(2);
      expect(hasMoreNotes.value).toBe(true);
    });
  });

  describe('filter change resets displayLimit', () => {
    it('resets limit when searchQuery changes', async () => {
      const { searchQuery, resetDisplayLimit } = setup();

      searchQuery.value = 'test';
      await nextTick();

      expect(resetDisplayLimit).toHaveBeenCalled();
    });

    it('resets limit when filterStatus changes', async () => {
      const { filterStatus, resetDisplayLimit } = setup();

      filterStatus.value = 'completed';
      await nextTick();

      expect(resetDisplayLimit).toHaveBeenCalled();
    });

    it('resets limit when selectedCategory changes', async () => {
      const { selectedCategory, resetDisplayLimit } = setup();

      selectedCategory.value = 'work';
      await nextTick();

      expect(resetDisplayLimit).toHaveBeenCalled();
    });
  });
});
