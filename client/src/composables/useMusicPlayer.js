import { ref, computed, reactive, onBeforeUnmount, watch } from 'vue';
import { musicApi } from '@/api/music.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const SETTINGS_KEY = 'music-player-settings';

function loadSettings() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function useMusicPlayer() {
  const tracks = ref([]);
  const loading = ref(false);
  const searchQuery = ref('');
  const currentTrackId = ref(null);
  const currentStreamUrl = ref('');
  const audioEl = ref(null);
  const isPlaying = ref(false);
  const isBuffering = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(0.8);
  const muted = ref(false);
  const repeatMode = ref('none'); // none -> all -> one
  const shuffle = ref(false);
  const deletingIds = ref(new Set());
  const uploadingState = reactive({
    uploading: false,
    progress: 0,
    loaded: 0,
    total: 0,
    filename: '',
  });
  const error = ref('');

  const settings = reactive({
    volume: 0.8,
    repeatMode: 'none',
    shuffle: false,
  });

  const currentTrack = computed(
    () => tracks.value.find(track => track.id === currentTrackId.value) || null
  );

  const currentIndex = computed(() =>
    tracks.value.findIndex(track => track.id === currentTrackId.value)
  );

  const filteredTracks = computed(() => {
    if (!searchQuery.value.trim()) return tracks.value;
    const q = searchQuery.value.trim().toLowerCase();
    return tracks.value.filter(track => {
      return [
        track.title,
        track.artist,
        track.album,
        track.genre,
        track.originalName,
      ]
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(q));
    });
  });

  function restoreSettings() {
    const loaded = loadSettings();
    if (typeof loaded.volume === 'number') {
      volume.value = clamp(loaded.volume, 0, 1);
      settings.volume = volume.value;
    }
    if (typeof loaded.shuffle === 'boolean') {
      shuffle.value = loaded.shuffle;
      settings.shuffle = loaded.shuffle;
    }
    if (typeof loaded.repeatMode === 'string') {
      repeatMode.value = loaded.repeatMode;
      settings.repeatMode = loaded.repeatMode;
    }
  }

  watch(
    () => ({
      volume: volume.value,
      shuffle: shuffle.value,
      repeatMode: repeatMode.value,
    }),
    val => {
      settings.volume = val.volume;
      settings.shuffle = val.shuffle;
      settings.repeatMode = val.repeatMode;
      saveSettings(settings);
    }
  );

  function attachAudioEvents(el) {
    if (!el) return;

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('pause', handlePause);
    el.addEventListener('playing', handlePlaying);
    el.addEventListener('waiting', handleWaiting);
    el.addEventListener('ended', handleEnded);
  }

  function detachAudioEvents(el) {
    if (!el) return;

    el.removeEventListener('timeupdate', handleTimeUpdate);
    el.removeEventListener('loadedmetadata', handleLoadedMetadata);
    el.removeEventListener('pause', handlePause);
    el.removeEventListener('playing', handlePlaying);
    el.removeEventListener('waiting', handleWaiting);
    el.removeEventListener('ended', handleEnded);
  }

  function setAudioElement(el) {
    if (audioEl.value === el) return;
    if (audioEl.value) {
      detachAudioEvents(audioEl.value);
    }
    audioEl.value = el;
    if (audioEl.value) {
      audioEl.value.preload = 'auto';
      audioEl.value.crossOrigin = 'anonymous';
      audioEl.value.volume = volume.value;
      audioEl.value.muted = muted.value;
      attachAudioEvents(audioEl.value);
    }
  }

  function handleTimeUpdate() {
    if (!audioEl.value) return;
    currentTime.value = Math.floor(audioEl.value.currentTime || 0);
  }

  function handleLoadedMetadata() {
    if (!audioEl.value) return;
    duration.value = Math.floor(audioEl.value.duration || 0);
  }

  function handlePause() {
    if (isBuffering.value) return;
    isPlaying.value = false;
  }

  function handlePlaying() {
    isBuffering.value = false;
    isPlaying.value = true;
  }

  function handleWaiting() {
    if (!audioEl.value) return;
    if (!audioEl.value.paused) {
      isBuffering.value = true;
    }
  }

  function handleEnded() {
    isPlaying.value = false;
    currentTime.value = duration.value;
    autoAdvance();
  }

  function autoAdvance() {
    if (!tracks.value.length) return;
    if (repeatMode.value === 'one') {
      seekTo(0);
      playCurrent();
      return;
    }

    const nextIndex = getNextIndex();
    if (nextIndex === -1) {
      if (repeatMode.value === 'all' && tracks.value.length) {
        playTrack(tracks.value[0]);
      }
      return;
    }
    playTrack(tracks.value[nextIndex]);
  }

  function getNextIndex() {
    if (!tracks.value.length) return -1;
    if (shuffle.value) {
      if (tracks.value.length === 1) return 0;
      const candidates = tracks.value
        .map((_, idx) => idx)
        .filter(idx => idx !== currentIndex.value && tracks.value[idx]);
      if (!candidates.length) return -1;
      const randomIdx = Math.floor(Math.random() * candidates.length);
      return candidates[randomIdx];
    }

    const nextIdx = currentIndex.value + 1;
    if (nextIdx >= tracks.value.length) {
      return repeatMode.value === 'all' ? 0 : -1;
    }
    return nextIdx;
  }

  function getPreviousIndex() {
    if (!tracks.value.length) return -1;
    if (shuffle.value) {
      return getNextIndex();
    }
    const prevIdx = currentIndex.value - 1;
    if (prevIdx < 0) {
      return repeatMode.value === 'all' ? tracks.value.length - 1 : -1;
    }
    return prevIdx;
  }

  async function fetchTracks() {
    loading.value = true;
    error.value = '';
    try {
      const resp = await musicApi.listTracks();
      const list = resp?.data?.tracks || [];
      tracks.value = list.map(track => ({
        ...track,
        durationSeconds: track.durationSeconds ?? track.duration ?? 0,
      }));
      if (!tracks.value.length) {
        currentTrackId.value = null;
        currentStreamUrl.value = '';
      } else if (!currentTrackId.value) {
        currentTrackId.value = tracks.value[0].id;
      }
    } catch (err) {
      error.value = err?.message || '加载音乐失败';
      console.error('加载音乐列表失败:', err);
    } finally {
      loading.value = false;
    }
  }

  async function initialize() {
    restoreSettings();
    await fetchTracks();
  }

  function playCurrent() {
    if (currentTrack.value) {
      playTrack(currentTrack.value);
    }
  }

  async function playTrack(trackOrId) {
    const target =
      typeof trackOrId === 'number'
        ? tracks.value.find(item => item.id === trackOrId)
        : trackOrId;
    if (!target) return;
    if (!audioEl.value) {
      currentTrackId.value = target.id;
      return;
    }

    const stream = musicApi.streamUrl(target.id);
    const versionKey =
      target.updatedAt ??
      target.updated_at ??
      target.createdAt ??
      target.created_at ??
      Date.now();
    const shouldReload = currentStreamUrl.value !== stream;

    currentTrackId.value = target.id;
    currentStreamUrl.value = stream;
    try {
      if (shouldReload) {
        audioEl.value.src = `${stream}?v=${versionKey}`;
      }
      await audioEl.value.play();
      isPlaying.value = true;
      isBuffering.value = false;
    } catch (err) {
      console.error('播放失败:', err);
      error.value = err?.message || '无法播放该音频';
    }
  }

  async function togglePlay() {
    if (!audioEl.value) return;
    if (!currentTrack.value && tracks.value.length) {
      await playTrack(tracks.value[0]);
      return;
    }
    try {
      if (audioEl.value.paused) {
        await audioEl.value.play();
        isPlaying.value = true;
      } else {
        audioEl.value.pause();
        isPlaying.value = false;
      }
    } catch (err) {
      console.error('切换播放失败:', err);
    }
  }

  function seekTo(seconds) {
    if (!audioEl.value) return;
    const clamped = clamp(seconds, 0, duration.value || 0);
    audioEl.value.currentTime = clamped;
    currentTime.value = clamped;
  }

  function playNext() {
    const nextIdx = getNextIndex();
    if (nextIdx === -1) return;
    playTrack(tracks.value[nextIdx]);
  }

  function playPrevious() {
    const prevIdx = getPreviousIndex();
    if (prevIdx === -1) return;
    playTrack(tracks.value[prevIdx]);
  }

  function setVolume(value) {
    const next = clamp(Number(value), 0, 1);
    volume.value = next;
    settings.volume = next;
    if (audioEl.value) {
      audioEl.value.volume = next;
    }
    if (next === 0) {
      muted.value = true;
      if (audioEl.value) audioEl.value.muted = true;
    } else {
      muted.value = false;
      if (audioEl.value) audioEl.value.muted = false;
    }
  }

  function toggleMute() {
    muted.value = !muted.value;
    if (audioEl.value) {
      audioEl.value.muted = muted.value;
    }
  }

  function toggleShuffle() {
    shuffle.value = !shuffle.value;
  }

  function cycleRepeatMode() {
    repeatMode.value =
      repeatMode.value === 'none'
        ? 'all'
        : repeatMode.value === 'all'
          ? 'one'
          : 'none';
  }

  async function deleteTrack(id) {
    if (!id) return;
    const set = new Set(deletingIds.value);
    set.add(id);
    deletingIds.value = set;
    try {
      await musicApi.deleteTrack(id);
      tracks.value = tracks.value.filter(track => track.id !== id);
      if (currentTrackId.value === id) {
        if (tracks.value.length) {
          currentTrackId.value = tracks.value[0].id;
          currentStreamUrl.value = '';
          if (audioEl.value) {
            audioEl.value.pause();
            audioEl.value.src = '';
          }
        } else {
          currentTrackId.value = null;
          currentStreamUrl.value = '';
          if (audioEl.value) {
            audioEl.value.pause();
            audioEl.value.src = '';
          }
        }
      }
    } catch (err) {
      console.error('删除音乐失败:', err);
      error.value = err?.message || '删除失败';
    } finally {
      const nextSet = new Set(deletingIds.value);
      nextSet.delete(id);
      deletingIds.value = nextSet;
    }
  }

  async function renameTrack(id, payload) {
    if (!id) return null;
    try {
      const resp = await musicApi.updateTrack(id, payload);
      const updated = resp?.data || null;
      if (!updated) return null;
      tracks.value = tracks.value.map(track =>
        track.id === id
          ? {
              ...track,
              ...updated,
            }
          : track
      );
      return updated;
    } catch (err) {
      console.error('更新音乐信息失败:', err);
      error.value = err?.message || '更新失败';
      throw err;
    }
  }

  async function uploadTracks(files) {
    if (!files || !files.length) return;
    uploadingState.uploading = true;
    uploadingState.progress = 0;
    uploadingState.loaded = 0;
    uploadingState.total = 0;
    uploadingState.filename = files[0]?.name || '';
    try {
      const resp = await musicApi.uploadTracks(
        files,
        (progress, loaded, total) => {
          uploadingState.progress = progress;
          uploadingState.loaded = loaded;
          uploadingState.total = total;
        }
      );
      const data = resp?.data;
      const newTracks = Array.isArray(data) ? data : data ? [data] : [];
      if (newTracks.length) {
        const normalized = newTracks.map(track => ({
          ...track,
          durationSeconds: track.durationSeconds ?? track.duration ?? 0,
        }));
        tracks.value = [...normalized, ...tracks.value];
        if (!currentTrackId.value && normalized.length) {
          currentTrackId.value = normalized[0].id;
        }
      }
    } catch (err) {
      console.error('上传音乐失败:', err);
      error.value = err?.message || '上传失败';
      throw err;
    } finally {
      uploadingState.uploading = false;
      setTimeout(() => {
        uploadingState.progress = 0;
        uploadingState.loaded = 0;
        uploadingState.total = 0;
        uploadingState.filename = '';
      }, 1200);
    }
  }

  function setSearch(query) {
    searchQuery.value = query;
  }

  function teardown() {
    if (audioEl.value) {
      detachAudioEvents(audioEl.value);
      audioEl.value.pause?.();
      audioEl.value.src = '';
    }
  }

  onBeforeUnmount(() => {
    teardown();
  });

  return {
    // state
    tracks,
    filteredTracks,
    loading,
    searchQuery,
    currentTrack,
    currentTrackId,
    currentStreamUrl,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    muted,
    repeatMode,
    shuffle,
    deletingIds,
    uploadingState,
    error,

    // methods
    initialize,
    fetchTracks,
    playTrack,
    playNext,
    playPrevious,
    playCurrent,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    deleteTrack,
    renameTrack,
    uploadTracks,
    setSearch,
    setAudioElement,
    teardown,
  };
}
