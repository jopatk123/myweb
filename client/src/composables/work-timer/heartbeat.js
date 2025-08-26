import * as worktimerApi from '@/api/worktimer';
import {
  savePendingHeartbeats,
  loadPendingHeartbeats,
  savePendingStarts,
  loadPendingStarts,
  saveTotalMs,
  clearPendingHeartbeats,
  clearPendingStarts,
} from './storage.js';

// 心跳机制管理
export class HeartbeatManager {
  constructor() {
    this.heartbeatTimer = null;
    this.currentSessionId = null;
    this.lastHeartbeatTs = null; // ms
    this.pendingHeartbeats = [];
    this.pendingStarts = [];
  }

  startHeartbeatInterval(
    startWorkTime,
    currentSessionId,
    endTime,
    totalMs,
    workSessions,
    saveWorkSessions
  ) {
    if (this.heartbeatTimer) return;

    this.currentSessionId = currentSessionId;
    this.lastHeartbeatTs = startWorkTime.getTime();

    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      if (!startWorkTime || !this.currentSessionId) return;

      // 发送自上次心跳后的增量
      const last = this.lastHeartbeatTs || startWorkTime.getTime();
      const delta = now.getTime() - last;
      // 取整到分钟以避免频繁小增量
      const minuteChunks = Math.floor(delta / (60 * 1000));
      if (minuteChunks <= 0) return;

      const increment = minuteChunks * 60 * 1000;
      this.lastHeartbeatTs = last + increment;

      this.sendHeartbeat(
        increment,
        new Date(this.lastHeartbeatTs).toISOString(),
        false,
        totalMs,
        workSessions,
        saveWorkSessions,
        endTime
      ).catch(() => {});

      // 同步本地显示（乐观更新）
      totalMs.value += increment;
    }, 60 * 1000);
  }

  stopHeartbeatInterval() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  enqueuePendingHeartbeat(sessionId, incrementMs, lastUpdate) {
    this.pendingHeartbeats.push({ sessionId, incrementMs, lastUpdate });
    savePendingHeartbeats(this.pendingHeartbeats);
  }

  enqueuePendingStart(sessionId, startIso, targetEndTime) {
    this.pendingStarts.push({ sessionId, startIso, targetEndTime });
    savePendingStarts(this.pendingStarts);
  }

  async flushPendingHeartbeats() {
    // 先尝试刷新 pending starts，确保会话存在
    try {
      const starts = (this.pendingStarts || []).slice();
      this.pendingStarts = [];
      for (const s of starts) {
        try {
          await worktimerApi.startSession(
            s.sessionId,
            s.startIso,
            s.targetEndTime
          );
        } catch (error) {
          // 如果 start 失败，恢复到队列并抛出以停止后续处理
          this.pendingStarts.unshift(s);
          savePendingStarts(this.pendingStarts);
          throw error;
        }
      }
      clearPendingStarts();
    } catch {
      // 如果 start 队列处理失败，则不继续 heartbeats
      return;
    }

    if (!navigator.onLine) return;

    const pending = (this.pendingHeartbeats || []).slice();
    this.pendingHeartbeats = [];

    try {
      for (const h of pending) {
        await worktimerApi.heartbeat(h.sessionId, h.incrementMs, h.lastUpdate);
      }
      clearPendingHeartbeats();
    } catch {
      // 恢复队列以便重试
      this.pendingHeartbeats = pending.concat(this.pendingHeartbeats || []);
      savePendingHeartbeats(this.pendingHeartbeats);
    }
  }

  async sendHeartbeat(
    incrementMs,
    lastUpdateIso,
    endSession = false,
    totalMs,
    workSessions,
    saveWorkSessions,
    endTime
  ) {
    if (!this.currentSessionId) return;

    if (!navigator.onLine) {
      // 若会话未在服务器创建，则也 enqueue start
      if (this.lastHeartbeatTs) {
        this.enqueuePendingStart(
          this.currentSessionId,
          new Date(this.lastHeartbeatTs).toISOString(),
          endTime.value
        );
      }
      this.enqueuePendingHeartbeat(
        this.currentSessionId,
        incrementMs,
        lastUpdateIso
      );
      return;
    }

    try {
      const data = await worktimerApi.heartbeat(
        this.currentSessionId,
        incrementMs,
        lastUpdateIso
      );

      // 服务端返回统一 totals
      if (data && typeof data.totalMs === 'number') {
        totalMs.value = data.totalMs;
      }
      // 注意：serverTodayMs 和 serverWeekMs 需要在外部传入
      // 这里暂时注释掉，由外部处理
      // if (data && typeof data.todayMs === 'number') {
      //   serverTodayMs.value = data.todayMs;
      // }
      // if (data && typeof data.weekMs === 'number') {
      //   serverWeekMs.value = data.weekMs;
      // }

      saveTotalMs(totalMs.value);

      // 更新本地会话记录的 duration
      const idx = workSessions.value.findIndex(
        s => s.id === this.currentSessionId
      );
      if (idx !== -1) {
        workSessions.value[idx].duration =
          (workSessions.value[idx].duration || 0) + Number(incrementMs || 0);
        workSessions.value[idx].lastUpdate = lastUpdateIso;
        if (endSession) {
          workSessions.value[idx].endTime = lastUpdateIso;
          workSessions.value[idx].is_active = 0;
        }
        saveWorkSessions();
      }

      // 刷新本地会话数据
      await this.flushPendingHeartbeats();

      if (endSession) {
        await worktimerApi
          .stopSession(this.currentSessionId, lastUpdateIso, incrementMs)
          .catch(() => {});
        this.currentSessionId = null;
      }
    } catch {
      this.enqueuePendingHeartbeat(
        this.currentSessionId,
        incrementMs,
        lastUpdateIso
      );
    }
  }

  loadPendingFromStorage() {
    this.pendingHeartbeats = loadPendingHeartbeats();
    this.pendingStarts = loadPendingStarts();
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }

  setCurrentSessionId(sessionId) {
    this.currentSessionId = sessionId;
  }

  getLastHeartbeatTs() {
    return this.lastHeartbeatTs;
  }

  setLastHeartbeatTs(ts) {
    this.lastHeartbeatTs = ts;
  }
}
