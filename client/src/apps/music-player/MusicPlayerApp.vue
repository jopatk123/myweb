<template>
  <div class="music-player-app">
    <header class="app-header">
      <div class="header-left">
        <h2>音乐播放器</h2>
        <span class="track-count">{{ tracks.length }} 首曲目</span>
      </div>
      <div class="header-actions">
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
      :current-track-id="currentTrack?.id || null"
      :is-playing="isPlaying"
      :deleting-ids="deletingIds"
      :loading="loading"
      @play-track="playTrack"
      @delete-track="deleteTrack"
      @rename-track="renameTrack"
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
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
    loading,
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
  } = player;

  const searchModel = computed({
    get: () => player.searchQuery.value,
    set: value => player.setSearch(value),
  });

  function triggerUpload() {
    fileInputEl.value?.click();
  }

  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      await player.uploadTracks(files);
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

  onMounted(async () => {
    if (audioEl.value) {
      player.setAudioElement(audioEl.value);
    }
    await player.initialize();
  });

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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
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
