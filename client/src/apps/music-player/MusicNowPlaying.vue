<template>
  <section class="now-playing">
    <div v-if="track" class="content">
      <div class="cover">
        <span>{{ coverEmoji }}</span>
      </div>
      <div class="info">
        <h3>{{ track.title || '未命名' }}</h3>
        <p class="meta">
          {{ track.artist || '未知艺术家' }}
          <template v-if="track.album"> · {{ track.album }}</template>
        </p>
        <p v-if="track.genre" class="genre">{{ track.genre }}</p>
      </div>
      <div class="status">
        <span class="badge" :class="{ playing: isPlaying }">
          {{ isPlaying ? '正在播放' : '已暂停' }}
        </span>
        <span class="time">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </span>
      </div>
    </div>
    <div v-else class="empty">选择一首音乐开始播放</div>
  </section>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    track: {
      type: Object,
      default: null,
    },
    currentTime: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: 0,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
  });

  const coverEmoji = computed(() => {
    if (!props.track) return '🎵';
    const title = props.track.title || '';
    if (/love|❤/i.test(title)) return '❤️';
    if (/night/i.test(title)) return '🌙';
    if (/sun|day/i.test(title)) return '🌞';
    if (/rain/i.test(title)) return '🌧';
    return '🎶';
  });

  function formatTime(value) {
    const seconds = Number(value) || 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
</script>

<style scoped>
  .now-playing {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    min-height: 90px;
  }

  .content {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    align-items: center;
    width: 100%;
    gap: 16px;
  }

  .cover {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
  }

  .info h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .info .meta {
    margin: 4px 0 0;
    opacity: 0.75;
    font-size: 14px;
  }

  .genre {
    margin: 4px 0 0;
    font-size: 12px;
    opacity: 0.65;
  }

  .status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    font-size: 12px;
  }

  .badge.playing {
    background: rgba(255, 215, 64, 0.85);
    color: #1f1c2c;
  }

  .time {
    font-size: 12px;
    opacity: 0.75;
  }

  .empty {
    width: 100%;
    text-align: center;
    opacity: 0.7;
  }
</style>
