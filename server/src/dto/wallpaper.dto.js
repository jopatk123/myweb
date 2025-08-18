import Joi from 'joi';

export const wallpaperSchemas = {
  // 创建壁纸验证
  create: Joi.object({
    groupId: Joi.number().integer().positive().optional()
  }),

  // 更新壁纸验证
  update: Joi.object({
    groupId: Joi.number().integer().positive().optional(),
    originalName: Joi.string().max(255).optional()
  }),

  // 创建分组验证
  createGroup: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional()
  }),

  // 更新分组验证
  updateGroup: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional()
  }),

  // 查询参数验证
  query: Joi.object({
    groupId: Joi.number().integer().positive().optional()
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