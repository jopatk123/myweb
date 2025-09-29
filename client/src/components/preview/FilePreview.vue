<template>
  <div class="file-preview">
    <input type="file" @change="onFileChange" />
    <div v-if="htmlPreview" class="preview-html" v-html="htmlPreview"></div>
    <pre v-else-if="textPreview" class="preview-text">{{ textPreview }}</pre>
    <div v-else class="preview-empty">请选择要预览的文件（.docx, .xlsx, .txt 等）</div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useFilePreview } from '@/composables/useFilePreview';

export default {
  name: 'FilePreview',
  setup() {
    const htmlPreview = ref('');
    const textPreview = ref('');
    const { previewDocx, previewXlsx, previewGenericText, extractTextFromDocx } = useFilePreview();

    const onFileChange = async (e) => {
      htmlPreview.value = '';
      textPreview.value = '';
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      try {
        if (name.endsWith('.docx')) {
          // 尝试用 html 预览，失败则退回纯文本
          try {
            htmlPreview.value = await previewDocx(file);
            if (!htmlPreview.value) textPreview.value = await extractTextFromDocx(file);
          } catch {
            textPreview.value = await extractTextFromDocx(file);
          }
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
          htmlPreview.value = await previewXlsx(file);
          if (!htmlPreview.value) textPreview.value = '无法生成表格预览';
        } else {
          textPreview.value = await previewGenericText(file);
        }
      } catch (err) {
        console.error('预览出错', err);
        textPreview.value = '预览出错';
      }
    };

    return { htmlPreview, textPreview, onFileChange };
  }
};
</script>

<style scoped>
.file-preview { padding: 8px; }
.preview-html { max-height: 60vh; overflow: auto; border: 1px solid #eee; padding: 8px; }
.preview-text { white-space: pre-wrap; max-height: 60vh; overflow: auto; border: 1px solid #eee; padding: 8px; }
.preview-empty { color: #888; }
</style>
