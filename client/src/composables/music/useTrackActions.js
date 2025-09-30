import { musicApi } from '@/api/music.js';

function normaliseTrack(track) {
  return {
    ...track,
    durationSeconds: track.durationSeconds ?? track.duration ?? 0,
  };
}

export function useTrackActions(state) {
  const {
    tracks,
    currentTrackId,
    currentStreamUrl,
    loading,
    error,
    deletingIds,
    uploadingState,
    searchQuery,
    audioEl,
  } = state;

  async function fetchTracks() {
    loading.value = true;
    error.value = '';
    try {
      const resp = await musicApi.listTracks();
      const list = resp?.data?.tracks || [];
      tracks.value = list.map(normaliseTrack);
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
        track.id === id ? normaliseTrack({ ...track, ...updated }) : track
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
        const normalised = newTracks.map(normaliseTrack);
        tracks.value = [...normalised, ...tracks.value];
        if (!currentTrackId.value && normalised.length) {
          currentTrackId.value = normalised[0].id;
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

  return {
    fetchTracks,
    deleteTrack,
    renameTrack,
    uploadTracks,
    setSearch,
  };
}
