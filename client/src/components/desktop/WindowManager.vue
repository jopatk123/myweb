<template>
  <div class="window-manager">
    <!-- 渲染所有窗口（包括已最小化的），以保证组件保持挂载，计时器不会因卸载而停止 -->
    <AppWindow
      v-for="window in windows"
      :key="window.id"
      :window="window"
      :is-active="window.id === activeWindowId"
      @close="closeWindow"
      @minimize="minimizeWindow"
      @maximize="toggleMaximize"
      @activate="setActiveWindow"
    />

    <!-- 任务栏 -->
    <div class="taskbar" v-if="windows.length > 0">
      <div class="taskbar-items">
        <div
          v-for="window in windows"
          :key="window.id"
          class="taskbar-item"
          :class="{
            active: window.id === activeWindowId,
            minimized: window.minimized,
          }"
          @click="onTaskbarItemClick(window)"
          :title="window.title"
        >
          <span class="taskbar-icon">📱</span>
          <span class="taskbar-title">{{ window.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import { useWindowManager } from '@/composables/useWindowManager.js';
  import AppWindow from './AppWindow.vue';

  const {
    windows,
    activeWindowId,
    closeWindow,
    setActiveWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
  } = useWindowManager();

  // 只显示可见的窗口
  const visibleWindows = computed(() =>
    windows.value.filter(w => w.visible && !w.minimized)
  );

  function onTaskbarItemClick(window) {
    if (window.minimized) {
      restoreWindow(window.id);
    } else if (window.id === activeWindowId.value) {
      minimizeWindow(window.id);
    } else {
      setActiveWindow(window.id);
    }
  }

  // 导出窗口管理器方法供外部使用
  defineExpose({
    windows,
    activeWindowId,
    closeWindow,
    setActiveWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
  });
</script>

<style scoped>
  .window-manager {
    position: relative;
    z-index: 100;
  }

  .taskbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 1000;
  }

  .taskbar-items {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 12px;
    gap: 8px;
    overflow-x: auto;
  }

  .taskbar-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
    max-width: 200px;
    color: white;
    font-size: 14px;
  }

  .taskbar-item:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .taskbar-item.active {
    background: rgba(0, 123, 255, 0.6);
  }

  .taskbar-item.minimized {
    opacity: 0.6;
  }

  .taskbar-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .taskbar-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  /* 滚动条样式 */
  .taskbar-items::-webkit-scrollbar {
    height: 4px;
  }

  .taskbar-items::-webkit-scrollbar-track {
    background: transparent;
  }

  .taskbar-items::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
</style>
