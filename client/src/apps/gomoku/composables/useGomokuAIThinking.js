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
    if (gameOver.value) return;
    const playerNumber = deps.currentPlayer.value;
    if (!gameModeService.isAIPlayer(playerNumber)) return; // 仅在当前玩家为 AI 时执行

    isAIThinking.value = true;
    currentAIPlayer.value = playerNumber;

    try {
      const playerInfo = gameModeService.getPlayer(playerNumber);
      const aiResult = await gameModeService.getAIMove(
        playerNumber,
        board.value,
        [],
        (thinkingUpdate) => {
          currentThinking.value = thinkingUpdate;
        }
      );

      currentThinking.value = null;

      if (makePlayerMove(aiResult.row, aiResult.col)) {
        const thinkingRecord = {
          moveNumber: moveCount.value,
            player: currentAIPlayer.value,
            playerName: playerInfo.name,
            position: { row: aiResult.row, col: aiResult.col },
            reasoning: aiResult.reasoning,
            analysis: aiResult.analysis
        };
        thinkingHistory.value.push(thinkingRecord);
        lastMoveWithReasoning.value = thinkingRecord;
        nextTick(() => { gomokuBoard.value?.drawBoard(); });

        if (gameOver.value) {
          recordGameResult(winner.value);
          return;
        }

        if (gameMode.value === 'ai_vs_ai') {
          setTimeout(() => { handleAITurn(); }, 1000);
        }
      }
    } catch (e) {
      console.error('AI下棋失败, 使用后备逻辑:', e);
      await handleSimpleAIMove();
    } finally {
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
