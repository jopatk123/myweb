// 游戏模式管理服务
import { AIModelService } from './AIModelService.js';

export const GAME_MODES = {
  HUMAN_VS_AI: 'human_vs_ai',
  AI_VS_AI: 'ai_vs_ai',
};

export const PLAYER_TYPES = {
  HUMAN: 'human',
  AI_MODEL: 'ai_model',
};

export class GameModeService {
  constructor() {
    this.currentMode = GAME_MODES.HUMAN_VS_AI;
    this.players = {
      1: { type: PLAYER_TYPES.HUMAN, name: '玩家', config: null },
      2: { type: PLAYER_TYPES.AI_MODEL, name: 'AI', config: null },
    };
    this.aiServices = new Map();
  }

  // 设置游戏模式
  setGameMode(mode) {
    this.currentMode = mode;

    if (mode === GAME_MODES.HUMAN_VS_AI) {
      this.players[1] = {
        type: PLAYER_TYPES.HUMAN,
        name: '玩家',
        config: null,
      };
      this.players[2] = {
        type: PLAYER_TYPES.AI_MODEL,
        name: 'AI',
        config: null,
      };
    } else if (mode === GAME_MODES.AI_VS_AI) {
      this.players[1] = {
        type: PLAYER_TYPES.AI_MODEL,
        name: 'AI黑子',
        config: null,
      };
      this.players[2] = {
        type: PLAYER_TYPES.AI_MODEL,
        name: 'AI白子',
        config: null,
      };
    }
  }

  // 配置玩家AI
  configurePlayerAI(playerNumber, aiConfig) {
    if (!aiConfig || !aiConfig.apiUrl || !aiConfig.apiKey) {
      throw new Error('AI配置不完整：需要API URL和API Key');
    }

    // 验证API URL格式
    if (!aiConfig.apiUrl.startsWith('http')) {
      throw new Error('API URL格式不正确，必须以http或https开头');
    }

    // 验证API Key不为空
    if (!aiConfig.apiKey.trim()) {
      throw new Error('API Key不能为空');
    }

    this.players[playerNumber].config = aiConfig;
    this.players[playerNumber].name =
      aiConfig.playerName || `AI${playerNumber}`;

    // 创建AI服务实例
    const aiService = new AIModelService({
      ...aiConfig,
      playerName: this.players[playerNumber].name,
    });

    this.aiServices.set(playerNumber, aiService);
  }

  // 获取玩家信息
  getPlayer(playerNumber) {
    return this.players[playerNumber];
  }

  // 检查玩家是否为AI
  isAIPlayer(playerNumber) {
    return this.players[playerNumber].type === PLAYER_TYPES.AI_MODEL;
  }

  // 检查玩家是否为人类
  isHumanPlayer(playerNumber) {
    return this.players[playerNumber].type === PLAYER_TYPES.HUMAN;
  }

  // 获取AI服务
  getAIService(playerNumber) {
    return this.aiServices.get(playerNumber);
  }

  // 获取AI移动 - 支持思考过程回调
  async getAIMove(playerNumber, board, gameHistory, onThinkingUpdate = null) {
    const aiService = this.getAIService(playerNumber);
    if (!aiService) {
      throw new Error(`玩家${playerNumber}未配置AI服务`);
    }

    return await aiService.getNextMove(
      board,
      gameHistory,
      playerNumber,
      onThinkingUpdate
    );
  }

  // 验证游戏配置
  validateGameConfig() {
    const errors = [];

    for (const [playerNumber, player] of Object.entries(this.players)) {
      if (player.type === PLAYER_TYPES.AI_MODEL) {
        if (!player.config) {
          errors.push(`玩家${playerNumber}需要配置AI`);
        } else if (!player.config.apiUrl || !player.config.apiKey) {
          errors.push(
            `玩家${playerNumber}的AI配置不完整：需要API URL和API Key`
          );
        } else if (!player.config.apiUrl.startsWith('http')) {
          errors.push(`玩家${playerNumber}的API URL格式不正确`);
        } else if (!this.aiServices.has(parseInt(playerNumber))) {
          errors.push(`玩家${playerNumber}的AI服务未初始化`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // 测试AI连接
  async testAIConnection(playerNumber) {
    const aiService = this.getAIService(playerNumber);
    if (!aiService) {
      throw new Error(`玩家${playerNumber}未配置AI服务`);
    }

    return await aiService.testConnection();
  }

  // 获取当前游戏模式信息
  getGameModeInfo() {
    return {
      mode: this.currentMode,
      players: { ...this.players },
      isHumanVsAI: this.currentMode === GAME_MODES.HUMAN_VS_AI,
      isAIVsAI: this.currentMode === GAME_MODES.AI_VS_AI,
    };
  }

  // 重置配置
  reset() {
    this.aiServices.clear();
    this.setGameMode(GAME_MODES.HUMAN_VS_AI);
  }
}
