// 五子棋 WebSocket 消息处理器
export function createGomokuHandlers(ctx){
  const { events, refs:{ currentRoom, currentPlayer, players, gameState, gameStatus, error }, state } = ctx;

  function normalizeRoom(room){
    if(!room) return room; if(room.room_code && !room.roomCode) room.roomCode = room.room_code; if(room.roomCode && !room.room_code) room.room_code = room.roomCode; return room;
  }

  function handleRoomCreated(data){
    normalizeRoom(data.room);
    // Only treat as local join if the created player matches our session
    const sid = localStorage.getItem('sessionId');
    const isSelf = data.player && data.player.session_id===sid;
    if(isSelf){
      currentRoom.value = data.room;
      currentPlayer.value = data.player;
      players.value = [data.player];
      gameStatus.value = data.room?.status || 'waiting';
      try{ state.isInRoom.value = true; }catch(e){}
    } else {
      // broadcast: other clients may want to know a room was created, but do not auto-enter
      // optionally update a public room list here
    }
  }

  function handleRoomJoined(data){
    normalizeRoom(data.room);
    const sid = localStorage.getItem('sessionId');
    const isSelf = data.player && data.player.session_id===sid;
    if(isSelf){
      currentRoom.value = data.room;
      currentPlayer.value = data.player;
      if(!players.value.find(p=>p.session_id===data.player.session_id)) players.value.push(data.player);
      gameStatus.value = data.room?.status || 'waiting';
      try{ state.isInRoom.value = true; }catch(e){}
    } else {
      // if we already are in this room, add the player to our list
      try{
        if(currentRoom.value && ((currentRoom.value.room_code||currentRoom.value.roomCode) === (data.room.room_code||data.room.roomCode))){
          if(data.player && !players.value.find(p=>p.session_id===data.player.session_id)) players.value.push(data.player);
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
      try{ const me = players.value.find(p=>p && p.session_id===sid); if(me) currentPlayer.value = me; }catch(e){}
    } else {
      // not a participant: ignore detailed room info for UI (could be used for lobby list)
    }
  }
  function handleRoomInfo(data){
    normalizeRoom(data.room);
    currentRoom.value = data.room;
    // prefer explicit players list, fallback to room.players
    players.value = data.players || (data.room && data.room.players) || players.value;
    gameState.value = data.game_state || (data.room && data.room.game_state) || gameState.value;
    // set game status from room if available
    try { gameStatus.value = (data.room && data.room.status) || gameStatus.value || 'waiting'; } catch(e) { /* ignore */ }
    // mark in-room
    try{ state.isInRoom.value = true; }catch(e){}
    // try to set currentPlayer by matching local sessionId
    try{
      const sid = localStorage.getItem('sessionId');
      if(sid && players.value && players.value.length){
        const me = players.value.find(p=>p && p.session_id===sid);
        if(me) currentPlayer.value = me;
      }
    }catch(e){}
  }
  function handlePlayerJoined(data){
    if(data.player && !players.value.find(p=>p.session_id===data.player.session_id)) players.value.push(data.player);
    // update room/game status if provided
    try { if(data.room && data.room.status) gameStatus.value = data.room.status; } catch(e){}
    try{ state.isInRoom.value = true; }catch(e){}
    // try to set currentPlayer for this client
    try{ const sid = localStorage.getItem('sessionId'); if(sid && data.player && data.player.session_id===sid) currentPlayer.value = data.player; }catch(e){}
    events.emitPlayerJoin(data);
  }
  function handlePlayerLeft(data){ if(data.player){ players.value = players.value.filter(p=>p.session_id!==data.player.session_id);} events.emitPlayerLeave(data); }
  function handlePlayerReadyChanged(data){ if(data.player){ const i=players.value.findIndex(p=>p.session_id===data.player.session_id); if(i>=0) players.value[i]=data.player; } events.emitPlayerReady(data); }
  function handleReadyToggled(data){ currentPlayer.value=data; }
  function handleGameStarted(data){ gameState.value=data.game_state; gameStatus.value='playing'; events.emitGameUpdate(data); }
  function handleGameUpdate(data){ if(data.game_state) gameState.value=data.game_state; events.emitGameUpdate(data); }
  function handleGameEnded(data){ if(data.game_state) gameState.value=data.game_state; gameStatus.value='finished'; events.emitMatchEnd(data); }
  function handleError(d){ error.value = d.message; }

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
    gomoku_error: handleError,
  };
}
