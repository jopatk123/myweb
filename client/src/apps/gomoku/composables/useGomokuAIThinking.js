// 管理AI思考与落子逻辑的组合式函数，拆分自 GomokuApp.vue，便于维护与测试
import { ref, nextTick } from 'vue';
import { useAIRuleViolation } from './useAIRuleViolation.js';

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
 * @param {Function} deps.showViolationModal 显示违规模态框函数
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
    gomokuBoard,
    showViolationModal
  } = deps;  // 状态
  const isAIThinking = ref(false);
  const currentAIPlayer = ref(null);
  const currentThinking = ref(null);
  const thinkingHistory = ref([]);
  const lastMoveWithReasoning = ref(null);

  // 规则违反处理
  const {
    validateAIMove,
    getViolationAlert,
    clearViolation
  } = useAIRuleViolation();

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

      // 获取玩家名称用于违规提示
      const playerNames = {
        1: gameModeService.getPlayer(1)?.name || 'AI玩家1',
        2: gameModeService.getPlayer(2)?.name || 'AI玩家2'
      };

      // 验证AI移动是否违反规则
      const validationResult = validateAIMove(aiResult, board.value, playerNumber, playerNames);
      if (validationResult.gameEnded) {
        // AI违规，游戏结束
        const violationAlert = getViolationAlert();
        if (violationAlert && showViolationModal) {
          // 显示友好的违规模态框
          showViolationModal(violationAlert.violationData);
        } else {
          // 后备方案：显示alert
          alert(violationAlert?.message || 'AI违规判负');
        }
        
        // 记录游戏结果（违规方判负）
        recordGameResult(validationResult.winner);
        return;
      }

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
        // AI移动失败，可能是位置已被占用等原因，这种情况也视为违规
        const playerNames = {
          1: gameModeService.getPlayer(1)?.name || 'AI玩家1',
          2: gameModeService.getPlayer(2)?.name || 'AI玩家2'
        };
        
        const violationResult = {
          gameEnded: true,
          winner: playerNumber === 1 ? 2 : 1,
          endReason: 'rule_violation'
        };

        const violatingPlayerName = playerNames[playerNumber];
        const winnerName = playerNames[violationResult.winner];
        
        if (showViolationModal) {
          showViolationModal({
            violatingPlayer: playerNumber,
            winner: violationResult.winner,
            violatingPlayerName,
            winnerName,
            violationType: 'occupied_position',
            violationMessage: '尝试在已有棋子的位置下棋',
            detailMessage: `下棋失败，可能位置已被占用`,
            timestamp: new Date()
          });
        } else {
          alert(`🚫 AI违规判负\n\n${violatingPlayerName} 尝试下棋失败！\n可能原因：位置已被占用或其他违规行为\n\n🏆 ${winnerName} 获胜！`);
        }
        
        recordGameResult(violationResult.winner);
        return;
      }
    } catch (e) {
      if (debug) console.error('[Gomoku][AI] error', e);
      
      // 检查是否是AI回复格式错误或解析错误
      const playerNames = {
        1: gameModeService.getPlayer(1)?.name || 'AI玩家1',
        2: gameModeService.getPlayer(2)?.name || 'AI玩家2'
      };

      // 判断错误类型，如果是格式错误或解析错误，则判负
      if (e.message && (
        e.message.includes('格式错误') || 
        e.message.includes('解析失败') ||
        e.message.includes('坐标无效') ||
        e.message.includes('API返回数据格式错误')
      )) {
        const winner = playerNumber === 1 ? 2 : 1;
        const winnerName = playerNames[winner];
        const violatingPlayerName = playerNames[playerNumber];
        
        if (showViolationModal) {
          showViolationModal({
            violatingPlayer: playerNumber,
            winner,
            violatingPlayerName,
            winnerName,
            violationType: 'parsing_error',
            violationMessage: 'AI回复格式错误',
            detailMessage: e.message,
            timestamp: new Date()
          });
        } else {
          alert(`🚫 AI违规判负\n\n${violatingPlayerName} AI回复格式错误被判负！\n错误信息：${e.message}\n\n🏆 ${winnerName} 获胜！`);
        }
        
        recordGameResult(winner);
        return;
      }

      // 其他错误（如网络错误）不判负，只是警告
      console.warn('[Gomoku][AI] connection failed:', e);
      // 可选：将当前Thinking置为提醒信息
      const playerInfo = gameModeService.getPlayer(playerNumber);
      currentThinking.value = { 
        player: playerNumber, 
        playerName: playerInfo?.name || 'AI', 
        steps: ['AI请求失败，已降级处理'], 
        progress: 100, 
        progressText: 'AI请求失败' 
      };
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
    clearViolation(); // 清除违规记录
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
