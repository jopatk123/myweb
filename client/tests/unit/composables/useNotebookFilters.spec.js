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
      createdAt: '2025-06-01T10:00:00Z',
      updatedAt: '2025-06-01T10:00:00Z',
    },
    {
      id: 2,
      title: '写代码',
      description: '实现新功能',
      completed: false,
      createdAt: '2025-06-02T10:00:00Z',
      updatedAt: '2025-06-02T10:00:00Z',
    },
    {
      id: 3,
      title: '读书',
      description: '读完Vue3文档',
      completed: true,
      createdAt: '2025-06-03T10:00:00Z',
      updatedAt: '2025-06-03T10:00:00Z',
    },
    {
      id: 4,
      title: '买菜',
      description: '做晚饭',
      completed: true,
      createdAt: '2025-05-28T10:00:00Z',
      updatedAt: '2025-05-28T10:00:00Z',
    },
    {
      id: 5,
      title: '运动',
      description: null,
      completed: false,
      createdAt: '2025-06-04T10:00:00Z',
      updatedAt: '2025-06-04T10:00:00Z',
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

  it('initializes with default filters', () => {
    const { searchQuery, filterStatus } = setup();

    expect(searchQuery.value).toBe('');
    expect(filterStatus.value).toBe('all');
  });

  it('returns notes sorted by pending first and newest first', () => {
    const { filteredNotes } = setup();

    expect(filteredNotes.value.map(note => note.id)).toEqual([5, 2, 1, 3, 4]);
  });

  it('filters by pending status', async () => {
    const { filteredNotes, filterStatus } = setup();

    filterStatus.value = 'pending';
    await nextTick();

    expect(filteredNotes.value.length).toBe(3);
    expect(filteredNotes.value.every(note => !note.completed)).toBe(true);
  });

  it('filters by completed status', async () => {
    const { filteredNotes, filterStatus } = setup();

    filterStatus.value = 'completed';
    await nextTick();

    expect(filteredNotes.value.map(note => note.id)).toEqual([3, 4]);
  });

  it('filters by search keyword in title and description', async () => {
    const { filteredNotes, searchQuery } = setup();

    searchQuery.value = '买';
    await nextTick();

    expect(filteredNotes.value.map(note => note.title)).toEqual([
      '买牛奶',
      '买菜',
    ]);
  });

  it('search is case insensitive and trims whitespace', async () => {
    const { filteredNotes, searchQuery } = setup();

    searchQuery.value = '  VUE3  ';
    await nextTick();

    expect(filteredNotes.value).toHaveLength(1);
    expect(filteredNotes.value[0].title).toBe('读书');
  });

  it('combines status and search filters', async () => {
    const { filteredNotes, filterStatus, searchQuery } = setup();

    filterStatus.value = 'pending';
    searchQuery.value = '代码';
    await nextTick();

    expect(filteredNotes.value).toHaveLength(1);
    expect(filteredNotes.value[0].id).toBe(2);
  });

  it('respects display limit after sorting', () => {
    const { filteredNotes } = setup(2);

    expect(filteredNotes.value.map(note => note.id)).toEqual([5, 2]);
  });

  it('handles null description gracefully during search', async () => {
    const { filteredNotes, searchQuery } = setup();

    searchQuery.value = '运动';
    await nextTick();

    expect(filteredNotes.value).toHaveLength(1);
    expect(filteredNotes.value[0].id).toBe(5);
  });

  it('hasMoreNotes reflects filtered total against display limit', async () => {
    const { hasMoreNotes, filterStatus } = setup(2);

    expect(hasMoreNotes.value).toBe(true);

    filterStatus.value = 'completed';
    await nextTick();

    expect(hasMoreNotes.value).toBe(false);
  });

  it('resets display limit when search or status changes', async () => {
    const { searchQuery, filterStatus, resetDisplayLimit } = setup();

    searchQuery.value = 'test';
    await nextTick();

    filterStatus.value = 'completed';
    await nextTick();

    expect(resetDisplayLimit).toHaveBeenCalledTimes(2);
  });
});
