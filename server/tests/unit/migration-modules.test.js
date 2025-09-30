import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('db migration helper script', () => {
  it('validates migration re-exports and column enforcement', () => {
    const scriptPath = path.resolve(
      __dirname,
      'helpers',
      'check-migrations.mjs'
    );
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

    if (result.status !== 0) {
      console.error(result.stdout);
      console.error(result.stderr);
    }

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
