/** 与 MessageText.vue 中 .message-text 样式保持一致 */
export const MESSAGE_TEXT_FONT_SIZE_PX = 13;
export const MESSAGE_TEXT_LINE_HEIGHT = 1.45;
export const MESSAGE_TEXT_VERTICAL_PADDING_PX = 10;

/**
 * 计算折叠状态下允许的最大高度（行数 × 行高 + 上下 padding）。
 */
export function getCollapsedMaxHeight(lines) {
  return (
    MESSAGE_TEXT_FONT_SIZE_PX * MESSAGE_TEXT_LINE_HEIGHT * lines +
    MESSAGE_TEXT_VERTICAL_PADDING_PX
  );
}

/**
 * 判断元素在垂直方向是否被裁剪。
 */
export function elementHasVerticalOverflow(element, tolerance = 1) {
  if (!element) return false;
  return element.scrollHeight > element.clientHeight + tolerance;
}

/**
 * 在临时应用折叠高度后检测内容是否溢出。
 * 避免「未折叠时测量 → 永远无溢出」的鸡生蛋问题。
 */
export function measureTextOverflow(element, collapsedLines) {
  if (!element) return false;

  const maxHeight = getCollapsedMaxHeight(collapsedLines);
  const previousMaxHeight = element.style.maxHeight;
  const previousOverflow = element.style.overflow;

  element.style.maxHeight = `${maxHeight}px`;
  element.style.overflow = 'hidden';
  const hasOverflow = elementHasVerticalOverflow(element);

  element.style.maxHeight = previousMaxHeight || '';
  element.style.overflow = previousOverflow || '';

  return hasOverflow;
}
