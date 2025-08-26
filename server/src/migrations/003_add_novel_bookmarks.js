export function up(knex) {
  return Promise.resolve().then(() =>
    knex.schema.hasTable('novel_bookmarks').then(exists => {
      if (!exists) {
        return knex.schema.createTable('novel_bookmarks', function (table) {
          table.increments('id').primary();
          table.string('book_id', 100).notNullable(); // 书籍ID（客户端生成）
          table.string('file_id', 100).nullable(); // 后端文件ID（如果有）
          table.string('title', 200).notNullable(); // 书签标题
          table.integer('chapter_index').notNullable().defaultTo(0); // 章节索引
          table.integer('scroll_position').defaultTo(0); // 滚动位置
          table.text('note').nullable(); // 备注
          table.string('device_id', 100).nullable(); // 设备ID（用于同步）
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('updated_at').defaultTo(knex.fn.now());
          table.timestamp('deleted_at').nullable();

          // 索引
          table.index(['book_id']);
          table.index(['file_id']);
          table.index(['device_id']);
          table.index(['created_at']);
        });
      }
    })
  );
}

export function down(knex) {
  return knex.schema.dropTableIfExists('novel_bookmarks');
}
