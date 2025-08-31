// AI大模型服务
export class AIModelService {
  constructor(config) {
    this.config = config;
    this.originalApiUrl = config.apiUrl;
    this.apiUrl = this.normalizeApiUrl(config.apiUrl);
  // 去掉可能复制时带入的前后空白
  this.apiKey = (config.apiKey || '').trim();
  this.modelName = config.modelName || 'deepseek-chat';
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

      await this.delay(500);

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

      if (onThinkingUpdate) {
        onThinkingUpdate({
          player: playerType,
          playerName: this.playerName,
          steps: ['开始分析棋局...', '识别威胁和机会...', '调用AI大模型...'],
          progress: 50,
          progressText: '正在请求AI模型分析'
        });
      }

      // 生成请求载荷（纯文本），准备发送给 AI
      const payloadString = this.buildRequestPayload(prompt);

      let response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.buildRequestHeaders(),
        body: payloadString
      });

      if (!response.ok) {
        const errorText = await response.text();
        // 尝试自动纠正基础路径后重试
        if (response.status === 404 && /\/v1\/?$/.test(this.originalApiUrl)) {
          const fixedUrl = this.normalizeApiUrl(this.originalApiUrl);
          if (fixedUrl !== this.apiUrl) {
            this.apiUrl = fixedUrl;
            const retry = await fetch(this.apiUrl, {
              method: 'POST',
              headers: this.buildRequestHeaders(),
              body: payloadString
            });
            if (retry.ok) {
              const rawRetry = await retry.clone().text();
              console.log('[Gomoku][AI][RawResponse][retry]', rawRetry);
              return await this.processResponse(retry, playerType, onThinkingUpdate, startTime, board, gameHistory);
            }
          }
        }
        if (response.status === 401) {
          throw new Error(`认证失败(401)，请检查: 1) API Key 是否正确且未过期 2) 是否包含多余空格/换行 3) Endpoint 与提供商是否匹配。原始响应: ${errorText}`);
        }
        throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // 记录成功响应的原始文本并发送到服务器内部日志（仅发送 requestText & responseText）
      try {
        const rawText = await response.clone().text();
        // 在浏览器控制台输出：只显示请求文本与回复文本
        try {
          console.log('[Gomoku][AI][RequestText]', prompt);
          console.log('[Gomoku][AI][ResponseText]', rawText);
        } catch (e) {
          // 忽略控制台写入错误
        }
      } catch (e) {
        // 忽略读取失败
      }

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
      throw error;
    } finally {
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

  // 获取系统提示词（使用统一服务）
  getSystemPrompt() {
    return aiPromptService.getSystemPrompt('gomoku-system');
  }

  // 构建游戏状态提示词（使用统一服务）
  buildPrompt(board, gameHistory, playerType) {
    return aiPromptService.buildGamePrompt('gomoku-system', {
      board,
      gameHistory,
      playerType
    });
  }

  // 解析AI回复（使用统一服务）
  parseAIResponse(response) {
    return aiPromptService.parseAIResponse(response, 'gomoku');
  }

  // 测试AI连接
  async testConnection() {
    try {
      // 验证配置
      if (!this.apiUrl || !this.apiKey) {
        throw new Error('AI配置不完整：需要API URL和API Key');
      }

      if (!this.apiUrl.startsWith('http')) {
        throw new Error('API URL格式不正确，必须以http或https开头');
      }

      // 进行实际的API调用测试
      const testBoard = Array(15).fill().map(() => Array(15).fill(0));
      testBoard[7][7] = 1; // 在中心放一个黑子
      
      const result = await this.getNextMove(testBoard, [{row: 7, col: 7, player: 1}], 2);
      
      // 验证返回结果
      if (!result || typeof result.row !== 'number' || typeof result.col !== 'number') {
        throw new Error('AI返回的移动结果格式不正确');
      }
      
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 导入统一的AI预设服务
import { aiPresetService, PRESET_AI_CONFIGS } from './AIPresetService.js';
// 导入统一的AI提示词服务
import { aiPromptService } from './AIPromptService.js';

// 导出预设配置（从统一服务获取）
export { PRESET_AI_CONFIGS };