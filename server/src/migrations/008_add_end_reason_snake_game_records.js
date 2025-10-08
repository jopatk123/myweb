/**
 * Migration: 为 snake_game_records 添加 end_reason 列（如果不存在）
 */
export const up = async knex => {
  if (!(await knex.schema.hasColumn('snake_game_records', 'end_reason'))) {
    await knex.schema.table('snake_game_records', table => {
      table.string('end_reason').defaultTo('finished');
    });
  }
};

export const down = async knex => {
  try {
    if (await knex.schema.hasColumn('snake_game_records', 'end_reason')) {
      await knex.schema.table('snake_game_records', table => {
        table.dropColumn('end_reason');
      });
    }
  } catch (e) {
    // SQLite 在某些版本对 dropColumn 支持有限，忽略以避免迁移失败
    console.warn(
      'down migration: dropColumn not supported, skipping',
      e && e.message
    );
  }
};
