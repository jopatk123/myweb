import Joi from 'joi';

export { validateBody, validateQuery } from './wallpaper.dto.js';

/**
 * 路径参数 id 校验中间件（正整数）
 * @param {string} [paramName='id']
 */
export function validateId(paramName = 'id') {
  return (req, res, next) => {
    const raw = req.params[paramName];
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      return res
        .status(400)
        .json({ code: 400, message: `参数 ${paramName} 无效，须为正整数` });
    }
    // 将字符串参数覆写为数字，方便后续 service 使用
    req.params[paramName] = value;
    next();
  };
}

/** GET /files 列表查询参数校验 */
export const listFilesSchema = Joi.object({
  page: Joi.number().integer().min(1).max(10000).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  type: Joi.string().max(50).allow('', null).optional(),
  search: Joi.string().max(200).allow('', null).optional(),
});
