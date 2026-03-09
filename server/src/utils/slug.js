/**
 * 从名称自动生成 slug。
 * 处理中文名称时使用拼音风格或直接保留字母数字字符。
 * @param {string} name - 应用或分组名称
 * @returns {string} - 生成的 slug
 */
export function generateSlug(name) {
  if (!name) return '';
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '') // 保留字母、数字、中文、空白、连字符
    .replace(/[\u4e00-\u9fa5]+/g, match => {
      // 中文字符之间用连字符分隔（每个字符作为独立单元）
      return match.split('').join('-');
    })
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 生成唯一 slug。如果生成的 slug 已存在，则追加数字后缀。
 * @param {string} name - 名称
 * @param {function} existsCheck - 检查 slug 是否存在的函数，接收 slug 返回 boolean
 * @returns {string} - 唯一的 slug
 */
export function generateUniqueSlug(name, existsCheck) {
  let base = generateSlug(name);
  if (!base) {
    // 如果名称无法生成有效 slug（例如纯特殊字符），使用时间戳
    base = `app-${Date.now()}`;
  }

  let slug = base;
  let counter = 1;
  while (existsCheck(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}
