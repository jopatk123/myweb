<template>
  <div class="gomoku-app">
    <!-- AI配置面板 -->
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

    <!-- 主游戏区域 -->
    <div class="main-game-area">
      <!-- 左侧：AI思考面板 -->
      <div class="left-panel">
        <AIThinkingPanel
          :current-thinking="currentThinking"
          :thinking-history="thinkingHistory"
          @clear-history="clearThinkingHistory"
        />
      </div>

      <!-- 中间：游戏棋盘 -->
      <div class="center-panel">
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
      </div>

      <!-- 右侧：游戏状态面板 -->
      <div class="right-panel">
        <GameStatusPanel
          :game-mode="gameMode"
          :current-player="currentPlayer"
          :game-over="gameOver"
          :is-ai-thinking="isAIThinking"
          :current-ai-player="currentAIPlayer"
          :player1-name="getPlayerName(1)"
          :player2-name="getPlayerName(2)"
          :move-count="moveCount"
          :player-wins="playerWins"
          :total-games="totalGames"
          :last-move="lastMoveWithReasoning"
          :game-mode-info="gameModeInfo"
        />
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
import AIThinkingPanel from './components/AIThinkingPanel.vue';
import GameStatusPanel from './components/GameStatusPanel.vue';
import { useGomokuGame } from './composables/useGomokuGame.js';
import { useGomokuStats } from './composables/useGomokuStats.js';
import { useGomokuHint } from './composables/useGomokuHint.js';
import { useGomokuAIThinking } from './composables/useGomokuAIThinking.js';
import { GameModeService } from './services/GameModeService.js';

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

// 游戏模式服务
const gameModeService = new GameModeService();

// 本地状态
const gomokuBoard = ref(null);
const showAIConfig = ref(false);
const gameMode = ref('human_vs_ai');
const aiConfig = ref(null);
// 引入 AI 思考逻辑组合
const {
  isAIThinking,
  currentAIPlayer,
  currentThinking,
  thinkingHistory,
  lastMoveWithReasoning,
  handleAITurn,
  clearThinkingHistory,
  getAIThinkingText
} = useGomokuAIThinking({
  gameModeService,
  gameMode,
  board,
  moveCount,
  gameOver,
  winner,
  makePlayerMove,
  recordGameResult,
  gomokuBoard,
  currentPlayer
});

// 计算属性
const gameModeInfo = computed(() => gameModeService.getGameModeInfo());

// 事件处理器
function handleStartGame() {
  if (!aiConfig.value && gameMode.value !== 'demo') {
    showAIConfig.value = true;
    return;
  }

  startGame();
  
  // 如果是AI对AI模式，开始AI对战
  if (gameMode.value === 'ai_vs_ai') {
    nextTick(() => {
      gomokuBoard.value?.drawBoard();
      handleAITurn();
    });
  } else {
    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });
  }
}

function handleConfiguredStart() { handleStartGame(); }

function handleConfigSaved(config) {
  gameMode.value = config.mode;
  aiConfig.value = config.aiConfig;
  
  // 配置游戏模式服务
  gameModeService.setGameMode(config.mode);
  
  if (config.mode === 'human_vs_ai') {
    gameModeService.configurePlayerAI(2, config.aiConfig);
  } else if (config.mode === 'ai_vs_ai') {
    // AI对AI模式需要配置两个AI
    gameModeService.configurePlayerAI(1, config.ai1Config || config.aiConfig);
    gameModeService.configurePlayerAI(2, config.ai2Config || config.aiConfig);
  }
}

function handleRestartGame() {
  restartGame();
  closeHint();
  currentThinking.value = null; currentAIPlayer.value = null; lastMoveWithReasoning.value = null; thinkingHistory.value = [];
  
  nextTick(() => {
    gomokuBoard.value?.drawBoard();
    
    // 如果是AI对AI模式，重新开始AI对战
    if (gameMode.value === 'ai_vs_ai') {
      handleAITurn();
    }
  });
}

async function handlePlayerMove(row, col) {
  // 在AI思考时或者不是人类玩家回合时不允许下棋
  if (isAIThinking.value) {
    return;
  }
  
  // 检查当前玩家是否为人类
  if (gameModeService.isAIPlayer(currentPlayer.value)) {
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

    // 处理AI回合
    await handleAITurn();
  }
}

// AI 逻辑已抽取至 useGomokuAIThinking

function handleUndoMove() {
  if (undoMove()) {
    // 如果是人机对战，需要撤销两步
    if (gameMode.value === 'human_vs_ai') {
      undoMove();
    }
    
    // 清理思考历史中对应的记录
    if (gameMode.value === 'human_vs_ai') {
      thinkingHistory.value = thinkingHistory.value.slice(0, -1);
    } else {
      thinkingHistory.value = thinkingHistory.value.slice(0, -2);
    }
    
    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });
  }
}

function handleShowHint() {
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

// clearThinkingHistory 已在组合函数中提供

// getAIThinkingText 已在组合函数中提供

function getPlayerName(playerNumber) {
  const player = gameModeService.getPlayer(playerNumber);
  return player ? player.name : `玩家${playerNumber}`;
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
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 600px;
  position: relative;
}

.main-game-area {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
  align-items: start;
  flex: 1;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.center-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.game-container {
  position: relative;
  display: flex;
  justify-content: center;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .main-game-area {
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 15px;
  }
}

@media (max-width: 992px) {
  .main-game-area {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .left-panel,
  .right-panel {
    order: 2;
  }
  
  .center-panel {
    order: 1;
  }
}

@media (max-width: 768px) {
  .gomoku-app {
    padding: 15px;
    min-height: auto;
  }
  
  .main-game-area {
    gap: 15px;
  }
  
  .left-panel,
  .right-panel {
    gap: 15px;
  }
  
  .center-panel {
    gap: 15px;
  }
}

@media (max-width: 576px) {
  .gomoku-app {
    padding: 10px;
  }
  
  .main-game-area {
    gap: 10px;
  }
}

/* 确保面板在小屏幕上的可读性 */
@media (max-width: 480px) {
  .left-panel,
  .right-panel {
    font-size: 0.9rem;
  }
}
</style>