// 简易五子棋多人服务（内存版）
import { v4 as uuidv4 } from 'uuid';

export class GomokuMultiplayerService {
  constructor(wsService){
    this.ws = wsService;
    this.rooms = new Map(); // roomCode -> {room_code, created_at, status, players:[], game_state}
  }

  createRoom(sessionId, playerName){
    const roomCode = this._genCode();
    const room = { room_code: roomCode, status:'waiting', created_at:Date.now(), players:[], created_by: sessionId };
    const player = { session_id: sessionId, player_name: playerName||'玩家', is_ready:false, seat:1 };
    room.players.push(player);
    room.game_state = this._createEmptyGameState();
    this.rooms.set(roomCode, room);
    this._broadcastRoom(room, 'room_created', { room, player });
    return { room, player };
  }

  joinRoom(sessionId, playerName, roomCode){
    const room = this.rooms.get(roomCode);
    if(!room) throw new Error('房间不存在');
    if(room.players.length>=2) throw new Error('房间已满');
    const seat = room.players.find(p=>p.seat===1)? 2:1;
    const player = { session_id: sessionId, player_name: playerName||'玩家', is_ready:false, seat };
    room.players.push(player);
    this._broadcastRoom(room, 'player_joined', { room, player });
    return { room, player };
  }

  toggleReady(sessionId, roomCode){
    const room = this.rooms.get(roomCode); if(!room) throw new Error('房间不存在');
    const p = room.players.find(p=>p.session_id===sessionId); if(!p) throw new Error('不在房间');
    p.is_ready = !p.is_ready;
    this._broadcastRoom(room, 'player_ready_changed', { player:p, players: room.players });
    return p;
  }

  startGame(sessionId, roomCode){
    const room = this.rooms.get(roomCode); if(!room) throw new Error('房间不存在');
    if(room.players.length!==2) throw new Error('需 2 名玩家');
    if(!room.players.every(p=>p.is_ready)) throw new Error('双方均准备才可开始');
    room.status='playing';
    room.game_state = this._createEmptyGameState();
    this._broadcastRoom(room, 'game_started', { game_state: room.game_state, players: room.players });
  }

  placePiece(sessionId, roomCode, row, col){
    const room = this.rooms.get(roomCode); if(!room) return;
    if(room.status!=='playing') return;
    const gs = room.game_state;
    const player = room.players.find(p=>p.session_id===sessionId); if(!player) return;
    if(gs.winner) return;
    if(gs.currentPlayer !== player.seat) return; // not turn
    if(row<0||row>=15||col<0||col>=15) return; if(gs.board[row][col]!==0) return;
    gs.board[row][col] = player.seat; gs.lastMove={ row, col, player: player.seat };
    // check win
    if(this._checkWin(gs.board, row, col, player.seat)){ gs.winner=player.seat; room.status='finished'; this._broadcastRoom(room,'game_ended',{ game_state: gs }); return; }
    gs.currentPlayer = gs.currentPlayer===1?2:1;
    this._broadcastRoom(room,'game_update',{ game_state: gs });
  }

  leaveRoom(sessionId, roomCode){
    const room = this.rooms.get(roomCode); if(!room) return;
    const idx = room.players.findIndex(p=>p.session_id===sessionId);
    if(idx>=0){ const [player] = room.players.splice(idx,1); this._broadcastRoom(room,'player_left',{ player }); }
    if(room.players.length===0){ this.rooms.delete(roomCode); }
    else { room.status='waiting'; room.players.forEach(p=> p.is_ready=false); }
  }

  getRoomInfo(roomCode){ const room = this.rooms.get(roomCode); if(!room) return null; return { room, players: room.players, game_state: room.game_state }; }

  _broadcastRoom(room, event, payload){ const type = 'gomoku_'+event; const data = { ...payload, room }; // 简单广播给所有连接（玩家少，开销低）
    this.ws.broadcast(type, data);
  }

  _genCode(){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code=''; for(let i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)]; if(this.rooms.has(code)) return this._genCode(); return code; }
  _createEmptyGameState(){ return { board: Array.from({length:15},()=>Array(15).fill(0)), currentPlayer:1, lastMove:null, winner:null }; }
  _checkWin(board,row,col,player){ const dirs=[[1,0],[0,1],[1,1],[1,-1]]; const inB=(r,c)=>r>=0&&r<15&&c>=0&&c<15; for(const [dr,dc] of dirs){ let cnt=1; let r=row+dr,c=col+dc; while(inB(r,c)&&board[r][c]===player){cnt++;r+=dr;c+=dc;} r=row-dr; c=col-dc; while(inB(r,c)&&board[r][c]===player){cnt++;r-=dr;c-=dc;} if(cnt>=5) return true; } return false; }
}
