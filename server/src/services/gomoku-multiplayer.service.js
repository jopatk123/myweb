// 简易五子棋多人服务（内存版）
import { v4 as uuidv4 } from 'uuid';

export class GomokuMultiplayerService {
  constructor(wsService){
    this.ws = wsService;
    this.rooms = new Map(); // roomCode -> {room_code, created_at, status, players:[], game_state}
  }

  createRoom(sessionId, playerName){
    const roomCode = this._genCode();
    
    // 获取客户端sessionId用于前端匹配
    const clientSessionId = this.ws.serverToClient.get(sessionId) || sessionId;
    
    const room = { room_code: roomCode, status:'waiting', created_at:Date.now(), players:[], created_by: sessionId };
    const player = { session_id: clientSessionId, player_name: playerName||'玩家', is_ready:false, seat:1 };
    room.players.push(player);
    room.game_state = this._createEmptyGameState();
    this.rooms.set(roomCode, room);
    
    console.debug(`[GomokuService] Room created: ${roomCode} by ${playerName} (server: ${sessionId}, client: ${clientSessionId})`);
    console.debug(`[GomokuService] Sending room_created message to sessionId: ${sessionId}`);
    
    // 只向创建者发送房间创建消息
    this.ws.sendToClient(sessionId, { 
      type: 'gomoku_room_created', 
      data: { room, player } 
    });
    
    // 广播房间列表更新
    this.broadcastRoomListUpdate();
    
    return { room, player };
  }

  joinRoom(sessionId, playerName, roomCode){
    const room = this.rooms.get(roomCode);
    if(!room) throw new Error('房间不存在');
    if(room.players.length>=2) throw new Error('房间已满');
    
    // 获取客户端sessionId用于前端匹配
    const clientSessionId = this.ws.serverToClient.get(sessionId) || sessionId;
    
    if(room.players.find(p => p.session_id === clientSessionId)) throw new Error('已在房间中');
    
    const seat = room.players.find(p=>p.seat===1)? 2:1;
    const player = { session_id: clientSessionId, player_name: playerName||'玩家', is_ready:false, seat };
    room.players.push(player);
    
    console.debug(`[GomokuService] Player ${playerName} joined room ${roomCode} (server: ${sessionId}, client: ${clientSessionId})`);
    
    // 向加入者发送房间加入消息
    this.ws.sendToClient(sessionId, { 
      type: 'gomoku_room_joined', 
      data: { room, player } 
    });
    
    // 向房间内所有玩家广播新玩家加入
    this._broadcastRoom(room, 'player_joined', { room, player });
    
    // 广播房间列表更新
    this.broadcastRoomListUpdate();
    
    return { room, player };
  }

  toggleReady(sessionId, roomCode){
    const room = this.rooms.get(roomCode); 
    if(!room) throw new Error('房间不存在');
    
    // 获取客户端sessionId用于匹配
    const clientSessionId = this.ws.serverToClient.get(sessionId) || sessionId;
    const p = room.players.find(p=>p.session_id===clientSessionId); 
    if(!p) throw new Error('不在房间');
    
    p.is_ready = !p.is_ready;
    
    console.debug(`[GomokuService] Player ${p.player_name} ready status: ${p.is_ready}`);
    
    // 向操作者发送ready切换确认
    this.ws.sendToClient(sessionId, { 
      type: 'gomoku_ready_toggled', 
      data: p 
    });
    
    // 向房间内所有玩家广播状态变化
    this._broadcastRoom(room, 'player_ready_changed', { player: p, players: room.players });
    
    return p;
  }

  startGame(sessionId, roomCode){
    const room = this.rooms.get(roomCode); 
    if(!room) throw new Error('房间不存在');
    if(room.players.length!==2) throw new Error('需 2 名玩家');
    if(!room.players.every(p=>p.is_ready)) throw new Error('双方均准备才可开始');
    
    room.status='playing';
    room.game_state = this._createEmptyGameState();
    
    console.debug(`[GomokuService] Game started in room ${roomCode}`);
    
    // 向房间内所有玩家广播游戏开始
    this._broadcastRoom(room, 'game_started', { game_state: room.game_state, players: room.players });
  }

