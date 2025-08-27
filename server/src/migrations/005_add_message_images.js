/**
 * 为留言板添加图片支持
 */

export const up = async (knex) => {
  // 为messages表添加图片字段
  await knex.schema.alterTable('messages', (table) => {
    table.text('images').nullable(); // JSON格式存储图片信息
    table.string('image_type', 20).nullable(); // 图片类型：paste, upload
  });
};

export const down = async (knex) => {
  await knex.schema.alterTable('messages', (table) => {
    table.dropColumn('images');
    table.dropColumn('image_type');
  });
};
