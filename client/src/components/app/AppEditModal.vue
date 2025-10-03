<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <div class="title">编辑应用</div>
        <button class="close" @click="close">✖</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label>名称</label>
          <input v-model="form.name" placeholder="例如：Google" />
        </div>
        <div class="form-row">
          <label>URL</label>
          <input v-model="form.target_url" placeholder="https://example.com" />
        </div>
        <div class="form-row icon-row">
          <label>图标</label>
          <div class="icon-selector-container">
            <IconSelector
              v-model="selectedIconPath"
              :icon-filename="form.icon_filename"
              @update:icon-filename="form.icon_filename = $event"
              @select-file="onSelectLocalFile"
              ref="iconSelectorRef"
            />
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="submit">保存</button>
          <button class="btn" @click="close">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import IconSelector from './IconSelector.vue';
  import { apiFetch } from '@/api/httpClient.js';

  const props = defineProps({
    show: Boolean,
    app: {
      type: Object,
      default: null,
    },
  });

  const emit = defineEmits(['update:show', 'submit']);

  const initialFormState = {
    name: '',
    slug: '',
    target_url: '',
    icon_filename: null,
  };

  // 简单的 slug 生成函数：把名称转换为小写、替换非字母数字为连字符、去重连字符
  function generateSlugFromName(name) {
    if (!name) return '';
    return name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // 移除非法字符
      .replace(/\s+/g, '-') // 空白转为连字符
      .replace(/-+/g, '-') // 合并连续连字符
      .replace(/^-|-$/g, ''); // 移除首尾连字符
  }

  const form = ref({ ...initialFormState });
  const selectedIconPath = ref('');
  const iconSelectorRef = ref(null);
  const pendingFile = ref(null); // 延迟上传的本地文件

  watch(
    () => props.show,
    newVal => {
      if (newVal && props.app) {
        // 填充现有应用数据
        form.value = {
          name: props.app.name || '',
          slug: props.app.slug || '',
          target_url: props.app.target_url || props.app.targetUrl || '',
          icon_filename:
            props.app.icon_filename || props.app.iconFilename || null,
        };
        selectedIconPath.value = '';
        pendingFile.value = null;
        if (iconSelectorRef.value) {
          iconSelectorRef.value.reset();
        }
      } else if (!newVal) {
        // 关闭时重置
        form.value = { ...initialFormState };
        selectedIconPath.value = '';
        pendingFile.value = null;
      }
    }
  );

  const close = () => {
    emit('update:show', false);
  };

  const submit = async () => {
    // 在提交前根据名称生成新的 slug（如果名称被修改）
    const computedSlug = generateSlugFromName(form.value.name);
    const payload = {
      name: form.value.name.trim(),
      slug: computedSlug,
      target_url: form.value.target_url?.trim() || null,
    };

    if (!payload.name || !payload.slug) {
      alert('请填写名称，系统无法生成有效的 slug');
      return;
    }
    if (!payload.target_url) {
      alert('请填写URL');
      return;
    }

    // 前端 URL 校验：确保是可解析的 URL 且协议为 http/https，友好提示错误
    try {
      const parsed = new URL(payload.target_url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        alert('URL 必须以 http:// 或 https:// 开头');
        return;
      }
    } catch {
      alert('URL 格式不正确，请输入有效的 URL，例如：https://example.com');
      return;
    }

    // 若存在延迟上传的本地文件，则先上传获取 filename
    if (pendingFile.value) {
      try {
        const formData = new FormData();
        formData.append('file', pendingFile.value);
        const resp = await apiFetch('/myapps/icons/upload', {
          method: 'POST',
          body: formData,
        });
        const json = await resp.json();
        if (resp.ok && json?.data?.filename) {
          payload.icon_filename = json.data.filename;
        } else {
          alert(json?.message || '上传失败');
          return;
        }
      } catch (error) {
        console.error('Icon upload failed:', error);
        alert('图标上传失败');
        return;
      }
    } else if (selectedIconPath.value) {
      // 如果选择了预选图标（且没有上传新文件）
      const iconPath = selectedIconPath.value;
      const filename = iconPath.split('/').pop();
      payload.preset_icon = filename;
    } else if (form.value.icon_filename) {
      // 保持原有图标（既没有上传新文件，也没有选择预设图标）
      payload.icon_filename = form.value.icon_filename;
    }

    emit('submit', payload);
  };

  function onSelectLocalFile(file) {
    pendingFile.value = file || null;
    // 选择自定义文件后，清空预选图标路径，避免二者并存
    if (file) selectedIconPath.value = '';
  }
</script>

<style scoped>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: #fff;
    width: 520px;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
  }
  .modal-body {
    padding: 12px;
  }
  .title {
    font-weight: 600;
  }
  .close {
    background: none;
    border: none;
    cursor: pointer;
  }
  .form-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
  }
  .form-row label {
    width: 72px;
    text-align: right;
    color: #555;
  }
  .form-row input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
  }
  .icon-row {
    align-items: flex-start;
  }
  .icon-selector-container {
    flex: 1;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
