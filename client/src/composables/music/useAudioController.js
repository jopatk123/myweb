import { musicApi } from '@/api/music.js';
import { clamp } from './utils.js';

export function useAudioController(state, { settings } = {}) {
  const {
    tracks,
    currentTrack,
    currentTrackId,
    currentStreamUrl,
    audioEl,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    muted,
    repeatMode,
    shuffle,
    error,
    currentIndex,
  } = state;

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

  function playCurrent() {
    if (currentTrack.value) {
      playTrack(currentTrack.value);
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
    if (settings) settings.volume = next;
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
    if (settings) settings.shuffle = shuffle.value;
  }

  function cycleRepeatMode() {
    repeatMode.value =
      repeatMode.value === 'none'
        ? 'all'
        : repeatMode.value === 'all'
          ? 'one'
          : 'none';
    if (settings) settings.repeatMode = repeatMode.value;
  }

  function teardown() {
    if (audioEl.value) {
      detachAudioEvents(audioEl.value);
      audioEl.value.pause?.();
      audioEl.value.src = '';
    }
  }

  return {
    setAudioElement,
    playTrack,
    playCurrent,
    togglePlay,
    seekTo,
    playNext,
    playPrevious,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    teardown,
  };
}
