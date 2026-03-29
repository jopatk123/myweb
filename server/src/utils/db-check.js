/**
 * 数据库检查工具
 */
import { getDb, setDb } from './dbPool.js';
import { initDatabase } from '../config/database.js';
import logger from './logger.js';

const dbCheckLogger = logger.child('DbCheck');

/**
 * 检查数据库表是否存在
 */
export function checkDatabaseTables() {
  const db = getDb();
  const requiredTables = [
    'messages',
    'user_sessions',
    'wallpapers',
    'wallpaper_groups',
    'apps',
    'app_groups',
    'files',
    'notebook_notes',
    'work_sessions',
    'work_daily_totals',
    'work_stats',
  ];

  const missingTables = [];
  const existingTables = [];

  for (const tableName of requiredTables) {
    try {
      // 尝试查询表是否存在
      const stmt = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `);
      const result = stmt.get(tableName);

      if (result) {
        existingTables.push(tableName);
      } else {
        missingTables.push(tableName);
      }
    } catch (error) {
      dbCheckLogger.error(`检查表 ${tableName} 时出错`, {
        error: error.message,
      });
      missingTables.push(tableName);
    }
  }

  return {
    existingTables,
    missingTables,
    allTablesExist: missingTables.length === 0,
  };
}

/**
 * 检查数据库连接
 */
export function checkDatabaseConnection() {
  try {
    const db = getDb();
    // 执行简单查询测试连接
    const stmt = db.prepare('SELECT 1 as test');
    const result = stmt.get();
    return result && result.test === 1;
  } catch (error) {
    dbCheckLogger.error('数据库连接检查失败', { error: error.message });
    return false;
  }
}

/**
 * 获取数据库状态信息
 */
export function getDatabaseStatus() {
  const connectionOk = checkDatabaseConnection();
  const tableCheck = checkDatabaseTables();

  return {
    connection: connectionOk ? 'ok' : 'error',
    tables: tableCheck,
    status: connectionOk && tableCheck.allTablesExist ? 'healthy' : 'unhealthy',
  };
}

/**
 * 主检查函数
 */
export async function performDatabaseCheck() {
  dbCheckLogger.info('检查数据库状态...');

  try {
    // 初始化数据库连接
    const db = await initDatabase();
    setDb(db);

    const status = getDatabaseStatus();

    if (status.connection === 'error') {
      dbCheckLogger.error('数据库连接失败');
      return false;
    }

    dbCheckLogger.info('数据库连接正常');

    if (status.tables.missingTables.length > 0) {
      dbCheckLogger.warn('缺少数据库表', {
        missing: status.tables.missingTables,
      });
      dbCheckLogger.info('请运行 npm run migrate 来创建缺失的表');
      return false;
    }

    dbCheckLogger.info('所有必要的数据库表都存在');
    dbCheckLogger.info(`数据库状态: ${status.status}`);

    return status.status === 'healthy';
  } catch (error) {
    dbCheckLogger.error('数据库检查过程中发生错误', { error: error.message });
    return false;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  performDatabaseCheck()
    .then(isHealthy => {
      process.exit(isHealthy ? 0 : 1);
    })
    .catch(error => {
      // 独立 CLI 脚本 - 使用 console.error 确保输出到 stderr
      console.error('\u274c 数据库检查失败:', error.message);
      process.exit(1);
    });
}
