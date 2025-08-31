// AI提示词管理服务（拆分重构后版本）
import { GOMOKU_ADVANCED_PROMPT } from './AIGomokuPromptTemplate.js';
import { BOARD_SIZE, DEFAULT_TEMPLATE_ID, FALLBACK_TEMPLATE_ID, isValidCoordinate } from './AIConstants.js';
import { boardToString as formatBoard, historyToString as formatHistory } from './AIBoardFormatter.js';
import { generateThreatAnalysisPrompt } from './AIThreatAnalyzer.js';
import { parseAIResponse as parseResponseExternal } from './AIResponseParser.js';

export class AIPromptService {
  constructor() {
    this.promptTemplates = this.initializePromptTemplates();
  }

  // 初始化提示词模板
  initializePromptTemplates() {
    // 提示词模板集中定义（如需新增模板，可在此扩展或创建新的模板文件）
    return {
      'gomoku-advanced': {
        id: 'gomoku-advanced',
        name: '高级五子棋AI提示词',
        description: '包含详细威胁分析、跳跃威胁识别和完整封堵策略的高级AI提示词',
        template: GOMOKU_ADVANCED_PROMPT
      },
      // 兼容旧代码中使用的默认ID（内容与高级版相同，可后续独立定制）
      'gomoku-system': {
        id: 'gomoku-system',
        name: '系统默认五子棋AI提示词',
        description: '系统默认（当前与高级模板一致）',
        template: GOMOKU_ADVANCED_PROMPT
      }
    };
  }

  // 获取所有提示词模板
  getAllTemplates() {
    return Object.values(this.promptTemplates);
  }

  // 根据ID获取提示词模板
  getTemplateById(templateId) {
    return this.promptTemplates[templateId] || null;
  }

  // 获取系统提示词
  getSystemPrompt(templateId = DEFAULT_TEMPLATE_ID) {
    const template = this.promptTemplates[templateId] || this.promptTemplates[FALLBACK_TEMPLATE_ID];
    return template.template;
  }

  // 构建游戏状态提示词（templateId 被忽略，因为当前仅有单一模板）
  buildGamePrompt(templateId, gameData) {
    return this.buildGomokuPrompt(gameData);
  }

  // 构建五子棋游戏状态提示词
  buildGomokuPrompt(gameData) {
    const { board, gameHistory, playerType } = gameData;
  const boardStr = formatBoard(board);
  const historyStr = formatHistory(gameHistory);
    const playerStr = playerType === 1 ? '黑子' : '白子';
    const threatAnalysis = generateThreatAnalysisPrompt(board, gameHistory, playerType);
    return `当前棋局状态：
棋盘（0=空位，1=黑子，2=白子）：
${boardStr}

历史走棋记录：
${historyStr}

${threatAnalysis}

你现在执${playerStr}，请分析当前局面并给出最佳下棋位置。

重要提醒：
- 如果存在活三威胁，必须立即封堵，否则必输
- 封堵位置必须在威胁线上或威胁线的延长线上
- 优先选择能同时建立自己防守阵型的位置
- 考虑棋盘边界对威胁发展的影响当前的棋盘边界为(0,0)到(14,14)`;
  }

  // （已拆分：棋盘与历史记录格式化已迁移到 AIBoardFormatter）

  // 添加自定义提示词模板
  addCustomTemplate(template) {
    if (!template.id || !template.name || !template.template) {
      throw new Error('提示词模板必须包含id、name和template字段');
    }
    
    this.promptTemplates[template.id] = {
      description: template.description || '自定义提示词模板',
      ...template
    };
  }

  // 移除提示词模板
  removeTemplate(templateId) {
    if (this.promptTemplates[templateId]) {
      delete this.promptTemplates[templateId];
    }
  }

  // 验证提示词模板
  validateTemplate(template) {
    const requiredFields = ['id', 'name', 'template'];
    for (const field of requiredFields) {
      if (!template[field]) {
        throw new Error(`提示词模板缺少必需字段: ${field}`);
      }
    }
    return true;
  }

  // 获取模板列表（用于选择）
  getTemplateList() {
    return Object.values(this.promptTemplates).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description
    }));
  }

  // 解析AI回复
  parseAIResponse(response) { return parseResponseExternal(response); }

  // 验证坐标有效性
  isValidCoordinate(row, col) { return isValidCoordinate(row, col, BOARD_SIZE); }

  // 威胁分析工具方法
  // 生成威胁分析提示词（直接使用拆分模块函数）
  generateThreatAnalysisPrompt(board, gameHistory, playerType) { return generateThreatAnalysisPrompt(board, gameHistory, playerType); }
}

// 创建单例实例
export const aiPromptService = new AIPromptService();

// 导出便捷方法
export const getSystemPrompt = (templateId) => aiPromptService.getSystemPrompt(templateId);
export const buildGamePrompt = (templateId, gameData) => aiPromptService.buildGamePrompt(templateId, gameData);
export const parseAIResponse = (response) => aiPromptService.parseAIResponse(response);
// 兼容性再导出（若其他代码依赖常量）
export { BOARD_SIZE } from './AIConstants.js';
