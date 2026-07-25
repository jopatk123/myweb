import Joi from 'joi';
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_IMAGE_MAX_COUNT,
} from '../constants/limits.js';

export { validateBody, validateQuery } from './common.js';

/**
 * 头像颜色：接受 <input type="color"> 输出的 6 位十六进制格式（#rrggbb）。
 * schema 和 service 层使用同一正则，保持一致。
 */
const colorPattern = /^#[0-9a-fA-F]{6}$/;

/**
 * 单张留言图片的 schema：
 * - path 必须匹配 `uploads/message-images/<filename>.<ext>` 形式，
 *   文件名仅允许字母、数字、连字符、下划线，禁止 `..`、`/` 等路径穿越字符；
 * - mimeType 仅允许服务端上传接口实际产出的几种图片 MIME；
 * - size 必须为正数且不超过单文件上限（防御性，主要校验仍由 multer 完成）。
 */
const messageImageSchema = Joi.object({
  filename: Joi.string().max(255).required(),
  originalName: Joi.string().max(255).allow('', null).optional(),
  mimeType: Joi.string()
    .valid(
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/avif',
      'image/x-icon'
    )
    .required(),
  size: Joi.number().integer().min(1).required(),
  path: Joi.string()
    .pattern(/^uploads\/message-images\/[a-z0-9][a-z0-9_-]*\.[a-z0-9]+$/i)
    .required(),
}).unknown(false);

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
    .items(messageImageSchema)
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
