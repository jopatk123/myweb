import { ref, computed, onMounted, nextTick } from 'vue';
import { useGomokuGame } from './useGomokuGame.js';
import { useGomokuStats } from './useGomokuStats.js';
import { useGomokuHint } from './useGomokuHint.js';
import { useGomokuAIThinking } from './useGomokuAIThinking.js';
import { GameModeService } from '../services/GameModeService.js';

export function useGomokuApp() {
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
    gameHistory,
    startGame,
    restartGame,
    makePlayerMove,
    undoMove,
  } = useGomokuGame();

  // 统计数据管理
  const { playerWins, totalGames, recordGameResult } = useGomokuStats();

  // 提示功能管理
  const { showHint, hintPosition, closeHint } = useGomokuHint();

  // 游戏模式服务
  const gameModeService = new GameModeService();

  // 本地状态
  const gomokuBoard = ref(null);
  const showAIConfig = ref(false);
  const gameMode = ref('human_vs_ai');
  const aiConfig = ref(null);
  const hideGameOverOverlay = ref(false);

  // 违规处理状态
  const showViolation = ref(false);
  const violationData = ref(null);

  // 引入 AI 思考逻辑组合
  const {
    isAIThinking,
    currentAIPlayer,
    currentThinking,
    thinkingHistory,
    lastMoveWithReasoning,
    handleAITurn,
    clearThinkingHistory,
    getAIThinkingText,
    isAIAutoPlaying,
    stopAIAutoPlay,
    resumeAIAutoPlay,
  } = useGomokuAIThinking({
    gameModeService,
    gameMode,
    board,
    moveCount,
    gameHistory,
    gameOver,
    winner,
    makePlayerMove,
    recordGameResult,
    gomokuBoard,
    currentPlayer,
    showViolationModal: data => {
      violationData.value = data;
      showViolation.value = true;
    },
  });

  // 计算属性
  const gameModeInfo = computed(() => gameModeService.getGameModeInfo());

  // 事件处理器
  function handleStartGame() {
    hideGameOverOverlay.value = false;
    // 检查游戏模式是否需要AI配置
    if (gameMode.value === 'human_vs_ai') {
      if (!aiConfig.value) {
        showAIConfig.value = true;
        return;
      }
      // 验证AI配置是否完整
      if (!aiConfig.value.apiUrl || !aiConfig.value.apiKey) {
        showAIConfig.value = true;
        return;
      }
    } else if (gameMode.value === 'ai_vs_ai') {
      if (
        !aiConfig.value ||
        !aiConfig.value.ai1Config ||
        !aiConfig.value.ai2Config
      ) {
        showAIConfig.value = true;
        return;
      }
      // 验证两个AI配置是否完整
      const ai1 = aiConfig.value.ai1Config;
      const ai2 = aiConfig.value.ai2Config;
      if (!ai1.apiUrl || !ai1.apiKey || !ai2.apiUrl || !ai2.apiKey) {
        showAIConfig.value = true;
        return;
      }
    }

    startGame();
    // 如果是AI对AI模式，开始AI对战
    if (gameMode.value === 'ai_vs_ai') {
      nextTick(() => {
        gomokuBoard.value?.drawBoard();
        try {
          handleAITurn();
        } catch (error) {
          const debug = window.location.search.includes('gomokuDebug=1');
          if (debug) console.error('[GomokuApp] AI vs AI start failed:', error);
          console.warn('[GomokuApp] AI connection failed (start):', error);
        }
      });
    } else {
      nextTick(() => {
        gomokuBoard.value?.drawBoard();
      });
    }
  }

  function handleConfiguredStart() {
    handleStartGame();
  }

  function handleConfigSaved(config) {
    gameMode.value = config.mode;

    // 配置游戏模式服务
    const debug = window.location.search.includes('gomokuDebug=1');
    gameModeService.setGameMode(config.mode);

    if (config.mode === 'human_vs_ai') {
      aiConfig.value = config.aiConfig;
      if (debug) console.log('[GomokuApp] Configuring player 2 AI');
      gameModeService.configurePlayerAI(2, config.aiConfig);
    } else if (config.mode === 'ai_vs_ai') {
      // AI对AI模式需要配置两个AI
      aiConfig.value = {
        ai1Config: config.ai1Config,
        ai2Config: config.ai2Config,
      };
      if (debug) console.log('[GomokuApp] Configuring AI vs AI mode');
      gameModeService.configurePlayerAI(1, config.ai1Config);
      gameModeService.configurePlayerAI(2, config.ai2Config);
    }
    if (debug) console.log('[GomokuApp] Game mode service configured');
  }

  function handleRestartGame() {
    hideGameOverOverlay.value = false;
    restartGame();
    closeHint();
    currentThinking.value = null;
    currentAIPlayer.value = null;
    lastMoveWithReasoning.value = null;
    thinkingHistory.value = [];

    nextTick(() => {
      gomokuBoard.value?.drawBoard();

      // 如果是AI对AI模式，重新开始AI对战
      if (gameMode.value === 'ai_vs_ai') {
        try {
          handleAITurn();
        } catch (error) {
          const debug = window.location.search.includes('gomokuDebug=1');
          if (debug)
            console.error('[GomokuApp] AI vs AI restart failed:', error);
          // 用非阻塞的控制台警告替代弹窗，避免中断游戏流程
          console.warn('[GomokuApp] AI connection failed (restart):', error);
        }
      }
    });
  }

  async function handlePlayerMove(row, col) {
    const debug = window.location.search.includes('gomokuDebug=1');
    // 在AI思考时或者不是人类玩家回合时不允许下棋
    if (isAIThinking.value) {
      if (debug) console.log('[GomokuApp] AI is thinking, player move blocked');
      return;
    }

    // 检查当前玩家是否为人类
    if (gameModeService.isAIPlayer(currentPlayer.value)) {
      if (debug) console.log('[GomokuApp] Current player is AI, move blocked');
      return;
    }
    if (makePlayerMove(row, col)) {
      if (debug) console.log('[GomokuApp] Player move successful');
      nextTick(() => {
        gomokuBoard.value?.drawBoard();
      });

      // 检查游戏是否结束
      if (gameOver.value) {
        recordGameResult(winner.value);
        return;
      }

      // 处理AI回合
      if (debug) console.log('[GomokuApp] Calling handleAITurn');
      try {
        await handleAITurn();
      } catch (error) {
        if (debug) console.error('[GomokuApp] AI turn failed:', error);
        // AI连接失败，记录为警告，不再阻断玩家流程（AI为辅助功能）
        console.warn('[GomokuApp] AI turn failed:', error);
      }
    } else {
      if (debug) console.log('[GomokuApp] Player move failed');
    }
  }

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

  // 违规模态框关闭处理
  function handleViolationClose() {
    showViolation.value = false;
    violationData.value = null;
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
        const rememberKeys = !!data.rememberKeys;
        if (data.config) {
          aiConfig.value = {
            ...data.config,
            apiKey: rememberKeys ? data.config.apiKey || '' : '',
          };
          if (gameMode.value === 'human_vs_ai') {
            // 配置服务（如果有 apiUrl 与 apiKey 则完整，否则等待用户输入）
            if (data.config.apiUrl && data.config.apiKey && rememberKeys) {
              gameModeService.setGameMode(gameMode.value);
              gameModeService.configurePlayerAI(2, aiConfig.value);
            }
          }
        }
        if (data.ai1Config || data.ai2Config) {
          aiConfig.value = {
            ai1Config: data.ai1Config
              ? {
                  ...data.ai1Config,
                  apiKey: rememberKeys ? data.ai1Config.apiKey || '' : '',
                }
              : null,
            ai2Config: data.ai2Config
              ? {
                  ...data.ai2Config,
                  apiKey: rememberKeys ? data.ai2Config.apiKey || '' : '',
                }
              : null,
          };
          if (gameMode.value === 'ai_vs_ai') {
            gameModeService.setGameMode(gameMode.value);
            if (
              aiConfig.value.ai1Config &&
              aiConfig.value.ai1Config.apiUrl &&
              aiConfig.value.ai1Config.apiKey &&
              rememberKeys
            ) {
              gameModeService.configurePlayerAI(1, aiConfig.value.ai1Config);
            }
            if (
              aiConfig.value.ai2Config &&
              aiConfig.value.ai2Config.apiUrl &&
              aiConfig.value.ai2Config.apiKey &&
              rememberKeys
            ) {
              gameModeService.configurePlayerAI(2, aiConfig.value.ai2Config);
            }
          }
        }
      }
    } catch (error) {
      const debug = window.location.search.includes('gomokuDebug=1');
      if (debug) console.error('加载配置失败:', error);
    }

    nextTick(() => {
      gomokuBoard.value?.drawBoard();
    });
  });

  return {
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
  };
}
