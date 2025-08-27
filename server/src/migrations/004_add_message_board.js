/**
 * 留言板相关表迁移
 */

export const up = async (knex) => {
  // 留言表
  await knex.schema.createTable('messages', (table) => {
    table.increments('id').primary();
    table.text('content').notNullable();
    table.string('author_name', 100).defaultTo('Anonymous');
    table.string('author_color', 7).defaultTo('#007bff');
    table.string('session_id', 36).notNullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    
    // 索引
    table.index(['created_at'], 'idx_messages_created_at');
    table.index(['session_id'], 'idx_messages_session_id');
  });

  // 用户会话表
  await knex.schema.createTable('user_sessions', (table) => {
    table.increments('id').primary();
    table.string('session_id', 36).unique().notNullable();
    table.string('nickname', 100).defaultTo('Anonymous');
    table.string('avatar_color', 7).defaultTo('#007bff');
    table.boolean('auto_open_enabled').defaultTo(true);
    table.datetime('last_active').defaultTo(knex.fn.now());
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    
    // 索引
    table.index(['session_id'], 'idx_user_sessions_session_id');
    table.index(['last_active'], 'idx_user_sessions_last_active');
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('user_sessions');
};