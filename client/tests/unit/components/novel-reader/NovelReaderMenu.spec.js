import { render, fireEvent, screen } from '@testing-library/vue';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import NovelReaderMenu from '@/apps/novel-reader/NovelReaderMenu.vue';

const baseBook = () => ({
  id: 'book-1',
  fileId: 'file-1',
  chapters: [{ title: '第一章' }, { title: '第二章' }],
  bookmarks: [
    {
      id: 'bookmark-1',
      title: '我的书签',
      chapterIndex: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
});

describe('NovelReaderMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('requests bookmark sync on mount', () => {
    const book = baseBook();
    const { emitted } = render(NovelReaderMenu, {
      props: {
        book,
        currentChapter: 0,
      },
    });

    const syncEvents = emitted()['force-sync-bookmarks'] ?? [];
    expect(syncEvents[0]).toEqual([book.id, book.fileId]);
  });

  it('emits bookmark-add with current chapter', async () => {
    const book = baseBook();
    const { emitted } = render(NovelReaderMenu, {
      props: {
        book,
        currentChapter: 1,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: '➕ 添加书签' }));
    const input = await screen.findByPlaceholderText('书签标题...');
    await fireEvent.update(input, '新书签');
    await fireEvent.click(screen.getByRole('button', { name: '添加' }));

    const addEvents = emitted()['bookmark-add'] ?? [];
    expect(addEvents).toHaveLength(1);
    expect(addEvents[0][0]).toMatchObject({
      title: '新书签',
      chapterIndex: 1,
    });
  });

  it('emits delete event when confirming removal', async () => {
    const book = baseBook();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { emitted } = render(NovelReaderMenu, {
      props: {
        book,
        currentChapter: 0,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: '🗑️' }));

    expect(confirmSpy).toHaveBeenCalled();
    const deleteEvents = emitted()['bookmark-delete'] ?? [];
    expect(deleteEvents[0]).toEqual([book.id, 'bookmark-1']);
  });

  it('navigates to bookmark and closes menu', async () => {
    const book = baseBook();
    const { emitted } = render(NovelReaderMenu, {
      props: {
        book,
        currentChapter: 0,
      },
    });

    await fireEvent.click(screen.getByText('我的书签'));

    const chapterEvents = emitted()['chapter-select'] ?? [];
    const closeEvents = emitted().close ?? [];
    expect(chapterEvents[0]).toEqual([0]);
    expect(closeEvents).toHaveLength(1);
  });
});
