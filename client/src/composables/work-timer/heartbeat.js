import * as worktimerApi from '@/api/worktimer';
import {
  savePendingHeartbeats,
  loadPendingHeartbeats,
  savePendingStarts,
  loadPendingStarts,
  savePendingStops,
  loadPendingStops,
  saveTotalMs,
  clearPendingHeartbeats,
  clearPendingStarts,
  clearPendingStops,
} from './storage.js';

// 心跳机制管理
export class HeartbeatManager {
  constructor() {
    this.heartbeatTimer = null;
    this.currentSessionId = null;
    this.sessionStartIso = null; // 当前会话的真实开始时间（离线入队用）
    this.lastHeartbeatTs = null; // ms
    this.pendingHeartbeats = [];
    this.pendingStarts = [];
    this.pendingStops = [];
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
      ).catch(error => {
        console.warn('定时发送工作心跳失败:', error);
      });

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
    // 同一会话只入队一次，避免离线期间反复心跳产生重复 start；
    // 重复重放 start 虽已由服务端「冲突保留 duration」兜底，仍不应放大请求
    if (this.pendingStarts.some(s => s.sessionId === sessionId)) return;
    this.pendingStarts.push({ sessionId, startIso, targetEndTime });
    savePendingStarts(this.pendingStarts);
  }

  enqueuePendingStop(sessionId, endTimeIso) {
    this.pendingStops.push({ sessionId, endTimeIso });
    savePendingStops(this.pendingStops);
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
    } catch (error) {
      console.warn('刷新待发送工作会话失败:', error);
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
    } catch (error) {
      console.warn('刷新待发送工作心跳失败:', error);
      // 恢复队列以便重试
      this.pendingHeartbeats = pending.concat(this.pendingHeartbeats || []);
      savePendingHeartbeats(this.pendingHeartbeats);
      return;
    }

    // 心跳落库后再结束会话（重放顺序：start → heartbeat → stop）
    const stops = (this.pendingStops || []).slice();
    this.pendingStops = [];
    for (const s of stops) {
      try {
        // finalIncrementMs 传 null：对应的最终增量已由心跳落库，避免重复累计
        await worktimerApi.stopSession(s.sessionId, s.endTimeIso, null);
      } catch (error) {
        console.warn('刷新待发送工作会话结束请求失败:', error);
        this.pendingStops.unshift(s);
        savePendingStops(this.pendingStops);
        return;
      }
    }
    clearPendingStops();
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
      // 若会话未在服务器创建，则也 enqueue start（同一会话只入队一次）
      if (this.sessionStartIso) {
        this.enqueuePendingStart(
          this.currentSessionId,
          this.sessionStartIso,
          endTime.value
        );
      }
      this.enqueuePendingHeartbeat(
        this.currentSessionId,
        incrementMs,
        lastUpdateIso
      );
      // 离线结束时 stop 请求也必须持久化，否则会话在服务端永远处于激活状态
      if (endSession) {
        this.enqueuePendingStop(this.currentSessionId, lastUpdateIso);
      }
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
        // 最终增量已由上面的 heartbeat 落库，finalIncrementMs 传 null，
        // 否则服务端 stop 会再累加一次造成双重计数
        await worktimerApi
          .stopSession(this.currentSessionId, lastUpdateIso, null)
          .catch(error => {
            console.warn('结束工作会话失败:', error);
            // stop 失败需持久化重试，否则会话在服务端永远处于激活状态
            this.enqueuePendingStop(this.currentSessionId, lastUpdateIso);
          });
        this.currentSessionId = null;
      }
    } catch (error) {
      console.warn('发送工作心跳失败:', error);
      this.enqueuePendingHeartbeat(
        this.currentSessionId,
        incrementMs,
        lastUpdateIso
      );
      if (endSession) {
        this.enqueuePendingStop(this.currentSessionId, lastUpdateIso);
      }
    }
  }

  loadPendingFromStorage() {
    this.pendingHeartbeats = loadPendingHeartbeats();
    this.pendingStarts = loadPendingStarts();
    this.pendingStops = loadPendingStops();
  }

  getSessionStartIso() {
    return this.sessionStartIso;
  }

  setSessionStartIso(iso) {
    this.sessionStartIso = iso;
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
