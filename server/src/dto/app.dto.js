/**
 * 应用模块请求体 schema 集合
 *
 * 配合 dto/common.js 的 validateBody 中间件使用：
 *   router.put('/:id/visible', validateBody(setVisibleSchema), ctrl.setVisible)
 *
 * Joi 在 convert:true 下会把字符串 "false"/"true" 等正确转为 boolean，
 * 杜绝 controller 层手写布尔解析导致的字符串 "false" 被当作 true 的 bug。
 */
import Joi from 'joi';

export const setVisibleSchema = Joi.object({
  visible: Joi.boolean().required(),
}).required();

export const setAutostartSchema = Joi.object({
  isAutostart: Joi.boolean().required(),
}).required();

export const bulkVisibleSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  visible: Joi.boolean().required(),
}).required();

export const moveAppsSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  // 允许 null（移动到默认分组）或正整数（目标分组 id）；不传时默认 null
  targetGroupId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.valid(null))
    .optional()
    .default(null),
}).required();

export const createGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
}).required();

export const updateGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
}).required();
