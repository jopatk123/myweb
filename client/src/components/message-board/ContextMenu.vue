<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
    }"
  >
    <div class="context-menu-item" @click="$emit('action', 'view')">
      <span class="context-menu-icon">👁️</span>
      查看图片
    </div>
    <div class="context-menu-item" @click="$emit('action', 'save')">
      <span class="context-menu-icon">💾</span>
      保存图片
    </div>
  </div>
</template>

<script setup>
  defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 }),
    },
  });

  defineEmits(['action']);
</script>

<style scoped>
  .context-menu {
    position: fixed;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    min-width: 150px;
    overflow: hidden;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 14px;
  }

  .context-menu-item:hover {
    background: #f8f9fa;
  }

  .context-menu-icon {
    font-size: 16px;
  }

  @media (max-width: 768px) {
    .context-menu-item {
      min-height: 44px;
      padding: 12px 16px;
    }
  }
</style>
