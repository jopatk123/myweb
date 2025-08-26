import { v4 as uuidv4 } from 'uuid';
import * as worktimerApi from '@/api/worktimer';

// 定时器控制逻辑
export class TimerControls {
  constructor(heartbeatManager) {
    this.heartbeatManager = heartbeatManager;
  }

  setPreset(endTime, time) {
    endTime.value = time;
  }

  startTimer(
    endTime,
    isTimerActive,
    startWorkTime,
    workSessions,
    totalMs,
    saveWorkSessionsFn
  ) {
    if (!endTime.value) return;

    isTimerActive.value = true;
    startWorkTime.value = new Date();

    const sessionId = uuidv4();
    this.heartbeatManager.setCurrentSessionId(sessionId);
    this.heartbeatManager.setLastHeartbeatTs(startWorkTime.value.getTime());

    // 仅在本地保存占位，并等待心跳来累计时长；避免重复 push 结束会话
    const localSession = {
      id: sessionId,
      date: new Date().toISOString().slice(0, 10),
      startTime: startWorkTime.value.toISOString(),
      duration: 0,
      targetEndTime: endTime.value,
      is_active: 1,
    };

    workSessions.value.push(localSession);
    saveWorkSessionsFn();

    worktimerApi
      .startSession(sessionId, startWorkTime.value.toISOString(), endTime.value)
      .catch(() => {
        this.heartbeatManager.enqueuePendingStart(
          sessionId,
          startWorkTime.value.toISOString(),
          endTime.value
        );
      })
      .finally(() => {
        this.heartbeatManager.startHeartbeatInterval(
          startWorkTime.value,
          sessionId,
          endTime.value,
          totalMs,
          workSessions,
          saveWorkSessionsFn
        );
      });
  }

  stopTimer(
    isTimerActive,
    startWorkTime,
    totalMs,
    workSessions,
    saveWorkSessionsFn,
    endTime
  ) {
    // 记录工作时长
    // 不再在这里新建一条会话，改为更新当前会话 is_active/结束时间，由心跳累计时长
    isTimerActive.value = false;

    // 发送最终心跳，并结束会话
    const now = new Date();
    const finalIncrement = startWorkTime.value
      ? now.getTime() - this.heartbeatManager.getLastHeartbeatTs()
      : 0;

    // 发送最终增量并结束会话
    this.heartbeatManager
      .sendHeartbeat(
        finalIncrement,
        now.toISOString(),
        true,
        totalMs,
        workSessions,
        saveWorkSessionsFn,
        endTime
      )
      .catch(() => {});

    this.heartbeatManager.stopHeartbeatInterval();
    startWorkTime.value = null;
  }

  resetTimer(endTime, isTimerActive, startWorkTime) {
    this.stopTimer(isTimerActive, startWorkTime);
    endTime.value = '18:00';
  }

  playNotificationSound() {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
      );
      audio.play().catch(() => {});
    } catch {
      // 静默失败
    }
  }
}
