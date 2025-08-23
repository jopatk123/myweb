import Joi from 'joi';

// 验证中间件生成器
export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      convert: true,
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ code: 400, message: '请求参数错误', errors: error.details });
    }
    // 覆盖为转换后的值（例如字符串数字转换为 number）
    req.body = value;
    next();
  };
}

// 上传（multipart）场景：req.body 经 multer 填充后仍可校验
export const uploadWallpaperSchema = Joi.object({
  groupId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().allow('', null))
    .optional(),
  name: Joi.string().max(255).allow('', null).optional(),
});

export const deleteWallpapersSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
});

export const moveWallpapersSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  groupId: Joi.alternatives()
    .try(Joi.number().integer().allow(null), Joi.string().allow(''))
    .required(),
});

export const updateWallpaperSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  mimeType: Joi.string().optional(),
});

export const createGroupSchema = Joi.object({
  name: Joi.string().max(100).required(),
  isDefault: Joi.boolean().optional(),
});

export const updateGroupSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  isCurrent: Joi.boolean().optional(),
});
