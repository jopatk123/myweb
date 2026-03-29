import Joi from 'joi';

export { validateBody } from './wallpaper.dto.js';

/** PUT /messages/user-settings 请求体校验（与 message.dto.js 保持同步）*/
export const updateUserSettingsSchema = Joi.object({
  nickname: Joi.string().max(50).allow('', null).optional(),
  avatarColor: Joi.string()
    .max(30)
    .pattern(/^#[0-9a-fA-F]{3,8}$|^rgb/)
    .allow('', null)
    .optional(),
  autoOpenEnabled: Joi.boolean().optional(),
});
