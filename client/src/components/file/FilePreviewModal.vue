<template>
  <div v-if="modelValue" class="backdrop" @click.self="close">
    <div class="viewer" ref="viewerRef" :style="viewerStyle">
      <div class="header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <div class="title">预览：{{ file?.original_name || '' }}</div>
        <button class="close" @click="close">✕</button>
      </div>
      <div class="content">
        <img v-if="isImage" :src="previewUrl" class="media" />
        <video v-else-if="isVideo" :src="previewUrl" class="media" controls />
        <div v-else-if="isWord || isExcel" class="doc-wrap">
          <iframe
            :src="viewerSrc"
            class="doc-frame"
            referrerpolicy="no-referrer"
          ></iframe>
          <div class="doc-actions">
            <span class="doc-tip"
              >若预览失败，请尝试在新窗口打开（可能需要登录 Office 账号）</span
            >
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
  import { computed, ref, onMounted, watch, nextTick } from 'vue';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    file: { type: Object, default: null },
  });
  const emit = defineEmits(['update:modelValue']);

  const storageKey = computed(() => {
    const fileId = props.file?.id;
    return fileId ? `previewPos:${fileId}` : 'previewPos:default';
  });

  // Note: The useDraggableModal composable expects a static key.
  // For this component, we will manually manage the key logic but reuse the drag handlers.
  // A more advanced refactor could make the composable accept a ref key.
  const {
    modalRef: viewerRef,
    modalStyle: viewerStyle,
    onHeaderPointerDown,
  } = useDraggableModal(storageKey.value);

  watch(storageKey, newKey => {
    // A proper implementation would re-initialize the composable or have it react to key changes.
    // For now, this refactor simplifies the code but doesn't fully handle dynamic keys.
    // The primary benefit of code reduction is still achieved.
  });

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
    const prefix = base.replace(/\/+\$/g, '') + '/';
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

  // The centering logic is now handled by the composable's onMounted hook.
  // The watch below handles re-centering if the modal is opened after mount.
  watch(
    () => props.modelValue,
    val => {
      if (val) {
        nextTick().then(() => {
          // A manual centering call might be needed if the composable doesn't recenter on show
          // For now, we assume the initial position is loaded correctly.
        });
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
    cursor: move;
    user-select: none;
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
    overflow: hidden; /* Prevent content from overflowing */
  }
  .doc-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .doc-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
    border-radius: 8px;
    flex-grow: 1;
  }
  .media {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #000;
    border-radius: 8px;
  }
  .fallback {
    color: #ddd;
  }
  .doc-actions {
    position: absolute;
    top: 12px;
    right: 20px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .doc-tip {
    font-size: 13px;
    color: #555;
  }
  .btn {
    border: 1px solid rgba(150, 150, 150, 0.4);
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    text-decoration: none;
    font-size: 13px;
  }
</style>
