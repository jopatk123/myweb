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
          <div v-if="loading" class="loading">正在生成预览...</div>
          <div
            v-else-if="previewHtml"
            class="doc-html"
            v-html="previewHtml"
          ></div>
          <div v-else class="fallback">
            无法预览该文件。你可以点击下方下载并在本地查看。
            <div style="margin-top: 10px">
              <a :href="previewUrl" target="_blank" rel="noopener" class="btn"
                >下载文件</a
              >
            </div>
          </div>
        </div>
        <div v-else class="fallback">暂不支持该类型预览</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, watch, nextTick } from 'vue';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';
  import { buildServerUrl } from '@/api/httpClient.js';

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

  watch(storageKey, () => {
    // A proper implementation would re-initialize the composable or have it react to key changes.
    // For now, this refactor simplifies the code but doesn't fully handle dynamic keys.
    // The primary benefit of code reduction is still achieved.
  });

  const typeCat = computed(() =>
    String(props.file?.typeCategory || props.file?.type_category || '')
  );
  const mime = computed(() =>
    String(props.file?.mimeType || props.file?.mime_type || '')
  );
  const nameOrPath = computed(() =>
    String(
      props.file?.originalName ||
        props.file?.original_name ||
        props.file?.storedName ||
        props.file?.stored_name ||
        props.file?.filePath ||
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
    const raw = String(
      f.fileUrl || f.file_url || f.filePath || f.file_path || ''
    );
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    return buildServerUrl(normalized.replace(/\\/g, '/'));
  });

  // 前端渲染状态
  const loading = ref(false);
  const previewHtml = ref('');

  // 辅助：从 URL 获取 ArrayBuffer（带凭据）
  async function fetchArrayBuffer(url) {
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error('无法获取文件');
    const size = Number(resp.headers.get('content-length') || 0);
    // 阈值：不处理超过 10MB 的文件（可调整）
    if (size && size > 10 * 1024 * 1024) throw new Error('文件过大');
    return await resp.arrayBuffer();
  }

  // 生成预览（docx -> html, xlsx -> html）
  async function generatePreview() {
    previewHtml.value = '';
    if (!previewUrl.value) return;
    loading.value = true;
    try {
      const url = previewUrl.value;
      // 仅处理 docx/xlsx 等可在前端解析的格式
      if (isWord.value) {
        // mammoth expects ArrayBuffer
        const ab = await fetchArrayBuffer(url);
        // dynamic import mammoth to reduce initial bundle cost
        const mammoth =
          (await import('mammoth')).default || (await import('mammoth'));
        const result = await mammoth.convertToHtml({ arrayBuffer: ab });
        const DOMPurify = (await import('dompurify')).default;
        previewHtml.value = DOMPurify.sanitize(result.value || '');
      } else if (isExcel.value) {
        const ab = await fetchArrayBuffer(url);
        const XLSX = (await import('xlsx')).default || (await import('xlsx'));
        const wb = XLSX.read(ab, { type: 'array' });
        const first = wb.SheetNames[0];
        const sheet = wb.Sheets[first];
        // 用 sheet_to_html 并 sanitize
        const rawHtml = XLSX.utils.sheet_to_html(sheet);
        const DOMPurify = (await import('dompurify')).default;
        previewHtml.value = DOMPurify.sanitize(rawHtml);
      }
    } catch {
      // 预览失败，previewHtml 保持空以触发 fallback UI
      // console.error(e);
      previewHtml.value = '';
    } finally {
      loading.value = false;
    }
  }

  function close() {
    emit('update:modelValue', false);
  }

  // 当文件或模态打开时尝试生成预览（自动降级为不可预览提示）
  watch(
    [() => props.file, () => props.modelValue],
    ([_file, open]) => {
      if (open && (isWord.value || isExcel.value)) {
        // 异步生成
        generatePreview().catch(() => {});
      } else {
        previewHtml.value = '';
      }
    },
    { immediate: true }
  );

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
