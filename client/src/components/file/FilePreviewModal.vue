<template>
  <div v-if="modelValue" class="backdrop" @click.self="close">
    <div class="viewer">
      <div class="header">
        <div class="title">预览：{{ file?.original_name || '' }}</div>
        <button class="close" @click="close">✕</button>
      </div>
      <div class="content" :class="{ 'content-video': isVideo }">
        <img v-if="isImage" :src="previewUrl" class="media" />
        <div v-else-if="isVideo" class="video-wrap">
          <video
            ref="videoRef"
            :src="previewUrl"
            class="media video-el"
            preload="metadata"
            controls
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onLoadedMeta"
          />
          <div class="controls">
            <button class="btn" @click="togglePlay">
              {{ playing ? '暂停' : '播放' }}
            </button>
            <input
              class="seek"
              type="range"
              min="0"
              :max="duration"
              step="0.05"
              v-model.number="currentTime"
              @input="onSeek"
            />
            <div class="time">{{ timeText }}</div>
            <button class="btn" @click="toggleMute">
              {{ muted ? '🔇' : '🔊' }}
            </button>
          </div>
        </div>
        <div v-else-if="isWord || isExcel" class="doc-wrap">
          <iframe
            :src="viewerSrc"
            class="doc-frame"
            referrerpolicy="no-referrer"
          ></iframe>
          <div class="doc-actions">
            <a :href="previewUrl" target="_blank" rel="noopener" class="btn"
              >在新窗口打开</a
            >
          </div>
        </div>
        <div v-else class="fallback">暂不支持该类型预览</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, watch } from 'vue';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    file: { type: Object, default: null },
  });
  const emit = defineEmits(['update:modelValue']);

  const typeCat = computed(() => String(props.file?.type_category || ''));
  const mime = computed(() => String(props.file?.mime_type || ''));
  const nameOrPath = computed(() =>
    String(
      props.file?.original_name ||
        props.file?.stored_name ||
        props.file?.file_path ||
        ''
    )
  );
  const isImage = computed(
    () =>
      typeCat.value === 'image' ||
      mime.value.toLowerCase().startsWith('image/') ||
      /\.(png|jpe?g|gif|bmp|webp|svg|avif)$/i.test(nameOrPath.value)
  );
  const isVideo = computed(
    () =>
      typeCat.value === 'video' ||
      mime.value.toLowerCase().startsWith('video/') ||
      /\.(mp4|webm|ogg|ogv|mov|mkv)$/i.test(nameOrPath.value)
  );
  const isWord = computed(
    () =>
      typeCat.value === 'word' ||
      /(msword|officedocument\.wordprocessingml\.document)/i.test(mime.value) ||
      /\.(docx?|dotx?)$/i.test(nameOrPath.value)
  );
  const isExcel = computed(
    () =>
      typeCat.value === 'excel' ||
      /(vnd\.ms-excel|officedocument\.spreadsheetml\.sheet)/i.test(
        mime.value
      ) ||
      /\.(xlsx?|xlsm|xlsb)$/i.test(nameOrPath.value)
  );

  const previewUrl = computed(() => {
    const f = props.file || {};
    const raw = String(f.file_url || f.file_path || '');
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = (
      import.meta.env.VITE_API_BASE ||
      window.location.origin ||
      ''
    ).toString();
    const prefix = base.replace(/\/+$/g, '') + '/';
    const path = raw.replace(/^\/+/, '').replace(/\\/g, '/');
    return `${prefix}${path}`;
  });

  // 在线查看器（优先 Office，皆使用绝对 URL）
  const viewerSrc = computed(() => {
    const abs = previewUrl.value;
    const encoded = encodeURIComponent(abs);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
  });

  function close() {
    emit('update:modelValue', false);
  }

  // 视频控制
  const videoRef = ref(null);
  const duration = ref(0);
  const currentTime = ref(0);
  const playing = ref(false);
  const muted = ref(false);

  const timeText = computed(() => {
    const fmt = s => {
      const m = Math.floor(s / 60)
        .toString()
        .padStart(2, '0');
      const ss = Math.floor(s % 60)
        .toString()
        .padStart(2, '0');
      return `${m}:${ss}`;
    };
    return `${fmt(currentTime.value)} / ${fmt(duration.value || 0)}`;
  });

  function onLoadedMeta() {
    if (!videoRef.value) return;
    duration.value = Number(videoRef.value.duration || 0);
  }
  function onTimeUpdate() {
    if (!videoRef.value) return;
    currentTime.value = Number(videoRef.value.currentTime || 0);
  }
  function togglePlay() {
    const v = videoRef.value;
    if (!v) return;
    if (v.paused) {
      v.play();
      playing.value = true;
    } else {
      v.pause();
      playing.value = false;
    }
  }
  function toggleMute() {
    const v = videoRef.value;
    if (!v) return;
    v.muted = !v.muted;
    muted.value = v.muted;
  }
  function onSeek() {
    const v = videoRef.value;
    if (!v) return;
    v.currentTime = Number(currentTime.value || 0);
  }

  watch(
    () => props.modelValue,
    v => {
      const vid = videoRef.value;
      if (!vid) return;
      if (!v) {
        try {
          vid.pause();
        } catch {}
        playing.value = false;
      } else {
        duration.value = Number(vid.duration || 0);
        currentTime.value = Number(vid.currentTime || 0);
        muted.value = Boolean(vid.muted);
      }
    }
  );
</script>

<style scoped>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2001;
  }
  .viewer {
    width: min(92vw, 1200px);
    height: min(92vh, 800px);
    background: #111;
    color: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.06);
  }
  .title {
    font-weight: 600;
  }
  .close {
    border: none;
    background: transparent;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
  }
  .content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
  }
  .doc-wrap {
    width: 100%;
    height: 100%;
  }
  .doc-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
    border-radius: 8px;
  }
  .video-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .media {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #000;
    border-radius: 8px;
  }
  .video-el {
    flex: 1;
    width: 100%;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    margin-top: 8px;
  }
  .seek {
    flex: 1;
  }
  .btn {
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
  }
  .time {
    width: 120px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .fallback {
    color: #ddd;
  }
  .doc-actions {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
  }
</style>
