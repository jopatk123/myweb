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
  }

  /**
   * 创建房间的通用逻辑
   */
  async createRoom(sessionId, playerName, roomData, gameConfig = {}) {
    try {
      const roomCode = await this.RoomModel.generateRoomCode();
      
      // 创建房间
      const room = await this.RoomModel.create({
        room_code: roomCode,
        created_by: sessionId,
        game_settings: gameConfig,
        ...roomData
      });

      // 创建房主玩家
      const playerColor = this.getNextPlayerColor(room.id, 0);
      const player = await this.PlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false
      });

      // 更新房间玩家数量
      await this.RoomModel.update(room.id, { current_players: 1 });

      // 初始化游戏状态
      this.initGameState(room.id, roomData.mode);

      return { room, player };
    } catch (error) {
      console.error('创建房间失败:', error);
      throw new Error('创建房间失败');
    }
  }

  /**
   * 加入房间的通用逻辑
   */
  async joinRoom(sessionId, playerName, roomCode) {
    try {
      const room = await this.RoomModel.findByRoomCode(roomCode);
      if (!room) {
        throw new Error('房间不存在');
      }

      if (room.status === 'finished') {
        throw new Error('游戏已结束');
      }

      // 检查是否已经在房间中
      const existingPlayer = await this.PlayerModel.findByRoomAndSession(room.id, sessionId);
      if (existingPlayer) {
        // 更新在线状态
        await this.PlayerModel.update(existingPlayer.id, { is_online: true });
        return { room, player: existingPlayer };
      }

      // 检查房间是否已满
      const currentPlayers = await this.PlayerModel.getPlayerCount(room.id);
      if (currentPlayers >= room.max_players) {
        throw new Error('房间已满');
      }

      // 创建玩家
      const playerColor = this.getNextPlayerColor(room.id, currentPlayers);
      const player = await this.PlayerModel.create({
        room_id: room.id,
        session_id: sessionId,
        player_name: playerName,
        player_color: playerColor,
        is_ready: false
      });

      // 更新房间玩家数量
      await this.RoomModel.update(room.id, { current_players: currentPlayers + 1 });

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
  async leaveRoom(sessionId, roomId) {
    try {
      const player = await this.PlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) {
        throw new Error('玩家不在房间中');
      }

      const room = await this.RoomModel.findById(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      // 删除玩家
      await this.PlayerModel.deleteBySession(sessionId);

      // 更新房间玩家数量
      const remainingPlayers = await this.PlayerModel.getPlayerCount(roomId);
      await this.RoomModel.update(roomId, { current_players: remainingPlayers });

      // 广播玩家离开消息
      this.broadcastToRoom(roomId, 'player_left', {
        session_id: sessionId,
        player_name: player.player_name,
        room_id: roomId
      });

      // 如果房间为空或房主离开，清理房间
      if (remainingPlayers === 0 || room.created_by === sessionId) {
        await this.cleanupRoom(roomId);
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
  async togglePlayerReady(sessionId, roomId) {
    try {
      const player = await this.PlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) {
        throw new Error('玩家不在房间中');
      }

      const newReadyStatus = !player.is_ready;
      await this.PlayerModel.update(player.id, { is_ready: newReadyStatus });

      // 获取更新后的玩家信息
      const updatedPlayer = await this.PlayerModel.findByRoomAndSession(roomId, sessionId);

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
  async getActiveRooms() {
    try {
      return await this.RoomModel.getActiveRooms();
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取房间详情
   */
  async getRoomDetails(roomId) {
    try {
      const room = await this.RoomModel.findById(roomId);
      const players = await this.PlayerModel.findByRoomId(roomId);
      return { room, players };
    } catch (error) {
      console.error('获取房间详情失败:', error);
      throw error;
    }
  }

  /**
   * 清理房间资源
   */
  async cleanupRoom(roomId) {
    try {
      // 删除所有玩家
      await this.PlayerModel.deleteByRoomId(roomId);
      
      // 标记房间为已完成
      await this.RoomModel.update(roomId, { 
        status: 'finished',
        ended_at: new Date()
      });

      // 清理游戏资源
      this.cleanupGameResources(roomId);

      console.log(`房间 ${roomId} 已清理`);
    } catch (error) {
      console.error('清理房间失败:', error);
    }
  }

  /**
   * 检查所有玩家是否准备就绪
   */
  async checkAllPlayersReady(roomId) {
    try {
      const players = await this.PlayerModel.findOnlineByRoomId(roomId);
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
}
