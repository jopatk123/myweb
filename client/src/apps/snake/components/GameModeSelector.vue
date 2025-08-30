<template>
  <div class="mode-selector">
    <h3>🎮 选择游戏模式</h3>
    <div class="mode-buttons">
      <button 
        class="mode-btn single-mode"
        @click="$emit('select-mode', 'single')"
      >
        🐍 单人模式
        <small>经典贪吃蛇游戏</small>
      </button>
      <button 
        class="mode-btn multiplayer-mode"
        @click="$emit('select-mode', 'multiplayer')"
      >
        👥 多人模式
        <small>与朋友一起玩</small>
      </button>
    </div>
  </div>
</template>

<script setup>
  defineEmits(['select-mode']);
</script>

<style scoped>
  .mode-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
  }

  .mode-selector h3 {
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: #333;
    text-align: center;
  }

  .mode-buttons {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1.5rem;
    min-width: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 15px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .mode-btn:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .mode-btn.single-mode {
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  }

  .mode-btn.multiplayer-mode {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  }

  .mode-btn small {
    font-size: 0.85rem;
    font-weight: 400;
    margin-top: 0.5rem;
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    .mode-buttons {
      flex-direction: column;
      gap: 1rem;
    }
    
    .mode-btn {
      min-width: 250px;
    }
  }
</style>