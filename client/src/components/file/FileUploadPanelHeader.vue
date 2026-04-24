<template>
  <div class="panel-header">
    <div class="header-left">
      <div class="title">{{ title }}</div>
      <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
    </div>
    <div class="header-actions">
      <button
        v-if="showMinimize"
        class="minimize-btn"
        @click="onMinimize"
        :title="minimized ? '展开' : '最小化'"
      >
        {{ minimized ? '▲' : '▼' }}
      </button>
      <button class="close-btn" @click="onClose" title="关闭">×</button>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    minimized: { type: Boolean, default: false },
    showMinimize: { type: Boolean, default: true },
  });

  const emit = defineEmits(['minimize', 'close']);

  function onMinimize() {
    emit('minimize');
  }

  function onClose() {
    emit('close');
  }
</script>

<style scoped>
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
  }

  .subtitle {
    font-size: 11px;
    opacity: 0.85;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .minimize-btn,
  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .minimize-btn:hover,
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .close-btn {
    font-size: 18px;
  }
</style>
