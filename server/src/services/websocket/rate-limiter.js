/**
 * 简单的滑动窗口令牌桶：每个 serverSessionId 每秒最多处理 `limit` 条消息。
 */
export class MessageRateLimiter {
  constructor(limit) {
    this.limit = limit;
    /** serverSessionId -> { count, resetAt } */
    this._state = new Map();
  }

  isLimited(serverSessionId) {
    const now = Date.now();
    let entry = this._state.get(serverSessionId);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + 1000 };
      this._state.set(serverSessionId, entry);
    }
    entry.count += 1;
    return entry.count > this.limit;
  }

  forget(serverSessionId) {
    this._state.delete(serverSessionId);
  }

  clear() {
    this._state.clear();
  }
}
