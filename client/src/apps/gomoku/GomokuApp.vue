<template>
  <div class="gomoku-app">
    <!-- 简化的AI配置面板 -->
    <SimpleAIConfig
      v-if="showAIConfig"
      @close="showAIConfig = false"
      @start-game="handleConfiguredStart"
      @config-saved="handleConfigSaved"
    />

    <!-- 游戏头部 -->
    <GomokuHeader
      :current-player="currentPlayer"
      :move-count="moveCount"
      :player-wins="playerWins"
      :total-games="totalGames"
      :game-over="gameOver"
    />

    <!-- 游戏区域 -->
    <div class="game-container">
      <GomokuBoard
        ref="gomokuBoard"
        :board="board"
        :current-player="currentPlayer"
        :game-over="gameOver"
        :last-move="lastMove"
        @move="handlePlayerMove"
      />

      <GomokuOverlays
        :game-started="gameStarted"
        :game-over="gameOver"
        :winner="winner"
        :current-player="currentPlayer"
        :move-count="moveCount"
        :show-hint="showHint"
        :hint-position="hintPosition"
        :is-ai-thinking="isAIThinking"
        :ai-thinking-text="getAIThinkingText()"
        @start="handleStartGame"
        @restart="handleRestartGame"
        @analyze="handleAnalyzeGame"
        @close-hint="closeHint"
        @config-ai="showAIConfig = true"
      />
    </div>

    <!-- 游戏控制 -->
    <GomokuControls
      :game-started="gameStarted"
      :game-over="gameOver"
      :current-player="currentPlayer"
      :can-undo="canUndo"
      @start="handleStartGame"
      @restart="handleRestartGame"
      @undo="handleUndoMove"
      @hint="handleShowHint"
      @config-ai="showAIConfig = true"
    />

    <!-- AI思考指示器 -->
    <div v-if="isAIThinking" class="ai-thinking-overlay">
      <div class="thinking-indicator">
        <div class="spinner"></div>
        <p>{{ getAIThinkingText() }}</p>
      </div>
    </div>

    <!-- 游戏状态面板 -->
    <div class="status-panel">
      <div class="status-item">
        <span class="status-label">模式:</span>
        <span class="status-value">{{ getModeText() }}</span>
      </div>
      <div v-if="aiConfig" class="status-item">
        <span class="status-label">AI:</span>
        <span class="status-value">{{ aiConfig.playerName || 'AI助手' }}</span>
      </div>
      <div v-if="lastAIReasoning" class="ai-reasoning">
        <h5>💭 AI思路:</h5>
        <p>{{ lastAIReasoning }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import GomokuHeader from './GomokuHeader.vue';
import GomokuBoard from './GomokuBoard.vue';
import GomokuControls from './GomokuControls.vue';
import GomokuOverlays from './GomokuOverlays.vue';
import SimpleAIConfig from './components/SimpleAIConfig.vue';
import { useGomokuGame } from './composables/useGomokuGame.js';
import { useGomokuStats } from './composables/useGomokuStats.js';
import { useGomokuHint } from './composables/useGomokuHint.js';

// 游戏状态管理
const {
  gameStarted,
  lastMove,
  canUndo,
  currentPlayer,
  gameOver,
  winner,
  board,
  moveCount,
  startGame,
  restartGame,
  makePlayerMove,
  undoMove
} = useGomokuGame();

// 统计数据管理
const {
  playerWins,
  totalGames,
  recordGameResult
} = useGomokuStats();

// 提示功能管理
const {
  showHint,
  hintPosition,
  closeHint
} = useGomokuHint();

// 本地状态
const gomokuBoard = ref(null);
const showAIConfig = ref(false);
const isAIThinking = ref(false);
const gameMode = ref('human_vs_ai');
const aiConfig = ref(null);
const lastAIReasoning = ref('');

// 事件处理器
function handleStartGame() {
  if (!aiConfig.value && gameMode.value !== 'demo') {
    showAIConfig.value = true;
    return;
  }

  startGame();
  nextTick(() => {
    gomokuBoard.value?.drawBoard();
  });
}

function handleConfiguredStart() {
  handleStartGame();
}

function handleConfigSaved(config) {
  gameMode.value = config.mode;
  aiConfig.value = config.aiConfig;
}

function handleRestartGame() {
  restartGame();
  closeHint();
  lastAIReasoning.value = '';
  
  nextTick(() => {
    gomokuBoard.value?.drawBoard();
  });
}

async function handlePlayerMove(row, col) {
  if (isAIThinking.value || currentPlayer.value !== 1) {
    return;
  }

  if (makePlayerMove(row, col)) {
    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });

    // 检查游戏是否结束
    if (gameOver.value) {
      recordGameResult(winner.value);
      return;
    }

    // AI回合
    if (gameMode.value === 'human_vs_ai' && aiConfig.value) {
      await handleAIMove();
    }
  }
}

