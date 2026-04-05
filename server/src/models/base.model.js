/**
 * 基础模型 —— 提供分页等公用数据库操作
 *
 * 使用方式：
 *   export class AppModel extends BaseModel { ... }
 *
 * 分页方法 paginate(table, where, params, orderBy, limit, page)：
 *   - table:   表名
 *   - where:   WHERE 子句字符串（含 "WHERE" 关键字），空字符串表示无过滤
 *   - params:  与 where 对应的绑定参数数组
 *   - orderBy: ORDER BY 子句，例如 'created_at DESC'
 *   - limit:   每页条数（会被 clamp 到 1~200）
 *   - page:    页码（最小 1）
 *
 * 返回：{ items: any[], total: number, page: number, limit: number }
 */
export class BaseModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * 执行分页查询，返回标准分页结构。
   * @param {string} table
   * @param {string} where  - 含 WHERE 关键字的完整 WHERE 子句，例如 "WHERE deleted_at IS NULL"
   * @param {any[]}  params - WHERE 子句对应的参数
   * @param {string} orderBy
   * @param {number} limit
   * @param {number} page
   * @returns {{ items: any[], total: number, page: number, limit: number }}
   */
  paginate(table, where, params, orderBy, limit, page) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM ${table} ${where}`)
      .get(...params);
    const total = totalRow?.total ?? 0;

    const items = this.db
      .prepare(
        `SELECT * FROM ${table} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
      )
      .all(...params, safeLimit, offset);

    return { items, total, page: safePage, limit: safeLimit };
  }
}
