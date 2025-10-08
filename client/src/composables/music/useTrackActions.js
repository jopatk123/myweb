import { musicApi } from '@/api/music.js';
import {
  prepareCompressedFiles,
  shouldCompressFile,
} from '@/services/audioCompression.js';

function normaliseTrack(track) {
  const groupId = track.group?.id ?? track.group_id ?? track.groupId ?? null;
  const groupName =
    track.group?.name ?? track.group_name ?? track.groupName ?? null;
  const groupIsDefault =
    track.group?.isDefault ?? track.group_is_default ?? track.groupIsDefault;
  return {
    ...track,
    durationSeconds: track.durationSeconds ?? track.duration ?? 0,
    group: groupId
      ? {
          id: Number(groupId),
          name: groupName || '默认歌单',
          isDefault: !!groupIsDefault,
        }
      : null,
  };
}

export function useTrackActions(state, { preloader } = {}) {
  const {
    tracks,
    groups,
    groupsLoading,
    activeGroupId,
    currentTrackId,
    currentStreamUrl,
    loading,
    error,
    deletingIds,
    uploadingState,
    searchQuery,
    audioEl,
    compressionState,
  } = state;

  async function fetchTracks({ refreshGroups = false } = {}) {
    loading.value = true;
    error.value = '';
    try {
      const resp = await musicApi.listTracks({ includeGroups: true });
      const list = resp?.data?.tracks || [];
      tracks.value = list.map(normaliseTrack);
      const groupPayload = resp?.data?.groups || [];
      if (groupPayload.length || refreshGroups) {
        groups.value = groupPayload.map(group => ({
          id: group.id,
          name: group.name,
          isDefault: !!group.isDefault,
          trackCount: group.trackCount ?? 0,
        }));
        if (
          groups.value.length &&
          (activeGroupId.value === null ||
            groups.value.every(group => group.id !== activeGroupId.value))
        ) {
          activeGroupId.value = 'all';
        }
      }
      if (!tracks.value.length) {
        currentTrackId.value = null;
        currentStreamUrl.value = '';
        preloader?.release(undefined, { force: true });
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

  async function fetchGroups() {
    groupsLoading.value = true;
    try {
      const resp = await musicApi.listGroups();
      const list = resp?.data || [];
      groups.value = list.map(group => ({
        id: group.id,
        name: group.name,
        isDefault: !!group.isDefault,
        trackCount: group.trackCount ?? 0,
      }));
      if (
        groups.value.length &&
        activeGroupId.value !== 'all' &&
        activeGroupId.value !== null &&
        !groups.value.some(group => group.id === Number(activeGroupId.value))
      ) {
        activeGroupId.value = 'all';
      }
    } catch (err) {
      console.error('加载歌单分组失败:', err);
      error.value = err?.message || '加载歌单分组失败';
    } finally {
      groupsLoading.value = false;
    }
  }

  async function createGroup(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    try {
      const resp = await musicApi.createGroup(trimmed);
      const created = resp?.data;
      if (created) {
        groups.value = [
          ...groups.value,
          {
            id: created.id,
            name: created.name,
            isDefault: !!created.isDefault,
            trackCount: created.trackCount ?? 0,
          },
        ];
        await fetchGroups();
      }
      return created;
    } catch (err) {
      console.error('创建歌单失败:', err);
      error.value = err?.message || '创建歌单失败';
      throw err;
    }
  }

  async function renameGroup(id, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    try {
      const resp = await musicApi.renameGroup(id, trimmed);
      const updated = resp?.data;
      if (updated) {
        groups.value = groups.value.map(group =>
          group.id === id
            ? {
                ...group,
                name: updated.name,
              }
            : group
        );
      }
      return updated;
    } catch (err) {
      console.error('重命名歌单失败:', err);
      error.value = err?.message || '重命名歌单失败';
      throw err;
    }
  }

  async function deleteGroup(id) {
    try {
      await musicApi.deleteGroup(id);
      groups.value = groups.value.filter(group => group.id !== id);
      tracks.value = tracks.value.map(track => {
        if (
          Number(track.group?.id ?? track.group_id ?? track.groupId) ===
          Number(id)
        ) {
          return normaliseTrack({
            ...track,
            group: null,
            group_id: null,
            groupId: null,
          });
        }
        return track;
      });
      if (Number(activeGroupId.value) === Number(id)) {
        activeGroupId.value = 'all';
      }
      await fetchGroups();
    } catch (err) {
      console.error('删除歌单失败:', err);
      error.value = err?.message || '删除歌单失败';
      throw err;
    }
  }

  function setActiveGroup(groupId) {
    if (groupId === 'all' || groupId === null || groupId === undefined) {
      activeGroupId.value = 'all';
      return;
    }
    activeGroupId.value = Number(groupId);
  }

  async function moveTrackToGroup(id, groupId) {
    try {
      const resp = await musicApi.moveTrack(id, groupId);
      const updated = resp?.data;
      if (!updated) return null;
      tracks.value = tracks.value.map(track =>
        track.id === id ? normaliseTrack({ ...track, ...updated }) : track
      );
      await fetchGroups();
      return updated;
    } catch (err) {
      console.error('移动歌曲到歌单失败:', err);
      error.value = err?.message || '移动歌曲失败';
      throw err;
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
      preloader?.release(id, { force: true });
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
      await fetchGroups();
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

  async function uploadTracks(files, options = {}) {
    if (!files || !files.length) return;
    const fileArray = Array.isArray(files) ? Array.from(files) : [files];
    compressionState.running = false;
    compressionState.progress = 0;
    compressionState.currentFile = '';
    uploadingState.uploading = true;
    uploadingState.progress = 0;
    uploadingState.loaded = 0;
    uploadingState.total = 0;
    uploadingState.filename = fileArray[0]?.name || '';
    try {
      let processedFiles = fileArray;
      let compressionMeta = null;
      const requiresCompression = fileArray.some(shouldCompressFile);

      if (requiresCompression) {
        compressionState.running = true;
        compressionState.progress = 0;
        compressionState.currentFile = '';
        try {
          const result = await prepareCompressedFiles(fileArray, {
            onFileStart: ({ file, index, total }) => {
              compressionState.currentFile = file.name;
              compressionState.progress = Math.round((index / total) * 100);
            },
            onProgress: ({ ratio = 0, index, total }) => {
              const value = ((index + ratio) / total) * 100;
              compressionState.progress = Math.min(100, Math.round(value));
            },
          });
          processedFiles = result.files;
          compressionMeta = result.compression;
        } catch (err) {
          console.warn(
            '音频压缩失败，将使用原始文件上传:',
            err?.message || err
          );
          processedFiles = fileArray;
          compressionMeta = null;
        } finally {
          compressionState.running = false;
          compressionState.progress = 0;
          compressionState.currentFile = '';
        }
      }

      const requestOptions = {
        ...options,
      };
      if (compressionMeta) {
        requestOptions.compression = compressionMeta;
      }

      const resp = await musicApi.uploadTracks(
        processedFiles,
        (progress, loaded, total) => {
          uploadingState.progress = progress;
          uploadingState.loaded = loaded;
          uploadingState.total = total;
        },
        requestOptions
      );
      const data = resp?.data;
      const newTracks = Array.isArray(data) ? data : data ? [data] : [];
      if (newTracks.length) {
        const normalised = newTracks.map(normaliseTrack);
        tracks.value = [...normalised, ...tracks.value];
        if (
          options.groupId &&
          Number(activeGroupId.value) !== options.groupId
        ) {
          activeGroupId.value = options.groupId;
        }
        if (!currentTrackId.value && normalised.length) {
          currentTrackId.value = normalised[0].id;
        }
        await fetchGroups();
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
    fetchGroups,
    createGroup,
    renameGroup,
    deleteGroup,
    setActiveGroup,
    moveTrackToGroup,
    deleteTrack,
    renameTrack,
    uploadTracks,
    setSearch,
  };
}
