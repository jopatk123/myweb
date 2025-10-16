import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useAudioController } from '@/composables/music/useAudioController.js';

// Mock the music API
vi.mock('@/api/music.js', () => ({
  musicApi: {
    streamUrl: vi.fn(id => `/api/music/tracks/${id}/stream`),
  },
}));

// Mock the httpClient
vi.mock('@/api/httpClient.js', () => ({
  buildServerUrl: vi.fn(path => `http://localhost:3000${path}`),
}));

describe('useAudioController - without preloader', () => {
  let state;
  let audioEl;
  let controller;

  beforeEach(() => {
    // Create mock audio element
    audioEl = {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      src: '',
      paused: true,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      muted: false,
      preload: '',
      crossOrigin: '',
    };

    // Create state
    state = {
      tracks: ref([
        { id: 1, title: 'Song 1', durationSeconds: 100 },
        { id: 2, title: 'Song 2', durationSeconds: 120 },
        { id: 3, title: 'Song 3', durationSeconds: 90 },
      ]),
      currentTrackId: ref(null),
      currentTrack: ref(null),
      currentStreamUrl: ref(''),
      audioEl: ref(audioEl),
      isPlaying: ref(false),
      isBuffering: ref(false),
      currentTime: ref(0),
      duration: ref(0),
      volume: ref(0.8),
      muted: ref(false),
      repeatMode: ref('none'),
      shuffle: ref(false),
      error: ref(''),
      currentIndex: ref(-1),
    };

    // Create controller without preloader option
    controller = useAudioController(state, { settings: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should play a track without preloader', async () => {
    const track = state.tracks.value[0];
    await controller.playTrack(track);

    expect(state.isPlaying.value).toBe(true);
    expect(state.currentTrackId.value).toBe(1);
    expect(audioEl.play).toHaveBeenCalled();
  });

  it('should handle playNext without preloader', () => {
    state.currentTrackId.value = 1;
    state.currentIndex.value = 0;

    controller.playNext();

    // Should queue the next track
    expect(audioEl.play).toHaveBeenCalled();
  });

  it('should handle playPrevious without preloader', () => {
    state.currentTrackId.value = 2;
    state.currentIndex.value = 1;

    controller.playPrevious();

    // Should queue the previous track
    expect(audioEl.play).toHaveBeenCalled();
  });

  it('should cleanup on teardown without preloader', () => {
    state.audioEl.value = audioEl;
    controller.teardown();

    expect(audioEl.pause).toHaveBeenCalled();
    expect(audioEl.src).toBe('');
  });

  it('should toggle play without preloader', async () => {
    state.audioEl.value = audioEl;
    state.currentTrackId.value = 1;

    await controller.togglePlay();

    expect(audioEl.play).toHaveBeenCalled();
    expect(state.isPlaying.value).toBe(true);
  });

  it('should set volume correctly', () => {
    controller.setVolume(0.5);
    expect(state.volume.value).toBe(0.5);
  });

  it('should seek to position', () => {
    state.duration.value = 100;
    controller.seekTo(50);
    expect(state.currentTime.value).toBe(50);
  });

  it('should cycle repeat mode', () => {
    expect(state.repeatMode.value).toBe('none');
    controller.cycleRepeatMode();
    expect(state.repeatMode.value).toBe('all');
    controller.cycleRepeatMode();
    expect(state.repeatMode.value).toBe('one');
    controller.cycleRepeatMode();
    expect(state.repeatMode.value).toBe('none');
  });

  it('should handle audio element without error', () => {
    controller.setAudioElement(audioEl);
    expect(audioEl.preload).toBe('auto');
  });
});
