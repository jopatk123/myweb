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
  if (gameOver.value) return;
  const playerNumber = deps.currentPlayer.value;
  if (!gameModeService.isAIPlayer(playerNumber)) return;
    isAIThinking.value = true;
    currentAIPlayer.value = playerNumber;
  const debug = window.location.search.includes('gomokuDebug=1');

    try {
  const playerInfo = gameModeService.getPlayer(playerNumber);
    const aiResult = await gameModeService.getAIMove(
        playerNumber,
        board.value,
        gameHistory ? gameHistory.value : [],
        (thinkingUpdate) => {
          currentThinking.value = thinkingUpdate;
      if (debug) console.log('[Gomoku][AI] thinking update', thinkingUpdate);
        }
      );

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
        const thinkingRecord = {
          moveNumber: moveCount.value,
            player: currentAIPlayer.value,
            playerName: playerInfo.name,
            position: { row: aiResult.row, col: aiResult.col },
            reasoning: aiResult.reasoning,
            analysis: aiResult.analysis
        };
  thinkingHistory.value.push(thinkingRecord);
  if (debug) console.log('[Gomoku][AI] move decided', thinkingRecord);
        lastMoveWithReasoning.value = thinkingRecord;
        nextTick(() => { gomokuBoard.value?.drawBoard(); });

        if (gameOver.value) {
          recordGameResult(winner.value);
          return;
        }

        if (gameMode.value === 'ai_vs_ai') {
          setTimeout(() => { handleAITurn(); }, 1000);
        }
      } else {
        // AI移动失败，游戏无法继续
        throw new Error('AI移动失败：无法在指定位置下棋');
      }
    } catch (e) {
      if (debug) console.error('[Gomoku][AI] error', e);
      // AI连接失败，不再抛出错误阻断游戏，而是记录警告并降级处理
      console.warn('[Gomoku][AI] connection failed:', e);
      // 可选：将当前Thinking置为提醒信息
      currentThinking.value = { player: playerNumber, playerName: playerInfo?.name || 'AI', steps: ['AI请求失败，已降级处理'], progress: 100, progressText: 'AI请求失败' };
      // 不再抛出，允许游戏继续（AI为辅助功能）
    } finally {
      if (debug) console.log('[Gomoku][AI] turn completed');
      isAIThinking.value = false;
      currentAIPlayer.value = null;
    }
  }

  // 简化的AI移动功能已移除，必须通过API进行AI对战

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
    clearThinkingHistory,
    getAIThinkingText
  };
}
