<template>
  <!-- AI配置面板 -->
  <SimpleAIConfig
    v-if="showAIConfig"
    @close="showAIConfig = false"
    @start-game="handleConfiguredStart"
    @config-saved="handleConfigSaved"
  />

  <!-- AI违规提示模态框 -->
  <ViolationModal
    v-if="showViolation"
    :violation-data="violationData"
    :visible="showViolation"
    @close="handleViolationClose"
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
          :game-over="gameOver && !hideGameOverOverlay"
          :winner="winner"
          :current-player="currentPlayer"
          :move-count="moveCount"
          :show-hint="showHint"
          :hint-position="hintPosition"
          :is-ai-thinking="isAIThinking"
          :ai-thinking-text="getAIThinkingText()"
          :game-mode="gameMode"
          :player1-name="getPlayerName(1)"
          :player2-name="getPlayerName(2)"
          @start="handleStartGame"
          @restart="handleRestartGame"
          @close-hint="closeHint"
          @config-ai="showAIConfig = true"
          @close-gameover="hideGameOverOverlay = true"
        />
      </div>

      <!-- 游戏控制 -->
      <GomokuControls
        :game-started="gameStarted"
        :game-over="gameOver"
        :current-player="currentPlayer"
        :can-undo="canUndo"
        :game-mode="gameMode"
        :is-a-i-auto-playing="isAIAutoPlaying"
        @start="handleStartGame"
        @restart="handleRestartGame"
        @undo="handleUndoMove"
        @hint="handleShowHint"
        @config-ai="showAIConfig = true"
        @stop-ai="stopAIAutoPlay()"
        @resume-ai="resumeAIAutoPlay()"
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
</template>

<script setup>
  import GomokuHeader from '../GomokuHeader.vue';
  import GomokuBoard from '../GomokuBoard.vue';
  import GomokuControls from '../GomokuControls.vue';
  import GomokuOverlays from '../GomokuOverlays.vue';
  import SimpleAIConfig from './SimpleAIConfig.vue';
  import AIThinkingPanel from './AIThinkingPanel.vue';
  import GameStatusPanel from './GameStatusPanel.vue';
  import ViolationModal from './ViolationModal.vue';
  import { useGomokuApp } from '../composables/useGomokuApp.js';

  const app = useGomokuApp();

  // 解构以便模板使用（保留原有的变量名以兼容模板）
  const {
    gomokuBoard,
    showAIConfig,
    handleConfiguredStart,
    handleConfigSaved,
    showViolation,
    violationData,
    currentPlayer,
    moveCount,
    playerWins,
    totalGames,
    gameOver,
    gameStarted,
    currentThinking,
    thinkingHistory,
    clearThinkingHistory,
    board,
    lastMove,
    handlePlayerMove,
    hideGameOverOverlay,
    winner,
    showHint,
    hintPosition,
    isAIThinking,
    getAIThinkingText,
    gameMode,
    getPlayerName,
    handleStartGame,
    handleRestartGame,
    closeHint,
    stopAIAutoPlay,
    resumeAIAutoPlay,
    canUndo,
    isAIAutoPlaying,
    currentAIPlayer,
    lastMoveWithReasoning,
    gameModeInfo,
    handleUndoMove,
    handleShowHint,
    handleViolationClose,
  } = app;
</script>

<style scoped>
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
