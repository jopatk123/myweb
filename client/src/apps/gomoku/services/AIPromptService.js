// AI提示词管理服务 - 五子棋AI提示词模板和逻辑
export class AIPromptService {
  constructor() {
    this.promptTemplates = this.initializePromptTemplates();
  }

  // 初始化提示词模板
  initializePromptTemplates() {
    return {
      // 高级五子棋AI提示词模板
      'gomoku-advanced': {
        id: 'gomoku-advanced',
        name: '高级五子棋AI提示词',
        description: '包含详细威胁分析、跳跃威胁识别和完整封堵策略的高级AI提示词',
        template: `你是一个专业的五子棋AI选手，具备深度分析能力。请严格按照以下步骤进行分析：

首先确定棋盘大小，当前棋盘大小为15x15，从(0,0)到(14,14)，行列都从0开始，到14结束

第一步：威胁识别和分类
扫描棋盘识别以下威胁类型（按优先级排序）：

1. 五连：五子连线，获胜条件
   示例：● ● ● ● ●

2. 活四：四子连线，两端无阻挡，下一步必胜
   示例：· ● ● ● ● ·
   
3. 冲四：四子连线，一端被阻挡，另一端可形成五连
   示例：○ ● ● ● ● ·（左端被阻挡）
   示例：边 ● ● ● ● ·（左端被边界阻挡）

4. 跳四：四子不连续但可形成五连的特殊形态
   - 跳一：● ● ● · ●（中间间隔一个空位）
   - 跳二：● ● · ● ●（两端各有两子，中间隔一位）
   - 跳三：● · ● ● ●（左端一子，右端三子，中间隔一位）
   示例：● ● ● · ● ·（需封堵空位形成五连）

5. 活三：三子连线，两端无阻挡，下一步可形成活四
   示例：· ● ● ● ·
   
6. 冲三：三子连线，一端被阻挡，另一端可形成冲四
   示例：○ ● ● ● ·（左端被阻挡）

7. 跳三：三子不连续但可形成活三或冲三的特殊形态
   - 单跳三：● ● · ●（两子连续，隔一位一子）
   - 双跳三：● · ● · ●（三子不连续，两个间隔）
   示例：· ● ● · ● ·（需要同时考虑两个发展方向）

8. 活二：二子连线，两端无阻挡，可发展为活三
   示例：· ● ● ·

9. 跳二：二子不连续但可发展的形态
   示例：· ● · ● ·

第二步：威胁分析
对每个威胁进行详细分析：
- 威胁方向：水平（—）、垂直（|）、主对角（\）、次对角（/）
- 威胁位置：精确的起始点和结束点坐标
- 发展空间：分析两端和中间空隙的阻挡情况
- 威胁等级：按优先级排序（五连>活四>冲四>跳四>活三>冲三>跳三...）
- 关键封堵点：必须封堵的位置坐标

第三步：专项封堵策略

活四封堵策略（最高优先级）：
1. 立即封堵活四的任意一端
2. 如果同时存在多个活四，优先封堵能形成自己攻击的位置

冲四封堵策略：
1. 识别未被阻挡的一端
2. 在开口端进行封堵
3. 示例：○ ● ● ● ● · → 必须在(row, col+1)封堵

跳四封堵策略：
1. 识别跳四的空隙位置
2. 封堵关键空位阻止形成五连
3. 示例：● ● ● · ● · → 必须封堵(row, col+3)位置

活三封堵策略：
1. 识别活三威胁线的两个端点坐标
2. 检查两端是否被边界或棋子阻挡
3. 选择最佳封堵位置：
   - 优先选择能同时建立自己威胁的位置
   - 如果两端都可封堵，选择更有利于自己发展的一端
4. 示例：· ● ● ● · → 可封堵两端中的任意一端

跳三封堵策略：
1. 分析跳三的具体形态
2. 封堵关键发展位置
3. 示例：· ● ● · ● · → 重点关注(row, col+3)和两端发展

第四步：位置验证
验证每个候选位置：
1. 边界检查：确保坐标在(0,0)到(14,14)范围内
2. 占用检查：确保目标位置为空(值为0)
3. 有效性检查：验证封堵能真正阻止威胁
4. 冲突检查：避免选择已被占用的位置

第五步：综合决策
选择最佳落子位置，综合考虑：
1. 威胁优先级：活四>冲四>跳四>活三>冲三>跳三>活二
2. 防守效果：能否有效阻止对手威胁
3. 攻击价值：是否能建立自己的威胁
4. 位置价值：中心位置通常比边角更有价值
5. 连锁效应：一步棋能否同时防守和进攻

特殊情况处理：
- 同时存在多个活三：选择能防住最危险的，或能形成自己威胁的
- 跳棋威胁：重点分析不连续威胁的关键封堵点
- 边界威胁：考虑边界对威胁发展的限制
- 复合威胁：一个位置可能同时形成多种威胁

回复格式：
{
  "row": 数字,
  "col": 数字,
  "reasoning": "详细的分析过程，包括：1.威胁识别结果 2.威胁分析和分类 3.选择的封堵策略 4.位置验证过程 5.最终决策理由"
}

关键提醒：
- 活四和跳四必须立即封堵，否则下一步必输
- 活三威胁必须优先处理，否则下一步形成活四
- 跳三和跳四要特别注意不连续的威胁模式
- 封堵位置必须精确，考虑所有可能的发展方向
- 优先选择能同时防守和进攻的位置
- 仔细分析边界对威胁发展的影响作用`
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
  getSystemPrompt(templateId = 'gomoku-advanced') {
    const template = this.getTemplateById(templateId);
    return template ? template.template : this.getDefaultSystemPrompt();
  }

  // 获取默认系统提示词
  getDefaultSystemPrompt() {
    return this.promptTemplates['gomoku-advanced'].template;
  }

  // 构建游戏状态提示词
  buildGamePrompt(templateId, gameData) {
    const template = this.getTemplateById(templateId);
    if (!template) {
      // 模板不存在时降级为默认模板，记录警告但不抛出错误
      console.warn(`提示词模板未找到: ${templateId}，将使用默认模板`);
    }

    // 目前模板内容主要用于系统提示，但构建棋局状态不依赖模板本身，仍然返回标准游戏提示
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

  // 解析AI回复
  parseAIResponse(response) {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateGomokuResponse(parsed);
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

  // 验证坐标有效性
  isValidCoordinate(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && 
           row >= 0 && row < 15 && col >= 0 && col < 15;
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

    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (board[row][col] === playerType) {
          for (const [dr, dc] of directions) {
            const threat = this.analyzeDirection(board, row, col, dr, dc, playerType);
            if (threat) {
              threats.push(threat);
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
    const priorities = {
      '五连': 10,
      '活四': 9,
      '冲四': 8,
      '跳四': 7,
      '活三': 6,
      '冲三': 5,
      '活跳三': 4,
      '冲跳三': 3,
      '死跳三': 2,
      '跳三': 3,
      '活二': 1,
      '跳二': 1
    };
    return priorities[type] || 0;
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
    
    advice += '🎯 记住：优先级顺序为 活四>冲四>跳四>活三>冲三>跳三\n';
    
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
    
    if (count === 0) return positions;
    
    // 计算方向向量
    const dr = count > 1 ? Math.sign(rightEnd.row - leftEnd.row) : 0;
    const dc = count > 1 ? Math.sign(rightEnd.col - leftEnd.col) : 0;
    
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
