import { createApiClient } from './httpClient.js';

const api = createApiClient({ timeout: 30000 });

export async function startSession(sessionId, startTime, targetEndTime) {
  const res = await api.post('/work-timer/start', {
    sessionId,
    startTime,
    targetEndTime,
  });
  return res.data;
}

export async function heartbeat(sessionId, incrementMs, lastUpdate) {
  const res = await api.post('/work-timer/heartbeat', {
    sessionId,
    incrementMs,
    lastUpdate,
  });
  return res.data;
}

export async function stopSession(sessionId, endTime, finalIncrementMs) {
  const res = await api.post('/work-timer/stop', {
    sessionId,
    endTime,
    finalIncrementMs,
  });
  return res.data;
}

export async function getStats() {
  const res = await api.get('/work-timer/stats');
  return res.data;
}
