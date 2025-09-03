// 五子棋多人 API 客户端（参考 snakeApiClient）
export class GomokuApiClient {
  constructor(ws){ this.ws = ws; }
  createRoom(playerName){ console.debug('[GomokuApi] send create_room', playerName); return this.ws.send({ type:'gomoku_create_room', data:{ playerName }}); }
  joinRoom(playerName, roomCode){ console.debug('[GomokuApi] send join_room', playerName, roomCode); return this.ws.send({ type:'gomoku_join_room', data:{ playerName, roomCode: roomCode.toUpperCase() }}); }
  toggleReady(roomCode){ if(!roomCode) return; console.debug('[GomokuApi] send toggle_ready', roomCode); return this.ws.send({ type:'gomoku_toggle_ready', data:{ roomCode }}); }
  leaveRoom(roomCode){ if(!roomCode) return; console.debug('[GomokuApi] send leave_room', roomCode); return this.ws.send({ type:'gomoku_leave_room', data:{ roomCode }}); }
  getRoomInfo(roomCode){ console.debug('[GomokuApi] send get_room_info', roomCode); return this.ws.send({ type:'gomoku_get_room_info', data:{ roomCode: roomCode.toUpperCase() }}); }
  getRoomList(){ console.debug('[GomokuApi] send get_room_list'); return this.ws.send({ type:'gomoku_get_room_list', data:{} }); }
  startGame(roomCode){ if(!roomCode) return; console.debug('[GomokuApi] send start_game', roomCode); return this.ws.send({ type:'gomoku_start_game', data:{ roomCode }}); }
  placePiece(roomCode, row, col){ if(!roomCode) return; console.debug('[GomokuApi] send place_piece', roomCode, row, col); return this.ws.send({ type:'gomoku_place_piece', data:{ roomCode, row, col }}); }
}
