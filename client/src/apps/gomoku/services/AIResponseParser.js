// AI 回复解析与验证
import { BOARD_SIZE, isValidCoordinate } from './AIConstants.js';

export function parseAIResponse(response) {
  try {
    if (!response || typeof response !== 'string') throw new Error('空回复');
    const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1])
      return validateGomokuResponse(JSON.parse(fenced[1].trim()));
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (jsonMatch) return validateGomokuResponse(JSON.parse(jsonMatch[0]));
    const coordRegex = /row\D*(-?\d+)[\s\S]*?col\D*(-?\d+)/i;
    const loose = response.match(coordRegex);
    if (loose) {
      const row = parseInt(loose[1], 10);
      const col = parseInt(loose[2], 10);
      return validateGomokuResponse({
        row,
        col,
        reasoning: response.slice(0, 200),
      });
    }
    throw new Error('未找到有效JSON或坐标');
  } catch (e) {
    throw new Error(`AI回复格式错误: ${e.message}`);
  }
}

export function validateGomokuResponse(parsed) {
  if (isValidCoordinate(parsed.row, parsed.col, BOARD_SIZE)) {
    let reasoning = (parsed.reasoning || '').toString();
    if (reasoning.length > 220) reasoning = reasoning.slice(0, 217) + '...';
    return {
      row: parsed.row,
      col: parsed.col,
      reasoning: reasoning || '无说明',
    };
  }
  throw new Error('AI回复中的坐标无效');
}
