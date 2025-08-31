// AI提示词管理服务 - 统一管理所有AI提示词模板和逻辑
export class AIPromptService {
  constructor() {
    this.promptTemplates = this.initializePromptTemplates();
  }

  // 初始化提示词模板
  initializePromptTemplates() {
    return {
      // 五子棋系统提示词模板
      'gomoku-system': {
        id: 'gomoku-system',
        name: '五子棋系统提示词',
        description: '五子棋AI的系统角色定义和规则说明',
        template: `你是一个专业的五子棋AI选手。你的目标是用最容易获胜的方式进行下棋。

规则说明：
- 棋盘大小：15x15
- 目标：连成5子获胜（横、竖、斜均可）
- 坐标系：行列都从0开始，到14结束
- 棋子表示：· = 空位，● = 黑子，○ = 白子

必须进行封堵的情况：
封堵对手即将形成活四的关键点（即对手已有三子连线且两端均有发展空间，下一步可形成活四的位置）
封堵冲四（一端被阻挡，但另一端可直接形成五连的四子连线，必须立即封堵）
封堵活三（三子连线且两端均无阻挡，若不封堵，对手下一步可形成活四必输局）
考虑封堵的情况：
封堵冲三（三子连线一端被阻挡，另一端可形成冲四）

回复格式：
请严格按照以下JSON格式回复，不要包含其他内容：
{
  "row": 数字,
  "col": 数字,
  "reasoning": "详细的分析和下棋理由"
}

示例：
{
  "row": 7,
  "col": 8,
  "reasoning": "此位置有助于我快速连成五子，或阻止对手获胜。"
}`
      },

      // 贪吃蛇系统提示词模板
      'snake-system': {
        id: 'snake-system',
        name: '贪吃蛇系统提示词',
        description: '贪吃蛇AI的系统角色定义和规则说明',
        template: `你是一个专业的贪吃蛇AI选手。你的目标是在不撞墙和不撞到自己的前提下，尽可能多地吃到食物。

规则说明：
- 游戏区域：20x20的网格
- 目标：控制蛇移动，吃到食物，让蛇变长
- 移动方向：上、下、左、右四个方向
- 死亡条件：撞墙或撞到自己的身体

策略要点：
1. 优先选择安全的方向移动
2. 在安全的前提下，选择距离食物最近的方向
3. 避免进入死胡同
4. 保持蛇身的连续性

回复格式：
请严格按照以下JSON格式回复，不要包含其他内容：
{
  "direction": "up|down|left|right",
  "reasoning": "详细的分析和移动理由"
}`
      },

      // 通用游戏系统提示词模板
      'general-game-system': {
        id: 'general-game-system',
        name: '通用游戏系统提示词',
        description: '通用游戏AI的系统角色定义',
        template: `你是一个专业的游戏AI选手。请根据具体的游戏规则和目标进行最佳决策。

回复格式：
请严格按照以下JSON格式回复，不要包含其他内容：
{
  "action": "具体行动",
  "reasoning": "详细的分析和决策理由"
}`
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
  getSystemPrompt(templateId = 'gomoku-system') {
    const template = this.getTemplateById(templateId);
    return template ? template.template : this.getDefaultSystemPrompt();
  }

  // 获取默认系统提示词
  getDefaultSystemPrompt() {
    return this.promptTemplates['gomoku-system'].template;
  }

  // 构建游戏状态提示词
  buildGamePrompt(templateId, gameData) {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`未找到提示词模板: ${templateId}`);
    }

    switch (templateId) {
      case 'gomoku-system':
        return this.buildGomokuPrompt(gameData);
      case 'snake-system':
        return this.buildSnakePrompt(gameData);
      default:
        return this.buildGeneralPrompt(gameData);
    }
  }

  // 构建五子棋游戏状态提示词
  buildGomokuPrompt(gameData) {
    const { board, gameHistory, playerType } = gameData;
    const boardStr = this.boardToString(board);
    const historyStr = this.historyToString(gameHistory);
    const playerStr = playerType === 1 ? '黑子' : '白子';
    
    return `当前棋局状态：
棋盘（0=空位，1=黑子，2=白子）：
${boardStr}

历史走棋记录：
${historyStr}

你现在执${playerStr}，请分析当前局面并给出最佳下棋位置。`;
  }

  // 构建贪吃蛇游戏状态提示词
  buildSnakePrompt(gameData) {
    const { snake, food, direction } = gameData;
    return `当前游戏状态：
蛇的位置：${JSON.stringify(snake)}
食物的位置：${JSON.stringify(food)}
当前方向：${direction}

请分析当前局面并选择最佳的移动方向。`;
  }

  // 构建通用游戏状态提示词
  buildGeneralPrompt(gameData) {
    return `当前游戏状态：
${JSON.stringify(gameData, null, 2)}

请分析当前局面并给出最佳决策。`;
  }

  // 将棋盘转换为字符串
  boardToString(board) {
    let result = '   ';
    // 添加列号
    for (let i = 0; i < 15; i++) {
      result += i.toString().padStart(2, ' ') + ' ';
    }
    result += '\n';
    
    // 添加棋盘内容
    for (let i = 0; i < 15; i++) {
      result += i.toString().padStart(2, ' ') + ' ';
      for (let j = 0; j < 15; j++) {
        let cell = board[i][j];
        if (cell === 0) {
          result += ' · '; // 空位用点表示，更直观
        } else if (cell === 1) {
          result += ' ● '; // 黑子
        } else if (cell === 2) {
          result += ' ○ '; // 白子
        } else {
          result += board[i][j].toString().padStart(2, ' ') + ' ';
        }
      }
      result += '\n';
    }
    return result;
  }

  // 将历史记录转换为字符串
  historyToString(gameHistory) {
    if (!gameHistory || gameHistory.length === 0) {
      return '暂无走棋记录';
    }
    
    let result = '';
    gameHistory.forEach((move, index) => {
      const playerStr = move.player === 1 ? '黑子' : '白子';
      result += `第${index + 1}步: ${playerStr} 下在 (${move.row}, ${move.col})\n`;
    });
    return result;
  }

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

  // 解析AI回复（通用方法）
  parseAIResponse(response, gameType = 'gomoku') {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 根据游戏类型验证回复格式
        switch (gameType) {
          case 'gomoku':
            return this.validateGomokuResponse(parsed);
          case 'snake':
            return this.validateSnakeResponse(parsed);
          default:
            return parsed;
        }
      }
      
      throw new Error('无法解析AI回复中的JSON信息');
    } catch (error) {
      throw new Error(`AI回复格式错误: ${error.message}`);
    }
  }

  // 验证五子棋AI回复
  validateGomokuResponse(parsed) {
    if (this.isValidCoordinate(parsed.row, parsed.col)) {
      return {
        row: parsed.row,
        col: parsed.col,
        reasoning: parsed.reasoning || '无说明'
      };
    }
    throw new Error('AI回复中的坐标无效');
  }

  // 验证贪吃蛇AI回复
  validateSnakeResponse(parsed) {
    const validDirections = ['up', 'down', 'left', 'right'];
    if (validDirections.includes(parsed.direction)) {
      return {
        direction: parsed.direction,
        reasoning: parsed.reasoning || '无说明'
      };
    }
    throw new Error('AI回复中的方向无效');
  }

  // 验证坐标有效性
  isValidCoordinate(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && 
           row >= 0 && row < 15 && col >= 0 && col < 15;
  }
}

// 创建单例实例
export const aiPromptService = new AIPromptService();

// 导出便捷方法
export const getSystemPrompt = (templateId) => aiPromptService.getSystemPrompt(templateId);
export const buildGamePrompt = (templateId, gameData) => aiPromptService.buildGamePrompt(templateId, gameData);
export const parseAIResponse = (response, gameType) => aiPromptService.parseAIResponse(response, gameType);
