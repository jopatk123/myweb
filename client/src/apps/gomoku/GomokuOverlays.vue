<template>
  <!-- 游戏开始覆盖层 -->
  <div v-if="!gameStarted" class="game-overlay">
    <div class="start-modal">
      <h3>AI大模型五子棋</h3>
      <p>体验AI大模型的智慧对战</p>
      <p>黑子先行，连成五子获胜</p>
      <div class="start-buttons">
        <button @click="$emit('start')" class="btn btn-primary">开始游戏</button>
        <button @click="$emit('config-ai')" class="btn btn-secondary">AI配置</button>
      </div>
    </div>
  </div>

  <!-- 游戏结束覆盖层 -->
  <div v-if="gameOver" class="game-overlay">
    <div class="game-over-modal">
      <h3 v-if="winner === 1" class="win-title">🎉 恭喜获胜！</h3>
      <h3 v-else-if="winner === 2" class="lose-title">😔 AI获胜</h3>
      <h3 v-else class="draw-title">🤝 平局</h3>

      <div class="game-result">
        <p v-if="winner === 1">你成功击败了最高难度AI！</p>
        <p v-else-if="winner === 2">AI技高一筹，再接再厉！</p>
        <p v-else>棋盘已满，不分胜负！</p>

        <div class="result-stats">
          <span>本局步数: {{ moveCount }}</span>
        </div>
      </div>

      <div class="modal-buttons">
        <button @click="$emit('restart')" class="btn btn-primary">
          再来一局
        </button>
        <button @click="$emit('analyze')" class="btn btn-secondary">
          复盘分析
        </button>
      </div>
    </div>
  </div>

  <!-- AI思考提示 -->
  <div
    v-if="isAiThinking"
    class="thinking-overlay"
  >
    <div class="thinking-indicator">
      <div class="thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p>{{ aiThinkingText }}</p>
    </div>
  </div>

  <!-- 提示覆盖层 -->
  <div v-if="showHint" class="hint-overlay" @click="$emit('close-hint')">
    <div class="hint-modal" @click.stop>
      <h4>💡 AI建议</h4>
      <p v-if="hintPosition">
        建议落子位置: ({{ hintPosition.row + 1 }}, {{ hintPosition.col + 1 }})
      </p>
      <p v-else>暂无建议，请自由发挥！</p>
      <button @click="$emit('close-hint')" class="btn btn-secondary">
        知道了
      </button>
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    gameStarted: {
      type: Boolean,
      default: false,
    },
    gameOver: {
      type: Boolean,
      default: false,
    },
    winner: {
      type: Number,
      default: null,
    },
    currentPlayer: {
      type: Number,
      required: true,
    },
    moveCount: {
      type: Number,
      default: 0,
    },
    showHint: {
      type: Boolean,
      default: false,
    },
    hintPosition: {
      type: Object,
      default: null,
    },
    isAiThinking: {
      type: Boolean,
      default: false,
    },
    aiThinkingText: {
      type: String,
      default: 'AI正在思考...',
    },
  });

  defineEmits(['start', 'restart', 'analyze', 'close-hint', 'config-ai']);
</script>

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
    border-radius: 12px;
    z-index: 10;
  }

  .start-modal,
  .game-over-modal {
    background: rgba(255, 255, 255, 0.95);
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    max-width: 300px;
  }

  .start-modal h3,
  .game-over-modal h3 {
    margin: 0 0 15px 0;
    font-size: 1.8rem;
  }

  .start-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
  }

  .win-title {
    color: #22c55e;
  }

  .lose-title {
    color: #ef4444;
  }

  .draw-title {
    color: #f59e0b;
  }

  .start-modal p,
  .game-over-modal p {
    margin: 10px 0;
    color: #333;
    font-size: 1rem;
  }

  .game-result {
    margin: 20px 0;
  }

  .result-stats {
    margin-top: 15px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    font-size: 0.9rem;
    color: #666;
  }

  .modal-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
  }

  .thinking-overlay {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    padding: 15px 20px;
    border-radius: 10px;
    color: white;
    z-index: 5;
  }

  .thinking-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .thinking-dots {
    display: flex;
    gap: 4px;
  }

  .thinking-dots span {
    width: 6px;
    height: 6px;
    background: #f59e0b;
    border-radius: 50%;
    animation: thinking 1.4s infinite ease-in-out;
  }

  .thinking-dots span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .thinking-dots span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes thinking {
    0%,
    80%,
    100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  .hint-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
  }

  .hint-modal {
    background: white;
    padding: 25px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 250px;
  }

  .hint-modal h4 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 1.3rem;
  }

  .hint-modal p {
    margin: 10px 0 20px 0;
    color: #666;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  .btn-primary {
    background: linear-gradient(45deg, #4ade80, #22c55e);
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(45deg, #22c55e, #16a34a);
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  @media (max-width: 768px) {
    .start-modal,
    .game-over-modal {
      padding: 20px;
      max-width: 280px;
    }

    .modal-buttons {
      flex-direction: column;
    }

    .thinking-overlay {
      top: 10px;
      right: 10px;
      padding: 10px 15px;
    }

    .hint-modal {
      padding: 20px;
      max-width: 220px;
    }
  }
</style>
