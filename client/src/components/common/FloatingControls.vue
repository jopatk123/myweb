<template>
  <div class="floating-controls">
    <button
      type="button"
      @click="$emit('random')"
      class="control-btn"
      title="随机切换壁纸"
      aria-label="随机切换壁纸"
    >
      🎲
    </button>
    <button
      type="button"
      @click="$emit('message')"
      class="control-btn"
      title="留言板"
      aria-label="打开留言板"
    >
      💬
    </button>
    <a
      href="/wallpapers"
      target="_blank"
      rel="noopener noreferrer"
      class="control-btn"
      title="管理后台"
      aria-label="在新标签页打开管理后台"
      >🛠️</a
    >
  </div>
</template>

<script setup>
  // 纯展示组件，事件通过 $emit 向上冒泡
</script>

<style scoped>
  .floating-controls {
    position: fixed;
    bottom: 30px;
    right: 30px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    z-index: 15;
  }

  .control-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    color: white;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* 防止被意外选中/显示文本插入点 */
  .floating-controls,
  .control-btn {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    caret-color: transparent; /* 隐藏光标 */
  }

  .control-btn:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    .floating-controls {
      bottom: 20px;
      right: 20px;
    }

    .control-btn {
      width: 50px;
      height: 50px;
      font-size: 20px;
    }
  }
</style>
