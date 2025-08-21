<template>
  <div>
    <div class="game-overlay" v-if="gameOver">
      <div class="game-over-modal">
        <h3>游戏结束！</h3>
        <p>最终分数: {{ score }}</p>
        <p>蛇的长度: {{ snakeLength }}</p>
        <button class="btn btn-primary" @click="$emit('restart')">重新开始</button>
      </div>
    </div>

    <div class="game-overlay" v-if="!gameStarted && !gameOver">
      <div class="start-modal">
        <h3>🐍 贪吃蛇大作战</h3>
        <p>使用方向键或WASD控制蛇的移动</p>
        <p>吃到食物可以增长身体和获得分数</p>
        <p>避免撞到自己！</p>
        <button class="btn btn-primary" @click="$emit('start')">开始游戏</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  gameStarted: { type: Boolean, required: true },
  gameOver: { type: Boolean, required: true },
  score: { type: Number, required: true },
  snakeLength: { type: Number, required: true }
});
</script>

<style scoped>
/* 使用父组件已有的样式规则 */
</style>


