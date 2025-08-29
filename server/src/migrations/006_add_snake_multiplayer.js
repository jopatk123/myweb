/**
 * 多人贪吃蛇游戏数据表
 */

export const up = async knex => {
  // 贪吃蛇房间表
  await knex.schema.createTable('snake_rooms', table => {
    table.increments('id').primary();
    table.string('room_code', 10).unique().notNullable();
    table.enum('mode', ['shared', 'competitive']).notNullable();
    table.enum('status', ['waiting', 'playing', 'finished']).defaultTo('waiting');
    table.integer('max_players').defaultTo(8);
    table.integer('current_players').defaultTo(0);
    table.string('created_by', 36).notNullable();
    table.text('game_settings'); // JSON格式存储游戏设置
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('room_code');
    table.index('status');
    table.index('created_by');
  });

  // 贪吃蛇玩家表
  await knex.schema.createTable('snake_players', table => {
    table.increments('id').primary();
    table.integer('room_id').unsigned().notNullable();
    table.string('session_id', 36).notNullable();
    table.string('player_name', 100).notNullable();
    table.string('player_color', 7).defaultTo('#007bff');
    table.boolean('is_ready').defaultTo(false);
    table.boolean('is_online').defaultTo(true);
    table.integer('score').defaultTo(0);
    table.integer('snake_length').defaultTo(3);
    table.string('last_vote', 10); // 最后投票的方向
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('last_active').defaultTo(knex.fn.now());
    
    table.foreign('room_id').references('id').inTable('snake_rooms').onDelete('CASCADE');
    table.index(['room_id', 'session_id']);
    table.index('is_online');
  });

  // 游戏记录表
  await knex.schema.createTable('snake_game_records', table => {
    table.increments('id').primary();
    table.integer('room_id').unsigned().notNullable();
    table.string('winner_session_id', 36);
    table.integer('winner_score').defaultTo(0);
    table.integer('game_duration').defaultTo(0); // 游戏时长（秒）
    table.integer('player_count').defaultTo(0);
    table.string('mode', 20);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.foreign('room_id').references('id').inTable('snake_rooms').onDelete('CASCADE');
    table.index('room_id');
    table.index('winner_session_id');
    table.index('mode');
  });
};

export const down = async knex => {
  await knex.schema.dropTableIfExists('snake_game_records');
  await knex.schema.dropTableIfExists('snake_players');
  await knex.schema.dropTableIfExists('snake_rooms');
};
