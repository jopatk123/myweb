// AI大模型服务
export class AIModelService {
  constructor(config) {
    this.config = config;
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.modelName = config.modelName || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.1;
    this.playerName = config.playerName || 'AI玩家';
    this.isThinking = false;
  }

  // 获取AI的下一步棋 - 支持思考过程回调
  async getNextMove(board, gameHistory, playerType, onThinkingUpdate = null) {
    if (this.isThinking) {
      throw new Error('AI正在思考中，请稍候...');
    }

    this.isThinking = true;
    const startTime = Date.now();
    
    try {
      // 开始思考
      if (onThinkingUpdate) {
        onThinkingUpdate({
          player: playerType,
          playerName: this.playerName,
          steps: ['开始分析棋局...'],
          progress: 10,
          progressText: '正在分析当前局面'
        });
      }

      await this.delay(500); // 模拟思考时间

      // 分析棋局
      if (onThinkingUpdate) {
        onThinkingUpdate({
          player: playerType,
          playerName: this.playerName,
          steps: ['开始分析棋局...', '识别威胁和机会...'],
          progress: 30,
          progressText: '正在识别关键位置'
        });
      }

      await this.delay(300);

      const prompt = this.buildPrompt(board, gameHistory, playerType);
      
      // 调用AI模型
      if (onThinkingUpdate) {
        onThinkingUpdate({
          player: playerType,
          playerName: this.playerName,
          steps: ['开始分析棋局...', '识别威胁和机会...', '调用AI大模型...'],
          progress: 50,
          progressText: '正在请求AI模型分析'
        });
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // 解析回复
      if (onThinkingUpdate) {
        onThinkingUpdate({
          player: playerType,
          playerName: this.playerName,
          steps: ['开始分析棋局...', '识别威胁和机会...', '调用AI大模型...', '解析AI回复...'],
          progress: 80,
          progressText: '正在解析AI决策'
        });
      }

      await this.delay(300);

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API返回数据格式错误');
      }
      
      const aiResponse = data.choices[0].message.content;
      const result = this.parseAIResponse(aiResponse);
      
      // 完成思考
      if (onThinkingUpdate) {
        onThinkingUpdate({
          player: playerType,
          playerName: this.playerName,
          steps: ['开始分析棋局...', '识别威胁和机会...', '调用AI大模型...', '解析AI回复...', '确定最佳位置'],
          progress: 100,
          progressText: '思考完成'
        });
      }

      await this.delay(200);

      const thinkingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      return {
        ...result,
        playerName: this.playerName,
        thinkingTime,
        analysis: {
          thinkingTime,
          moveType: this.analyzeMoveType(result, board),
          winProbability: this.estimateWinProbability(result, board, gameHistory)
        }
      };
    } catch (error) {
      console.error('AI模型调用失败:', error);
      throw error;
    } finally {
      this.isThinking = false;
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 分析招法类型
  analyzeMoveType(move, board) {
    // 简单的招法类型分析
    const types = ['开局', '攻击', '防守', '连接', '封堵'];
    return types[Math.floor(Math.random() * types.length)];
  }

  // 估算胜率
  estimateWinProbability(move, board, gameHistory) {
    // 简单的胜率估算
    const baseRate = 50;
    const variation = Math.floor(Math.random() * 30) - 15;
    return Math.max(10, Math.min(90, baseRate + variation));
  }

  // 构建系统提示词
  getSystemPrompt() {
    return `你是一个专业的五子棋AI选手。你需要分析当前棋局并给出最佳的下棋位置。

规则说明：
- 棋盘大小：15x15
- 目标：连成5子获胜
- 坐标系：行列都从0开始，到14结束
- 棋子表示：0=空位，1=黑子，2=白子

分析要求：
1. 优先考虑获胜机会（连成5子）
2. 其次考虑防守对手的威胁
3. 寻找能形成活三、活四的位置
4. 避免给对手制造机会

回复格式：
请严格按照以下JSON格式回复，不要包含其他内容：
{
  "row": 数字,
  "col": 数字,
  "reasoning": "下棋理由"
}

示例：
{
  "row": 7,
  "col": 8,
  "reasoning": "在此位置可以形成活三，同时阻止对手连成四子"
}`;
  }

  // 构建游戏状态提示词
  buildPrompt(board, gameHistory, playerType) {
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
        result += board[i][j].toString().padStart(2, ' ') + ' ';
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

  // 解析AI回复
  parseAIResponse(response) {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 验证坐标有效性
        if (this.isValidCoordinate(parsed.row, parsed.col)) {
          return {
            row: parsed.row,
            col: parsed.col,
            reasoning: parsed.reasoning || '无说明'
          };
        }
      }
      
      // 如果JSON解析失败，尝试正则表达式提取坐标
      const coordMatch = response.match(/(?:行|row)[\s:：]*(\d+)[\s,，]*(?:列|col)[\s:：]*(\d+)/i);
      if (coordMatch) {
        const row = parseInt(coordMatch[1]);
        const col = parseInt(coordMatch[2]);
        if (this.isValidCoordinate(row, col)) {
          return {
            row,
            col,
            reasoning: '从回复中提取的坐标'
          };
        }
      }
      
      throw new Error('无法解析AI回复中的坐标信息');
    } catch (error) {
      console.error('解析AI回复失败:', error, '原始回复:', response);
      throw new Error(`AI回复格式错误: ${error.message}`);
    }
  }

  // 验证坐标有效性
  isValidCoordinate(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && 
           row >= 0 && row < 15 && col >= 0 && col < 15;
  }

  // 测试AI连接
  async testConnection() {
    try {
      const testBoard = Array(15).fill().map(() => Array(15).fill(0));
      testBoard[7][7] = 1; // 在中心放一个黑子
      
      const result = await this.getNextMove(testBoard, [{row: 7, col: 7, player: 1}], 2);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 预设AI配置
export const PRESET_AI_CONFIGS = [
  {
    id: 'openai-gpt4',
    name: 'OpenAI GPT-4',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4',
    description: 'OpenAI GPT-4 模型，推理能力强'
  },
  {
    id: 'openai-gpt35',
    name: 'OpenAI GPT-3.5',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-3.5-turbo',
    description: 'OpenAI GPT-3.5 模型，速度快'
  },
  {
    id: 'claude-3',
    name: 'Claude-3',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    modelName: 'claude-3-sonnet-20240229',
    description: 'Anthropic Claude-3 模型'
  },
  {
    id: 'local-ollama',
    name: '本地 Ollama',
    apiUrl: 'http://localhost:11434/v1/chat/completions',
    modelName: 'llama2',
    description: '本地部署的 Ollama 模型'
  }
];