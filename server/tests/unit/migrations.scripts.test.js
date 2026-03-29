import { jest } from '@jest/globals';
import {
  up as up005,
  down as down005,
} from '../../src/migrations/005_add_message_images.js';
import {
  up as up007,
  down as down007,
} from '../../src/migrations/007_add_updated_at_snake_tables.js';
import {
  up as up008,
  down as down008,
} from '../../src/migrations/008_add_end_reason_snake_game_records.js';
import {
  up as up009,
  down as down009,
} from '../../src/migrations/009_add_music_tables.js';
import {
  up as up010,
  down as down010,
} from '../../src/migrations/010_music_groups_and_enhancements.js';

function createChain() {
  const chain = {};
  const methods = [
    'nullable',
    'notNullable',
    'defaultTo',
    'unique',
    'references',
    'inTable',
    'onDelete',
    'primary',
  ];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  return chain;
}

function createTableBuilder() {
  const chain = createChain();
  return {
    text: jest.fn(() => chain),
    string: jest.fn(() => chain),
    integer: jest.fn(() => chain),
    bigInteger: jest.fn(() => chain),
    enu: jest.fn(() => chain),
    timestamp: jest.fn(() => chain),
    increments: jest.fn(() => chain),
    boolean: jest.fn(() => chain),
    timestamps: jest.fn(),
    dropColumn: jest.fn(),
    index: jest.fn(),
  };
}

function createSchemaMock({
  hasTables = {},
  hasColumns = {},
  throwInTable = false,
} = {}) {
  return {
    hasTable: jest.fn(async table => Boolean(hasTables[table])),
    hasColumn: jest.fn(async (table, column) =>
      Boolean(hasColumns[`${table}.${column}`])
    ),
    createTable: jest.fn(async (_table, callback) => {
      const builder = createTableBuilder();
      callback(builder);
    }),
    alterTable: jest.fn(async (_table, callback) => {
      const builder = createTableBuilder();
      callback(builder);
    }),
    table: jest.fn(async (_table, callback) => {
      if (throwInTable) {
        throw new Error('table operation failed');
      }
      const builder = createTableBuilder();
      callback(builder);
    }),
    dropTableIfExists: jest.fn(async () => {}),
    dropTable: jest.fn(async () => {}),
  };
}

function createKnexMock({
  hasTables = {},
  hasColumns = {},
  createSql = '',
  defaultGroup = null,
  insertResult = [{ id: 1 }],
  throwInTable = false,
} = {}) {
  const schema = createSchemaMock({ hasTables, hasColumns, throwInTable });

  const groupFirst = jest.fn(async () => defaultGroup);
  const groupWhere = jest.fn(() => ({ first: groupFirst }));
  const groupInsert = jest.fn(async () => insertResult);

  const tracksUpdate = jest.fn(async () => 1);
  const tracksWhereNull = jest.fn(() => ({ update: tracksUpdate }));

  const knexFn = jest.fn(table => {
    if (table === 'music_groups') {
      return {
        where: groupWhere,
        insert: groupInsert,
      };
    }
    if (table === 'music_tracks') {
      return {
        whereNull: tracksWhereNull,
      };
    }
    return {
      where: jest.fn(() => ({ first: jest.fn(async () => null) })),
      insert: jest.fn(async () => []),
      whereNull: jest.fn(() => ({ update: jest.fn(async () => 0) })),
    };
  });

  knexFn.schema = schema;
  knexFn.fn = { now: jest.fn(() => 'NOW') };
  knexFn.raw = jest.fn(async () => [{ sql: createSql }]);
  knexFn.transaction = jest.fn(async callback => {
    const trx = {
      raw: jest.fn(async () => {}),
    };
    await callback(trx);
  });

  knexFn.__groupInsert = groupInsert;
  knexFn.__groupWhere = groupWhere;
  knexFn.__tracksWhereNull = tracksWhereNull;

  return knexFn;
}

