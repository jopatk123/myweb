#!/usr/bin/env node
/**
 * 应用图标孤儿文件清理脚本
 *
 * 用途：清理 server/uploads/apps/icons/ 中未被任何未删除应用引用的图标。
 *
 * 触发场景：
 *   - POST /api/apps/icons/upload 成功后创建/更新应用失败，且回滚未执行；
 *   - 进程在落盘与写库之间崩溃；
 *   - 历史遗留的孤儿文件。
 *
 * 用法：
 *   npm run cleanup:app-icons           # 默认 dry-run，只打印将删除的文件
 *   npm run cleanup:app-icons -- --apply # 实际执行删除
 *
 * 推荐通过系统定时任务（cron）每日低峰期运行：
 *   0 3 * * * cd /path/to/myweb && npm run cleanup:app-icons -- --apply >> /var/log/myweb-cleanup.log 2>&1
 */
import Database from 'better-sqlite3';
import { readdir, unlink, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabasePath } from '../src/config/env.js';
import logger from '../src/utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptLogger = logger.child('CleanupAppIcons');

const ICONS_DIR = join(__dirname, '../uploads/apps/icons');

function collectReferencedFilenames(db) {
  const rows = db
    .prepare(
      `SELECT icon_filename FROM apps WHERE deleted_at IS NULL AND icon_filename IS NOT NULL AND icon_filename != ''`
    )
    .all();
  return new Set(
    rows.map(row => row.icon_filename).filter(name => typeof name === 'string')
  );
}

async function listDirFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(name => !name.startsWith('.') && !name.endsWith('.tmp'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (!apply) {
    scriptLogger.info(
      'dry-run 模式：仅打印将删除的文件，不实际删除。使用 --apply 执行删除。'
    );
  }

  const dbPath = resolveDatabasePath();
  const db = new Database(dbPath, { readonly: true });
  try {
    const referenced = collectReferencedFilenames(db);
    scriptLogger.info('DB 中引用的图标数量', { count: referenced.size });

    const diskFiles = await listDirFiles(ICONS_DIR);
    scriptLogger.info('磁盘上的图标数量', { count: diskFiles.length });

    const orphans = diskFiles.filter(name => !referenced.has(name));
    if (orphans.length === 0) {
      scriptLogger.info('未发现孤儿图标');
      return;
    }

    scriptLogger.info('发现孤儿图标', { count: orphans.length });

    let deletedCount = 0;
    let wouldDeleteCount = 0;
    let failedCount = 0;
    for (const name of orphans) {
      const filePath = join(ICONS_DIR, name);
      try {
        const st = await stat(filePath);
        const sizeKB = Math.round(st.size / 1024);
        if (apply) {
          await unlink(filePath);
          scriptLogger.info('已删除', { file: name, sizeKB });
          deletedCount++;
        } else {
          scriptLogger.info('将删除', { file: name, sizeKB });
          wouldDeleteCount++;
        }
      } catch (err) {
        failedCount++;
        scriptLogger.warn('删除失败', { file: name, error: err.message });
      }
    }
    scriptLogger.info('清理完成', {
      mode: apply ? 'apply' : 'dry-run',
      deleted: deletedCount,
      wouldDelete: wouldDeleteCount,
      failed: failedCount,
    });
  } finally {
    db.close();
  }
}

main().catch(err => {
  scriptLogger.error('清理脚本异常退出', { error: err });
  process.exit(1);
});
