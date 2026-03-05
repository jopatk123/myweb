import Joi from 'joi';

export { validateBody } from './wallpaper.dto.js';

export const sendMessageSchema = Joi.object({
  content: Joi.string().max(5000).allow('', null).optional(),
  authorName: Joi.string().max(50).allow('', null).optional(),
  authorColor: Joi.string()
    .max(30)
    .pattern(/^#[0-9a-fA-F]{3,8}$|^rgb/)
    .allow('', null)
    .optional(),
  images: Joi.array().items(Joi.object()).max(10).allow(null).optional(),
  imageType: Joi.string()
    .valid('single', 'multiple', 'grid', null)
    .allow(null)
    .optional(),
});

export const updateUserSettingsSchema = Joi.object({
  nickname: Joi.string().max(50).allow('', null).optional(),
  avatarColor: Joi.string()
    .max(30)
    .pattern(/^#[0-9a-fA-F]{3,8}$|^rgb/)
    .allow('', null)
    .optional(),
  autoOpenEnabled: Joi.boolean().optional(),
});

export const clearAllMessagesSchema = Joi.object({
  confirm: Joi.boolean().valid(true).required().messages({
    'any.only': '需要确认才能清除所有留言',
    'any.required': '需要确认才能清除所有留言',
  }),
});

export const getMessagesSchema = Joi.object({
  page: Joi.number().integer().min(1).max(10000).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  q: Joi.string().max(200).allow('', null).optional(),
});