async function handleAIMove() {
  if (gameOver.value || currentPlayer.value !== 2) {
    return;
  }

  isAIThinking.value = true;
  
  try {
    // 模拟AI思考
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 简单AI逻辑：随机选择空位
    const emptyPositions = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (board.value[row][col] === 0) {
          emptyPositions.push({ row, col });
        }
      }
    }
    
    if (emptyPositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyPositions.length);
      const aiMove = emptyPositions[randomIndex];
      
      if (makePlayerMove(aiMove.row, aiMove.col)) {
        lastAIReasoning.value = `选择位置(${aiMove.row + 1}, ${aiMove.col + 1})，这是一个不错的位置`;
        
        nextTick(() => {
          gomokuBoard.value?.drawBoard();
        });

        if (gameOver.value) {
          recordGameResult(winner.value);
        }
      }
    }
  } catch (error) {
    console.error('AI下棋失败:', error);
  } finally {
    isAIThinking.value = false;
  }
}

function handleUndoMove() {
  if (undoMove()) {
    // 如果是人机对战，需要撤销两步
    if (gameMode.value === 'human_vs_ai') {
      undoMove();
    }
    
    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });
  }
}

function handleShowHint() {
  // 简单提示：建议中心位置
  if (!gameStarted.value || gameOver.value) return;
  
  const centerRow = 7;
  const centerCol = 7;
  
  if (board.value[centerRow][centerCol] === 0) {
    hintPosition.value = { row: centerRow, col: centerCol };
    showHint.value = true;
  }
}

function handleAnalyzeGame() {
  handleRestartGame();
}

function getAIThinkingText() {
  if (aiConfig.value) {
    return `${aiConfig.value.playerName} 正在思考...`;
  }
  return 'AI正在思考...';
}

function getModeText() {
  switch (gameMode.value) {
    case 'ai_vs_ai':
      return 'AI对AI';
    case 'human_vs_ai':
      return '人机对战';
    default:
      return '演示模式';
  }
}

// 生命周期
onMounted(() => {
  // 加载保存的配置
  try {
    const saved = localStorage.getItem('gomoku_simple_config');
    if (saved) {
      const data = JSON.parse(saved);
      gameMode.value = data.gameMode || 'human_vs_ai';
      if (data.config) {
        aiConfig.value = {
          ...data.config,
          apiKey: '' // 不加载API Key
        };
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }

  nextTick(() => {
    gomokuBoard.value?.drawBoard();
  });
});
</script>

<style scoped>
.gomoku-app {
  display: inline-block;
  vertical-align: top;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 600px;
  position: relative;
}

.game-container {
  position: relative;
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.ai-thinking-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px 20px;
  border-radius: 10px;
  color: white;
  z-index: 100;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.thinking-indicator p {
  margin: 0;
  font-size: 0.9rem;
}

.status-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 15px;
  margin-top: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.status-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.status-value {
  font-weight: 500;
  color: #4ade80;
}

.ai-reasoning {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.ai-reasoning h5 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: #a78bfa;
}

.ai-reasoning p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .gomoku-app {
    padding: 15px;
    max-width: 95vw;
  }
  
  .ai-thinking-overlay {
    top: 10px;
    right: 10px;
    left: 10px;
    padding: 12px 16px;
  }
  
  .thinking-indicator {
    justify-content: center;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
  }
}
</style>