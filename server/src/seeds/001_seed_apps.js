import { BUILTIN_APP_DEFINITIONS } from '../../../shared/builtin-apps.js';

/**
 * 非破坏性 seed：仅补齐缺失的内置应用，不删除用户自建应用。
 * 与 src/db/seeding.js 的 ensureBuiltinApps 保持同一真相源（shared/builtin-apps.js）。
 */
export async function seed(knex) {
  for (const app of BUILTIN_APP_DEFINITIONS) {
    const existing = await knex('apps').where({ slug: app.slug }).first();
    if (existing) continue;
    await knex('apps').insert({
      name: app.name,
      slug: app.slug,
      description: app.description,
      icon_filename: app.iconFilename,
      group_id: null,
      is_visible: app.visible ? 1 : 0,
      is_autostart: 0,
      is_builtin: 1,
      target_url: null,
    });
  }
}
