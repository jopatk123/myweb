<template>
  <div class="music-controls">
    <div class="time-row">
      <span>{{ formatTime(currentTime) }}</span>
      <input
        type="range"
        min="0"
        :max="duration || 0"
        :value="currentTime"
        @input="emitSeek($event.target.value)"
      />
      <span>{{ formatTime(duration) }}</span>
    </div>

    <div class="controls-row">
      <div class="left-controls">
        <button
          class="round-btn"
          type="button"
          @click="$emit('toggle-shuffle')"
        >
          <span :class="{ active: shuffle }">🔀</span>
        </button>
        <button class="round-btn" type="button" @click="$emit('previous')">
          ⏮
        </button>
        <button
          class="play-btn"
          type="button"
          :class="{ buffering: isBuffering }"
          @click="$emit('toggle-play')"
        >
          <span v-if="isBuffering">⏳</span>
          <span v-else>{{ isPlaying ? '⏸' : '▶️' }}</span>
        </button>
        <button
          class="round-btn"
          type="button"
          :disabled="!canPlayNext"
          @click="$emit('next')"
        >
          ⏭
        </button>
        <button class="round-btn" type="button" @click="$emit('toggle-repeat')">
          <span :class="{ active: repeatMode !== 'none' }">
            {{ repeatLabel }}
          </span>
        </button>
      </div>

      <div class="right-controls">
        <button class="round-btn" type="button" @click="$emit('toggle-mute')">
          {{ muted || volume === 0 ? '🔇' : '🔊' }}
        </button>
        <input
          class="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="muted ? 0 : volume"
          @input="emitVolume($event.target.value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    isPlaying: { type: Boolean, default: false },
    isBuffering: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    volume: { type: Number, default: 1 },
    muted: { type: Boolean, default: false },
    repeatMode: { type: String, default: 'none' },
    shuffle: { type: Boolean, default: false },
    canPlayNext: { type: Boolean, default: true },
  });

  const emit = defineEmits([
    'toggle-play',
    'next',
    'previous',
    'seek',
    'volume-change',
    'toggle-shuffle',
    'toggle-repeat',
    'toggle-mute',
  ]);

  const repeatLabel = computed(() => {
    if (props.repeatMode === 'one') return '🔂';
    if (props.repeatMode === 'all') return '🔁';
    return '↻';
  });

  function formatTime(value) {
    const seconds = Number(value) || 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function emitSeek(value) {
    emit('seek', Number(value));
  }

  function emitVolume(value) {
    emit('volume-change', Number(value));
  }
</script>

<style scoped>
  .music-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.25);
  }

  .time-row {
    display: grid;
    grid-template-columns: 60px 1fr 60px;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
  }

  .time-row input[type='range'] {
    width: 100%;
  }

  .controls-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .left-controls,
  .right-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .round-btn,
  .play-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.2s ease,
      transform 0.2s ease;
  }

  .round-btn:hover,
  .play-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .play-btn {
    width: 56px;
    height: 56px;
    font-size: 22px;
    background: linear-gradient(135deg, #ff8a65, #ffcc80);
    color: #2b2535;
    font-weight: 700;
  }

  .play-btn.buffering {
    animation: pulse 1s ease-in-out infinite;
  }

  .round-btn span.active {
    color: #ffcc80;
  }

  .volume-slider {
    width: 120px;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
