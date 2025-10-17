<template>
  <div class="control-hints">
    <h4>🎮 控制提示</h4>
    <div class="controls">
      <div class="control-key">WASD</div>
      <div class="control-or">或</div>
      <div class="control-key">方向键</div>
      <div class="control-desc">控制蛇的移动</div>
    </div>
  </div>
</template>

<style scoped>
  .control-hints {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .control-hints h4 {
    margin: 0 0 15px 0;
    color: #2c3e50;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }

  .control-key {
    padding: 8px 12px;
    background: #f8f9fa;
    border: 1px solid #e1e8ed;
    border-radius: 6px;
    font-family: monospace;
    font-weight: bold;
    color: #2c3e50;
  }

  .control-or {
    color: #666;
    font-style: italic;
  }

  .control-desc {
    color: #666;
  }

  @media (max-width: 480px) {
    .controls {
      flex-direction: column;
      gap: 10px;
    }
  }
</style>
