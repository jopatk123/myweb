import { musicApi } from '@/api/music.js';
import { buildServerUrl } from '@/api/httpClient.js';
import { clamp } from './utils.js';

export function useAudioController(state, { settings, preloader } = {}) {
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

  let currentObjectUrl = null;
  let prefetchTimer = null;

  function cleanupCurrentObjectUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function clearPrefetchTimer() {
    if (prefetchTimer) {
      clearTimeout(prefetchTimer);
      prefetchTimer = null;
    }
  }

  function resolveStreamUrl(value) {
    if (!value) return '';
    return /^https?:/i.test(value) ? value : buildServerUrl(value);
  }

  function attachAudioEvents(el) {
    if (!el) return;

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('durationchange', handleDurationChange);
    el.addEventListener('pause', handlePause);
    el.addEventListener('playing', handlePlaying);
    el.addEventListener('waiting', handleWaiting);
    el.addEventListener('ended', handleEnded);
  }

  function detachAudioEvents(el) {
    if (!el) return;

    el.removeEventListener('timeupdate', handleTimeUpdate);
    el.removeEventListener('loadedmetadata', handleLoadedMetadata);
    el.removeEventListener('durationchange', handleDurationChange);
    el.removeEventListener('pause', handlePause);
    el.removeEventListener('playing', handlePlaying);
    el.removeEventListener('waiting', handleWaiting);
    el.removeEventListener('ended', handleEnded);
  }

  function normaliseDurationValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || Number.isNaN(numeric) || numeric <= 0) {
      return null;
    }
    return Math.round(numeric);
  }

  function extractTrackDuration(track) {
    if (!track) return null;
    const candidates = [
      track.durationSeconds,
      track.duration,
      track.duration_seconds,
      track.meta?.duration,
    ];
    for (const candidate of candidates) {
      const value = normaliseDurationValue(candidate);
      if (value !== null) {
        return value;
      }
    }
    return null;
  }

  function resolveElementDuration(el) {
    const direct = normaliseDurationValue(el?.duration);
    if (direct !== null) {
      return direct;
    }

    if (el?.seekable && el.seekable.length) {
      try {
        const end = el.seekable.end(el.seekable.length - 1);
        const fromSeekable = normaliseDurationValue(end);
        if (fromSeekable !== null) {
          return fromSeekable;
        }
      } catch (err) {
        console.debug('解析音频 seekable 时长失败', err);
      }
    }

    return extractTrackDuration(currentTrack.value);
  }

  function syncDurationFromElement() {
    if (!audioEl.value) return;
    const resolved = resolveElementDuration(audioEl.value);
    if (resolved !== null) {
      duration.value = resolved;
    } else if (currentTime.value > duration.value) {
      duration.value = currentTime.value;
    } else if (
      !Number.isFinite(duration.value) ||
      Number.isNaN(duration.value)
    ) {
      duration.value = 0;
    }
  }

  function handleTimeUpdate() {
    if (!audioEl.value) return;
    currentTime.value = Math.floor(audioEl.value.currentTime || 0);
    if (currentTime.value > duration.value) {
      duration.value = currentTime.value;
    }
  }

  function handleLoadedMetadata() {
    syncDurationFromElement();
  }

  function handleDurationChange() {
    syncDurationFromElement();
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
      cleanupCurrentObjectUrl();
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

    const trackDuration = extractTrackDuration(target);
    duration.value = trackDuration ?? 0;
    currentTime.value = 0;

    const stream = musicApi.streamUrl(target.id);
    const versionKey =
      target.updatedAt ??
      target.updated_at ??
      target.createdAt ??
      target.created_at ??
      Date.now();
    const shouldReload = currentStreamUrl.value !== stream;

    clearPrefetchTimer();
    const prefetched = preloader?.consume(target.id) || null;

    let nextSource;
    if (prefetched) {
      nextSource = prefetched.objectUrl;
    } else {
      const streamUrl = resolveStreamUrl(stream);
      const separator = streamUrl.includes('?') ? '&' : '?';
      nextSource = `${streamUrl}${separator}v=${versionKey}`;
    }

    currentTrackId.value = target.id;
    currentStreamUrl.value = stream;
    try {
      if (shouldReload) {
        cleanupCurrentObjectUrl();
        audioEl.value.src = nextSource;
      } else if (audioEl.value.src !== nextSource) {
        cleanupCurrentObjectUrl();
        audioEl.value.src = nextSource;
      }
      if (prefetched) {
        currentObjectUrl = prefetched.objectUrl;
      }
      if (!shouldReload && audioEl.value.src !== nextSource) {
        audioEl.value.src = nextSource;
      }
      await audioEl.value.play();
      isPlaying.value = true;
      isBuffering.value = false;
      syncDurationFromElement();
      schedulePrefetch();
    } catch (err) {
      if (!prefetched) {
        const fallbackSource = resolveStreamUrl(stream);
        if (fallbackSource && audioEl.value.src !== fallbackSource) {
          try {
            cleanupCurrentObjectUrl();
            audioEl.value.src = fallbackSource;
            await audioEl.value.play();
            isPlaying.value = true;
            isBuffering.value = false;
            syncDurationFromElement();
            schedulePrefetch();
            return;
          } catch (fallbackErr) {
            console.error('播放失败(回退源):', fallbackErr);
          }
        }
      }
      console.error('播放失败:', err);
      error.value = err?.message || '无法播放该音频';
      if (prefetched && !currentObjectUrl) {
        URL.revokeObjectURL(prefetched.objectUrl);
      }
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
        const targetTrack =
          currentTrack.value || (tracks.value.length ? tracks.value[0] : null);
        if (!currentStreamUrl.value || !audioEl.value.src) {
          if (targetTrack) {
            await playTrack(targetTrack);
          }
          return;
        }
        await audioEl.value.play();
        isPlaying.value = true;
        isBuffering.value = false;
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

  function schedulePrefetch() {
    if (!preloader || shuffle.value || !tracks.value.length) {
      preloader?.release(undefined, { force: true });
      return;
    }

    const nextIdx = getNextIndex();
    if (nextIdx === -1) {
      preloader.release(undefined, { force: true });
      return;
    }

    const nextTrack = tracks.value[nextIdx];
    if (!nextTrack) return;

    clearPrefetchTimer();
    prefetchTimer = setTimeout(() => {
      preloader
        .prefetch(nextTrack, { retainCurrent: false })
        .catch(err => console.debug('预加载下一首失败', err));
    }, 2000);
  }

  function teardown() {
    clearPrefetchTimer();
    if (audioEl.value) {
      detachAudioEvents(audioEl.value);
      audioEl.value.pause?.();
      audioEl.value.src = '';
    }
    cleanupCurrentObjectUrl();
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