describe('migration 005_add_message_images', () => {
  test('up adds both columns when missing', async () => {
    const knex = createKnexMock({
      hasColumns: {
        'messages.images': false,
        'messages.image_type': false,
      },
    });

    await up005(knex);

    expect(knex.schema.alterTable).toHaveBeenCalledTimes(2);
  });

  test('down drops existing columns', async () => {
    const knex = createKnexMock({
      hasColumns: {
        'messages.images': true,
        'messages.image_type': false,
      },
    });

    await down005(knex);

    expect(knex.schema.alterTable).toHaveBeenCalledTimes(1);
  });
});

describe('migration 007_add_updated_at_snake_tables', () => {
  test('up adds updated_at columns when missing', async () => {
    const knex = createKnexMock({
      hasColumns: {
        'snake_rooms.updated_at': false,
        'snake_players.updated_at': false,
      },
    });

    await up007(knex);

    expect(knex.schema.table).toHaveBeenCalledTimes(2);
  });

  test('down catches drop errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const knex = createKnexMock({
      hasColumns: {
        'snake_players.updated_at': true,
      },
      throwInTable: true,
    });

    await down007(knex);

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('migration 008_add_end_reason_snake_game_records', () => {
  test('up adds end_reason when missing', async () => {
    const knex = createKnexMock({
      hasColumns: {
        'snake_game_records.end_reason': false,
      },
    });

    await up008(knex);

    expect(knex.schema.table).toHaveBeenCalledTimes(1);
  });

  test('down catches drop errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const knex = createKnexMock({
      hasColumns: {
        'snake_game_records.end_reason': true,
      },
      throwInTable: true,
    });

    await down008(knex);

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('migration 009_add_music_tables', () => {
  test('up creates files/music tables and rebuilds files constraint when music missing', async () => {
    const knex = createKnexMock({
      hasTables: {
        files: false,
        music_tracks: false,
      },
      createSql: 'CREATE TABLE files (type_category TEXT)',
    });

    await up009(knex);

    expect(knex.schema.createTable).toHaveBeenCalledTimes(2);
    expect(knex.schema.alterTable).toHaveBeenCalledTimes(2);
    expect(knex.transaction).toHaveBeenCalledTimes(1);
  });

  test('down drops music table and rebuilds files without music', async () => {
    const knex = createKnexMock({
      hasTables: {
        music_tracks: true,
      },
      createSql:
        "CREATE TABLE files (type_category TEXT CHECK(type_category IN ('image','music')))",
    });

    await down009(knex);

    expect(knex.schema.dropTableIfExists).toHaveBeenCalledWith('music_tracks');
    expect(knex.transaction).toHaveBeenCalledTimes(1);
  });
});

describe('migration 010_music_groups_and_enhancements', () => {
  test('up creates default group, adds group_id and extra columns when missing', async () => {
    const knex = createKnexMock({
      hasTables: {
        music_groups: false,
      },
      hasColumns: {
        'music_tracks.group_id': false,
        'music_tracks.compression_strategy': false,
        'music_tracks.original_bitrate': false,
        'music_tracks.transcode_profile': false,
      },
      defaultGroup: null,
      insertResult: [{ id: 88 }],
    });

    await up010(knex);

    expect(knex.schema.createTable).toHaveBeenCalledWith(
      'music_groups',
      expect.any(Function)
    );
    expect(knex.__groupInsert).toHaveBeenCalled();
    expect(knex.__tracksWhereNull).toHaveBeenCalled();
    expect(knex.schema.alterTable).toHaveBeenCalled();
  });

  test('down rebuilds music_tracks and drops music_groups when present', async () => {
    const knex = createKnexMock({
      hasTables: {
        music_tracks: true,
        music_groups: true,
      },
    });

    await down010(knex);

    expect(knex.transaction).toHaveBeenCalledTimes(1);
    expect(knex.schema.dropTable).toHaveBeenCalledWith('music_groups');
  });
});
