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
    <div class="resize-handle tl" @pointerdown.prevent="(e)=>onResizeStart(e,'tl')">
      <div class="resize-corner" />
    </div>
    <div class="resize-handle tr" @pointerdown.prevent="(e)=>onResizeStart(e,'tr')">
      <div class="resize-corner" />
    </div>
    <div class="resize-handle bl" @pointerdown.prevent="(e)=>onResizeStart(e,'bl')">
      <div class="resize-corner" />
    </div>
    <div class="resize-handle br" @pointerdown.prevent="(e)=>onResizeStart(e,'br')">
      <div class="resize-corner" />
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, onUnmounted } from 'vue';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';
  import { useWindowManager } from '@/composables/useWindowManager.js';

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
  const { modalRef, modalStyle, onHeaderPointerDown, pos, savePosition } =
    useDraggableModal(props.window.storageKey);

  // 小说阅读器自动最小化功能
  const { minimizeWindow } = useWindowManager();
  const minimizeTimer = ref(null);
  const isNovelReader = computed(() => props.window.appSlug === 'novel-reader');

  // 获取小说阅读器设置
  const getNovelReaderSettings = () => {
    try {
      const settings = localStorage.getItem('novel-reader-settings');
      return settings ? JSON.parse(settings) : { autoMinimize: false };
  } catch {
      return { autoMinimize: false };
    }
  };

  // 检查是否启用自动最小化
  const isAutoMinimizeEnabled = computed(() => {
    if (!isNovelReader.value) return false;
    const settings = getNovelReaderSettings();
    return settings.autoMinimize === true;
  });

  // 鼠标进入窗口
  function onMouseEnter() {
    if (isNovelReader.value && isAutoMinimizeEnabled.value) {
      cancelMinimize();
    }
  }

  // 鼠标离开窗口
  function onMouseLeave() {
    if (isNovelReader.value && props.isActive && isAutoMinimizeEnabled.value) {
      scheduleMinimize();
    }
  }

  // 窗口获得焦点
  function onFocusIn() {
    if (isNovelReader.value && isAutoMinimizeEnabled.value) {
      cancelMinimize();
    }
  }

  // 窗口失去焦点
  function onFocusOut() {
    if (isNovelReader.value && props.isActive && isAutoMinimizeEnabled.value) {
      scheduleMinimize(0); // 立即最小化
    }
  }

  // 安排最小化
  function scheduleMinimize(delay = 100) {
    cancelMinimize();
    minimizeTimer.value = setTimeout(() => {
      if (!props.window.minimized) {
        minimizeWindow(props.window.id);
      }
    }, delay);
  }

  // 取消最小化
  function cancelMinimize() {
    if (minimizeTimer.value) {
      clearTimeout(minimizeTimer.value);
      minimizeTimer.value = null;
    }
  }

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
  // 将最小化的行为改为关闭窗口（与关闭按钮相同）
  onClose();
  }

  function onMaximize() {
    emit('maximize', props.window.id);
  }

  function onHeaderDoubleClick() {
    emit('maximize', props.window.id);
  }

  // 窗口缩放支持（右下角把手）
  const MIN_WIDTH = 300;
  const MIN_HEIGHT = 200;

  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startLeft = 0;
  let startTop = 0;
  let resizeCorner = 'br'; // 'br'|'bl'|'tr'|'tl'

  function loadPersistedSize() {
    try {
      const key = props.window.storageKey
        ? `${props.window.storageKey}:size`
        : null;
      if (!key) return;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.width === 'number')
        props.window.width = parsed.width;
      if (parsed && typeof parsed.height === 'number')
        props.window.height = parsed.height;
  } catch {
      // ignore
    }
  }

  function persistSize() {
    try {
      const key = props.window.storageKey
        ? `${props.window.storageKey}:size`
        : null;
      if (!key) return;
      const obj = {
        width: Number(props.window.width || 0),
        height: Number(props.window.height || 0),
      };
      localStorage.setItem(key, JSON.stringify(obj));
  } catch {
      // ignore
    }
  }

  function onResizeStart(e, corner = 'br') {
    e.stopPropagation();
    e.preventDefault();
    if (props.window.maximized) return; // 禁止在最大化时缩放
    resizing = true;
    resizeCorner = corner;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = Number(props.window.width || 520);
    startHeight = Number(props.window.height || 400);
    // 记录当前窗口左上位置（来自 pos）
    startLeft = Number(pos?.value?.x ?? 0);
    startTop = Number(pos?.value?.y ?? 0);
    document.addEventListener('pointermove', onResizing);
    document.addEventListener('pointerup', onResizeEnd, { once: true });
  }

  function onResizing(e) {
    if (!resizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newW = startWidth;
    let newH = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    switch (resizeCorner) {
      case 'br':
        newW = Math.max(MIN_WIDTH, Math.round(startWidth + dx));
        newH = Math.max(MIN_HEIGHT, Math.round(startHeight + dy));
        break;
      case 'bl':
        // 左下：宽度随鼠标向右减少，左边随之移动；高度随下拉增加
        newW = Math.round(startWidth - dx);
        if (newW < MIN_WIDTH) newW = MIN_WIDTH;
        newLeft = startLeft + (startWidth - newW);
        newH = Math.max(MIN_HEIGHT, Math.round(startHeight + dy));
        break;
      case 'tr':
        // 右上：宽度随右移增加；高度随上移减少，top 需要移动
        newW = Math.max(MIN_WIDTH, Math.round(startWidth + dx));
        newH = Math.round(startHeight - dy);
        if (newH < MIN_HEIGHT) newH = MIN_HEIGHT;
        newTop = startTop + (startHeight - newH);
        break;
      case 'tl':
        // 左上：宽度和高度都随移动减少，左/top 需要更新
        newW = Math.round(startWidth - dx);
        if (newW < MIN_WIDTH) newW = MIN_WIDTH;
        newLeft = startLeft + (startWidth - newW);
        newH = Math.round(startHeight - dy);
        if (newH < MIN_HEIGHT) newH = MIN_HEIGHT;
        newTop = startTop + (startHeight - newH);
        break;
    }

    props.window.width = newW;
    props.window.height = newH;
    // 如果 left/top 发生变化，更新 pos（会在 onResizeEnd 时持久化）
    if (typeof newLeft === 'number') pos.value.x = Math.round(newLeft);
    if (typeof newTop === 'number') pos.value.y = Math.round(newTop);
  }

  function onResizeEnd() {
    resizing = false;
    document.removeEventListener('pointermove', onResizing);
    // 持久化尺寸与位置
    persistSize();
    try {
      savePosition();
  } catch {
      // ignore
    }
  }

  // 初始化时尝试加载持久化尺寸
  if (typeof window !== 'undefined') {
    // 在下一个事件循环调用以确保 props.window 已就绪
    setTimeout(() => loadPersistedSize(), 0);
  }

  // 组件卸载时清理定时器
  onUnmounted(() => {
    cancelMinimize();
  });
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
