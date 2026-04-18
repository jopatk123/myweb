import Joi from 'joi';
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_IMAGE_MAX_COUNT,
} from '../constants/limits.js';

export { validateBody } from './wallpaper.dto.js';

/**
 * 头像颜色：接受 <input type="color"> 输出的 6 位十六进制格式（#rrggbb）。
 * schema 和 service 层使用同一正则，保持一致。
 */
const colorPattern = /^#[0-9a-fA-F]{6}$/;

export const sendMessageSchema = Joi.object({
  content: Joi.string()
    .max(MESSAGE_CONTENT_MAX_LENGTH)
    .allow('', null)
    .optional(),
  authorName: Joi.string().max(50).allow('', null).optional(),
  authorColor: Joi.string()
    .max(7)
    .pattern(colorPattern)
    .allow('', null)
    .optional(),
  // imageType 是前端存储的展示元数据，无需枚举校验，仅限制长度防止滥用
  imageType: Joi.string().max(20).allow('', null).optional(),
  images: Joi.array()
    .items(Joi.object())
    .max(MESSAGE_IMAGE_MAX_COUNT)
    .allow(null)
    .optional(),
});

export const updateUserSettingsSchema = Joi.object({
  nickname: Joi.string().max(50).allow('', null).optional(),
  avatarColor: Joi.string()
    .max(7)
    .pattern(colorPattern)
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
