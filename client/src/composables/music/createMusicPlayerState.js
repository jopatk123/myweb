import { computed, reactive, ref } from 'vue';

export function createMusicPlayerState() {
  const tracks = ref([]);
  const loading = ref(false);
  const groups = ref([]);
  const groupsLoading = ref(false);
  const activeGroupId = ref(null);
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
  const repeatMode = ref('none');
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
  const prefetching = reactive({
    status: 'idle',
    trackId: null,
  });
  const compressionState = reactive({
    running: false,
    progress: 0,
    currentFile: '',
  });

  const currentTrack = computed(
    () => tracks.value.find(track => track.id === currentTrackId.value) || null
  );

  const currentIndex = computed(() =>
    tracks.value.findIndex(track => track.id === currentTrackId.value)
  );

  const filteredTracks = computed(() => {
    const baseList = (() => {
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
    })();

    if (activeGroupId.value === null || activeGroupId.value === 'all') {
      return baseList;
    }

    return baseList.filter(track => {
      const gid = track.group?.id ?? track.group_id ?? track.groupId ?? null;
      return Number(gid) === Number(activeGroupId.value);
    });
  });

  const groupedTracks = computed(() => {
    const buckets = new Map();
    const groupMeta = groups.value.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {});

    for (const track of filteredTracks.value) {
      const gid = track.group?.id ?? track.group_id ?? track.groupId ?? 0;
      const meta = groupMeta[gid] || {
        id: gid,
        name: track.group?.name || '未分组',
        isDefault: track.group?.isDefault || false,
      };
      if (!buckets.has(meta.id)) {
        buckets.set(meta.id, {
          group: meta,
          tracks: [],
        });
      }
      buckets.get(meta.id).tracks.push(track);
    }

    return Array.from(buckets.values());
  });

  return {
    tracks,
    filteredTracks,
    groupedTracks,
    loading,
    groups,
    groupsLoading,
    activeGroupId,
    searchQuery,
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
    deletingIds,
    uploadingState,
    error,
    currentIndex,
    prefetching,
    compressionState,
  };
}
