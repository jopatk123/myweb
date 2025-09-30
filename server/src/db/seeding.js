/**
 * Seeding helpers: insert builtin apps and seed example apps when empty.
 */

export function seedAppsIfEmpty(db) {
  try {
    const row = db
      .prepare('SELECT COUNT(1) AS c FROM apps WHERE is_deleted = 0')
      .get();
    if (row && row.c === 0) {
      // 确保默认分组存在
      const g = db
        .prepare(
          "SELECT id FROM app_groups WHERE slug = 'default' AND deleted_at IS NULL"
        )
        .get();
      const gid = g ? g.id : null;
      const insert = db.prepare(
        `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url) VALUES (?,?,?,?,?,?,?,?)`
      );
      insert.run(
        '贪吃蛇',
        'snake',
        '经典小游戏（本地实现示例）',
        'snake-128.png',
        gid,
        1,
        1,
        null
      );
      console.log('🌱 Seeded example app: snake');

      // 也种子计算器应用，避免额外脚本依赖（如果尚未存在）
      const hasCalculator = db
        .prepare('SELECT id FROM apps WHERE slug = ? AND is_deleted = 0')
        .get('calculator');
      if (!hasCalculator) {
        try {
          insert.run(
            '计算器',
            'calculator',
            '科学计算器，支持基本运算和内存功能',
            'calculator-128.png',
            gid,
            1,
            1,
            null
          );
          console.log('🌱 Seeded example app: calculator');
        } catch (e) {
          console.warn(
            'seedAppsIfEmpty: failed to seed calculator app:',
            e?.message || e
          );
        }
      } else {
        console.log(
          '🟢 Calculator app already exists, skipping seed for calculator'
        );
      }

      // 也种子笔记本应用
      const hasNotebook = db
        .prepare('SELECT id FROM apps WHERE slug = ? AND is_deleted = 0')
        .get('notebook');
      if (!hasNotebook) {
        try {
          insert.run(
            '笔记本',
            'notebook',
            '待办事项管理，记录和跟踪日常任务',
            'notebook-128.svg',
            gid,
            1,
            1,
            null
          );
          console.log('🌱 Seeded example app: notebook');
        } catch (e) {
          console.warn(
            'seedAppsIfEmpty: failed to seed notebook app:',
            e?.message || e
          );
        }
      } else {
        console.log(
          '🟢 Notebook app already exists, skipping seed for notebook'
        );
      }
    }
  } catch (e) {
    console.warn('seedAppsIfEmpty warning:', e?.message || e);
  }
}

export function ensureBuiltinApps(db) {
  try {
    const builtins = [
      {
        name: '贪吃蛇',
        slug: 'snake',
        description: '经典小游戏（本地实现示例）',
        icon_filename: 'snake-128.png',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '计算器',
        slug: 'calculator',
        description: '科学计算器，支持基本运算和内存功能',
        icon_filename: 'calculator-128.png',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '笔记本',
        slug: 'notebook',
        description: '待办事项管理，记录和跟踪日常任务',
        icon_filename: 'notebook-128.svg',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '小说阅读器',
        slug: 'novel-reader',
        description: '用于阅读本地小说文件，支持章节与进度管理',
        icon_filename: 'novel-reader.svg',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '下班计时器',
        slug: 'work-timer',
        description: '工作时间管理和下班倒计时',
        icon_filename: 'work-timer-128.svg',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '五子棋',
        slug: 'gomoku',
        description: '五子棋对战，挑战AI',
        icon_filename: 'gomoku-128.svg',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '留言板',
        slug: 'message-board',
        description: '用于站内留言与通知展示',
        icon_filename: 'message-board-128.svg',
        is_visible: 0,
        is_builtin: 1,
        target_url: null,
      },
    ];

    const findStmt = db.prepare(
      'SELECT id, is_deleted, is_builtin, description, icon_filename, target_url, is_visible FROM apps WHERE slug = ?'
    );
    const insertStmt = db.prepare(
      `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url, is_deleted) VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const restoreStmt = db.prepare(
      `UPDATE apps SET is_deleted = 0, is_builtin = 1, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`
    );

    // ensure default group id exists
    const g = db
      .prepare(
        "SELECT id FROM app_groups WHERE slug = 'default' AND deleted_at IS NULL"
      )
      .get();
    const gid = g ? g.id : null;

    for (const b of builtins) {
      const row = findStmt.get(b.slug);
      if (!row) {
        insertStmt.run(
          b.name,
          b.slug,
          b.description,
          b.icon_filename,
          gid,
          b.is_visible,
          b.is_builtin,
          b.target_url,
          0
        );
        console.log(`🌱 Inserted builtin app: ${b.slug}`);
        continue;
      }

      if (row.is_deleted === 1) {
        restoreStmt.run(b.slug);
        console.log(`♻️ Restored builtin app: ${b.slug}`);
      }

      const patch = [];
      const params = [];

      if (!row.is_builtin) {
        patch.push('is_builtin = 1');
      }

      if (!row.icon_filename && b.icon_filename) {
        patch.push('icon_filename = ?');
        params.push(b.icon_filename);
      }

      if (!row.description && b.description) {
        patch.push('description = ?');
        params.push(b.description);
      }

      if (row.target_url === null && b.target_url !== null) {
        patch.push('target_url = ?');
        params.push(b.target_url);
      }

      if (patch.length > 0) {
        patch.push('updated_at = CURRENT_TIMESTAMP');
        const sql = `UPDATE apps SET ${patch.join(', ')} WHERE slug = ?`;
        db.prepare(sql).run(...params, b.slug);
      }
    }
  } catch (e) {
    console.warn('ensureBuiltinApps warning:', e?.message || e);
  }
}
