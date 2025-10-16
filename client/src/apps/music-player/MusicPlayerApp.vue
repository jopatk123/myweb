<template>
  <div class="music-player-app">
    <MusicPlayerHeader
      :track-count="tracks.length"
      :group-options="groupOptions"
      :selected-group="selectedGroup"
      :groups-loading="groupsLoading"
      :current-group="currentGroup"
      :search="searchModel.value"
      @update:search="value => (searchModel.value = value)"
      @group-change="handleGroupChange"
      @create-group="createGroup"
      @rename-group="renameCurrentGroup"
      @delete-group="deleteCurrentGroup"
      @request-upload="triggerUpload"
    />
    <input
      ref="fileInputEl"
      type="file"
      class="hidden"
      accept="audio/*"
      multiple
      @change="handleFilesSelected"
    />

    <section v-if="error.value" class="error-banner">
      {{ error.value }}
    </section>

    <MusicLibrary
      :tracks="filteredTracks"
      :grouped-tracks="groupedTracks"
      :current-track-id="currentTrack?.id || null"
      :is-playing="isPlaying"
      :deleting-ids="deletingIds"
      :loading="loading"
      :groups="groups"
      :active-group-id="activeGroupId"
      @play-track="playTrack"
      @delete-track="deleteTrack"
      @rename-track="renameTrack"
      @move-track="moveTrack"
    />

    <MusicNowPlaying
      :track="currentTrack"
      :current-time="currentTime"
      :duration="duration"
      :is-playing="isPlaying"
    />

    <MusicPlayerControls
      :is-playing="isPlaying"
      :is-buffering="isBuffering"
      :current-time="currentTime"
      :duration="duration"
      :volume="volume"
      :muted="muted"
      :repeat-mode="repeatMode"
      :shuffle="shuffle"
      :can-play-next="tracks.length > 1"
      @toggle-play="togglePlay"
      @next="playNext"
      @previous="playPrevious"
      @seek="seekTo"
      @volume-change="setVolume"
      @toggle-mute="toggleMute"
      @toggle-shuffle="toggleShuffle"
      @toggle-repeat="cycleRepeatMode"
    />

    <audio ref="audioEl" class="audio-element" preload="auto"></audio>

    <UploadProgressOverlay :uploading-state="uploadingState" />
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
  import MusicLibrary from './MusicLibrary.vue';
  import MusicPlayerControls from './MusicPlayerControls.vue';
  import MusicNowPlaying from './MusicNowPlaying.vue';
  import MusicPlayerHeader from './components/MusicPlayerHeader.vue';
  import UploadProgressOverlay from './components/UploadProgressOverlay.vue';
  import { useMusicPlayer } from '@/composables/useMusicPlayer.js';

  const fileInputEl = ref(null);
  const audioEl = ref(null);

  const player = useMusicPlayer();

  const {
    tracks,
    filteredTracks,
    groupedTracks,
    loading,
    groups,
    groupsLoading,
    currentTrack,
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
    activeGroupId,
    setActiveGroup,
    createGroup: createGroupApi,
    renameGroup,
    deleteGroup,
    moveTrackToGroup,
  } = player;

  const searchModel = computed({
    get: () => player.searchQuery.value,
    set: value => player.setSearch(value),
  });

  const selectedGroup = ref('all');

  const groupOptions = computed(() =>
    (groups.value || []).map(group => ({
      id: group.id,
      name: group.name,
      trackCount: group.trackCount ?? 0,
      isDefault: !!group.isDefault,
    }))
  );

  const currentGroup = computed(() => {
    if (selectedGroup.value === 'all') return null;
    return groupOptions.value.find(
      group => Number(group.id) === Number(selectedGroup.value)
    );
  });

  const uploadGroupId = computed(() => {
    if (selectedGroup.value === 'all') return null;
    const numeric = Number(selectedGroup.value);
    return Number.isNaN(numeric) ? null : numeric;
  });

  function triggerUpload() {
    fileInputEl.value?.click();
  }

  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      await player.uploadTracks(files, {
        groupId: uploadGroupId.value,
      });
    } finally {
      event.target.value = '';
    }
  }

  function playTrack(track) {
    player.playTrack(track);
  }

  function deleteTrack(id) {
    player.deleteTrack(id);
  }

  async function renameTrack({ id, title, artist, album }) {
    const payload = {};
    if (title !== undefined) payload.title = title;
    if (artist !== undefined) payload.artist = artist;
    if (album !== undefined) payload.album = album;
    if (Object.keys(payload).length) {
      await player.renameTrack(id, payload);
    }
  }

  function togglePlay() {
    player.togglePlay();
  }
  function playNext() {
    player.playNext();
  }
  function playPrevious() {
    player.playPrevious();
  }
  function seekTo(value) {
    player.seekTo(value);
  }
  function setVolume(value) {
    player.setVolume(value);
  }
  function toggleMute() {
    player.toggleMute();
  }
  function toggleShuffle() {
    player.toggleShuffle();
  }
  function cycleRepeatMode() {
    player.cycleRepeatMode();
  }

  function handleGroupChange(value) {
    selectedGroup.value = value;
    setActiveGroup(value);
  }

  async function createGroup() {
    const name = window.prompt('请输入新的歌单名称');
    if (!name) return;
    const created = await createGroupApi(name);
    if (created?.id) {
      selectedGroup.value = created.id;
      setActiveGroup(created.id);
    }
  }

  async function renameCurrentGroup() {
    if (!currentGroup.value) return;
    const name = window.prompt('重命名歌单', currentGroup.value.name);
    if (!name || name.trim() === currentGroup.value.name) return;
    await renameGroup(currentGroup.value.id, name.trim());
  }

  async function deleteCurrentGroup() {
    if (!currentGroup.value) return;
    if (!window.confirm('确认删除该歌单？其中的歌曲将移动到默认歌单。')) {
      return;
    }
    await deleteGroup(currentGroup.value.id);
    selectedGroup.value = 'all';
    setActiveGroup('all');
  }

  async function moveTrack({ id, groupId }) {
    await moveTrackToGroup(id, groupId);
  }

  onMounted(async () => {
    if (audioEl.value) {
      player.setAudioElement(audioEl.value);
    }
    await player.initialize();
    if (activeGroupId.value && activeGroupId.value !== 'all') {
      selectedGroup.value = activeGroupId.value;
    } else {
      selectedGroup.value = 'all';
    }
  });

  watch(
    () => activeGroupId.value,
    value => {
      if (value === null || value === undefined || value === 'all') {
        selectedGroup.value = 'all';
      } else {
        selectedGroup.value = value;
      }
    }
  );

  onBeforeUnmount(() => {
    player.teardown();
  });
</script>

<style scoped>
  .music-player-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #1f1c2c 0%, #928dab 100%);
    color: #fff;
    gap: 12px;
    overflow: hidden;
    position: relative;
  }

  .hidden {
    display: none;
  }

  .error-banner {
    padding: 10px 16px;
    border-radius: 12px;
    background: rgba(255, 87, 87, 0.2);
    color: #ffeceb;
    font-size: 14px;
  }

  .audio-element {
    display: none;
  }
</style>
