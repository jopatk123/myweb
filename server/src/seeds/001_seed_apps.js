import { BUILTIN_APP_DEFINITIONS } from '../../../shared/builtin-apps.js';

export async function seed(knex) {
  await knex('apps').del();
  await knex('apps').insert(
    BUILTIN_APP_DEFINITIONS.filter(app => app.visible).map(app => ({
      name: app.name,
      slug: app.slug,
      description: app.description,
      icon_filename: app.iconFilename,
      is_visible: 1,
      is_builtin: 1,
    }))
  );
}
