<template>
  <div v-if="show" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <div class="title">新增自定义应用</div>
        <button class="close" @click="close">✖</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label>名称</label>
          <input v-model="form.name" placeholder="例如：Google" />
        </div>
        <div class="form-row">
          <label>Slug</label>
          <input v-model="form.slug" placeholder="例如：google" />
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
          <button class="btn btn-primary" @click="submit">创建</button>
          <button class="btn" @click="close">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import IconSelector from './IconSelector.vue';

  const props = defineProps({
    show: Boolean,
    groupId: [String, Number, null],
  });

  const emit = defineEmits(['update:show', 'submit']);

  const initialFormState = {
    name: '',
    slug: '',
    target_url: '',
    icon_filename: null,
    group_id: null,
    is_visible: true,
  };

  const form = ref({ ...initialFormState });
  const selectedIconPath = ref('');
  const iconSelectorRef = ref(null);
  const pendingFile = ref(null); // 延迟上传的本地文件

  watch(
    () => props.show,
    newVal => {
      if (newVal) {
        // Reset form when modal opens
        form.value = { ...initialFormState, group_id: props.groupId };
        selectedIconPath.value = '';
        pendingFile.value = null;
        if (iconSelectorRef.value) {
          iconSelectorRef.value.reset();
        }
      }
    }
  );

  const close = () => {
    emit('update:show', false);
  };

  const submit = async () => {
    const payload = {
      ...form.value,
      name: form.value.name.trim(),
      slug: form.value.slug.trim(),
      target_url: form.value.target_url?.trim() || null,
    };

    if (!payload.name || !payload.slug) {
      alert('请填写名称与slug');
      return;
    }
    if (!payload.target_url) {
      alert('请填写URL');
      return;
    }

    // 如果选择了预选图标且还未有上传文件名
    if (
      selectedIconPath.value &&
      !form.value.icon_filename &&
      !pendingFile.value
    ) {
      const iconPath = selectedIconPath.value;
      const filename = iconPath.split('/').pop();
      payload.preset_icon = filename;
    }

    // 若存在延迟上传的本地文件，则先上传获取 filename
    if (pendingFile.value && !form.value.icon_filename) {
      try {
        const formData = new FormData();
        formData.append('file', pendingFile.value);
        const resp = await fetch('/api/apps/icons/upload', {
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
