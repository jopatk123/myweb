#!/usr/bin/env node
/**
 * 后端 "build" 校验脚本。
 *
 * 当前后端是纯 Node ESM 工程，没有真正的打包产物，但 CI 仍需要一个会真实失败的
 * 构建步骤来拦截：
 *   1. 任意源文件的语法错误（通过 `node --check`）
 *   2. OpenAPI 主入口结构损坏（通过 spectral 之外的最小可读性检查）
 *
 * 之前的 `echo 'Server build completed'` 不会失败，导致 CI 的 build 步骤是伪绿灯。
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, '..');
const srcRoot = join(serverRoot, 'src');
const openapiPath = join(serverRoot, 'openapi.yaml');

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(full)));
    } else if (entry.isFile() && full.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function runNodeCheck(file) {
  return new Promise((resolveCheck, rejectCheck) => {
    const proc = spawn(process.execPath, ['--check', file], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    proc.on('error', rejectCheck);
    proc.on('exit', code => {
      if (code === 0) {
        resolveCheck();
      } else {
        rejectCheck(
          new Error(`node --check failed (${code}) for ${file}\n${stderr}`)
        );
      }
    });
  });
}

async function verifyOpenApi() {
  let info;
  try {
    info = await stat(openapiPath);
  } catch {
    throw new Error(`openapi.yaml 不存在: ${openapiPath}`);
  }
  if (!info.isFile() || info.size < 32) {
    throw new Error(`openapi.yaml 异常或过小 (${info.size} bytes)`);
  }
  const head = (await readFile(openapiPath, 'utf8')).slice(0, 512);
  if (!/openapi\s*:\s*['"]?3\./.test(head)) {
    throw new Error('openapi.yaml 顶部缺少有效的 openapi: 3.x 声明');
  }
}

async function main() {
  const files = await collectJsFiles(srcRoot);
  if (files.length === 0) {
    throw new Error(`未发现可校验的源文件: ${srcRoot}`);
  }

  const concurrency = Math.min(8, files.length);
  let cursor = 0;
  const failures = [];

  async function worker() {
    while (cursor < files.length) {
      const idx = cursor++;
      const file = files[idx];
      try {
        await runNodeCheck(file);
      } catch (err) {
        failures.push({ file, message: err.message });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`[build] ${relative(serverRoot, f.file)}\n${f.message}`);
    }
    throw new Error(`server build failed: ${failures.length} file(s)`);
  }

  await verifyOpenApi();

  console.log(
    `server build OK (${files.length} files syntax-checked, openapi.yaml verified)`
  );
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
