/**
 * 通用房间管理服务
 * 提供房间的创建、加入、离开等基础功能
 */
import { BaseMultiplayerService } from './base-multiplayer.service.js';

export class RoomManagerService extends BaseMultiplayerService {
  constructor(wsService, RoomModel, PlayerModel) {
    super(wsService);
    this.RoomModel = RoomModel;
    this.PlayerModel = PlayerModel;
    // 定时清理（每5分钟一次）
    if (!RoomManagerService._cleanupStarted) {
      RoomManagerService._cleanupStarted = true;
      setInterval(() => {
        try {
          this.cleanupEmptyRooms();
        } catch (e) {
          console.error('定时清理房间失败', e);
        }
      }, 5 * 60 * 1000);
    }
  }

  /**
   * 创建房间的通用逻辑
   */
  createRoom(sessionId, playerName, roomData, gameConfig = {}) {
    try {
      const roomCode = this.RoomModel.generateRoomCode();
      
      // 创建房间，设置初始玩家数量为1
      const room = this.RoomModel.create({
        room_code: roomCode,
        created_by: sessionId,
        game_settings: gameConfig,
        current_players: 1, // 明确设置初始玩家数量
        ...roomData
      });

      // 创建房主玩家
      const playerColor = this.getNextPlayerColor(room.id, 0);
      const player = this.PlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false
      });

      // 初始化游戏状态
      this.initGameState(room.id, roomData.mode);

      // 获取最新的房间信息（包含更新后的数据）
      const updatedRoom = this.RoomModel.findById(room.id);

      return { room: updatedRoom, player };
    } catch (error) {
      console.error('创建房间失败:', error);
      throw new Error('创建房间失败');
    }
  }

  /**
   * 加入房间的通用逻辑
   */
  joinRoom(sessionId, playerName, roomCode) {
    try {
      const room = this.RoomModel.findByRoomCode(roomCode);
      if (!room) {
        throw new Error('房间不存在');
      }

      if (room.status === 'finished') {
        throw new Error('游戏已结束');
      }

      // 检查是否已经在房间中
      const existingPlayer = this.PlayerModel.findByRoomAndSession(room.id, sessionId);
      if (existingPlayer) {
        // 更新在线状态
        this.PlayerModel.update(existingPlayer.id, { is_online: true });
        return { room, player: existingPlayer };
      }

      // 检查房间是否已满
      const currentPlayers = this.PlayerModel.getPlayerCount(room.id);
      if (currentPlayers >= room.max_players) {
        throw new Error('房间已满');
      }

      // 创建玩家
      const playerColor = this.getNextPlayerColor(room.id, currentPlayers);
      const player = this.PlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false
      });

      // 更新房间玩家数量
      this.RoomModel.update(room.id, { current_players: currentPlayers + 1 });

      // 广播玩家加入消息
      this.broadcastToRoom(room.id, 'player_joined', {
        player,
        room_id: room.id
      });

      return { room, player };
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  }

  /**
   * 离开房间的通用逻辑
   */
  leaveRoom(sessionId, roomId) {
    try {
      const player = this.PlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) {
        throw new Error('玩家不在房间中');
      }

      const room = this.RoomModel.findById(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      // 删除玩家
      this.PlayerModel.deleteBySession(sessionId);

      // 更新房间玩家数量
      const remainingPlayers = this.PlayerModel.getPlayerCount(roomId);
      this.RoomModel.update(roomId, { current_players: remainingPlayers });

      // 广播玩家离开消息
      this.broadcastToRoom(roomId, 'player_left', {
        session_id: sessionId,
        player_name: player.player_name,
        room_id: roomId
      });

      // 如果房间为空或房主离开，清理房间
      if (remainingPlayers === 0 || room.created_by === sessionId) {
        this.cleanupRoom(roomId);
      }

      return { success: true };
    } catch (error) {
      console.error('离开房间失败:', error);
      throw error;
    }
  }

  /**
   * 切换玩家准备状态
   */
  togglePlayerReady(sessionId, roomId) {
    try {
      const player = this.PlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) {
        throw new Error('玩家不在房间中');
      }

      const newReadyStatus = !player.is_ready;
      this.PlayerModel.update(player.id, { is_ready: newReadyStatus });

      // 获取更新后的玩家信息
      const updatedPlayer = this.PlayerModel.findByRoomAndSession(roomId, sessionId);

      // 广播玩家状态变化
      this.broadcastToRoom(roomId, 'player_ready_changed', {
        session_id: sessionId,
        is_ready: newReadyStatus,
        player: updatedPlayer
      });

      return updatedPlayer;
    } catch (error) {
      console.error('切换准备状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取房间列表
   */
  getActiveRooms() {
    try {
      return this.RoomModel.getActiveRooms();
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取房间详情
   */
  getRoomDetails(roomId) {
    try {
      const room = this.RoomModel.findById(roomId);
      const players = this.PlayerModel.findByRoomId(roomId);
      return { room, players };
    } catch (error) {
      console.error('获取房间详情失败:', error);
      throw error;
    }
  }

  /**
   * 清理房间资源
   */
  cleanupRoom(roomId) {
    try {
      // 1. 删除玩家记录（或标记离线）
      this.PlayerModel.deleteByRoomId(roomId);

      // 2. 直接删除房间，释放房间码（满足需求：房间结束/无人后可再次使用房间号）
      this.RoomModel.delete(roomId);

      // 3. 清理游戏状态/定时器
      this.cleanupGameResources(roomId);

      // 4. 广播房间列表更新，通知前端刷新
      if (this.wsService?.broadcast) {
        this.wsService.broadcast('snake_room_list_updated');
      }

      console.log(`房间 ${roomId} 已删除并释放房间码`);
    } catch (error) {
      console.error('清理房间失败:', error);
    }
  }

  /**
   * 检查所有玩家是否准备就绪
   */
  checkAllPlayersReady(roomId) {
    try {
      const players = this.PlayerModel.findOnlineByRoomId(roomId);
      const readyCount = players.filter(p => p.is_ready).length;
      const totalPlayers = players.length;
      
      return {
        allReady: readyCount > 0 && readyCount === totalPlayers,
        readyCount,
        totalPlayers,
        players
      };
    } catch (error) {
      console.error('检查玩家准备状态失败:', error);
      return { allReady: false, readyCount: 0, totalPlayers: 0, players: [] };
    }
  }

  /**
   * 扫描并删除空房间（无在线玩家但状态仍在 waiting/playing 或计数不一致）
   */
  cleanupEmptyRooms() {
    try {
      const rooms = this.RoomModel.getActiveRooms();
      let removed = 0;
      rooms.forEach(r => {
        const online = this.PlayerModel.getPlayerCount(r.id);
        if (online === 0 || online !== r.current_players) {
          // 强制更新 current_players 以避免前端显示 1
          if (online === 0) {
            this.cleanupRoom(r.id);
            removed++;
          } else if (online !== r.current_players) {
            this.RoomModel.update(r.id, { current_players: online });
          }
        }
      });
      if (removed > 0 && this.wsService?.broadcast) {
        this.wsService.broadcast('snake_room_list_updated');
      }
    } catch (e) {
      console.error('扫描空房间失败', e);
    }
  }
}
