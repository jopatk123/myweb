/**
 * AI对话日志服务
 * 负责将AI的输入输出发送到服务器进行记录
 */
import { getApiBase, buildServerUrl } from '@/api/httpClient.js';

export class AILogService {
  constructor() {
    // 基础API地址
    this.apiBase = getApiBase();
    
    // 日志队列，用于批量发送或重试
    this.logQueue = [];
    
    // 是否在生产环境禁用日志
    const mode = import.meta.env?.MODE || 'development';
    this.enabled =
      mode !== 'production' ||
      import.meta.env.VITE_ENABLE_AI_LOGGING === 'true';

    this._buildServerUrl = buildServerUrl;
  }

  /**
   * 记录AI对话
   * @param {Object} logData - 日志数据
   * @param {string} logData.requestText - 请求文本
   * @param {string} logData.responseText - 响应文本
   * @param {string} logData.model - AI模型名称
   * @param {number} logData.playerType - 玩家类型 (1=黑子, 2=白子)
   * @param {string} logData.timestamp - 时间戳
   * @param {Object} logData.rawRequest - 原始请求数据（可选）
   * @param {Object} logData.rawResponse - 原始响应数据（可选）
   * @param {Object} logData.gameState - 游戏状态信息（可选）
   * @param {Object} logData.parsedResult - 解析后的结果（可选）
   */
  async logConversation(logData) {
    if (!this.enabled) {
      return;
    }

    try {
      const logEntry = {
        requestText: logData.requestText || '',
        responseText: logData.responseText || '',
        model: logData.model || 'unknown',
        playerType: logData.playerType || 'unknown',
        timestamp: logData.timestamp || new Date().toISOString(),
        rawRequest: logData.rawRequest || null,
        rawResponse: logData.rawResponse || null,
        gameState: logData.gameState || null,
        parsedResult: logData.parsedResult || null
      };

      // 发送到服务器
      await this.sendToServer(logEntry);
      
    } catch (error) {
      void error;
      // 更详细的错误输出
      console.warn('AI日志记录失败');

      // 针对后端返回的 404 或特定错误，降级策略：将日志写入 localStorage 以便后续上传
      try {
        const status = error && error.status ? error.status : null;
        if (status === 404) {
          // 保存到本地备份
          const backupKey = 'ai_logs_backup';
          const existing = JSON.parse(localStorage.getItem(backupKey) || '[]');
          existing.push({ ...logData, failedAt: new Date().toISOString() });
          // 限制备份长度
          while (existing.length > 500) existing.shift();
          localStorage.setItem(backupKey, JSON.stringify(existing));
        } else {
          // 将失败的日志添加到队列中，稍后重试
          this.logQueue.push(logData);
          // 如果队列过长，移除最旧的记录
          if (this.logQueue.length > 100) {
            this.logQueue.shift();
          }
        }
      } catch (storageErr) {
        void storageErr;
        // 如果localStorage不可用，则退回到队列机制
        console.warn('AI日志备份失败，本地存储不可用');
        this.logQueue.push(logData);
        if (this.logQueue.length > 100) this.logQueue.shift();
      }
    }
  }

  /**
   * 发送日志到服务器
   * @private
   */
  async sendToServer(logEntry) {
  const response = await fetch(this._buildServerUrl('/internal/logs/ai'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry)
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text().catch(() => '');
      const err = new Error(`服务器响应错误: ${status} ${text}`);
      // 为了让外层可以根据 status 做降级处理，附加 status 字段
      err.status = status;
      throw err;
    }
  }

  /**
   * 重试发送队列中的日志
   */
  async retryQueuedLogs() {
    if (this.logQueue.length === 0) {
      return;
    }

    const logsToRetry = [...this.logQueue];
    this.logQueue = [];

    for (const logData of logsToRetry) {
      try {
        await this.logConversation(logData);
      } catch (error) {
        void error;
        // 重试失败，重新加入队列
        this.logQueue.push(logData);
      }
    }
  }

  /**
   * 获取队列中未发送的日志数量
   */
  getQueueLength() {
    return this.logQueue.length;
  }

  /**
   * 清空日志队列
   */
  clearQueue() {
    this.logQueue = [];
  }

  /**
   * 设置日志服务启用状态
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// 创建全局实例
export const aiLogService = new AILogService();
