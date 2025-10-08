/**
 * Migration: 添加 updated_at 列到 snake_rooms 和 snake_players（如果不存在）
 */
export const up = async knex => {
  // 为 SQLite / 其他 DB 添加列（如果尚未存在）
  if (!(await knex.schema.hasColumn('snake_rooms', 'updated_at'))) {
    await knex.schema.table('snake_rooms', table => {
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasColumn('snake_players', 'updated_at'))) {
    await knex.schema.table('snake_players', table => {
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
};

export const down = async knex => {
  // 尝试移除列（某些 SQLite 版本不支持 dropColumn）
  try {
    if (await knex.schema.hasColumn('snake_players', 'updated_at')) {
      await knex.schema.table('snake_players', table => {
        table.dropColumn('updated_at');
      });
    }

    if (await knex.schema.hasColumn('snake_rooms', 'updated_at')) {
      await knex.schema.table('snake_rooms', table => {
        table.dropColumn('updated_at');
      });
    }
  } catch (e) {
    // 如果无法 dropColumn （SQLite 限制），忽略以避免迁移回滚失败
    console.warn(
      'down migration: dropColumn not supported, skipping',
      e && e.message
    );
  }
};
