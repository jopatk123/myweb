/**
 * 检测两个矩形是否相交
 * @param {Object} rect1 - 第一个矩形 {x, y, w, h}
 * @param {Object} rect2 - 第二个矩形 {left, top, width, height}
 * @returns {boolean} 是否相交
 */
export function rectIntersect(rect1, rect2) {
  return !(
    rect1.x + rect1.w < rect2.left ||
    rect2.left + rect2.width < rect1.x ||
    rect1.y + rect1.h < rect2.top ||
    rect2.top + rect2.height < rect1.y
  );
}
