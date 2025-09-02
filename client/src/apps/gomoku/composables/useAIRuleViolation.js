// AI对战规则违反处理组合式函数
import { ref } from 'vue';

export function useAIRuleViolation() {
  const violationResult = ref(null);

  // 违规类型枚举
  const VIOLATION_TYPES = {
    INVALID_FORMAT: 'invalid_format',      // 返回数据格式不正确
    OCCUPIED_POSITION: 'occupied_position', // 选择的位置已有棋子
    OUT_OF_BOUNDS: 'out_of_bounds',        // 坐标超出棋盘范围
    PARSING_ERROR: 'parsing_error'         // AI回复解析失败
  };

  // 验证AI返回的数据格式
  const validateAIResponse = (aiResult) => {
    try {
      // 检查基本结构
      if (!aiResult || typeof aiResult !== 'object') {
        return {
          isValid: false,
          violationType: VIOLATION_TYPES.INVALID_FORMAT,
          message: 'AI返回数据格式错误：返回值不是有效对象'
        };
      }

      // 检查坐标字段
      if (typeof aiResult.row !== 'number' || typeof aiResult.col !== 'number') {
        return {
          isValid: false,
          violationType: VIOLATION_TYPES.INVALID_FORMAT,
          message: 'AI返回数据格式错误：缺少有效的row和col坐标字段'
        };
      }

      // 检查坐标是否为整数
      if (!Number.isInteger(aiResult.row) || !Number.isInteger(aiResult.col)) {
        return {
          isValid: false,
          violationType: VIOLATION_TYPES.INVALID_FORMAT,
          message: 'AI返回数据格式错误：坐标必须为整数'
        };
      }

      // 检查坐标范围 (0-14)
      if (aiResult.row < 0 || aiResult.row > 14 || aiResult.col < 0 || aiResult.col > 14) {
        return {
          isValid: false,
          violationType: VIOLATION_TYPES.OUT_OF_BOUNDS,
          message: `AI选择的位置超出棋盘范围：(${aiResult.row + 1}, ${aiResult.col + 1})`
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        violationType: VIOLATION_TYPES.PARSING_ERROR,
        message: `AI回复解析失败：${error.message}`
      };
    }
  };

  // 验证棋盘位置是否可以落子
  const validatePosition = (board, row, col) => {
    try {
      // 检查位置是否已被占用
      if (board[row][col] !== 0) {
        return {
          isValid: false,
          violationType: VIOLATION_TYPES.OCCUPIED_POSITION,
          message: `位置(${row + 1}, ${col + 1})已有棋子，不能重复下棋`
        };
      }

      return { isValid: true };
    } catch (error) {
      console.warn('validatePosition failed', error);
      return {
        isValid: false,
        violationType: VIOLATION_TYPES.OUT_OF_BOUNDS,
        message: `访问棋盘位置失败：坐标可能超出范围`
      };
    }
  };

  // 处理AI违规，返回获胜方
  const handleViolation = (violatingPlayer, violationType, message, playerNames) => {
    const winner = violatingPlayer === 1 ? 2 : 1; // 对方获胜
    const violatingPlayerName = playerNames[violatingPlayer] || `AI玩家${violatingPlayer}`;
    const winnerName = playerNames[winner] || `AI玩家${winner}`;

    const violationMessages = {
      [VIOLATION_TYPES.INVALID_FORMAT]: '数据格式不正确',
      [VIOLATION_TYPES.OCCUPIED_POSITION]: '尝试在已有棋子的位置下棋',
      [VIOLATION_TYPES.OUT_OF_BOUNDS]: '选择的位置超出棋盘范围', 
      [VIOLATION_TYPES.PARSING_ERROR]: 'AI回复解析失败'
    };

    violationResult.value = {
      violatingPlayer,
      winner,
      violatingPlayerName,
      winnerName,
      violationType,
      violationMessage: violationMessages[violationType] || '未知违规',
      detailMessage: message,
      timestamp: new Date()
    };

    return {
      gameEnded: true,
      winner,
      endReason: 'rule_violation',
      violationInfo: violationResult.value
    };
  };

  // 生成违规提示消息
  const getViolationAlert = () => {
    if (!violationResult.value) return null;

    const { violatingPlayerName, winnerName, violationMessage, detailMessage } = violationResult.value;
    
    return {
      title: '🚫 AI违规判负',
      message: `${violatingPlayerName} 违反游戏规则被判负！\n\n违规原因：${violationMessage}\n详细信息：${detailMessage}\n\n🏆 ${winnerName} 获胜！`,
      type: 'rule_violation',
      violationData: violationResult.value // 新增：结构化违规数据
    };
  };

  // 清除违规结果
  const clearViolation = () => {
    violationResult.value = null;
  };

  // 综合验证函数：同时验证AI回复格式和棋盘位置
  const validateAIMove = (aiResult, board, playerNumber, playerNames) => {
    // 首先验证AI回复格式
    const formatValidation = validateAIResponse(aiResult);
    if (!formatValidation.isValid) {
      return handleViolation(playerNumber, formatValidation.violationType, formatValidation.message, playerNames);
    }

    // 然后验证棋盘位置
    const positionValidation = validatePosition(board, aiResult.row, aiResult.col);
    if (!positionValidation.isValid) {
      return handleViolation(playerNumber, positionValidation.violationType, positionValidation.message, playerNames);
    }

    return { gameEnded: false };
  };

  return {
    // 状态
    violationResult,
    VIOLATION_TYPES,
    
    // 方法
    validateAIResponse,
    validatePosition,
    validateAIMove,
    handleViolation,
    getViolationAlert,
    clearViolation
  };
}
