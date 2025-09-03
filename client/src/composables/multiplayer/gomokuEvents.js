// 五子棋事件系统
export function createGomokuEvents(){
  const listeners = { 
    gameUpdate:[], 
    playerJoin:[], 
    playerLeave:[], 
    playerReady:[], 
    matchEnd:[], 
    roomListUpdate:[],
    roomCreate:[],
    roomJoin:[]
  };
  const add=(t,cb)=>{ if(listeners[t]) listeners[t].push(cb); };
  const emit=(t,p)=>{ if(listeners[t]) listeners[t].forEach(cb=>{ try{ cb(p);}catch(e){ console.error('gomoku event error', t, e); } }); };
  return {
    onGameUpdate: cb=>add('gameUpdate', cb),
    onPlayerJoin: cb=>add('playerJoin', cb),
    onPlayerLeave: cb=>add('playerLeave', cb),
    onPlayerReady: cb=>add('playerReady', cb),
    onMatchEnd: cb=>add('matchEnd', cb),
    onRoomListUpdate: cb=>add('roomListUpdate', cb),
    onRoomCreate: cb=>add('roomCreate', cb),
    onRoomJoin: cb=>add('roomJoin', cb),
    emitGameUpdate: d=>emit('gameUpdate', d),
    emitPlayerJoin: d=>emit('playerJoin', d),
    emitPlayerLeave: d=>emit('playerLeave', d),
    emitPlayerReady: d=>emit('playerReady', d),
    emitMatchEnd: d=>emit('matchEnd', d),
    emitRoomListUpdate: d=>emit('roomListUpdate', d),
    emitRoomCreate: d=>emit('roomCreate', d),
    emitRoomJoin: d=>emit('roomJoin', d),
  };
}
