#!/usr/bin/env node
/**
 * 留言板孤儿图片清理脚本
 *
 * 用途：清理 server/uploads/message-images/ 中未被任何留言引用的图片文件。
 *
 * 触发场景：
 *   - 用户通过 /api/messages/upload-image 上传图片后放弃发送，DB 中没有对应留言；
 *   - 删除留言时 DB 已删但文件清理失败（如临时 IO 错误）；
 *   - 历史遗留的孤儿文件。
 *
 * 用法：
 *   npm run cleanup:message-images           # 默认 dry-run，只打印将删除的文件
 *   npm run cleanup:message-images -- --apply # 实际执行删除
 *   node server/scripts/cleanup-message-images.js --apply
 *
 * 推荐通过系统定时任务（cron）每日低峰期运行：
 *   0 3 * * * cd /path/to/myweb && npm run cleanup:message-images -- --apply >> /var/log/myweb-cleanup.log 2>&1
 */
import Database from 'better-sqlite3';
import { readdir, unlink, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabasePath } from '../src/config/env.js';
import logger from '../src/utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptLogger = logger.child('CleanupMessageImages');

const IMAGES_DIR = join(__dirname, '../uploads/message-images');

/**
 * 从 DB 中查询所有留言图片的文件名集合。
 * @param {Database.Database} db
 * @returns {Set<string>} 引用文件名集合
 */
function collectReferencedFilenames(db) {
  const rows = db
    .prepare(
      `SELECT images FROM messages WHERE images IS NOT NULL AND images != ''`
    )
    .all();
  const referenced = new Set();
  for (const row of rows) {
    let images;
    try {
      images = JSON.parse(row.images);
    } catch {
      // 历史脏数据：JSON 解析失败，跳过（不应删除其引用的文件，避免误删）
      continue;
    }
    if (!Array.isArray(images)) continue;
    for (const img of images) {
      if (img && typeof img.filename === 'string' && img.filename) {
        referenced.add(img.filename);
      }
    }
  }
  return referenced;
}

async function listDirFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(name => !name.startsWith('.'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      // 目录不存在视为空，避免脚本在初始化前报错
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
    scriptLogger.info('DB 中引用的图片数量', { count: referenced.size });

    const diskFiles = await listDirFiles(IMAGES_DIR);
    scriptLogger.info('磁盘上的图片数量', { count: diskFiles.length });

    const orphans = diskFiles.filter(name => !referenced.has(name));
    if (orphans.length === 0) {
      scriptLogger.info('未发现孤儿图片');
      return;
    }

    scriptLogger.info('发现孤儿图片', { count: orphans.length });

    let deletedCount = 0;
    let failedCount = 0;
    for (const name of orphans) {
      const filePath = join(IMAGES_DIR, name);
      try {
        const st = await stat(filePath);
        const sizeKB = Math.round(st.size / 1024);
        if (apply) {
          await unlink(filePath);
          scriptLogger.info('已删除', { file: name, sizeKB });
        } else {
          scriptLogger.info('将删除', { file: name, sizeKB });
        }
        deletedCount++;
      } catch (err) {
        failedCount++;
        scriptLogger.warn('删除失败', { file: name, error: err.message });
      }
    }
    scriptLogger.info('清理完成', {
      mode: apply ? 'apply' : 'dry-run',
      deleted: deletedCount,
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
