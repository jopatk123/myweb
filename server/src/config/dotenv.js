import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ENV_PATH = path.join(__dirname, '../../../.env');

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = trimmed
    .slice(0, separatorIndex)
    .trim()
    .replace(/^export\s+/, '');
  if (!key) return null;

  let value = trimmed.slice(separatorIndex + 1).trim();
  if (!value) return { key, value: '' };

  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (isQuoted && value.length >= 2) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadEnvFile(envPath = DEFAULT_ENV_PATH) {
  if (!envPath || !fs.existsSync(envPath)) return 0;

  const content = fs.readFileSync(envPath, 'utf8');
  let loadedCount = 0;

  for (const rawLine of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(rawLine);
    if (!parsed) continue;

    if (process.env[parsed.key] !== undefined) continue;

    process.env[parsed.key] = parsed.value;
    loadedCount += 1;
  }

  return loadedCount;
}

export function loadRepoEnv() {
  return loadEnvFile(DEFAULT_ENV_PATH);
}
