export function up(knex) {
  return Promise.resolve()
    .then(() =>
      knex.schema.hasTable('work_sessions').then(exists => {
        if (!exists) {
          return knex.schema.createTable('work_sessions', function (table) {
            table.string('id').primary();
            table.string('date').notNullable();
            table.timestamp('start_time').notNullable();
            table.timestamp('last_update');
            table.timestamp('end_time');
            table.integer('duration').defaultTo(0);
            table.string('target_end_time');
            table.boolean('is_active').defaultTo(true);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
          });
        }
      })
    )
    .then(() =>
      knex.schema.hasTable('work_stats').then(exists => {
        if (!exists) {
          return knex.schema.createTable('work_stats', function (table) {
            table.increments('id').primary();
            table.integer('total_ms').defaultTo(0);
            table.timestamp('updated_at').defaultTo(knex.fn.now());
          });
        }
      })
    );
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('work_stats')
    .dropTableIfExists('work_sessions');
}
