import Joi from 'joi';

export { validateBody } from './wallpaper.dto.js';

export const startTimerSchema = Joi.object({
  sessionId: Joi.string().max(100).required(),
  startTime: Joi.string().isoDate().allow(null).optional(),
  targetEndTime: Joi.string().isoDate().allow(null).optional(),
});

export const heartbeatSchema = Joi.object({
  sessionId: Joi.string().max(100).required(),
  incrementMs: Joi.number().integer().min(0).max(86400000).default(0),
  lastUpdate: Joi.string().isoDate().allow(null).optional(),
});

export const stopTimerSchema = Joi.object({
  sessionId: Joi.string().max(100).required(),
  endTime: Joi.string().isoDate().allow(null).optional(),
  finalIncrementMs: Joi.number()
    .integer()
    .min(0)
    .max(86400000)
    .allow(null)
    .optional(),
});
