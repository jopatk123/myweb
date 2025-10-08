import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { SETTINGS_KEY } from '@/composables/music/utils.js';

const listTracks = vi.fn();
const streamUrl = vi.fn();
const deleteTrack = vi.fn();
const uploadTracks = vi.fn();
const updateTrack = vi.fn();
const listGroups = vi.fn();

const mockPreloader = {
  prefetch: vi.fn(),
  consume: vi.fn(),
  getPrefetched: vi.fn(),
  release: vi.fn(),
  abort: vi.fn(),
  teardown: vi.fn(),
};

const useTrackPreloader = vi.fn(() => mockPreloader);
const prepareCompressedFiles = vi.fn(async files => ({
  files,
  compression: null,
}));
const shouldCompressFile = vi.fn(() => false);

vi.mock('@/api/music.js', () => ({
  musicApi: {
    listTracks,
    streamUrl,
    deleteTrack,
    uploadTracks,
    updateTrack,
    listGroups,
  },
}));

vi.mock('@/composables/music/useTrackPreloader.js', () => ({
  useTrackPreloader,
}));

vi.mock('@/services/audioCompression.js', () => ({
  prepareCompressedFiles,
  shouldCompressFile,
}));

describe('useMusicPlayer', () => {
  let useMusicPlayer;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    window.localStorage?.clear?.();
    streamUrl.mockReturnValue('/stream/1');
    Object.values(mockPreloader).forEach(fn => fn.mockClear?.());
    mockPreloader.prefetch.mockResolvedValue(null);
    mockPreloader.consume.mockReturnValue(null);
    mockPreloader.release.mockResolvedValue();
    mockPreloader.teardown.mockResolvedValue();
    useTrackPreloader.mockReturnValue(mockPreloader);
    prepareCompressedFiles.mockClear();
    shouldCompressFile.mockClear();
    shouldCompressFile.mockReturnValue(false);
    listGroups.mockResolvedValue({ data: [] });
    listTracks.mockResolvedValue({
      data: {
        tracks: [
          {
            id: 1,
            title: 'Track One',
            artist: 'Artist',
            duration: 123,
            updatedAt: 1700000000000,
          },
          {
            id: 2,
            title: 'Track Two',
            duration: 321,
          },
        ],
      },
    });
    const module = await import('@/composables/useMusicPlayer.js');
    useMusicPlayer = module.useMusicPlayer;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const originalCreateObjectURL = globalThis.URL?.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL?.revokeObjectURL;

  beforeAll(() => {
    if (!globalThis.URL) {
      globalThis.URL = class {
        static createObjectURL() {
          return 'blob:mock';
        }
        static revokeObjectURL() {}
      };
      return;
    }
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  afterAll(() => {
    if (originalCreateObjectURL) {
      globalThis.URL.createObjectURL = originalCreateObjectURL;
    }
    if (originalRevokeObjectURL) {
      globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  async function createPlayer() {
    const TestHost = defineComponent({
      setup(_, { expose }) {
        const state = useMusicPlayer();
        expose({ state });
        return () => null;
      },
    });
    const wrapper = mount(TestHost);
    await nextTick();
    return { state: wrapper.vm.state, wrapper };
  }

  it('initialise loads tracks and selects the first entry', async () => {
    const { state, wrapper } = await createPlayer();

    await state.initialize();
    await nextTick();

    expect(listTracks).toHaveBeenCalledTimes(1);
    expect(state.tracks.value).toHaveLength(2);
    expect(state.tracks.value[0]).toMatchObject({
      id: 1,
      title: 'Track One',
      durationSeconds: 123,
    });
    expect(state.currentTrackId.value).toBe(1);
    expect(state.currentTrack.value.title).toBe('Track One');
    expect(state.loading.value).toBe(false);
    expect(state.error.value).toBe('');

    wrapper.unmount();
  });

  it('initialise prefetches the first track for quicker playback', async () => {
    const { state, wrapper } = await createPlayer();

    await state.initialize();
    await nextTick();

    expect(mockPreloader.prefetch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ retainCurrent: true })
    );

    wrapper.unmount();
  });

  it('playTrack wires audio element, updates stream url and marks playing', async () => {
    const { state, wrapper } = await createPlayer();
    await state.initialize();
    await nextTick();

    const audioMock = {
      src: '',
      paused: true,
      volume: 0,
      muted: false,
      preload: '',
      crossOrigin: '',
      play: vi.fn().mockImplementation(() => {
        audioMock.paused = false;
        return Promise.resolve();
      }),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    state.setAudioElement(audioMock);

    await state.playTrack(1);

    expect(streamUrl).toHaveBeenCalledWith(1);
    expect(audioMock.src).toContain('/stream/1?v=');
    expect(audioMock.play).toHaveBeenCalled();
    expect(state.isPlaying.value).toBe(true);
    expect(state.currentTrackId.value).toBe(1);

    wrapper.unmount();
  });

  it('playTrack consumes prefetched blob and schedules next track prefetch', async () => {
    vi.useFakeTimers();
    const { state, wrapper } = await createPlayer();
    await state.initialize();
    await nextTick();

    const audioMock = {
      src: '',
      paused: true,
      volume: 0,
      muted: false,
      preload: '',
      crossOrigin: '',
      play: vi.fn().mockImplementation(() => {
        audioMock.paused = false;
        return Promise.resolve();
      }),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    state.setAudioElement(audioMock);

    mockPreloader.prefetch.mockClear();
    mockPreloader.prefetch.mockResolvedValue(null);
    mockPreloader.consume.mockReturnValue({
      trackId: 1,
      objectUrl: 'blob:track-1',
      mimeType: 'audio/ogg',
    });

    await state.playTrack(1);

    expect(mockPreloader.consume).toHaveBeenCalledWith(1);
    expect(audioMock.src).toBe('blob:track-1');
    expect(audioMock.play).toHaveBeenCalled();

    vi.advanceTimersByTime(2500);
    await nextTick();

    expect(mockPreloader.prefetch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2 }),
      expect.objectContaining({ retainCurrent: false })
    );

    vi.useRealTimers();
    wrapper.unmount();
  });

  it('deleteTrack removes current track and resets playback target', async () => {
    const { state, wrapper } = await createPlayer();
    await state.initialize();
    await nextTick();

    deleteTrack.mockResolvedValue({});

    const audioMock = {
      src: '',
      paused: true,
      volume: 0.5,
      muted: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    state.setAudioElement(audioMock);

    await state.deleteTrack(1);

    expect(deleteTrack).toHaveBeenCalledWith(1);
    expect(mockPreloader.release).toHaveBeenCalledWith(1, {
      force: true,
    });
    expect(state.tracks.value.map(track => track.id)).toEqual([2]);
    expect(state.currentTrackId.value).toBe(2);
    expect(audioMock.pause).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('uploadTracks merges new tracks and resets upload state after delay', async () => {
    const { state, wrapper } = await createPlayer();
    await state.initialize();
    await nextTick();

    vi.useFakeTimers();

    uploadTracks.mockImplementation(async (_files, onProgress) => {
      onProgress?.(55, 550, 1000);
      return {
        data: [
          {
            id: 10,
            title: 'New Upload',
            durationSeconds: 210,
          },
        ],
      };
    });

    const dummyFile = { name: 'song.mp3', size: 1 };

    await state.uploadTracks([dummyFile]);

    expect(uploadTracks).toHaveBeenCalled();
    expect(state.tracks.value[0]).toMatchObject({
      id: 10,
      title: 'New Upload',
      durationSeconds: 210,
    });
    expect(state.uploadingState.uploading).toBe(false);
    expect(state.uploadingState.progress).toBe(55);

    vi.runAllTimers();

    expect(state.uploadingState.progress).toBe(0);
    expect(state.uploadingState.filename).toBe('');

    wrapper.unmount();
  });

  it('initialize restores persisted settings from storage', async () => {
    window.localStorage?.setItem?.(
      SETTINGS_KEY,
      JSON.stringify({ volume: 0.4, shuffle: true, repeatMode: 'all' })
    );

    const { state, wrapper } = await createPlayer();

    await state.initialize();
    await nextTick();

    expect(state.volume.value).toBeCloseTo(0.4);
    expect(state.shuffle.value).toBe(true);
    expect(state.repeatMode.value).toBe('all');

    wrapper.unmount();
  });

  it('teardown terminates preloader lifecycle to avoid leaks', async () => {
    const { state, wrapper } = await createPlayer();
    await state.initialize();
    await nextTick();

    state.teardown();

    expect(mockPreloader.teardown).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('renameTrack preserves existing duration when API omits it', async () => {
    const { state, wrapper } = await createPlayer();
    await state.initialize();
    await nextTick();

    updateTrack.mockResolvedValue({
      data: {
        id: 1,
        title: 'Renamed Track',
      },
    });

    await state.renameTrack(1, { title: 'Renamed Track' });
    await nextTick();

    expect(updateTrack).toHaveBeenCalledWith(1, { title: 'Renamed Track' });
    expect(state.tracks.value[0]).toMatchObject({
      id: 1,
      title: 'Renamed Track',
      durationSeconds: 123,
    });

    wrapper.unmount();
  });

  it('togglePlay loads stream when audio element has no source yet', async () => {
    const { state, wrapper } = await createPlayer();
    await state.initialize();
    await nextTick();

    const audioMock = {
      src: '',
      paused: true,
      volume: 0.5,
      muted: false,
      preload: '',
      crossOrigin: '',
      play: vi.fn().mockImplementation(() => {
        audioMock.paused = false;
        return Promise.resolve();
      }),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    state.setAudioElement(audioMock);
    state.currentStreamUrl.value = '';

    await state.togglePlay();

    expect(streamUrl).toHaveBeenCalledWith(1);
    expect(audioMock.play).toHaveBeenCalledTimes(1);
    expect(state.isPlaying.value).toBe(true);
    expect(state.currentStreamUrl.value).toContain('/stream/1');

    wrapper.unmount();
  });
});
