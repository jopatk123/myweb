import Joi from 'joi';
import { mapToSnake } from './field-mapper.js';

const appSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .optional(),
  description: Joi.string().allow(null, '').optional(),
  icon_filename: Joi.string().allow(null, '').optional(),
  preset_icon: Joi.string().allow(null, '').optional(),
  group_id: Joi.alternatives()
    .try(Joi.number().integer().allow(null), Joi.string().allow('', null))
    .optional(),
  is_visible: Joi.boolean().optional(),
  is_autostart: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().integer().valid(0, 1))
    .optional(),
  is_builtin: Joi.boolean().optional(),
  target_url: Joi.string().uri().allow(null, '').optional(),
});

export async function validateAppPayload(
  body,
  { requireName = true, normalizeEmptyGroupId = false } = {}
) {
  const bodySnake = mapToSnake(body || {});
  const schema = requireName
    ? appSchema
    : appSchema.fork(['name'], s => s.optional());
  const payload = await schema.validateAsync(bodySnake, { convert: true });

  delete payload.slug;

  if (normalizeEmptyGroupId && payload.group_id === '') {
    payload.group_id = null;
  }

  return payload;
}

export async function applyPresetIconPayload(payload, copyPresetIcon) {
  if (!payload.preset_icon || payload.icon_filename) {
    return payload;
  }

  const iconFilename = await copyPresetIcon(payload.preset_icon);
  const nextPayload = {
    ...payload,
    icon_filename: iconFilename,
  };
  delete nextPayload.preset_icon;

  return nextPayload;
}

export function buildCreateAppPayload(payload) {
  return {
    ...payload,
    is_builtin: payload.is_builtin ? 1 : 0,
  };
}

export function buildUpdateAppPayload(payload) {
  const nextPayload = { ...payload };
  if (nextPayload.is_builtin) {
    delete nextPayload.is_builtin;
  }

  return nextPayload;
}
