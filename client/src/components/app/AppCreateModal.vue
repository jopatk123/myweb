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
        <div class="form-row">
          <label>图标</label>
          <input
            type="file"
            accept="image/*"
            @change="onIconSelected"
            ref="fileInput"
          />
          <div v-if="form.icon_filename" class="preview">
            <img :src="`/uploads/apps/icons/${form.icon_filename}`" />
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
  const fileInput = ref(null);

  watch(
    () => props.show,
    newVal => {
      if (newVal) {
        // Reset form when modal opens
        form.value = { ...initialFormState, group_id: props.groupId };
        if (fileInput.value) {
          fileInput.value.value = ''; // Reset file input
        }
      }
    }
  );

  const close = () => {
    emit('update:show', false);
  };

  const submit = () => {
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

    emit('submit', payload);
  };

  // Icon upload logic remains internal to the modal
  async function onIconSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch('/api/apps/icons/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await resp.json();
      if (resp.ok && json?.data?.filename) {
        form.value.icon_filename = json.data.filename;
      } else {
        alert(json?.message || '上传失败');
      }
    } catch (error) {
      console.error('Icon upload failed:', error);
      alert('图标上传失败');
    }
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
  .preview img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border: 1px dashed #ddd;
    border-radius: 8px;
    padding: 4px;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
