<template>
  <div
    class="app-window"
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
    <div class="resize-handle" @pointerdown.prevent="onResizeStart">
      <div class="resize-corner" />
    </div>
  </div>
</template>

<script setup>
  import { computed, inject, ref, onMounted, onUnmounted } from 'vue';
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
  const { modalRef, modalStyle, onHeaderPointerDown } = useDraggableModal(
    props.window.storageKey
  );

  // 小说阅读器自动最小化功能
  const { minimizeWindow } = useWindowManager();
  const minimizeTimer = ref(null);
  const isNovelReader = computed(() => props.window.appSlug === 'novel-reader');

  // 获取小说阅读器设置
  const getNovelReaderSettings = () => {
    try {
      const settings = localStorage.getItem('novel-reader-settings');
      return settings ? JSON.parse(settings) : { autoMinimize: false };
    } catch (e) {
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
    emit('minimize', props.window.id);
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
    } catch (e) {
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
    } catch (e) {
      // ignore
    }
  }

  function onResizeStart(e) {
    e.stopPropagation();
    e.preventDefault();
    if (props.window.maximized) return; // 禁止在最大化时缩放
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = Number(props.window.width || 520);
    startHeight = Number(props.window.height || 400);
    document.addEventListener('pointermove', onResizing);
    document.addEventListener('pointerup', onResizeEnd, { once: true });
  }

  function onResizing(e) {
    if (!resizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newW = Math.max(MIN_WIDTH, Math.round(startWidth + dx));
    const newH = Math.max(MIN_HEIGHT, Math.round(startHeight + dy));
    props.window.width = newW;
    props.window.height = newH;
  }

  function onResizeEnd() {
    resizing = false;
    document.removeEventListener('pointermove', onResizing);
    // 持久化尺寸
    persistSize();
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
    height: calc(100% - 45px);
    overflow: auto;
  }

  /* 右下角缩放把手 */
  .resize-handle {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    z-index: 20;
    opacity: 0.6;
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
