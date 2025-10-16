import { onBeforeUnmount } from 'vue';
import { createMusicPlayerState } from './music/createMusicPlayerState.js';
import { useMusicSettings } from './music/useMusicSettings.js';
import { useAudioController } from './music/useAudioController.js';
import { useTrackActions } from './music/useTrackActions.js';

export function useMusicPlayer() {
  const state = createMusicPlayerState();
  const settingsManager = useMusicSettings({
    volume: state.volume,
    repeatMode: state.repeatMode,
    shuffle: state.shuffle,
  });
  const audioController = useAudioController(state, {
    settings: settingsManager,
  });
  const trackActions = useTrackActions(state);
  let disposed = false;
  async function initialize() {
    settingsManager.restoreSettings();
    await trackActions.fetchTracks({ refreshGroups: true });
  }

  function teardown() {
    if (disposed) return;
    disposed = true;
    audioController.teardown();
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
