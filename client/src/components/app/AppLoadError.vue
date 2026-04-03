<template>
  <div class="app-load-error">
    <span class="app-load-error__icon">⚠</span>
    <p class="app-load-error__text">应用加载失败</p>
  </div>
</template>

<style scoped>
  .app-load-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    gap: 8px;
    color: var(--color-error, #e53935);
    font-size: 13px;
    user-select: none;
  }

  .app-load-error__icon {
    font-size: 24px;
  }
</style>
