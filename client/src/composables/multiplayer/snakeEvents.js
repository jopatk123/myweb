// 事件系统：集中管理订阅与触发，避免在主组合函数内堆积过多代码
export function createSnakeEvents() {
  const listeners = {
    gameUpdate: [],
    playerJoin: [],
    playerLeave: [],
    playerReady: [],
    voteUpdate: [],
    autoPopup: [],
  };

  const add = (type, cb) => {
    if (listeners[type]) listeners[type].push(cb);
  };
  const emit = (type, payload) => {
    if (listeners[type]) listeners[type].forEach(cb => {
      try { cb(payload); } catch (e) { console.error('Snake event handler error', type, e); }
    });
  };

  return {
    // 订阅
    onGameUpdate: cb => add('gameUpdate', cb),
    onPlayerJoin: cb => add('playerJoin', cb),
    onPlayerLeave: cb => add('playerLeave', cb),
    onPlayerReady: cb => add('playerReady', cb),
    onVoteUpdate: cb => add('voteUpdate', cb),
    onAutoPopup: cb => add('autoPopup', cb),
    // 触发
    emitGameUpdate: data => emit('gameUpdate', data),
    emitPlayerJoin: data => emit('playerJoin', data),
    emitPlayerLeave: data => emit('playerLeave', data),
    emitPlayerReady: data => emit('playerReady', data),
    emitVoteUpdate: data => emit('voteUpdate', data),
    emitAutoPopup: data => emit('autoPopup', data)
  };
}
