import Joi from 'joi';

export { validateBody } from './wallpaper.dto.js';

export const createBookmarkSchema = Joi.object({
  bookId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().max(200))
    .required(),
  fileId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().max(200))
    .allow(null)
    .optional(),
  title: Joi.string().max(500).required(),
  chapterIndex: Joi.number().integer().min(0).default(0),
  scrollPosition: Joi.number().min(0).default(0),
  note: Joi.string().max(2000).allow('', null).optional(),
  deviceId: Joi.string().max(200).allow('', null).optional(),
});

export const updateBookmarkSchema = Joi.object({
  title: Joi.string().max(500).optional(),
  chapterIndex: Joi.number().integer().min(0).optional(),
  scrollPosition: Joi.number().min(0).optional(),
  note: Joi.string().max(2000).allow('', null).optional(),
}).min(1);

export const syncBookmarksSchema = Joi.object({
  deviceId: Joi.string().max(200).allow('', null).optional(),
  bookmarks: Joi.array()
    .items(
      Joi.object({
        bookId: Joi.alternatives()
          .try(Joi.number().integer().positive(), Joi.string().max(200))
          .required(),
        fileId: Joi.alternatives()
          .try(Joi.number().integer().positive(), Joi.string().max(200))
          .allow(null)
          .optional(),
        title: Joi.string().max(500).required(),
        chapterIndex: Joi.number().integer().min(0).default(0),
        scrollPosition: Joi.number().min(0).default(0),
        note: Joi.string().max(2000).allow('', null).optional(),
      })
    )
    .max(500)
    .required(),
});
