// AI大模型服务
export class AIModelService {
  constructor(config) {
    this.config = config;
    this.originalApiUrl = config.apiUrl;
    this.apiUrl = this.normalizeApiUrl(config.apiUrl);
  // 去掉可能复制时带入的前后空白
  this.apiKey = (config.apiKey || '').trim();
    this.modelName = config.modelName || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.1;
    this.playerName = config.playerName || 'AI玩家';
    this.isThinking = false;
  }

  // 规范化接口地址：用户经常只填到 /v1 导致 404
  normalizeApiUrl(url) {
    if (!url) return url;
    const trimmed = url.replace(/\s+/g, '');
    // 已经是具体路径则直接返回
    if (/\/v1\/(chat\/completions|messages)/.test(trimmed)) return trimmed;
    if (/\/v1\/?$/.test(trimmed)) {
      if (trimmed.includes('anthropic')) {
        return trimmed.replace(/\/v1\/?$/, '/v1/messages');
      }
      // openai / moonshot / ollama 走 chat/completions 风格
      return trimmed.replace(/\/v1\/?$/, '/v1/chat/completions');
    }
    return trimmed;
  }

  detectProvider() {
    const u = this.apiUrl;
    if (!u) return 'unknown';
    if (u.includes('anthropic')) return 'anthropic';
    if (u.includes('ollama')) return 'ollama';
    if (u.includes('moonshot')) return 'moonshot';
    if (u.includes('openai')) return 'openai';
    return 'openai-like';
  }

  buildRequestPayload(prompt) {
    const provider = this.detectProvider();
    if (provider === 'anthropic') {
      // 简化的 Anthropic Messages API 结构（真实 API 可能需调整）
      return JSON.stringify({
        model: this.modelName,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ]
      });
    }
    // OpenAI 兼容风格
    return JSON.stringify({
      model: this.modelName,
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      max_tokens: this.maxTokens,
      temperature: this.temperature
    });
  }

  buildRequestHeaders() {
    const provider = this.detectProvider();
    if (provider === 'anthropic') {
      return {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      };
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  // 获取AI的下一步棋 - 支持思考过程回调
  async getNextMove(board, gameHistory, playerType, onThinkingUpdate = null) {
    console.log('[DEBUG AIModelService] getNextMove called for playerType:', playerType);
    console.log('[DEBUG AIModelService] isThinking:', this.isThinking);
    if (this.isThinking) {
      console.error('[DEBUG AIModelService] AI is already thinking');
      throw new Error('AI正在思考中，请稍候...');
    }

    this.isThinking = true;
    const startTime = Date.now();
    console.log('[DEBUG AIModelService] Starting AI thinking process');
    
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
      console.log('[DEBUG AIModelService] Built prompt for AI:', prompt.substring(0, 200) + '...');
      console.log('[DEBUG AIModelService] 完整AI提示词:');
      console.log('='.repeat(50));
      console.log(this.getSystemPrompt());
      console.log('-'.repeat(50));
      console.log(prompt);
      console.log('='.repeat(50));
      
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

      console.log('[DEBUG AIModelService] Making API request to:', this.apiUrl);
      console.log('[DEBUG AIModelService] Request headers:', this.buildRequestHeaders());
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.buildRequestHeaders(),
        body: this.buildRequestPayload(prompt)
      });
      console.log('[DEBUG AIModelService] API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG AIModelService] API request failed:', response.status, errorText);
        // 针对用户只填了基址 /v1 的场景再做一次自动补全重试
        if (response.status === 404 && /\/v1\/?$/.test(this.originalApiUrl)) {
          console.log('[DEBUG AIModelService] Attempting to fix URL and retry');
          const fixedUrl = this.normalizeApiUrl(this.originalApiUrl);
          if (fixedUrl !== this.apiUrl) {
            this.apiUrl = fixedUrl; // 更新并重试一次
            console.log('[DEBUG AIModelService] Retrying with fixed URL:', this.apiUrl);
            const retry = await fetch(this.apiUrl, {
              method: 'POST',
              headers: this.buildRequestHeaders(),
              body: this.buildRequestPayload(prompt)
            });
            if (retry.ok) {
              return await this.processResponse(retry, playerType, onThinkingUpdate, startTime, board, gameHistory);
            }
          }
        }
        if (response.status === 401) {
          // 尝试给出更可操作的提示
            throw new Error(`认证失败(401)，请检查: 1) API Key 是否正确且未过期 2) 是否包含多余空格/换行 3) Endpoint 与提供商是否匹配。原始响应: ${errorText}`);
        }
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

  const result = await this.processResponse(response, playerType, onThinkingUpdate, startTime, board, gameHistory);
      
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

      return result;
    } catch (error) {
      console.error('[DEBUG AIModelService] AI模型调用失败:', error);
      console.error('[DEBUG AIModelService] Error stack:', error.stack);
      throw error;
    } finally {
      console.log('[DEBUG AIModelService] AI thinking completed, resetting isThinking flag');
      this.isThinking = false;
    }
  }

  async processResponse(response, playerType, onThinkingUpdate, startTime, board, gameHistory) {
    const data = await response.json();
    // OpenAI / moonshot / ollama 风格
    if (data.choices && data.choices[0]) {
      const message = data.choices[0].message || data.choices[0];
      const aiResponse = message.content || message.text || '';
      const parsed = this.parseAIResponse(aiResponse);
      const thinkingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      return {
        ...parsed,
        playerName: this.playerName,
        thinkingTime,
        analysis: {
          thinkingTime,
            moveType: this.analyzeMoveType(parsed, board),
            winProbability: this.estimateWinProbability(parsed, board, gameHistory)
        }
      };
    }
    // Anthropic messages 风格（content 可能是数组）
    if (data.content) {
      let contentText = '';
      if (Array.isArray(data.content)) {
        contentText = data.content.map(p => (p.text || p.content || p)).join('\n');
      } else {
        contentText = data.content.text || data.content;
      }
      const parsed = this.parseAIResponse(contentText);
      const thinkingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      return {
        ...parsed,
        playerName: this.playerName,
        thinkingTime,
        analysis: {
          thinkingTime,
          moveType: this.analyzeMoveType(parsed, board),
          winProbability: this.estimateWinProbability(parsed, board, gameHistory)
        }
      };
    }
    throw new Error('API返回数据格式错误');
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
    return `你是一个专业的五子棋AI选手。你的目标是用最容易获胜的方式进行下棋。

规则说明：
- 棋盘大小：15x15
- 目标：连成5子获胜（横、竖、斜均可）
- 坐标系：行列都从0开始，到14结束
- 棋子表示：· = 空位，● = 黑子，○ = 白子

请你自由发挥，不要拘泥于任何术语或固定套路，只需根据当前棋盘和历史走棋记录，选择最容易获胜的落子。

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
    id: 'Kimi',
    name: 'Kimi',
    apiUrl: 'https://api.moonshot.cn/v1',
    modelName: 'kimi-k2-turbo-preview',
    description: 'Kimi'
  }

];