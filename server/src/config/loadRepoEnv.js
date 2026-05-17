import { loadRepoEnv } from './dotenv.js';

if (!process.env.JEST_WORKER_ID) {
  loadRepoEnv();
}
