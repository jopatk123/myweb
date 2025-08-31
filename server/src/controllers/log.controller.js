import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LogController {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.aiLogFile = path.join(this.logDir, 'ai-conversations.log');
  }

  /**
   * 获取AI对话日志
   */
  async getAILogs(req, res, next) {
    try {
      const { lines = 100, search = '', format = 'text' } = req.query;
      
      if (!fs.existsSync(this.aiLogFile)) {
        return res.json({
          code: 200,
          data: {
            logs: [],
            totalLines: 0,
            message: 'AI对话日志文件不存在'
          }
        });
      }

      // 读取日志文件
      const content = await fs.promises.readFile(this.aiLogFile, 'utf8');
      
      if (format === 'json') {
        // 解析日志为结构化数据
        const parsedLogs = this.parseLogContent(content);
        
        // 应用搜索过滤
        let filteredLogs = parsedLogs;
        if (search) {
          filteredLogs = parsedLogs.filter(log => 
            log.requestText.toLowerCase().includes(search.toLowerCase()) ||
            log.responseText.toLowerCase().includes(search.toLowerCase()) ||
            log.model.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        // 限制返回行数
        const limitedLogs = filteredLogs.slice(-Math.max(1, parseInt(lines) || 100));
        
        res.json({
          code: 200,
          data: {
            logs: limitedLogs,
            totalEntries: filteredLogs.length,
            totalLines: content.split('\n').length
          }
        });
      } else {
        // 返回原始文本
        let lines_array = content.split('\n');
        
        // 应用搜索过滤
        if (search) {
          lines_array = lines_array.filter(line => 
            line.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        // 限制返回行数
        const limitedLines = lines_array.slice(-Math.max(1, parseInt(lines) || 100));
        
        res.json({
          code: 200,
          data: {
            logs: limitedLines.join('\n'),
            totalLines: lines_array.length
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * 清空AI对话日志
   */
  async clearAILogs(req, res, next) {
    try {
      if (fs.existsSync(this.aiLogFile)) {
        await fs.promises.writeFile(this.aiLogFile, '');
      }
      
      res.json({
        code: 200,
        message: 'AI对话日志已清空'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(req, res, next) {
    try {
      if (!fs.existsSync(this.aiLogFile)) {
        return res.json({
          code: 200,
          data: {
            fileExists: false,
            size: 0,
            entries: 0,
            lastModified: null
          }
        });
      }

      const stats = await fs.promises.stat(this.aiLogFile);
      const content = await fs.promises.readFile(this.aiLogFile, 'utf8');
      
      // 统计日志条目数（通过分隔符计算）
      const entries = (content.match(/={80}/g) || []).length;
      
      res.json({
        code: 200,
        data: {
          fileExists: true,
          size: stats.size,
          sizeFormatted: this.formatFileSize(stats.size),
          entries: entries,
          lines: content.split('\n').length,
          lastModified: stats.mtime.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 解析日志内容为结构化数据
   * @private
   */
  parseLogContent(content) {
    const entries = [];
    const logEntries = content.split('=' .repeat(80));
    
    for (const entry of logEntries) {
      if (!entry.trim()) continue;
      
      const lines = entry.trim().split('\n');
      if (lines.length < 3) continue;
      
      // 解析头部信息
      const headerMatch = lines[0].match(/^\[(.*?)\] \[Model: (.*?)\] \[Player: (.*?)\]$/);
      if (!headerMatch) continue;
      
      const [, timestamp, model, playerType] = headerMatch;
      
      // 找到REQUEST和RESPONSE的位置
      const requestIndex = lines.findIndex(line => line.startsWith('REQUEST:'));
      const responseIndex = lines.findIndex(line => line.startsWith('RESPONSE:'));
      
      if (requestIndex === -1 || responseIndex === -1) continue;
      
      const requestText = lines.slice(requestIndex + 1, responseIndex).join('\n').trim();
      const responseText = lines.slice(responseIndex + 1).join('\n').trim();
      
      entries.push({
        timestamp,
        model,
        playerType,
        requestText,
        responseText
      });
    }
    
    return entries;
  }

  /**
   * 格式化文件大小
   * @private
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
