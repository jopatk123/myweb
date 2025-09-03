// 五子棋 WebSocket 消息处理器
export function createGomokuHandlers(ctx){
  const { events, refs:{ currentRoom, currentPlayer, players, gameState, gameStatus, error }, state } = ctx;

  function normalizeRoom(room){
    if(!room) return room; if(room.room_code && !room.roomCode) room.roomCode = room.room_code; if(room.roomCode && !room.room_code) room.room_code = room.roomCode; return room;
  }

  function handleRoomCreated(data){
    console.debug('[GomokuHandlers] handleRoomCreated called with data:', data);
    normalizeRoom(data.room);
    // Only treat as local join if the created player matches our session
    const sid = localStorage.getItem('sessionId');
    const isSelf = data.player && data.player.session_id===sid;
    
    console.debug('[GomokuHandlers] Room created:', data.room?.room_code, 'isSelf:', isSelf);
    console.debug('[GomokuHandlers] SessionId comparison - local:', sid, 'server:', data.player?.session_id);
    
    if(isSelf){
      console.debug('[GomokuHandlers] Setting currentRoom for self:', data.room);
      currentRoom.value = data.room;
      currentPlayer.value = data.player;
      players.value = [data.player];
      gameStatus.value = data.room?.status || 'waiting';
      try{ state.isInRoom.value = true; }catch(e){}
      console.debug('[GomokuHandlers] Entered room as creator:', data.room?.room_code);
      
      // 触发房间创建成功事件
      events.emitRoomCreate(data);
    } else {
      console.debug('[GomokuHandlers] Room created by another player (not self)');
      // broadcast: other clients may want to know a room was created, but do not auto-enter
      console.debug('[GomokuHandlers] Room created by another player:', data.room?.room_code);
      
      // 如果没有sessionId，可能是首次访问，尝试生成一个
      if (!sid && data.player) {
        console.warn('[GomokuHandlers] No sessionId found, this might be the issue');
      }
    }
  }

  function handleRoomJoined(data){
    normalizeRoom(data.room);
    const sid = localStorage.getItem('sessionId');
    const isSelf = data.player && data.player.session_id===sid;
    
    console.debug('[GomokuHandlers] Room joined:', data.room?.room_code, 'isSelf:', isSelf);
    console.debug('[GomokuHandlers] SessionId comparison - local:', sid, 'server:', data.player?.session_id);
    
    if(isSelf){
      currentRoom.value = data.room;
      currentPlayer.value = data.player;
      if(!players.value.find(p=>p.session_id===data.player.session_id)) {
        players.value.push(data.player);
      }
      gameStatus.value = data.room?.status || 'waiting';
      try{ state.isInRoom.value = true; }catch(e){}
      console.debug('[GomokuHandlers] Successfully joined room:', data.room?.room_code);
      
      // 触发房间加入成功事件
      events.emitRoomJoin(data);
    } else {
      // if we already are in this room, add the player to our list
      try{
        if(currentRoom.value && ((currentRoom.value.room_code||currentRoom.value.roomCode) === (data.room.room_code||data.room.roomCode))){
          if(data.player && !players.value.find(p=>p.session_id===data.player.session_id)) {
            players.value.push(data.player);
            console.debug('[GomokuHandlers] Another player joined our room:', data.player.player_name);
          }
        }
      }catch(e){}
    }
  }

  function handleRoomInfo(data){
    normalizeRoom(data.room);
    // Only set currentRoom if this client is a participant in the room
    const sid = localStorage.getItem('sessionId');
    const playersList = data.players || (data.room && data.room.players) || [];
    const isParticipant = playersList && playersList.find(p=>p && p.session_id===sid);
    
    if(isParticipant){
      currentRoom.value = data.room;
      players.value = playersList;
      gameState.value = data.game_state || (data.room && data.room.game_state) || gameState.value;
      try { gameStatus.value = data.room?.status || gameStatus.value || 'waiting'; } catch(e){}
      try{ state.isInRoom.value = true; }catch(e){}
      // set currentPlayer if present in players
      try{ 
        const me = players.value.find(p=>p && p.session_id===sid); 
        if(me) currentPlayer.value = me; 
      }catch(e){}
      console.debug('[GomokuHandlers] Room info updated for participant:', data.room?.room_code, 'Status:', gameStatus.value);
    } else {
      // not a participant: ignore detailed room info for UI (could be used for lobby list)
      console.debug('[GomokuHandlers] Ignoring room info - not a participant:', data.room?.room_code);
    }
  }
  function handlePlayerJoined(data){
    console.debug('[GomokuHandlers] Player joined event:', data.player?.player_name);
    
    if(data.player && !players.value.find(p=>p.session_id===data.player.session_id)) {
      players.value.push(data.player);
    }
    // update room/game status if provided
    try { if(data.room && data.room.status) gameStatus.value = data.room.status; } catch(e){}
    try{ state.isInRoom.value = true; }catch(e){}
    // try to set currentPlayer for this client
    try{ 
      const sid = localStorage.getItem('sessionId'); 
      if(sid && data.player && data.player.session_id===sid) {
        currentPlayer.value = data.player;
        console.debug('[GomokuHandlers] Updated current player:', data.player.player_name);
      }
    }catch(e){}
    events.emitPlayerJoin(data);
  }
  function handlePlayerLeft(data){ if(data.player){ players.value = players.value.filter(p=>p.session_id!==data.player.session_id);} events.emitPlayerLeave(data); }
  function handlePlayerReadyChanged(data){ 
    console.debug('[GomokuHandlers] Player ready changed:', data.player?.player_name, 'ready:', data.player?.is_ready);
    
    if(data.player){ 
      const i=players.value.findIndex(p=>p.session_id===data.player.session_id); 
      if(i>=0) {
        players.value[i] = {...players.value[i], ...data.player};
        // Also update currentPlayer if it's the same player
        const sid = localStorage.getItem('sessionId');
        if(data.player.session_id === sid) {
          currentPlayer.value = {...currentPlayer.value, ...data.player};
        }
      }
    } 
    events.emitPlayerReady(data); 
  }
  function handleReadyToggled(data){ 
    console.debug('[GomokuHandlers] Ready toggled:', data);
    currentPlayer.value = {...currentPlayer.value, ...data}; 
  }
  function handleGameStarted(data){ 
    console.debug('[GomokuHandlers] Game started:', data);
    console.debug('[GomokuHandlers] Setting gameState:', data.game_state);
    console.debug('[GomokuHandlers] Setting gameStatus to playing');
    console.debug('[GomokuHandlers] Current players before update:', players.value);
    
    if(data.game_state) {
      gameState.value = data.game_state;
    }
    
    // 确保 players 数组也被更新
    if(data.players && Array.isArray(data.players)) {
      players.value = data.players;
      console.debug('[GomokuHandlers] Updated players from game start:', data.players);
    }
    
    gameStatus.value = 'playing'; 
    
    console.debug('[GomokuHandlers] After update - gameStatus:', gameStatus.value);
    console.debug('[GomokuHandlers] After update - gameState:', gameState.value);
    console.debug('[GomokuHandlers] After update - players:', players.value);
    
    events.emitGameUpdate(data); 
    console.debug('[GomokuHandlers] GameUpdate event emitted');
  }
  function handleGameUpdate(data){ if(data.game_state) gameState.value=data.game_state; events.emitGameUpdate(data); }
  function handleGameEnded(data){ if(data.game_state) gameState.value=data.game_state; gameStatus.value='finished'; events.emitMatchEnd(data); }
  function handleError(d){ error.value = d.message; }
  function handleRoomList(data){ 
    console.debug('[GomokuHandlers] Room list received:', data.rooms?.length || 0, 'rooms');
    // 触发房间列表更新事件
    events.emitRoomListUpdate && events.emitRoomListUpdate(data.rooms || []); 
  }

  return {
    gomoku_room_created: handleRoomCreated,
    gomoku_room_joined: handleRoomJoined,
    gomoku_room_info: handleRoomInfo,
    gomoku_player_joined: handlePlayerJoined,
    gomoku_player_left: handlePlayerLeft,
    gomoku_player_ready_changed: handlePlayerReadyChanged,
    gomoku_ready_toggled: handleReadyToggled,
    gomoku_game_started: handleGameStarted,
    gomoku_game_update: handleGameUpdate,
    gomoku_game_ended: handleGameEnded,
    gomoku_room_list: handleRoomList,
    gomoku_error: handleError,
  };
}
