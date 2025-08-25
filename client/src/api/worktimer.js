import axios from 'axios';

export async function startSession(sessionId, startTime, targetEndTime) {
  const res = await axios.post('/api/work-timer/start', {
    sessionId,
    startTime,
    targetEndTime,
  });
  return res.data.data;
}

export async function heartbeat(sessionId, incrementMs, lastUpdate) {
  const res = await axios.post('/api/work-timer/heartbeat', {
    sessionId,
    incrementMs,
    lastUpdate,
  });
  return res.data.data;
}

export async function stopSession(sessionId, endTime, finalIncrementMs) {
  const res = await axios.post('/api/work-timer/stop', {
    sessionId,
    endTime,
    finalIncrementMs,
  });
  return res.data.data;
}

export async function getStats() {
  const res = await axios.get('/api/work-timer/stats');
  return res.data.data;
}
