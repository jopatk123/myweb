/**
 * 为留言板添加图片支持
 */

export const up = async knex => {
  const hasImagesColumn = await knex.schema.hasColumn('messages', 'images');
  const hasImageTypeColumn = await knex.schema.hasColumn(
    'messages',
    'image_type'
  );

  if (!hasImagesColumn) {
    await knex.schema.alterTable('messages', table => {
      table.text('images').nullable(); // JSON格式存储图片信息
    });
  }

  if (!hasImageTypeColumn) {
    await knex.schema.alterTable('messages', table => {
      table.string('image_type', 20).nullable(); // 图片类型：paste, upload
    });
  }
};

export const down = async knex => {
  const hasImagesColumn = await knex.schema.hasColumn('messages', 'images');
  const hasImageTypeColumn = await knex.schema.hasColumn(
    'messages',
    'image_type'
  );

  if (hasImagesColumn || hasImageTypeColumn) {
    await knex.schema.alterTable('messages', table => {
      if (hasImagesColumn) {
        table.dropColumn('images');
      }
      if (hasImageTypeColumn) {
        table.dropColumn('image_type');
      }
    });
  }
};
