import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DB_PATH || path.join(__dirname, 'data', 'myweb.db'),
    },
    migrations: {
      directory: path.join(__dirname, 'src', 'migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'src', 'seeds'),
    },
    useNullAsDefault: true,
  },
};
