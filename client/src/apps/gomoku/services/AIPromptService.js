// AI提示词管理服务 - 五子棋AI提示词模板和逻辑
import { GOMOKU_ADVANCED_PROMPT } from './AIGomokuPromptTemplate.js';

// ========= 常量区域 =========
export const BOARD_SIZE = 15;
export const DEFAULT_TEMPLATE_ID = 'gomoku-system';
export const FALLBACK_TEMPLATE_ID = 'gomoku-advanced';
const THREAT_PRIORITIES = Object.freeze({
  '五连': 10,
  '活四': 9,
  '冲四': 8,
  '跳四': 7,
  '活三': 6,
  '冲三': 5,
  '活跳三': 4,
  '冲跳三': 3,
  '跳三': 3,
  '死跳三': 2,
  '活二': 1,
  '跳二': 1
});

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
  const boardStr = this.boardToString(board);
    const historyStr = this.historyToString(gameHistory);
    const playerStr = playerType === 1 ? '黑子' : '白子';
    
    // 生成威胁分析
    const threatAnalysis = this.generateThreatAnalysisPrompt(board, gameHistory, playerType);
    
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

  // 将棋盘转换为字符串
  boardToString(board) {
    if (!board || !Array.isArray(board) || !Array.isArray(board[0])) return '无效棋盘数据';
    const size = board.length;
    let result = '   ';
    // 添加列号
    for (let i = 0; i < size; i++) {
      result += i.toString().padStart(2, ' ') + ' ';
    }
    result += '\n';
    
    // 添加棋盘内容
    for (let i = 0; i < size; i++) {
      result += i.toString().padStart(2, ' ') + ' ';
      for (let j = 0; j < size; j++) {
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

  // 解析AI回复
  parseAIResponse(response) {
    try {
      if (!response || typeof response !== 'string') throw new Error('空回复');
      // 1. 代码块 JSON
      const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced && fenced[1]) {
        const parsed = JSON.parse(fenced[1].trim());
        return this.validateGomokuResponse(parsed);
      }
      // 2. 第一段 JSON 对象
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateGomokuResponse(parsed);
      }
      // 3. 宽松坐标匹配
      const coordRegex = /row\D*(-?\d+)[\s\S]*?col\D*(-?\d+)/i;
      const loose = response.match(coordRegex);
      if (loose) {
        const row = parseInt(loose[1], 10);
        const col = parseInt(loose[2], 10);
        return this.validateGomokuResponse({ row, col, reasoning: response.slice(0, 200) });
      }
      throw new Error('未找到有效JSON或坐标');
    } catch (error) {
      throw new Error(`AI回复格式错误: ${error.message}`);
    }
  }

  // 验证五子棋AI回复
  validateGomokuResponse(parsed) {
    if (this.isValidCoordinate(parsed.row, parsed.col)) {
      let reasoning = (parsed.reasoning || '').toString();
      if (reasoning.length > 220) reasoning = reasoning.slice(0, 217) + '...';
      return { row: parsed.row, col: parsed.col, reasoning: reasoning || '无说明' };
    }
    throw new Error('AI回复中的坐标无效');
  }

  // 验证坐标有效性
  isValidCoordinate(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  // 威胁分析工具方法
  analyzeThreats(board, playerType) {
    const threats = [];
    const directions = [
      [0, 1],   // 水平
      [1, 0],   // 垂直
      [1, 1],   // 右下斜
      [1, -1]   // 左下斜
    ];

    // 使用 visited 集合来避免沿同一线段重复分析（性能优化）
    const visited = new Set();
    const size = board.length;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] === playerType) {
          for (const [dr, dc] of directions) {
            // 以线段的最小端点作为标识，避免多次从线中不同点重复分析
            const key = `${row}-${col}-${dr}-${dc}`;
            if (visited.has(key)) continue;

            const threat = this.analyzeDirection(board, row, col, dr, dc, playerType);
            if (threat) {
              threats.push(threat);
              // 标记该线段上所有坐标为已访问，减少重复分析
              try {
                const { leftEnd, rightEnd } = threat;
                if (leftEnd && rightEnd) {
                  let r = leftEnd.row;
                  let c = leftEnd.col;
                  while (true) {
                    visited.add(`${r}-${c}-${dr}-${dc}`);
                    if (r === rightEnd.row && c === rightEnd.col) break;
                    r += dr; c += dc;
                    if (!this.isValidCoordinate(r, c)) break;
                  }
                }
              } catch (e) {
                // 忽略标记错误，防止影响主流程
              }
            }
          }
        }
      }
    }

    return this.mergeThreats(threats);
  }

  // 分析特定方向的威胁
  analyzeDirection(board, startRow, startCol, dr, dc, playerType) {
    // 先检查连续威胁
    const continuousThreat = this.analyzeContinuousThreat(board, startRow, startCol, dr, dc, playerType);
    if (continuousThreat) {
      return continuousThreat;
    }

    // 再检查跳跃威胁
    return this.analyzeJumpThreat(board, startRow, startCol, dr, dc, playerType);
  }

  // 分析连续威胁
  analyzeContinuousThreat(board, startRow, startCol, dr, dc, playerType) {
    let count = 1;
    let blockedLeft = false;
    let blockedRight = false;
    let leftEnd = { row: startRow, col: startCol };
    let rightEnd = { row: startRow, col: startCol };

    // 向左/上检查连续棋子
    let r = startRow - dr;
    let c = startCol - dc;
    while (this.isValidCoordinate(r, c) && board[r][c] === playerType) {
      count++;
      leftEnd = { row: r, col: c };
      r -= dr;
      c -= dc;
    }
    if (!this.isValidCoordinate(r, c) || board[r][c] !== 0) {
      blockedLeft = true;
    }

    // 向右/下检查连续棋子
    r = startRow + dr;
    c = startCol + dc;
    while (this.isValidCoordinate(r, c) && board[r][c] === playerType) {
      count++;
      rightEnd = { row: r, col: c };
      r += dr;
      c += dc;
    }
    if (!this.isValidCoordinate(r, c) || board[r][c] !== 0) {
      blockedRight = true;
    }

    // 判断连续威胁类型
    if (count >= 5) {
      return { type: '五连', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
    } else if (count === 4) {
      if (!blockedLeft && !blockedRight) {
        return { type: '活四', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
      } else if (!blockedLeft || !blockedRight) {
        return { type: '冲四', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
      }
    } else if (count === 3) {
      if (!blockedLeft && !blockedRight) {
        return { type: '活三', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
      } else if (!blockedLeft || !blockedRight) {
        return { type: '冲三', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
      }
    } else if (count === 2 && !blockedLeft && !blockedRight) {
      return { type: '活二', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
    }

    return null;
  }

  // 分析跳跃威胁（跳三、跳四等）
  analyzeJumpThreat(board, startRow, startCol, dr, dc, playerType) {
    const maxRange = 6; // 最大搜索范围
    const pattern = [];
    const positions = [];

    // 收集该方向上的棋子模式
    for (let i = -maxRange; i <= maxRange; i++) {
      const r = startRow + i * dr;
      const c = startCol + i * dc;
      if (this.isValidCoordinate(r, c)) {
        pattern.push(board[r][c]);
        positions.push({ row: r, col: c });
      }
    }

    // 查找跳跃威胁模式
    return this.findJumpThreatPattern(pattern, positions, playerType, startRow, startCol, dr, dc);
  }

  // 查找跳跃威胁模式
  findJumpThreatPattern(pattern, positions, playerType, startRow, startCol, dr, dc) {
    const centerIndex = Math.floor(pattern.length / 2);
    
    // 跳四模式检测
    const jumpFourPatterns = [
      // ●●●·●模式
      [playerType, playerType, playerType, 0, playerType],
      // ●●·●●模式  
      [playerType, playerType, 0, playerType, playerType],
      // ●·●●●模式
      [playerType, 0, playerType, playerType, playerType]
    ];

    for (const jumpPattern of jumpFourPatterns) {
      const matchResult = this.findPatternInSequence(pattern, jumpPattern, centerIndex);
      if (matchResult) {
        const startPos = positions[matchResult.startIndex];
        const endPos = positions[matchResult.endIndex];
        const gapPositions = matchResult.gaps.map(gapIndex => positions[gapIndex]);
        
        return {
          type: '跳四',
          count: 4,
          leftEnd: startPos,
          rightEnd: endPos,
          gaps: gapPositions,
          continuous: false,
          pattern: jumpPattern
        };
      }
    }

    // 跳三模式检测
    const jumpThreePatterns = [
      // ●●·●模式
      [playerType, playerType, 0, playerType],
      // ●·●●模式
      [playerType, 0, playerType, playerType],
      // ●·●·●模式（双跳）
      [playerType, 0, playerType, 0, playerType]
    ];

    for (const jumpPattern of jumpThreePatterns) {
      const matchResult = this.findPatternInSequence(pattern, jumpPattern, centerIndex);
      if (matchResult) {
        const startPos = positions[matchResult.startIndex];
        const endPos = positions[matchResult.endIndex];
        const gapPositions = matchResult.gaps.map(gapIndex => positions[gapIndex]);
        
        // 检查两端是否被阻挡
        const leftBlocked = matchResult.startIndex === 0 || pattern[matchResult.startIndex - 1] !== 0;
        const rightBlocked = matchResult.endIndex === pattern.length - 1 || pattern[matchResult.endIndex + 1] !== 0;
        
        let jumpType = '跳三';
        if (!leftBlocked && !rightBlocked) {
          jumpType = '活跳三';
        } else if (leftBlocked && rightBlocked) {
          jumpType = '死跳三';
        } else {
          jumpType = '冲跳三';
        }
        
        return {
          type: jumpType,
          count: 3,
          leftEnd: startPos,
          rightEnd: endPos,
          gaps: gapPositions,
          continuous: false,
          pattern: jumpPattern,
          blockedLeft: leftBlocked,
          blockedRight: rightBlocked
        };
      }
    }

    return null;
  }

  // 在序列中查找模式
  findPatternInSequence(sequence, pattern, centerIndex) {
    const sequenceLen = sequence.length;
    const patternLen = pattern.length;
    
    // 从中心附近开始搜索
    for (let start = Math.max(0, centerIndex - patternLen); start <= Math.min(sequenceLen - patternLen, centerIndex); start++) {
      let match = true;
      const gaps = [];
      
      for (let i = 0; i < patternLen; i++) {
        if (pattern[i] === 0) {
          gaps.push(start + i);
          if (sequence[start + i] !== 0) {
            match = false;
            break;
          }
        } else if (sequence[start + i] !== pattern[i]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        return {
          startIndex: start,
          endIndex: start + patternLen - 1,
          gaps: gaps
        };
      }
    }
    
    return null;
  }

  // 合并重复的威胁
  mergeThreats(threats) {
    const merged = [];
    const seen = new Set();

    for (const threat of threats) {
      const key = `${threat.type}-${threat.leftEnd.row},${threat.leftEnd.col}-${threat.rightEnd.row},${threat.rightEnd.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(threat);
      }
    }

    return merged.sort((a, b) => this.getThreatPriority(b.type) - this.getThreatPriority(a.type));
  }

  // 获取威胁优先级
  getThreatPriority(type) {
    return THREAT_PRIORITIES[type] || 0;
  }

  // 生成威胁分析提示词
  generateThreatAnalysisPrompt(board, gameHistory, playerType) {
    const opponentType = playerType === 1 ? 2 : 1;
    const opponentThreats = this.analyzeThreats(board, opponentType);
    const myThreats = this.analyzeThreats(board, playerType);

    let threatAnalysis = '当前局面威胁分析：\n\n';
    
    if (opponentThreats.length > 0) {
      threatAnalysis += '⚠️  对手威胁（按优先级排序）：\n';
      opponentThreats.forEach((threat, index) => {
        const threatDescription = this.formatThreatDescription(threat);
        threatAnalysis += `${index + 1}. ${threatDescription}\n`;
        
        // 为高优先级威胁提供封堵建议
        if (threat.type === '活四' || threat.type === '冲四' || threat.type === '跳四' || threat.type === '活三') {
          const blockPositions = this.getBlockPositions(threat);
          if (blockPositions.length > 0) {
            threatAnalysis += `   🛡️  必须封堵位置：${blockPositions.map(pos => `(${pos.row},${pos.col})`).join(' 或 ')}\n`;
          }
        }
      });
      threatAnalysis += '\n';
    } else {
      threatAnalysis += '✅ 对手暂无直接威胁\n\n';
    }

    if (myThreats.length > 0) {
      threatAnalysis += '⚡ 我方攻击机会：\n';
      myThreats.forEach((threat, index) => {
        const threatDescription = this.formatThreatDescription(threat);
        threatAnalysis += `${index + 1}. ${threatDescription}\n`;
      });
      threatAnalysis += '\n';
    } else {
      threatAnalysis += '🔍 我方需要寻找攻击机会\n\n';
    }

    // 添加战术建议
    threatAnalysis += this.generateTacticalAdvice(opponentThreats, myThreats);

    return threatAnalysis;
  }

  // 格式化威胁描述
  formatThreatDescription(threat) {
    const { type, leftEnd, rightEnd, gaps, continuous } = threat;
    let description = `${type}`;
    
    if (continuous) {
      description += `：从(${leftEnd.row},${leftEnd.col})到(${rightEnd.row},${rightEnd.col})`;
    } else {
      description += `：从(${leftEnd.row},${leftEnd.col})到(${rightEnd.row},${rightEnd.col})`;
      if (gaps && gaps.length > 0) {
        description += `，关键空位：${gaps.map(gap => `(${gap.row},${gap.col})`).join(',')}`;
      }
    }
    
    return description;
  }

  // 生成战术建议
  generateTacticalAdvice(opponentThreats, myThreats) {
    let advice = '💡 战术建议：\n';
    
    // 检查紧急威胁
    const urgentThreats = opponentThreats.filter(t => 
      ['活四', '冲四', '跳四'].includes(t.type)
    );
    
    if (urgentThreats.length > 0) {
      advice += '🚨 紧急：存在致命威胁，必须立即封堵！\n';
    } else {
      const majorThreats = opponentThreats.filter(t => 
        ['活三', '冲三', '活跳三'].includes(t.type)
      );
      
      if (majorThreats.length > 0) {
        advice += '⚠️  优先：处理对手的三连威胁，防止形成活四\n';
      }
    }
    
    // 检查自己的机会
    const myOpportunities = myThreats.filter(t => 
      ['活三', '冲三', '活跳三', '跳四'].includes(t.type)
    );
    
    if (myOpportunities.length > 0 && urgentThreats.length === 0) {
      advice += '⚡ 机会：可以考虑发展自己的攻击线\n';
    }
    
    advice += '🎯 记住：优先级顺序为 活四>冲四>跳四>活三>跳三>冲三>\n';
    
    return advice;
  }

  // 获取封堵位置
  getBlockPositions(threat) {
    const positions = [];
    // 处理跳跃威胁
    if (!threat.continuous && threat.gaps) {
      // 跳跃威胁需要封堵关键空隙
      threat.gaps.forEach(gap => {
        if (this.isValidCoordinate(gap.row, gap.col)) {
          positions.push(gap);
        }
      });
      return positions;
    }
    
    // 处理连续威胁
    const { leftEnd, rightEnd, blockedLeft, blockedRight, count } = threat;
    if (!count || count < 2) return positions; // 少于2子的威胁不需要封堵建议

    // 计算方向向量（基于端点差值，若端点相同则尝试从邻点推断）
    let dr = Math.sign(rightEnd.row - leftEnd.row);
    let dc = Math.sign(rightEnd.col - leftEnd.col);
    if (dr === 0 && dc === 0) {
      // 退回到检查附近单元以推断方向，安全兜底为水平
      dr = 0; dc = 1;
    }
    
    // 检查左端封堵位置
    if (!blockedLeft) {
      const leftBlock = {
        row: leftEnd.row - dr,
        col: leftEnd.col - dc
      };
      if (this.isValidCoordinate(leftBlock.row, leftBlock.col)) {
        positions.push(leftBlock);
      }
    }

    // 检查右端封堵位置
    if (!blockedRight) {
      const rightBlock = {
        row: rightEnd.row + dr,
        col: rightEnd.col + dc
      };
      if (this.isValidCoordinate(rightBlock.row, rightBlock.col)) {
        positions.push(rightBlock);
      }
    }

    return positions;
  }
}

// 创建单例实例
export const aiPromptService = new AIPromptService();

// 导出便捷方法
export const getSystemPrompt = (templateId) => aiPromptService.getSystemPrompt(templateId);
export const buildGamePrompt = (templateId, gameData) => aiPromptService.buildGamePrompt(templateId, gameData);
export const parseAIResponse = (response) => aiPromptService.parseAIResponse(response);
