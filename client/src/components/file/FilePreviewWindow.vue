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
  import { computed } from 'vue';

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
    const base = (
      import.meta.env.VITE_API_BASE ||
      window.location.origin ||
      ''
    ).toString();
    const prefix = base.replace(/\/+\$/g, '') + '/';
    const path = raw.replace(/^\/+/, '').replace(/\\/g, '/');
    return `${prefix}${path}`;
  });

  const viewerSrc = computed(() => {
    const abs = previewUrl.value;
    const encoded = encodeURIComponent(abs);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
  });
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
