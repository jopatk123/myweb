<template>
  <div class="file-preview-window">
    <div class="viewer">
      <div class="header">
        <div class="title">
          预览：{{ file?.original_name || file?.originalName || '' }}
        </div>
      </div>
      <div class="content">
        <img v-if="isImage" :src="previewUrl" class="media" />
        <video v-else-if="isVideo" :src="previewUrl" class="media" controls />
        <div v-else-if="isWord || isExcel" class="doc-wrap">
          <div v-if="loading" class="loading">正在生成预览...</div>
          <div v-else-if="previewHtml" class="doc-html" v-html="previewHtml"></div>
          <div v-else class="fallback">
            无法预览该文件，您可以点击下方下载并在本地查看。
            <div style="margin-top:10px">
              <a :href="previewUrl" target="_blank" rel="noopener" class="btn">下载文件</a>
            </div>
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
    file: { type: Object, default: null },
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

    // 对于uploads路径的文件，应该直接使用相对路径
    if (raw.startsWith('uploads/')) {
      return `/${raw}`;
    }

    // 其他情况使用完整的base URL
    const base = (
      import.meta.env.VITE_API_BASE ||
      window.location.origin ||
      ''
    ).toString();
    const prefix = base.replace(/\/+\$/g, '') + '/';
    const path = raw.replace(/^\/+/, '').replace(/\\/g, '/');
    return `${prefix}${path}`;
  });

  const loading = ref(false);
  const previewHtml = ref('');

  async function fetchArrayBuffer(url) {
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error('无法获取文件');
    const size = Number(resp.headers.get('content-length') || 0);
    if (size && size > 10 * 1024 * 1024) throw new Error('文件过大');
    return await resp.arrayBuffer();
  }

  async function generatePreview() {
    previewHtml.value = '';
    if (!previewUrl.value) return;
    loading.value = true;
    try {
      const url = previewUrl.value;
      if (isWord.value) {
        const ab = await fetchArrayBuffer(url);
        const mammoth = (await import('mammoth')).default || (await import('mammoth'));
        const result = await mammoth.convertToHtml({ arrayBuffer: ab });
        const DOMPurify = (await import('dompurify')).default;
        previewHtml.value = DOMPurify.sanitize(result.value || '');
      } else if (isExcel.value) {
        const ab = await fetchArrayBuffer(url);
        const XLSX = (await import('xlsx')).default || (await import('xlsx'));
        const wb = XLSX.read(ab, { type: 'array' });
        const first = wb.SheetNames[0];
        const sheet = wb.Sheets[first];
        const rawHtml = XLSX.utils.sheet_to_html(sheet);
        const DOMPurify = (await import('dompurify')).default;
        previewHtml.value = DOMPurify.sanitize(rawHtml);
      }
    } catch (e) {
      previewHtml.value = '';
    } finally {
      loading.value = false;
    }
  }

  // 当 file 变化时生成预览
  watch(
    () => props.file,
    () => {
      if (isWord.value || isExcel.value) generatePreview().catch(() => {});
      else previewHtml.value = '';
    },
    { immediate: true }
  );
</script>

<style scoped>
  .viewer {
    width: 100%;
    height: 100%;
    background: #111;
    color: #fff;
    display: flex;
    flex-direction: column;
    height: calc(100% - 45px);
  }
  .header {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.06);
  }
  .content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    overflow: hidden;
  }
  .doc-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
    border-radius: 8px;
  }
  .media {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #000;
    border-radius: 8px;
  }
  .doc-actions {
    position: absolute;
    top: 12px;
    right: 20px;
    z-index: 10;
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
    text-decoration: none;
  }
</style>
