<template>
  <div>
    <div class="game-overlay" v-if="gameOver">
      <div class="game-over-modal">
        <h3>游戏结束！</h3>
        <p>最终分数: {{ score }}</p>
        <p>蛇的长度: {{ snakeLength }}</p>
        <button class="btn btn-primary" @click="$emit('restart')">
          重新开始
        </button>
      </div>
    </div>

    <div class="game-overlay" v-if="!gameStarted && !gameOver">
      <div class="start-modal">
        <h3>🐍 贪吃蛇大作战</h3>
        <p>使用方向键或WASD控制蛇的移动</p>
        <p>吃到食物可以增长身体和获得分数</p>
        <p>避免撞到自己！</p>
        <button class="btn btn-primary" @click="$emit('start')">
          开始游戏
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    gameStarted: { type: Boolean, required: true },
    gameOver: { type: Boolean, required: true },
    score: { type: Number, required: true },
    snakeLength: { type: Number, required: true },
  });
</script>

<style scoped></style>

<style scoped>
  .game-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
  }

  .game-over-modal,
  .start-modal {
    background: rgba(255, 255, 255, 0.95);
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .game-over-modal h3,
  .start-modal h3 {
    color: #ff4757;
    margin: 0 0 15px 0;
    font-size: 1.8rem;
  }

  .start-modal h3 {
    color: #4ade80;
  }

  .game-over-modal p,
  .start-modal p {
    margin: 10px 0;
    color: #333;
    font-size: 1.1rem;
  }
</style>
