// 威胁分析模块
import { THREAT_PRIORITIES, isValidCoordinate } from './AIConstants.js';
import { DIRECTIONS } from '../constants/gameConstants.js';

// 主入口：分析棋盘上指定玩家的所有威胁
export function analyzeThreats(board, playerType) {
  const threats = [];
  const visited = new Set();
  const size = board.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] === playerType) {
        for (const [dr, dc] of DIRECTIONS) {
          const key = `${row}-${col}-${dr}-${dc}`;
          if (visited.has(key)) continue;
          const threat = analyzeDirection(board, row, col, dr, dc, playerType);
            if (threat) {
              threats.push(threat);
              // 标记线段（容错）
              try {
                const { leftEnd, rightEnd } = threat;
                if (leftEnd && rightEnd) {
                  let r = leftEnd.row, c = leftEnd.col;
                  while (true) {
                    visited.add(`${r}-${c}-${dr}-${dc}`);
                    if (r === rightEnd.row && c === rightEnd.col) break;
                    r += dr; c += dc;
                    if (!isValidCoordinate(r, c)) break;
                  }
                }
              } catch(_) {}
            }
        }
      }
    }
  }
  return mergeThreats(threats);
}

export function analyzeDirection(board, startRow, startCol, dr, dc, playerType) {
  const continuousThreat = analyzeContinuousThreat(board, startRow, startCol, dr, dc, playerType);
  if (continuousThreat) return continuousThreat;
  return analyzeJumpThreat(board, startRow, startCol, dr, dc, playerType);
}

