// 五子棋多人 API 客户端（参考 snakeApiClient）
export class GomokuApiClient {
  constructor(ws){ this.ws = ws; }
  createRoom(playerName){ return this.ws.send({ type:'gomoku_create_room', data:{ playerName }}); }
  joinRoom(playerName, roomCode){ return this.ws.send({ type:'gomoku_join_room', data:{ playerName, roomCode: roomCode.toUpperCase() }}); }
  toggleReady(roomCode){ if(!roomCode) return; return this.ws.send({ type:'gomoku_toggle_ready', data:{ roomCode }}); }
  leaveRoom(roomCode){ if(!roomCode) return; return this.ws.send({ type:'gomoku_leave_room', data:{ roomCode }}); }
  getRoomInfo(roomCode){ return this.ws.send({ type:'gomoku_get_room_info', data:{ roomCode: roomCode.toUpperCase() }}); }
  startGame(roomCode){ if(!roomCode) return; return this.ws.send({ type:'gomoku_start_game', data:{ roomCode }}); }
  placePiece(roomCode, row, col){ if(!roomCode) return; return this.ws.send({ type:'gomoku_place_piece', data:{ roomCode, row, col }}); }
}
