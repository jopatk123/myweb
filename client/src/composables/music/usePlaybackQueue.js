export function usePlaybackQueue(state) {
  const { tracks, currentIndex, repeatMode, shuffle } = state;

  function nextIndex() {
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

  function previousIndex() {
    if (!tracks.value.length) return -1;
    if (shuffle.value) {
      return nextIndex();
    }
    const prevIdx = currentIndex.value - 1;
    if (prevIdx < 0) {
      return repeatMode.value === 'all' ? tracks.value.length - 1 : -1;
    }
    return prevIdx;
  }

  function nextTrack() {
    const idx = nextIndex();
    if (idx === -1) return null;
    return tracks.value[idx] ?? null;
  }

  function previousTrack() {
    const idx = previousIndex();
    if (idx === -1) return null;
    return tracks.value[idx] ?? null;
  }

  function shouldRepeatCurrent() {
    return repeatMode.value === 'one';
  }

  function shouldLoopAll() {
    return repeatMode.value === 'all';
  }

  function isShuffleEnabled() {
    return !!shuffle.value;
  }

  return {
    nextIndex,
    previousIndex,
    nextTrack,
    previousTrack,
    shouldRepeatCurrent,
    shouldLoopAll,
    isShuffleEnabled,
  };
}
