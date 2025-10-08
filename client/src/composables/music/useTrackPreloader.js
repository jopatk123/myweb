import { musicApi } from '@/api/music.js';

export function useTrackPreloader(state) {
  let cacheRecord = null;
  let fetchController = null;

  function resetState() {
    state.prefetching.status = 'idle';
    state.prefetching.trackId = null;
  }

  function revokeCache({ force = false } = {}) {
    if (!cacheRecord) return;
    const playingId = state.currentTrackId?.value ?? null;
    if (!force && playingId && cacheRecord.trackId === Number(playingId)) {
      return;
    }
    if (cacheRecord.objectUrl) {
      URL.revokeObjectURL(cacheRecord.objectUrl);
    }
    cacheRecord = null;
  }

  async function prefetch(track, options = {}) {
    if (!track || !track.id) return null;
    if (cacheRecord?.trackId === track.id) {
      return cacheRecord;
    }

    if (fetchController) {
      fetchController.abort();
      fetchController = null;
    }

    const shouldForceRelease = !options.retainCurrent;
    if (cacheRecord) {
      revokeCache({ force: shouldForceRelease });
    }

    fetchController = new AbortController();
    state.prefetching.status = 'running';
    state.prefetching.trackId = track.id;

    try {
      const url = musicApi.streamUrl(track.id);
      const response = await fetch(url, {
        signal: fetchController.signal,
        cache: 'force-cache',
      });
      if (!response.ok) {
        throw new Error(`预加载失败: ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      cacheRecord = {
        trackId: track.id,
        objectUrl,
        mimeType: response.headers.get('Content-Type') || blob.type,
        size: blob.size,
      };
      state.prefetching.status = 'success';
      return cacheRecord;
    } catch (error) {
      if (fetchController?.signal?.aborted) {
        resetState();
      } else {
        console.warn('下一首音乐预加载失败:', error?.message || error);
        state.prefetching.status = 'error';
      }
      return null;
    } finally {
      fetchController = null;
    }
  }

  function getPrefetched(trackId) {
    if (!cacheRecord) return null;
    return Number(cacheRecord.trackId) === Number(trackId) ? cacheRecord : null;
  }

  function consume(trackId) {
    const record = getPrefetched(trackId);
    if (!record) return null;
    cacheRecord = null;
    resetState();
    return record;
  }

  function release(trackId, { force = false } = {}) {
    if (!cacheRecord) return;
    if (
      trackId === undefined ||
      trackId === null ||
      Number(cacheRecord.trackId) === Number(trackId)
    ) {
      revokeCache({ force });
      resetState();
    }
  }

  function abort() {
    if (fetchController) {
      fetchController.abort();
      fetchController = null;
      resetState();
    }
  }

  function teardown() {
    abort();
    revokeCache({ force: true });
    resetState();
  }

  return {
    prefetch,
    getPrefetched,
    consume,
    release,
    abort,
    teardown,
  };
}
