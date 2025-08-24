<template>
  <div
    class="app-window"
    :class="{
      active: isActive,
      minimized: window.minimized,
      maximized: window.maximized,
    }"
    :style="windowStyle"
    @mousedown="onWindowClick"
  >
    <div
      class="window-header"
      @pointerdown.stop.prevent="onHeaderPointerDown"
      @dblclick="onHeaderDoubleClick"
    >
      <div class="window-title">{{ window.title }}</div>
      <div class="window-controls">
        <button
          class="control-btn minimize"
          @click.stop="onMinimize"
          title="最小化"
        >
          ─
        </button>
        <button
          class="control-btn maximize"
          @click.stop="onMaximize"
          :title="window.maximized ? '还原' : '最大化'"
        >
          {{ window.maximized ? '❐' : '□' }}
        </button>
        <button class="control-btn close" @click.stop="onClose" title="关闭">
          ✖
        </button>
      </div>
    </div>

    <div class="window-body">
      <component :is="window.component" v-if="window.component" />
      <div v-else class="empty">未找到应用组件</div>
    </div>
  </div>
</template>

<script setup>
  import { computed, inject } from 'vue';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';

  const props = defineProps({
    window: {
      type: Object,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['close', 'minimize', 'maximize', 'activate']);

  // 使用现有的拖拽功能
  const { modalRef, modalStyle, onHeaderPointerDown } = useDraggableModal(
    props.window.storageKey
  );

  const windowStyle = computed(() => {
    const baseStyle = {
      zIndex: props.window.zIndex,
      width: props.window.maximized ? '100vw' : `${props.window.width}px`,
      height: props.window.maximized ? '100vh' : `${props.window.height}px`,
      ...modalStyle.value,
    };

    if (props.window.maximized) {
      baseStyle.left = '0px';
      baseStyle.top = '0px';
    }

    if (props.window.minimized) {
      baseStyle.display = 'none';
    }

    return baseStyle;
  });

  function onWindowClick() {
    emit('activate', props.window.id);
  }

  function onClose() {
    emit('close', props.window.id);
  }

  function onMinimize() {
    emit('minimize', props.window.id);
  }

  function onMaximize() {
    emit('maximize', props.window.id);
  }

  function onHeaderDoubleClick() {
    emit('maximize', props.window.id);
  }
</script>

<style scoped>
  .app-window {
    position: fixed;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid #e0e0e0;
    transition: box-shadow 0.2s ease;
  }

  .app-window.active {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    border-color: #007acc;
  }

  .app-window.maximized {
    border-radius: 0;
  }

  .window-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-bottom: 1px solid #dee2e6;
    cursor: move;
    user-select: none;
  }

  .app-window.active .window-header {
    background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
    color: white;
  }

  .window-title {
    font-weight: 600;
    font-size: 14px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .window-controls {
    display: flex;
    gap: 4px;
  }

  .control-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }

  .control-btn:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  .control-btn.close:hover {
    background: #e74c3c;
    color: white;
  }

  .control-btn.minimize:hover {
    background: #f39c12;
    color: white;
  }

  .control-btn.maximize:hover {
    background: #27ae60;
    color: white;
  }

  .app-window.active .control-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .app-window.active .control-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .window-body {
    padding: 12px;
    height: calc(100% - 45px);
    overflow: auto;
  }

  .empty {
    color: #888;
    text-align: center;
    padding: 40px 0;
  }

  /* 最小化动画 */
  .app-window.minimized {
    transform: scale(0);
    opacity: 0;
    transition: all 0.3s ease;
  }
</style>
