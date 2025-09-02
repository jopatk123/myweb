/**
 * WebSocket服务
 */
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
// 迁移到新抽象：使用适配器包装新的 SnakeGameService
import { SnakeMultiplayerAdapter } from './snake-multiplayer.adapter.js';
import { GomokuMultiplayerService } from './gomoku-multiplayer.service.js';

export class WebSocketService {
  constructor() {
    this.clients = new Map();
    this.wss = null;
  this.snakeMultiplayer = new SnakeMultiplayerAdapter(this);
  this.gomokuService = new GomokuMultiplayerService(this);
  // 维护会话所在房间码映射，用于断线自动离开
  this.sessionRoomMap = new Map(); // sessionId -> roomCode
  // 映射：client-provided sessionId <-> server分配的 connection id
  this.serverToClient = new Map(); // serverConnId -> clientSessionId
  this.clientToServer = new Map(); // clientSessionId -> serverConnId
  }

  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws, req) => {
      const sessionId = req.headers['x-session-id'] || uuidv4();

      this.clients.set(sessionId, ws);
  // 保存 server-side connection id 到 ws 以便后续查找
  ws._serverSessionId = sessionId;
      ws.send(
        JSON.stringify({
          type: 'connected',
          sessionId,
        })
      );

      ws.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(sessionId, message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        // 清理映射
        const clientId = this.serverToClient.get(sessionId);
        if (clientId) {
          this.clientToServer.delete(clientId);
          this.serverToClient.delete(sessionId);
        }
        this.clients.delete(sessionId);
        console.log(`WebSocket client disconnected: ${sessionId}`);
        
        // 处理贪吃蛇游戏中的玩家离线
        this.handleSnakePlayerDisconnect(sessionId);
      });

      ws.on('error', error => {
        console.error(`WebSocket error for ${sessionId}:`, error);
        this.clients.delete(sessionId);
      });
    });

    return this.wss;
  }

  async handleMessage(sessionId, message) {
  // Map server connection id to client-provided sessionId when available
  const clientId = this.serverToClient.get(sessionId) || sessionId;
    switch (message.type) {
      case 'ping':
        this.sendToClient(sessionId, { type: 'pong' });
        break;
      case 'join':
        // Client may provide its own sessionId (stored in localStorage). Map it to our server connection id.
        try{
          const provided = message.sessionId;
          if(provided){
            this.serverToClient.set(sessionId, provided);
            this.clientToServer.set(provided, sessionId);
            // also set a quick property on the ws object
            const ws = this.clients.get(sessionId);
            if(ws) ws._clientSessionId = provided;
          }
        }catch(e){}
        console.log(`Client ${sessionId} joined message board (mapped clientId=${this.serverToClient.get(sessionId)||sessionId})`);
        break;
      
      // 贪吃蛇多人游戏消息
      case 'snake_create_room':
        this.handleSnakeCreateRoom(clientId, message.data);
        break;
      case 'snake_join_room':
        this.handleSnakeJoinRoom(clientId, message.data);
        break;
      case 'snake_toggle_ready':
        this.handleSnakeToggleReady(clientId, message.data);
        break;
      case 'snake_vote':
        this.handleSnakeVote(clientId, message.data);
        break;
      case 'snake_move':
        this.handleSnakeMove(clientId, message.data);
        break;
      case 'snake_leave_room':
        this.handleSnakeLeaveRoom(clientId, message.data);
        break;
      case 'snake_get_room_info':
        this.handleSnakeGetRoomInfo(clientId, message.data);
        break;
    case 'snake_start_game':
        // 适配器实现了 startGame，调用并返回结果
        try {
      const { roomCode } = message.data || {};
      await this.snakeMultiplayer.startGame(clientId, roomCode);
          // 广播房间列表更新（具体的 game_started 会由底层服务通过 room 广播发送完整 payload）
          this.broadcast('snake_room_list_updated');
        } catch (e) {
          console.error('处理 snake_start_game 失败:', e && e.message);
      this.sendToClient(clientId, { type: 'snake_error', data: { message: e.message } });
        }
        break;
      // 五子棋多人模式
      case 'gomoku_create_room':
        try { const { playerName } = message.data||{}; const result = this.gomokuService.createRoom(clientId, playerName); this.sendToClient(clientId,{ type:'gomoku_room_created', data: result }); }
        catch(e){ this.sendToClient(clientId,{ type:'gomoku_error', data:{ message: e.message }});} break;
      case 'gomoku_join_room':
        try { const { playerName, roomCode } = message.data||{}; const result = this.gomokuService.joinRoom(clientId, playerName, roomCode); this.sendToClient(clientId,{ type:'gomoku_room_joined', data: result }); }
        catch(e){ this.sendToClient(clientId,{ type:'gomoku_error', data:{ message: e.message }});} break;
      case 'gomoku_toggle_ready':
        try { const { roomCode } = message.data||{}; const p = this.gomokuService.toggleReady(clientId, roomCode); this.sendToClient(clientId,{ type:'gomoku_ready_toggled', data: p }); }
        catch(e){ this.sendToClient(clientId,{ type:'gomoku_error', data:{ message: e.message }});} break;
      case 'gomoku_start_game':
        try { const { roomCode } = message.data||{}; this.gomokuService.startGame(clientId, roomCode); }
        catch(e){ this.sendToClient(clientId,{ type:'gomoku_error', data:{ message: e.message }});} break;
      case 'gomoku_place_piece':
        try { const { roomCode, row, col } = message.data||{}; this.gomokuService.placePiece(clientId, roomCode, row, col); }
        catch(e){ /* ignore */ } break;
      case 'gomoku_leave_room':
        try { const { roomCode } = message.data||{}; this.gomokuService.leaveRoom(clientId, roomCode); this.sendToClient(clientId,{ type:'gomoku_room_left', data:{ success:true }}); }
        catch(e){ /* ignore */ } break;
      case 'gomoku_get_room_info':
        try { const { roomCode } = message.data||{}; const info = this.gomokuService.getRoomInfo(roomCode); this.sendToClient(clientId,{ type:'gomoku_room_info', data: info }); }
        catch(e){ this.sendToClient(clientId,{ type:'gomoku_error', data:{ message: e.message }});} break;
    }
  }

  sendToClient(sessionId, data) {
    // sessionId may be a client-provided id; map back to server connection id
    const serverId = this.clientToServer.get(sessionId) || sessionId;
    const client = this.clients.get(serverId);
    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  broadcast(type, data) {
    const message = JSON.stringify({ type, data });

    this.clients.forEach((client, sessionId) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      } else {
        this.clients.delete(sessionId);
      }
    });
  }

  getOnlineCount() {
    return this.clients.size;
  }

  // 向房间广播消息
  async broadcastToRoom(roomId, eventType, data) {
    try {
      // 仅向属于该房间的在线玩家发送事件，减少不必要的广播开销
      // 优先使用 PlayerModel.findOnlineByRoomId 获取该房间所有在线玩家的 session_id
      let sessionIds = [];
      try {
        if (this.snakeMultiplayer && this.snakeMultiplayer.PlayerModel && typeof this.snakeMultiplayer.PlayerModel.findOnlineByRoomId === 'function') {
          const players = await this.snakeMultiplayer.PlayerModel.findOnlineByRoomId(roomId);
          sessionIds = (players || []).map(p => p.session_id).filter(Boolean);
        }
      } catch (e) {
        console.warn('broadcastToRoom: failed to get players from PlayerModel, falling back to sessionRoomMap', e);
      }

      // fallback: use sessionRoomMap (sessionId -> room_code) if model lookup failed or returned empty
      if ((!sessionIds || sessionIds.length === 0) && this.sessionRoomMap && this.sessionRoomMap.size > 0) {
        // try to match by room code string if roomId is actually a room code
        // sessionRoomMap stores room_code values
        this.sessionRoomMap.forEach((code, sessionId) => {
          if (!code) return;
          // allow sending when roomId equals code or when code ends/contains roomId
          if (String(code) === String(roomId) || String(code).toLowerCase() === String(roomId).toLowerCase()) {
            sessionIds.push(sessionId);
          }
        });
      }

      // If we still have no sessionIds, try to resolve room code via RoomModel (roomId might be a numeric id or roomCode)
      if (!sessionIds || sessionIds.length === 0) {
        try {
          if (this.snakeMultiplayer && this.snakeMultiplayer.RoomModel && typeof this.snakeMultiplayer.RoomModel.findById === 'function') {
            const room = await this.snakeMultiplayer.RoomModel.findById(roomId);
            if (room && room.id) {
              const players = await this.snakeMultiplayer.PlayerModel.findOnlineByRoomId(room.id);
              sessionIds = (players || []).map(p => p.session_id).filter(Boolean);
            }
          }
        } catch (e) {
          // ignore and try other fallbacks
        }
      }

      // If still empty, as a last resort do a filtered broadcast using sessionRoomMap matching room code or roomId string.
      const message = JSON.stringify({ type: `snake_${eventType}`, data: { room_id: roomId, ...data } });
      if (!sessionIds || sessionIds.length === 0) {
        // fallback: send only to clients whose sessionRoomMap indicates they are in the same room code
        this.sessionRoomMap.forEach((code, sessionId) => {
          if (!code) return;
          if (String(code) === String(roomId) || String(code).toLowerCase() === String(roomId).toLowerCase()) {
            const client = this.clients.get(sessionId);
            if (client && client.readyState === client.OPEN) {
              try { client.send(message); } catch (err) { console.warn('send to client failed', sessionId, err); }
            } else {
              this.clients.delete(sessionId);
            }
          }
        });
        // also, if nothing matched, fall back to broadcasting to all clients for compatibility (safe but heavier)
        let anySent = false;
        this.clients.forEach((client, sessionId) => {
          if (client && client.readyState === client.OPEN) {
            try { client.send(message); anySent = true; } catch (err) { console.warn('send to client failed', sessionId, err); }
          } else { this.clients.delete(sessionId); }
        });
        if (!anySent) {
          console.warn('broadcastToRoom: no clients sent for room', roomId);
        }
        return;
      }

      sessionIds.forEach(sessionId => {
        const client = this.clients.get(sessionId);
        if (client && client.readyState === client.OPEN) {
          try { client.send(message); } catch (err) { console.warn('send to client failed', sessionId, err); }
        } else {
          this.clients.delete(sessionId);
        }
      });
    } catch (error) {
      console.error('房间广播失败:', error);
    }
  }

  // 贪吃蛇多人游戏处理方法
  async handleSnakeCreateRoom(sessionId, data) {
    try {
      const { playerName, mode, gameSettings } = data;
      const result = await this.snakeMultiplayer.createRoom(sessionId, playerName, mode, gameSettings);
      
      this.sendToClient(sessionId, {
        type: 'snake_room_created',
        data: result
      });
      if (result?.room?.room_code) {
        this.sessionRoomMap.set(sessionId, result.room.room_code);
      }
      
      // 广播房间列表已更新
      this.broadcast('snake_room_list_updated');
    } catch (error) {
      this.sendToClient(sessionId, {
        type: 'snake_error',
        data: { message: error.message }
      });
    }
  }

  async handleSnakeJoinRoom(sessionId, data) {
    try {
      const { playerName, roomCode } = data;
      const result = await this.snakeMultiplayer.joinRoom(sessionId, playerName, roomCode);
      
      this.sendToClient(sessionId, {
        type: 'snake_room_joined',
        data: result
      });
      if (result?.room?.room_code) {
        this.sessionRoomMap.set(sessionId, result.room.room_code);
      }
    } catch (error) {
      this.sendToClient(sessionId, {
        type: 'snake_error',
        data: { message: error.message }
      });
    }
  }

  async handleSnakeToggleReady(sessionId, data) {
    try {
      const { roomCode } = data;
      const result = await this.snakeMultiplayer.toggleReady(sessionId, roomCode);
      
      this.sendToClient(sessionId, {
        type: 'snake_ready_toggled',
        data: result
      });
    } catch (error) {
      this.sendToClient(sessionId, {
        type: 'snake_error',
        data: { message: error.message }
      });
    }
  }

  async handleSnakeVote(sessionId, data) {
    try {
      const { roomCode, direction } = data;
      await this.snakeMultiplayer.handleVote(sessionId, roomCode, direction);
    } catch (error) {
      console.error('处理投票失败:', error);
    }
  }

  async handleSnakeMove(sessionId, data) {
    try {
      const { roomCode, direction } = data;
      await this.snakeMultiplayer.handleMove(sessionId, roomCode, direction);
    } catch (error) {
      console.error('处理移动失败:', error);
    }
  }

  async handleSnakeLeaveRoom(sessionId, data) {
    try {
      const { roomCode } = data;
      await this.snakeMultiplayer.leaveRoom(sessionId, roomCode);
      // 移除映射
      if (this.sessionRoomMap.get(sessionId) === roomCode) {
        this.sessionRoomMap.delete(sessionId);
      }
      
      this.sendToClient(sessionId, {
        type: 'snake_room_left',
        data: { success: true }
      });
  // 离开房间后更新房间列表（可能房间被删除）
  this.broadcast('snake_room_list_updated');
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  }

  async handleSnakeGetRoomInfo(sessionId, data) {
    try {
      const { roomCode } = data;
      const roomInfo = await this.snakeMultiplayer.getRoomInfo(roomCode);
      
      this.sendToClient(sessionId, {
        type: 'snake_room_info',
        data: roomInfo
      });
    } catch (error) {
      this.sendToClient(sessionId, {
        type: 'snake_error',
        data: { message: error.message }
      });
    }
  }

  async handleSnakePlayerDisconnect(sessionId) {
    try {
      const roomCode = this.sessionRoomMap.get(sessionId);
      if (roomCode) {
        // 调用离开逻辑（复用已有路径）
        await this.snakeMultiplayer.leaveRoom(sessionId, roomCode);
        this.sessionRoomMap.delete(sessionId);
        this.broadcast('snake_room_list_updated');
      }
    } catch (error) {
      console.error('处理玩家断线失败:', error);
    }
  }
}
