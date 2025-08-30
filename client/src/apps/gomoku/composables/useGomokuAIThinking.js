// 管理AI思考与落子逻辑的组合式函数，拆分自 GomokuApp.vue，便于维护与测试
import { ref, nextTick } from 'vue';

/**
 * useGomokuAIThinking
 * @param {Object} deps 依赖对象
 * @param {import('../services/GameModeService.js').GameModeService} deps.gameModeService 游戏模式服务实例
 * @param {import('vue').Ref} deps.gameMode 当前游戏模式 ref
 * @param {import('vue').ComputedRef} deps.board 棋盘二维数组
 * @param {import('vue').ComputedRef} deps.moveCount 落子数
 * @param {import('vue').ComputedRef} deps.gameOver 是否结束
 * @param {import('vue').ComputedRef} deps.winner 胜者
 * @param {Function} deps.makePlayerMove 执行落子(row,col)=>boolean
 * @param {Function} deps.recordGameResult 记录结果(winner)
 * @param {import('vue').Ref} deps.gomokuBoard 棋盘组件 ref (需有 drawBoard)
 */
export function useGomokuAIThinking(deps) {
  const {
    gameModeService,
    gameMode,
    board,
    moveCount,
  gameHistory,
    gameOver,
    winner,
    makePlayerMove,
    recordGameResult,
    gomokuBoard
  } = deps;

  // 状态
  const isAIThinking = ref(false);
  const currentAIPlayer = ref(null);
  const currentThinking = ref(null);
  const thinkingHistory = ref([]);
  const lastMoveWithReasoning = ref(null);

  async function handleAITurn() {
    console.log('[DEBUG] handleAITurn called, gameOver:', gameOver.value, 'currentPlayer:', deps.currentPlayer.value);
    if (gameOver.value) {
      console.log('[DEBUG] Game is over, AI turn skipped');
      return;
    }
    const playerNumber = deps.currentPlayer.value;
    console.log('[DEBUG] Checking if player', playerNumber, 'is AI:', gameModeService.isAIPlayer(playerNumber));
    if (!gameModeService.isAIPlayer(playerNumber)) {
      console.log('[DEBUG] Current player is not AI, turn skipped');
      return;
    }

    console.log('[DEBUG] Starting AI turn for player', playerNumber);
    isAIThinking.value = true;
    currentAIPlayer.value = playerNumber;
  const debug = window.location.search.includes('gomokuDebug=1');
  if (debug) console.log('[Gomoku][AI] turn start for player', playerNumber);

    try {
      const playerInfo = gameModeService.getPlayer(playerNumber);
      console.log('[DEBUG] Player info:', playerInfo);
      console.log('[DEBUG] Getting AI move from gameModeService');
      const aiResult = await gameModeService.getAIMove(
        playerNumber,
        board.value,
        gameHistory ? gameHistory.value : [],
        (thinkingUpdate) => {
          console.log('[DEBUG] Thinking update received:', thinkingUpdate);
          currentThinking.value = thinkingUpdate;
          if (debug) console.log('[Gomoku][AI] thinking update', thinkingUpdate);
        }
      );
      console.log('[DEBUG] AI move result:', aiResult);

      // 补充 80% / 100% 进度（AIModelService 解析后已经返回，这里模拟终段展示）
      currentThinking.value = {
        player: playerNumber,
        playerName: gameModeService.getPlayer(playerNumber).name,
        steps: ['开始分析棋局...', '识别威胁和机会...', '调用AI大模型...', '解析AI回复...', '确定最佳位置'],
        progress: 100,
        progressText: `决定下在(${aiResult.row + 1}, ${aiResult.col + 1})`
      };
      await new Promise(r=>setTimeout(r,500)); // 让用户看到最终决策

      currentThinking.value = null;

      if (makePlayerMove(aiResult.row, aiResult.col)) {
        console.log('[DEBUG] AI move executed successfully at:', aiResult.row, aiResult.col);
        const thinkingRecord = {
          moveNumber: moveCount.value,
            player: currentAIPlayer.value,
            playerName: playerInfo.name,
            position: { row: aiResult.row, col: aiResult.col },
            reasoning: aiResult.reasoning,
            analysis: aiResult.analysis
        };
  thinkingHistory.value.push(thinkingRecord);
  console.log('[DEBUG] Added thinking record to history. Total records:', thinkingHistory.value.length);
  if (debug) console.log('[Gomoku][AI] move decided', thinkingRecord);
        lastMoveWithReasoning.value = thinkingRecord;
        nextTick(() => { gomokuBoard.value?.drawBoard(); });

        if (gameOver.value) {
          console.log('[DEBUG] Game ended after AI move, winner:', winner.value);
          recordGameResult(winner.value);
          return;
        }

        if (gameMode.value === 'ai_vs_ai') {
          setTimeout(() => { handleAITurn(); }, 1000);
        }
      } else {
        console.error('[DEBUG] AI move FAILED - makePlayerMove returned false for:', aiResult.row, aiResult.col);
        console.error('[DEBUG] Current board state at position:', board.value[aiResult.row][aiResult.col]);
        console.error('[DEBUG] Current player should be:', currentAIPlayer.value);
      }
    } catch (e) {
      console.error('[DEBUG] AI下棋失败, 使用后备逻辑:', e);
      console.error('[DEBUG] Error stack:', e.stack);
      await handleSimpleAIMove();
    } finally {
      console.log('[DEBUG] AI turn completed, resetting thinking state');
      isAIThinking.value = false;
      currentAIPlayer.value = null;
    }
  }

  async function handleSimpleAIMove() {
    const empty = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board.value[r][c] === 0) empty.push({ row: r, col: c });
      }
    }
    if (!empty.length) return;
    const { row, col } = empty[Math.floor(Math.random() * empty.length)];
    const playerInfo = gameModeService.getPlayer(currentAIPlayer.value || deps.currentPlayer.value);
    if (makePlayerMove(row, col)) {
      const record = {
        moveNumber: moveCount.value,
        player: currentAIPlayer.value,
        playerName: playerInfo.name,
        position: { row, col },
        reasoning: `随机选择位置(${row + 1}, ${col + 1})`,
        analysis: { thinkingTime: '0.5', moveType: '随机', winProbability: 50 }
      };
      thinkingHistory.value.push(record);
      lastMoveWithReasoning.value = record;
      nextTick(() => { gomokuBoard.value?.drawBoard(); });
      if (gameOver.value) recordGameResult(winner.value);
    }
  }

  function clearThinkingHistory() {
    thinkingHistory.value = [];
    lastMoveWithReasoning.value = null;
  }

  function getAIThinkingText() {
    if (currentThinking.value) {
      return `${currentThinking.value.playerName} 正在思考...`;
    }
    return 'AI正在思考...';
  }

  return {
    // 状态
    isAIThinking,
    currentAIPlayer,
    currentThinking,
    thinkingHistory,
    lastMoveWithReasoning,
    // 方法
    handleAITurn,
    handleSimpleAIMove,
    clearThinkingHistory,
    getAIThinkingText
  };
}
