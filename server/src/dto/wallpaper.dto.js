import Joi from 'joi';

export const wallpaperSchemas = {
  // 创建壁纸验证
  create: Joi.object({
    groupId: Joi.number().integer().positive().optional()
  }),

  // 更新壁纸验证（请求已由中间件归一化为 snake_case）
  update: Joi.object({
    group_id: Joi.number().integer().positive().optional(),
    original_name: Joi.string().max(255).optional()
  }),

  // 创建分组验证
  createGroup: Joi.object({
    name: Joi.string().min(1).max(100).required()
  }),

  // 更新分组验证
  updateGroup: Joi.object({
    name: Joi.string().min(1).max(100).optional()
  }),

  // 查询参数验证
  query: Joi.object({
    group_id: Joi.number().integer().positive().optional()
  })
};

// 验证中间件
export function validateWallpaper(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message
      });
    }
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message
      });
    }
    next();
  };
}