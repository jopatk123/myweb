/**
 * Migration: 添加 users 表（以及兼容的 user_sessions 回滚路径）
 */

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  const hasUsersTable = await knex.schema.hasTable('users');
  if (!hasUsersTable) {
    await knex.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('username', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('role', 50).notNullable().defaultTo('user');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  const hasUserSessionsTable = await knex.schema.hasTable('user_sessions');
  if (!hasUserSessionsTable) {
    await knex.schema.createTable('user_sessions', table => {
      table.increments('id').primary();
      table.string('session_id', 36).unique().notNullable();
      table.string('nickname', 100).defaultTo('Anonymous');
      table.string('avatar_color', 7).defaultTo('#007bff');
      table.boolean('auto_open_enabled').defaultTo(true);
      table.datetime('last_active').defaultTo(knex.fn.now());
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.datetime('updated_at').defaultTo(knex.fn.now());

      table.index(['session_id'], 'idx_user_sessions_session_id');
      table.index(['last_active'], 'idx_user_sessions_last_active');
    });
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('user_sessions');
}
