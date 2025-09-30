import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('db schema helper script', () => {
  it('validates schema re-exports and initialization', () => {
    const scriptPath = path.resolve(__dirname, 'helpers', 'check-schema.mjs');
    const result = spawnSync(
      process.execPath,
      ['--experimental-vm-modules', scriptPath],
      {
        encoding: 'utf-8',
      }
    );

    if (result.error) {
      throw result.error;
    }

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
