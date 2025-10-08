import { describe, it, expect, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import { usePlaybackQueue } from '@/composables/music/usePlaybackQueue.js';

function createState(overrides = {}) {
  const base = {
    tracks: ref([
      { id: 1, title: 'Song A' },
      { id: 2, title: 'Song B' },
      { id: 3, title: 'Song C' },
    ]),
    currentIndex: ref(0),
    repeatMode: ref('none'),
    shuffle: ref(false),
  };
  return { ...base, ...overrides };
}

describe('usePlaybackQueue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sequential next and previous indices', () => {
    const state = createState();
    const queue = usePlaybackQueue(state);

    expect(queue.nextIndex()).toBe(1);
    expect(queue.previousIndex()).toBe(-1);

    state.currentIndex.value = 2;
    expect(queue.nextIndex()).toBe(-1);
    expect(queue.previousIndex()).toBe(1);
  });

  it('wraps around when repeat mode is all', () => {
    const state = createState();
    const queue = usePlaybackQueue(state);

    state.currentIndex.value = 2;
    state.repeatMode.value = 'all';
    expect(queue.nextIndex()).toBe(0);

    state.currentIndex.value = 0;
    expect(queue.previousIndex()).toBe(2);
  });

  it('identifies repeat-one mode', () => {
    const state = createState();
    const queue = usePlaybackQueue(state);

    expect(queue.shouldRepeatCurrent()).toBe(false);
    state.repeatMode.value = 'one';
    expect(queue.shouldRepeatCurrent()).toBe(true);
  });

  it('returns concrete tracks for next/previous helpers', () => {
    const state = createState();
    const queue = usePlaybackQueue(state);

    const nextTrack = queue.nextTrack();
    expect(nextTrack).toMatchObject({ id: 2 });

    state.currentIndex.value = 2;
    state.repeatMode.value = 'all';
    const wrappedTrack = queue.nextTrack();
    expect(wrappedTrack).toMatchObject({ id: 1 });

    state.currentIndex.value = 0;
    const prevTrack = queue.previousTrack();
    expect(prevTrack).toMatchObject({ id: 3 });
  });

  it('uses random selection when shuffle is enabled', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.8);
    const state = createState({ shuffle: ref(true) });
    const queue = usePlaybackQueue(state);

    const index = queue.nextIndex();
    expect(index).toBe(2);
    expect(queue.isShuffleEnabled()).toBe(true);
    randomSpy.mockRestore();
  });
});
