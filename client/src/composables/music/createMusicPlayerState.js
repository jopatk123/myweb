import { computed, reactive, ref } from 'vue';

export function createMusicPlayerState() {
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

  return {
    tracks,
    filteredTracks,
    loading,
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
  };
}