  placePiece(sessionId, roomCode, row, col){
    const room = this.rooms.get(roomCode); if(!room) return;
    if(room.status!=='playing') return;
    const gs = room.game_state;
    
    // 获取客户端sessionId用于匹配
    const clientSessionId = this.ws.serverToClient.get(sessionId) || sessionId;
    const player = room.players.find(p=>p.session_id===clientSessionId); if(!player) return;
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
    
    // 获取客户端sessionId用于匹配
    const clientSessionId = this.ws.serverToClient.get(sessionId) || sessionId;
    const idx = room.players.findIndex(p=>p.session_id===clientSessionId);
    if(idx>=0){ 
      const [player] = room.players.splice(idx,1); 
      console.debug(`[GomokuService] Player ${player.player_name} left room ${roomCode}`);
      this._broadcastRoom(room,'player_left',{ player }); 
    }
    if(room.players.length===0){ 
      this.rooms.delete(roomCode); 
      console.debug(`[GomokuService] Room ${roomCode} deleted (no players)`);
    }
    else { room.status='waiting'; room.players.forEach(p=> p.is_ready=false); }
    
    // 广播房间列表更新
    this.broadcastRoomListUpdate();
  }

  getRoomInfo(roomCode){ const room = this.rooms.get(roomCode); if(!room) return null; return { room, players: room.players, game_state: room.game_state }; }

  // 获取活跃房间列表
  getActiveRooms() {
    const activeRooms = [];
    for (const [roomCode, room] of this.rooms) {
      activeRooms.push({
        room_code: room.room_code,
        status: room.status,
        created_at: room.created_at,
        created_by: room.created_by,
        current_players: room.players.length,
        max_players: 2,
        players: room.players.map(p => ({
          session_id: p.session_id,
          player_name: p.player_name,
          is_ready: p.is_ready,
          seat: p.seat
        }))
      });
    }
    return activeRooms;
  }

  // 向所有连接的客户端广播房间列表更新
  broadcastRoomListUpdate() {
    const activeRooms = this.getActiveRooms();
    // 向所有连接的客户端发送房间列表更新
    this.ws.broadcast('gomoku_room_list', { rooms: activeRooms });
    console.debug('[GomokuService] Broadcast room list update:', activeRooms.length, 'rooms');
  }

  _broadcastRoom(room, event, payload){ 
    const type = 'gomoku_'+event; 
    const data = { ...payload, room }; 
    
    // 只向房间内的玩家发送消息
    if(room && room.players && room.players.length > 0) {
      room.players.forEach(player => {
        if(player && player.session_id) {
          this.ws.sendToClient(player.session_id, { type, data });
        }
      });
      console.debug(`[GomokuService] Broadcast ${event} to room ${room.room_code} players:`, room.players.map(p => p.player_name));
    } else {
      console.debug(`[GomokuService] No players to broadcast ${event} to`);
    }
  }

  _genCode(){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code=''; for(let i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)]; if(this.rooms.has(code)) return this._genCode(); return code; }
  _createEmptyGameState(){ return { board: Array.from({length:15},()=>Array(15).fill(0)), currentPlayer:1, lastMove:null, winner:null }; }
  _checkWin(board,row,col,player){ const dirs=[[1,0],[0,1],[1,1],[1,-1]]; const inB=(r,c)=>r>=0&&r<15&&c>=0&&c<15; for(const [dr,dc] of dirs){ let cnt=1; let r=row+dr,c=col+dc; while(inB(r,c)&&board[r][c]===player){cnt++;r+=dr;c+=dc;} r=row-dr; c=col-dc; while(inB(r,c)&&board[r][c]===player){cnt++;r-=dr;c-=dc;} if(cnt>=5) return true; } return false; }
}
