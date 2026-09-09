<template>
  <div class="settings-panel">
    <div class="setting-item">
      <label>昵称：</label>
      <input
        v-model="localSettings.nickname"
        type="text"
        placeholder="输入昵称"
        maxlength="50"
      />
    </div>
    <div class="setting-item">
      <label>头像颜色：</label>
      <div class="color-picker">
        <input v-model="localSettings.avatarColor" type="color" />
        <button @click="randomizeColor" class="random-color-btn">🎲</button>
      </div>
    </div>
    <div class="setting-item">
      <label>
        <input v-model="localSettings.autoOpenEnabled" type="checkbox" />
        自动打开新消息
      </label>
      <small class="setting-hint">当有新消息时自动打开留言板</small>
    </div>
    <div class="setting-actions">
      <button @click="onSave" class="save-btn">保存</button>
      <button @click="onCancel" class="cancel-btn">取消</button>
    </div>

    <div class="danger-zone">
      <h4>⚠️ 危险操作</h4>
      <div class="danger-action">
        <p>清除留言板将删除所有留言和图片，此操作不可恢复。</p>
        <button @click="$emit('request-clear')" class="clear-btn">
          🗑️ 清除留言板
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { watch, ref } from 'vue';

  const props = defineProps({
    modelValue: {
      type: Object,
      required: true,
    },
    generateRandomColor: {
      type: Function,
      required: true,
    },
  });

  const emit = defineEmits([
    'update:modelValue',
    'save',
    'cancel',
    'request-clear',
  ]);

  // local copy used for editing in the form
  const localSettings = ref({ ...props.modelValue });

  // small deep-equality helper for this small settings object
  const isEqual = (a, b) => {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  };

  // Only update localSettings when incoming prop actually differs to avoid
  // write->emit->parent->prop->write cycles that cause recursive updates.
  watch(
    () => props.modelValue,
    val => {
      if (!isEqual(val, localSettings.value)) {
        localSettings.value = { ...val };
      }
    },
    { immediate: true, deep: true }
  );

  // Only emit updates when localSettings differs from the prop to avoid
  // emitting unchanged values which can trigger the above watcher.
  watch(
    localSettings,
    val => {
      if (!isEqual(val, props.modelValue)) {
        emit('update:modelValue', { ...val });
      }
    },
    { deep: true }
  );

  const randomizeColor = () => {
    const color = props.generateRandomColor();
    localSettings.value.avatarColor = color;
  };

  const onSave = () => emit('save');
  const onCancel = () => emit('cancel');
</script>

<style scoped>
  .settings-panel {
    padding: 12px 14px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 4px;
  }

  .setting-item label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #495057;
    min-width: 80px;
  }

  .setting-hint {
    color: #6c757d;
    font-size: 12px;
    margin-left: 24px;
  }

  .setting-item input[type='text'] {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
    padding: 5px 8px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 13px;
  }

  .color-picker {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-picker input[type='color'] {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .random-color-btn {
    background: none;
    border: 1px solid #ced4da;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 14px;
  }

  .setting-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .save-btn,
  .cancel-btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  }

  .save-btn {
    background: #007bff;
    color: white;
  }

  .cancel-btn {
    background: #6c757d;
    color: white;
  }

  .danger-zone {
    margin-top: 14px;
    padding: 10px 12px;
    border: 1px solid #dc3545;
    border-radius: 6px;
    background: #fff5f5;
  }

  .danger-zone h4 {
    margin: 0 0 12px 0;
    color: #dc3545;
    font-size: 14px;
  }

  .danger-action {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .danger-action p {
    margin: 0;
    font-size: 12px;
    color: #6c757d;
  }

  .clear-btn {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
    align-self: flex-start;
  }

  .clear-btn:hover {
    background: #c82333;
  }
</style>
