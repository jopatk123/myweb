export function up(knex) {
  return knex.schema
    .createTable('wallpaper_groups', function (table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.boolean('is_default').defaultTo(false);
      table.boolean('is_current').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    })
    .createTable('wallpapers', function (table) {
      table.increments('id').primary();
      table.string('mime_type');
      table
        .integer('group_id')
        .references('id')
        .inTable('wallpaper_groups')
        .onDelete('SET NULL');
      table.string('name');
      table.boolean('is_active').defaultTo(false);
      table.timestamp('deleted_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.string('filename');
      table.string('original_name');
      table.string('file_path');
      table.integer('file_size');
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('wallpapers')
    .dropTableIfExists('wallpaper_groups');
}
