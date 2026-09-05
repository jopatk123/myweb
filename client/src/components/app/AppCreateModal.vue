<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <div class="title">新增自定义应用</div>
        <button class="close" @click="close" :disabled="submitting">✖</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label>名称</label>
          <input v-model="form.name" placeholder="例如：Google" />
        </div>

        <div class="form-row">
          <label>URL</label>
          <input v-model="form.targetUrl" placeholder="https://example.com" />
        </div>
        <div class="form-row icon-row">
          <label>图标</label>
          <div class="icon-selector-container">
            <IconSelector
              v-model="selectedIconPath"
              :icon-filename="form.iconFilename"
              @update:icon-filename="form.iconFilename = $event"
              @select-file="onSelectLocalFile"
              ref="iconSelectorRef"
            />
          </div>
        </div>
        <div class="actions">
          <button
            class="btn btn-primary"
            @click="submit"
            :disabled="submitting"
          >
            {{ submitting ? '创建中...' : '创建' }}
          </button>
          <button class="btn" @click="close" :disabled="submitting">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import IconSelector from './IconSelector.vue';
  import { useAppIconSubmit } from '@/composables/useAppIconSubmit.js';

  const props = defineProps({
    show: Boolean,
    groupId: [String, Number, null],
  });

  const emit = defineEmits(['update:show', 'submit']);

  const initialFormState = {
    name: '',
    targetUrl: '',
    iconFilename: null,
    groupId: null,
    isVisible: true,
  };

  const form = ref({ ...initialFormState });
  const selectedIconPath = ref('');
  const iconSelectorRef = ref(null);
  const {
    pendingFile,
    submitting,
    showInfo,
    showError,
    validateTargetUrl,
    discardUnreferencedIcon,
    resolveIconFields,
  } = useAppIconSubmit();

  watch(
    () => props.show,
    newVal => {
      if (newVal) {
        form.value = { ...initialFormState, groupId: props.groupId };
        selectedIconPath.value = '';
        pendingFile.value = null;
        submitting.value = false;
        if (iconSelectorRef.value) {
          iconSelectorRef.value.reset();
        }
      }
    }
  );

  const close = () => {
    if (submitting.value) return;
    emit('update:show', false);
  };

  const submit = async () => {
    if (submitting.value) return;

    const payload = {
      ...form.value,
      name: form.value.name.trim(),
      targetUrl: form.value.targetUrl?.trim() || null,
      groupId: form.value.groupId || null,
      isVisible:
        form.value.isVisible !== undefined ? form.value.isVisible : true,
      isBuiltin: false,
    };

    if (!payload.name) {
      showInfo('请填写名称');
      return;
    }
    if (!validateTargetUrl(payload.targetUrl)) {
      return;
    }

    submitting.value = true;
    let uploadedFilename = null;
    try {
      const iconFields = await resolveIconFields({
        selectedIconPath: selectedIconPath.value,
        existingIconFilename: form.value.iconFilename,
      });
      uploadedFilename = iconFields.uploadedFilename;
      if (iconFields.iconFilename) {
        payload.iconFilename = iconFields.iconFilename;
      }
      if (iconFields.presetIcon) {
        payload.presetIcon = iconFields.presetIcon;
      }
      emit('submit', payload);
    } catch (error) {
      await discardUnreferencedIcon(uploadedFilename);
      showError(error?.message || '图标上传失败');
    } finally {
      submitting.value = false;
    }
  };

  function onSelectLocalFile(file) {
    pendingFile.value = file || null;
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
  .close:disabled,
  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
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
