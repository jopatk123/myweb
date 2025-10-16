<template>
  <div
    class="app-window"
    ref="modalRef"
    :data-window-id="window.id"
    :data-app-slug="window.appSlug"
    :class="{
      active: isActive,
      minimized: window.minimized,
      maximized: window.maximized,
    }"
    :style="windowStyle"
    @pointerdown.capture="onWindowClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <AppWindowHeader
      :title="window.title"
      :maximized="window.maximized"
      :active="isActive"
      @pointerdown="onHeaderPointerDown"
      @doubleclick="onHeaderDoubleClick"
      @minimize="onMinimize"
      @maximize="onMaximize"
      @close="onClose"
    />

    <div class="window-body">
      <component
        :is="window.component"
        v-if="window.component"
        v-bind="window.props"
      />
      <div v-else class="empty">未找到应用组件</div>
    </div>
    <!-- 底部可拖动条：高度为顶部的一半，仅作拖动用 -->
    <div
      class="window-footer-drag"
      @pointerdown.stop.prevent="onHeaderPointerDown"
      aria-hidden="true"
    />
    <!-- 四角缩放把手 -->
    <div
      class="resize-handle tl"
      @pointerdown.prevent="e => onResizeStart(e, 'tl')"
    >
      <div class="resize-corner" />
    </div>
    <div
      class="resize-handle tr"
      @pointerdown.prevent="e => onResizeStart(e, 'tr')"
    >
      <div class="resize-corner" />
    </div>
    <div
      class="resize-handle bl"
      @pointerdown.prevent="e => onResizeStart(e, 'bl')"
    >
      <div class="resize-corner" />
    </div>
    <div
      class="resize-handle br"
      @pointerdown.prevent="e => onResizeStart(e, 'br')"
    >
      <div class="resize-corner" />
    </div>
  </div>
</template>

<script setup>
  import { computed, toRef } from 'vue';
  import AppWindowHeader from '@/components/desktop/AppWindowHeader.vue';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';
  import { useAppWindowResize } from '@/composables/useAppWindowResize.js';
  import { useNovelReaderAutoMinimize } from '@/composables/useNovelReaderAutoMinimize.js';

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

  const windowRef = toRef(props, 'window');
  const isActiveRef = toRef(props, 'isActive');

  const { modalRef, modalStyle, onHeaderPointerDown, pos, savePosition } =
    useDraggableModal(props.window.storageKey);

  const { onMouseEnter, onMouseLeave, onFocusIn, onFocusOut } =
    useNovelReaderAutoMinimize(windowRef, isActiveRef);

  const { onResizeStart } = useAppWindowResize(windowRef, pos, savePosition);

  const windowStyle = computed(() => {
    const baseStyle = {
      zIndex: windowRef.value.zIndex,
      width: windowRef.value.maximized ? '100vw' : `${windowRef.value.width}px`,
      height: windowRef.value.maximized
        ? '100vh'
        : `${windowRef.value.height}px`,
      ...modalStyle.value,
    };

    if (windowRef.value.maximized) {
      baseStyle.left = '0px';
      baseStyle.top = '0px';
    }

    if (windowRef.value.minimized) {
      baseStyle.display = 'none';
    }

    return baseStyle;
  });

  function onWindowClick() {
    emit('activate', windowRef.value.id);
  }

  function onClose() {
    emit('close', windowRef.value.id);
  }

  function onMinimize() {
    emit('minimize', windowRef.value.id);
  }

  function onMaximize() {
    emit('maximize', windowRef.value.id);
  }

  function onHeaderDoubleClick() {
    emit('maximize', windowRef.value.id);
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

  .window-body {
    padding: 12px;
    /* 减去 header(约40-45px) 和底部拖拽条高度(约22px) */
    height: calc(100% - 67px);
    overflow: auto;
  }

  /* 底部拖动条，仅用于拖动，样式与顶部活动状态一致，但高度为顶部的一半 */
  .window-footer-drag {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 22px; /* 顶部约44px 时的一半高度 */
    cursor: move;
    background: transparent; /* 默认透明 */
    z-index: 15;
  }

  .app-window.active .window-footer-drag {
    background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
    opacity: 0.95;
  }

  /* 右下角缩放把手 */
  .resize-handle {
    position: absolute;
    width: 14px;
    height: 14px;
    z-index: 20;
    opacity: 0.6;
  }

  .resize-handle.tl {
    left: 6px;
    top: 6px;
    cursor: nwse-resize; /* 左上-右下 */
  }

  .resize-handle.tr {
    right: 6px;
    top: 6px;
    cursor: nesw-resize; /* 右上-左下 */
  }

  .resize-handle.bl {
    left: 6px;
    bottom: 6px;
    cursor: nesw-resize; /* 左下-右上 */
  }

  .resize-handle.br {
    right: 6px;
    bottom: 6px;
    cursor: nwse-resize; /* 右下-左上 */
  }

  .resize-corner {
    width: 100%;
    height: 100%;
    background: transparent;
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
