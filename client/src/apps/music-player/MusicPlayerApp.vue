<template>
  <div class="music-player-app">
    <header class="app-header">
      <div class="header-left">
        <h2>音乐播放器</h2>
        <span class="track-count">{{ tracks.length }} 首曲目</span>
        <span
          v-if="prefetching.status === 'running'"
          class="prefetch-indicator"
        >
          ⚡ 正在预加载下一首
        </span>
        <span
          v-else-if="prefetching.status === 'success'"
          class="prefetch-indicator ok"
        >
          ✅ 下一首已缓存
        </span>
        <span
          v-else-if="prefetching.status === 'error'"
          class="prefetch-indicator error"
        >
          ⚠️ 预加载失败
        </span>
      </div>
      <div class="header-actions">
        <div class="group-selector" v-if="groupOptions.length">
          <label for="music-group-select">歌单</label>
          <select
            id="music-group-select"
            v-model="selectedGroup"
            :disabled="groupsLoading"
            @change="onGroupChange"
          >
            <option value="all">全部歌曲</option>
            <option
              v-for="group in groupOptions"
              :key="group.id"
              :value="group.id"
            >
              {{ group.name }} ({{ group.trackCount }})
            </option>
          </select>
          <button
            class="icon-button"
            type="button"
            :disabled="groupsLoading"
            @click="createGroup"
          >
            ➕
          </button>
          <button
            class="icon-button"
            type="button"
            :disabled="groupsLoading || !currentGroup || currentGroup.isDefault"
            @click="renameCurrentGroup"
          >
            ✏️
          </button>
          <button
            class="icon-button danger"
            type="button"
            :disabled="groupsLoading || !currentGroup || currentGroup.isDefault"
            @click="deleteCurrentGroup"
          >
            🗑
          </button>
        </div>
        <label class="search-box">
          <span class="icon">🔍</span>
          <input
            v-model="searchModel"
            type="search"
            placeholder="搜索歌曲、歌手或专辑"
          />
        </label>
        <button class="upload-button" type="button" @click="triggerUpload">
          上传音乐
        </button>
        <input
          ref="fileInputEl"
          type="file"
          class="hidden"
          accept="audio/*"
          multiple
          @change="handleFilesSelected"
        />
      </div>
    </header>

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

    <transition name="fade">
      <div v-if="uploadingState.uploading" class="upload-progress">
        <div class="progress-card">
          <p>正在上传：{{ uploadingState.filename }}</p>
          <div class="progress-bar">
            <div
              class="progress-inner"
              :style="{ width: `${uploadingState.progress}%` }"
            ></div>
          </div>
          <p class="progress-meta">
            {{ uploadingState.progress }}% ({{
              formatBytes(uploadingState.loaded)
            }}/ {{ formatBytes(uploadingState.total) }})
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
  import MusicLibrary from './MusicLibrary.vue';
  import MusicPlayerControls from './MusicPlayerControls.vue';
  import MusicNowPlaying from './MusicNowPlaying.vue';
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
    prefetching,
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

  function onGroupChange() {
    setActiveGroup(selectedGroup.value);
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

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }
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
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .header-left h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .track-count {
    font-size: 14px;
    opacity: 0.75;
  }

  .prefetch-indicator {
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 999px;
    background-color: rgba(255, 255, 255, 0.12);
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .prefetch-indicator.ok {
    background-color: rgba(76, 175, 80, 0.2);
  }

  .prefetch-indicator.error {
    background-color: rgba(244, 67, 54, 0.2);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .group-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.85);
  }

  .group-selector label {
    font-size: 12px;
    opacity: 0.9;
  }

  .group-selector select {
    border: none;
    border-radius: 999px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.25);
    color: inherit;
    outline: none;
  }

  .group-selector .icon-button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.18);
    color: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .group-selector .icon-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.28);
  }

  .group-selector .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .search-box {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    gap: 6px;
    color: rgba(255, 255, 255, 0.75);
  }

  .search-box input {
    border: none;
    background: transparent;
    color: inherit;
    outline: none;
    min-width: 220px;
  }

  .upload-button {
    padding: 8px 18px;
    border-radius: 999px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .upload-button:hover {
    background: rgba(255, 255, 255, 0.3);
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

  .upload-progress {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    pointer-events: none;
  }

  .progress-card {
    width: 320px;
    margin-bottom: 24px;
    padding: 16px;
    border-radius: 16px;
    background: rgba(15, 15, 22, 0.85);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
  }

  .progress-card p {
    margin: 0;
  }

  .progress-bar {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    overflow: hidden;
    margin-top: 8px;
  }

  .progress-inner {
    height: 100%;
    background: linear-gradient(90deg, #ff8a65, #ffd54f);
    transition: width 0.2s ease;
  }

  .progress-meta {
    margin-top: 6px;
    font-size: 12px;
    opacity: 0.7;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
