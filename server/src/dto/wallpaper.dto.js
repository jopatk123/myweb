import Joi from 'joi';

// 校验中间件统一抽离到 dto/common.js，避免各业务 dto 重复实现，
// 同时消除"留言路由从壁纸 dto 导入 validateQuery"这类跨模块耦合。
export { validateBody, validateQuery } from './common.js';

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
  // mimeType 不允许通过更新接口修改——变更 MIME 类型需要重新上传文件并重新校验魔数
});

export const createGroupSchema = Joi.object({
  name: Joi.string().max(100).required(),
  isDefault: Joi.boolean().optional(),
});

export const updateGroupSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  isCurrent: Joi.boolean().optional(),
});
