import { onBeforeUnmount } from 'vue';
import { createMusicPlayerState } from './music/createMusicPlayerState.js';
import { useMusicSettings } from './music/useMusicSettings.js';
import { useAudioController } from './music/useAudioController.js';
import { useTrackActions } from './music/useTrackActions.js';
import { useTrackPreloader } from './music/useTrackPreloader.js';

export function useMusicPlayer() {
  const state = createMusicPlayerState();
  const settingsManager = useMusicSettings({
    volume: state.volume,
    repeatMode: state.repeatMode,
    shuffle: state.shuffle,
  });
  const preloader = useTrackPreloader(state);
  const audioController = useAudioController(state, {
    settings: settingsManager,
    preloader,
  });
  const trackActions = useTrackActions(state, { preloader });
  let disposed = false;
  async function initialize() {
    settingsManager.restoreSettings();
    await trackActions.fetchTracks({ refreshGroups: true });
    if (state.tracks.value.length) {
      preloader
        .prefetch(state.tracks.value[0], { retainCurrent: true })
        .catch(() => {});
    }
  }

  function teardown() {
    if (disposed) return;
    disposed = true;
    audioController.teardown();
    preloader.teardown();
  }

  onBeforeUnmount(() => {
    teardown();
  });

  return {
    // state
    tracks: state.tracks,
    filteredTracks: state.filteredTracks,
    groupedTracks: state.groupedTracks,
    loading: state.loading,
    groups: state.groups,
    groupsLoading: state.groupsLoading,
    searchQuery: state.searchQuery,
    currentTrack: state.currentTrack,
    currentTrackId: state.currentTrackId,
    currentStreamUrl: state.currentStreamUrl,
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
    currentTime: state.currentTime,
    duration: state.duration,
    volume: state.volume,
    muted: state.muted,
    repeatMode: state.repeatMode,
    shuffle: state.shuffle,
    deletingIds: state.deletingIds,
    uploadingState: state.uploadingState,
    error: state.error,
    currentIndex: state.currentIndex,
    activeGroupId: state.activeGroupId,
    prefetching: state.prefetching,
    compressionState: state.compressionState,

    // methods
    initialize,
    fetchTracks: trackActions.fetchTracks,
    fetchGroups: trackActions.fetchGroups,
    createGroup: trackActions.createGroup,
    renameGroup: trackActions.renameGroup,
    deleteGroup: trackActions.deleteGroup,
    setActiveGroup: trackActions.setActiveGroup,
    moveTrackToGroup: trackActions.moveTrackToGroup,
    playTrack: audioController.playTrack,
    playNext: audioController.playNext,
    playPrevious: audioController.playPrevious,
    playCurrent: audioController.playCurrent,
    togglePlay: audioController.togglePlay,
    seekTo: audioController.seekTo,
    setVolume: audioController.setVolume,
    toggleMute: audioController.toggleMute,
    toggleShuffle: audioController.toggleShuffle,
    cycleRepeatMode: audioController.cycleRepeatMode,
    deleteTrack: trackActions.deleteTrack,
    renameTrack: trackActions.renameTrack,
    uploadTracks: trackActions.uploadTracks,
    setSearch: trackActions.setSearch,
    setAudioElement: audioController.setAudioElement,
    teardown,
  };
}