export function analyzeContinuousThreat(board, startRow, startCol, dr, dc, playerType) {
  let count = 1;
  let blockedLeft = false, blockedRight = false;
  let leftEnd = { row: startRow, col: startCol };
  let rightEnd = { row: startRow, col: startCol };
  // 左
  let r = startRow - dr, c = startCol - dc;
  while (isValidCoordinate(r, c) && board[r][c] === playerType) { count++; leftEnd = { row: r, col: c }; r -= dr; c -= dc; }
  if (!isValidCoordinate(r, c) || board[r][c] !== 0) blockedLeft = true;
  // 右
  r = startRow + dr; c = startCol + dc;
  while (isValidCoordinate(r, c) && board[r][c] === playerType) { count++; rightEnd = { row: r, col: c }; r += dr; c += dc; }
  if (!isValidCoordinate(r, c) || board[r][c] !== 0) blockedRight = true;

  if (count >= 5) return { type: '五连', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
  if (count === 4) {
    if (!blockedLeft && !blockedRight) return { type: '活四', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
    if (!blockedLeft || !blockedRight) return { type: '冲四', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
  }
  if (count === 3) {
    if (!blockedLeft && !blockedRight) return { type: '活三', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
    if (!blockedLeft || !blockedRight) return { type: '冲三', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
  }
  if (count === 2 && !blockedLeft && !blockedRight) return { type: '活二', count, leftEnd, rightEnd, blockedLeft, blockedRight, continuous: true };
  return null;
}

export function analyzeJumpThreat(board, startRow, startCol, dr, dc, playerType) {
  const maxRange = 6;
  const pattern = []; const positions = [];
  for (let i = -maxRange; i <= maxRange; i++) {
    const r = startRow + i * dr; const c = startCol + i * dc;
    if (isValidCoordinate(r, c)) { pattern.push(board[r][c]); positions.push({ row: r, col: c }); }
  }
  return findJumpThreatPattern(pattern, positions, playerType);
}

export function findJumpThreatPattern(pattern, positions, playerType) {
  const centerIndex = Math.floor(pattern.length / 2);
  const jumpFourPatterns = [ [playerType, playerType, playerType, 0, playerType], [playerType, playerType, 0, playerType, playerType], [playerType, 0, playerType, playerType, playerType] ];
  for (const p of jumpFourPatterns) {
    const m = findPatternInSequence(pattern, p, centerIndex);
    if (m) {
      return { type: '跳四', count: 4, leftEnd: positions[m.startIndex], rightEnd: positions[m.endIndex], gaps: m.gaps.map(i=>positions[i]), continuous: false, pattern: p };
    }
  }
  const jumpThreePatterns = [ [playerType, playerType, 0, playerType], [playerType, 0, playerType, playerType], [playerType, 0, playerType, 0, playerType] ];
  for (const p of jumpThreePatterns) {
    const m = findPatternInSequence(pattern, p, centerIndex);
    if (m) {
      const leftBlocked = m.startIndex === 0 || pattern[m.startIndex - 1] !== 0;
      const rightBlocked = m.endIndex === pattern.length - 1 || pattern[m.endIndex + 1] !== 0;
      let jumpType;
      if (!leftBlocked && !rightBlocked) jumpType = '活跳三';
      else if (leftBlocked && rightBlocked) jumpType = '死跳三';
      else jumpType = '冲跳三';
      return { type: jumpType === '活跳三' ? '活跳三' : (jumpType === '冲跳三' ? '冲跳三' : (jumpType === '死跳三' ? '死跳三' : '跳三')), count: 3, leftEnd: positions[m.startIndex], rightEnd: positions[m.endIndex], gaps: m.gaps.map(i=>positions[i]), continuous: false, pattern: p, blockedLeft: leftBlocked, blockedRight: rightBlocked };
    }
  }
  return null;
}

export function findPatternInSequence(sequence, pattern, centerIndex) {
  const sequenceLen = sequence.length, patternLen = pattern.length;
  for (let start = Math.max(0, centerIndex - patternLen); start <= Math.min(sequenceLen - patternLen, centerIndex); start++) {
    let match = true; const gaps = [];
    for (let i = 0; i < patternLen; i++) {
      if (pattern[i] === 0) { gaps.push(start + i); if (sequence[start + i] !== 0) { match = false; break; } }
      else if (sequence[start + i] !== pattern[i]) { match = false; break; }
    }
    if (match) return { startIndex: start, endIndex: start + patternLen - 1, gaps };
  }
  return null;
}

export function mergeThreats(threats) {
  const merged = []; const seen = new Set();
  for (const t of threats) {
    const key = `${t.type}-${t.leftEnd.row},${t.leftEnd.col}-${t.rightEnd.row},${t.rightEnd.col}`;
    if (!seen.has(key)) { seen.add(key); merged.push(t); }
  }
  return merged.sort((a,b) => getThreatPriority(b.type) - getThreatPriority(a.type));
}

export function getThreatPriority(type) { return THREAT_PRIORITIES[type] || 0; }

export function formatThreatDescription(threat) {
  const { type, leftEnd, rightEnd, gaps, continuous } = threat;
  let desc = `${type}：从(${leftEnd.row},${leftEnd.col})到(${rightEnd.row},${rightEnd.col})`;
  if (!continuous && gaps && gaps.length) desc += `，关键空位：${gaps.map(g=>`(${g.row},${g.col})`).join(',')}`;
  return desc;
}

export function getBlockPositions(threat) {
  const positions = [];
  if (!threat.continuous && threat.gaps) {
    threat.gaps.forEach(g => { if (isValidCoordinate(g.row, g.col)) positions.push(g); });
    return positions;
  }
  const { leftEnd, rightEnd, blockedLeft, blockedRight, count } = threat;
  if (!count || count < 2) return positions;
  let dr = Math.sign(rightEnd.row - leftEnd.row); let dc = Math.sign(rightEnd.col - leftEnd.col);
  if (dr === 0 && dc === 0) { dr = 0; dc = 1; }
  if (!blockedLeft) { const leftBlock = { row: leftEnd.row - dr, col: leftEnd.col - dc }; if (isValidCoordinate(leftBlock.row, leftBlock.col)) positions.push(leftBlock); }
  if (!blockedRight) { const rightBlock = { row: rightEnd.row + dr, col: rightEnd.col + dc }; if (isValidCoordinate(rightBlock.row, rightBlock.col)) positions.push(rightBlock); }
  return positions;
}

export function generateTacticalAdvice(opponentThreats, myThreats) {
  let advice = '💡 战术建议：\n';
  const urgentThreats = opponentThreats.filter(t => ['活四','冲四','跳四'].includes(t.type));
  if (urgentThreats.length) advice += '🚨 紧急：存在致命威胁，必须立即封堵！\n';
  else {
    const major = opponentThreats.filter(t => ['活三','冲三','活跳三'].includes(t.type));
    if (major.length) advice += '⚠️  优先：处理对手的三连威胁，防止形成活四\n';
  }
  const myOps = myThreats.filter(t => ['活三','冲三','活跳三','跳四'].includes(t.type));
  if (myOps.length && !urgentThreats.length) advice += '⚡ 机会：可以考虑发展自己的攻击线\n';
  advice += '🎯 记住：优先级顺序为 活四>冲四>跳四>活三>跳三>冲三>\n';
  return advice;
}

export function generateThreatAnalysisPrompt(board, gameHistory, playerType) {
  // WARNING: deprecated - prompt generation removed. Use analyzeThreats/analyzeDirection APIs directly if needed.
  return '';
}
