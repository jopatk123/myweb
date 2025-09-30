import { render, fireEvent } from '@testing-library/vue';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import NovelReaderContent from '@/apps/novel-reader/NovelReaderContent.vue';
import { DEFAULT_READER_SETTINGS } from '@/apps/novel-reader/constants/settings.js';

const buildBook = () => ({
  id: 'book-1',
  chapters: [
    { title: '序章', content: '第一段\n第二段' },
    { title: '第二章', content: '更多内容' },
  ],
});

function setScrollMetrics(element, { scrollHeight, clientHeight, scrollTop }) {
  Object.defineProperty(element, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(element, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  });
  element.scrollTop = scrollTop;
}

describe('NovelReaderContent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('disables previous navigation on first chapter', () => {
    const book = buildBook();
    const { getByRole } = render(NovelReaderContent, {
      props: {
        book,
        chapter: book.chapters[0],
        settings: DEFAULT_READER_SETTINGS,
        progress: {},
      },
    });

    const prevBtn = getByRole('button', { name: '← 上一章' });
    const nextBtn = getByRole('button', { name: '下一章 →' });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  it('emits chapter-change when navigating forward', async () => {
    const book = buildBook();
    const { getByRole, emitted } = render(NovelReaderContent, {
      props: {
        book,
        chapter: book.chapters[0],
        settings: DEFAULT_READER_SETTINGS,
        progress: {},
      },
    });

    await fireEvent.click(getByRole('button', { name: '下一章 →' }));
    const events = emitted()['chapter-change'] ?? [];
    expect(events[0]).toEqual([1]);
  });

  it('emits throttled progress updates on scroll', async () => {
    const book = buildBook();
    const progress = {};
    const { container, emitted } = render(NovelReaderContent, {
      props: {
        book,
        chapter: book.chapters[0],
        settings: DEFAULT_READER_SETTINGS,
        progress,
      },
    });

    const readingArea = container.querySelector('.reading-area');
    expect(readingArea).not.toBeNull();

    setScrollMetrics(readingArea, {
      scrollHeight: 2000,
      clientHeight: 500,
      scrollTop: 300,
    });

    await fireEvent.scroll(readingArea);
    vi.advanceTimersByTime(400);

    const events = emitted()['progress-change'] ?? [];
    expect(events[0][0]).toMatchObject({
      chapterIndex: 0,
      scrollPosition: 300,
    });
    expect(events[0][0].scrollPercentage).toBeCloseTo(300 / (2000 - 500));
  });

  it('scrolls reading area on space key press', async () => {
    const book = buildBook();
    const { container } = render(NovelReaderContent, {
      props: {
        book,
        chapter: book.chapters[0],
        settings: DEFAULT_READER_SETTINGS,
        progress: {},
      },
    });

    const readingArea = container.querySelector('.reading-area');
    expect(readingArea).not.toBeNull();

    setScrollMetrics(readingArea, {
      scrollHeight: 2000,
      clientHeight: 500,
      scrollTop: 0,
    });

    await fireEvent.keyDown(document, { key: ' ' });
    expect(readingArea.scrollTop).toBeCloseTo(500 * 0.8);
  });
});
