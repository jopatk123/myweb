/**
 * WebSocket服务
 */
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
// 迁移到新抽象：使用适配器包装新的 SnakeGameService
import { SnakeMultiplayerAdapter } from './snake-multiplayer.adapter.js';

export class WebSocketService {
  constructor() {
    this.clients = new Map();
    this.wss = null;
  this.snakeMultiplayer = new SnakeMultiplayerAdapter(this);
  }

  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws, req) => {
      const sessionId = req.headers['x-session-id'] || uuidv4();

      this.clients.set(sessionId, ws);
      console.log(`WebSocket client connected: ${sessionId}`);

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

  handleMessage(sessionId, message) {
    switch (message.type) {
      case 'ping':
        this.sendToClient(sessionId, { type: 'pong' });
        break;
      case 'join':
        console.log(`Client ${sessionId} joined message board`);
        break;
      
      // 贪吃蛇多人游戏消息
      case 'snake_create_room':
        this.handleSnakeCreateRoom(sessionId, message.data);
        break;
      case 'snake_join_room':
        this.handleSnakeJoinRoom(sessionId, message.data);
        break;
      case 'snake_toggle_ready':
        this.handleSnakeToggleReady(sessionId, message.data);
        break;
      case 'snake_vote':
        this.handleSnakeVote(sessionId, message.data);
        break;
      case 'snake_move':
        this.handleSnakeMove(sessionId, message.data);
        break;
      case 'snake_leave_room':
        this.handleSnakeLeaveRoom(sessionId, message.data);
        break;
      case 'snake_get_room_info':
        this.handleSnakeGetRoomInfo(sessionId, message.data);
        break;
    }
  }

  sendToClient(sessionId, data) {
    const client = this.clients.get(sessionId);
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
      // 这里需要从数据库获取房间内的玩家
      // 暂时使用简单的实现
      this.clients.forEach((client, sessionId) => {
        if (client.readyState === client.OPEN) {
          this.sendToClient(sessionId, {
            type: `snake_${eventType}`,
            data: {
              room_id: roomId,
              ...data
            }
          });
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
      
      this.sendToClient(sessionId, {
        type: 'snake_room_left',
        data: { success: true }
      });
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
      // 这里可能需要查询玩家当前所在的房间，暂时留空
      // 在实际实现中，应该维护一个 sessionId -> roomCode 的映射
    } catch (error) {
      console.error('处理玩家断线失败:', error);
    }
  }
}
