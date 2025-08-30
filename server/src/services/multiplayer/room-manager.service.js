/**
 * 通用房间管理服务
 * 提供房间的创建、加入、离开等基础功能
 */
import { BaseMultiplayerService } from './base-multiplayer.service.js';

export class RoomManagerService extends BaseMultiplayerService {
  constructor(wsService, RoomModel, PlayerModel, options = {}) {
    super(wsService, options);
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
      }, this.options.cleanupInterval);
    }
  }

  /**
   * 创建房间的通用逻辑
   * @param {string} sessionId - 会话ID
   * @param {string} playerName - 玩家名称
   * @param {object} roomData - 房间数据
   * @param {object} gameConfig - 游戏配置
   * @returns {object} 创建结果 {room, player}
   */
  createRoom(sessionId, playerName, roomData, gameConfig = {}) {
    try {
      // 验证游戏配置
      const validation = this.validateGameConfig(gameConfig);
      if (!validation.isValid) {
        throw new Error(`游戏配置无效: ${validation.errors.join(', ')}`);
      }

      const roomCode = this.generateRoomCode();
      
      // 创建房间，设置初始玩家数量为1
      const room = this.RoomModel.create({
        room_code: roomCode,
        created_by: sessionId,
        game_settings: validation.validatedConfig,
        current_players: 1,
        game_type: this.getGameType(),
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
      this.initGameState(room.id, roomData.mode, validation.validatedConfig);

      // 获取最新的房间信息（包含更新后的数据）
      const updatedRoom = this.RoomModel.findById(room.id);

      console.log(`${this.getGameType()} 房间已创建: ${roomCode} (ID: ${room.id})`);
      return { room: updatedRoom, player };
    } catch (error) {
      console.error('创建房间失败:', error);
      throw new Error(`创建房间失败: ${error.message}`);
    }
  }

  /**
   * 加入房间的通用逻辑
   * @param {string} sessionId - 会话ID
   * @param {string} playerName - 玩家名称
   * @param {string} roomCode - 房间码
   * @returns {object} 加入结果 {room, player}
   */
  joinRoom(sessionId, playerName, roomCode) {
    try {
      const room = this.RoomModel.findByRoomCode(roomCode);
      if (!room) {
        throw new Error('房间不存在');
      }

      // 检查游戏类型匹配
      if (room.game_type && room.game_type !== this.getGameType()) {
        throw new Error(`房间类型不匹配: 期望 ${this.getGameType()}, 实际 ${room.game_type}`);
      }

      if (room.status === 'finished') {
        throw new Error('游戏已结束');
      }

      // 对于贪吃蛇共享模式，允许在游戏进行中加入
      const isSnakeSharedMode = this.getGameType() === 'snake' && room.mode === 'shared';
      if (room.status === 'playing' && !isSnakeSharedMode) {
        throw new Error('游戏正在进行中，无法加入');
      }

      // 检查是否已经在房间中
      const existingPlayer = this.PlayerModel.findByRoomAndSession(room.id, sessionId);
      if (existingPlayer) {
        // 更新在线状态
        this.PlayerModel.update(existingPlayer.id, { 
          is_online: true,
          last_active: new Date().toISOString()
        });
        
        // 获取房间内所有玩家
        const players = this.PlayerModel.findOnlineByRoomId(room.id);
        
        // 广播玩家重新上线
        this.broadcastToRoom(room.id, 'player_reconnected', {
          player: existingPlayer,
          room_id: room.id
        });
        
        return { room, player: existingPlayer, players };
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

      // 获取房间内所有玩家
      const players = this.PlayerModel.findOnlineByRoomId(room.id);

      // 广播玩家加入消息
      this.broadcastToRoom(room.id, 'player_joined', {
        player,
        room_id: room.id,
        players,
        room
      });

      console.log(`玩家 ${playerName} 加入 ${this.getGameType()} 房间: ${roomCode} (状态: ${room.status})`);
      return { room, player, players };
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  }

  /**
   * 离开房间的通用逻辑
   * @param {string} sessionId - 会话ID
   * @param {number} roomId - 房间ID
   * @returns {object} 离开结果
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
        room_id: roomId,
        remaining_count: remainingPlayers
      });

      // 如果房间为空或房主离开，清理房间
      if (remainingPlayers === 0 || room.created_by === sessionId) {
        this.cleanupRoom(roomId);
      } else if (room.created_by === sessionId) {
        // 转移房主权限给下一个玩家
        this.transferHostRole(roomId);
      }

      console.log(`玩家 ${player.player_name} 离开 ${this.getGameType()} 房间`);
      return { success: true };
    } catch (error) {
      console.error('离开房间失败:', error);
      throw error;
    }
  }

  /**
   * 转移房主权限
   * @param {number} roomId - 房间ID
   */
  transferHostRole(roomId) {
    try {
      const players = this.PlayerModel.findOnlineByRoomId(roomId);
      if (players.length > 0) {
        const newHost = players[0];
        this.RoomModel.update(roomId, { created_by: newHost.session_id });
        
        this.broadcastToRoom(roomId, 'host_changed', {
          new_host: newHost.session_id,
          room_id: roomId
        });
        
        console.log(`房间 ${roomId} 房主已转移给 ${newHost.player_name}`);
      }
    } catch (error) {
      console.error('转移房主权限失败:', error);
    }
  }

  /**
   * 切换玩家准备状态
   * @param {string} sessionId - 会话ID
   * @param {number} roomId - 房间ID
   * @returns {object} 更新后的玩家信息
   */
  togglePlayerReady(sessionId, roomId) {
    try {
      const player = this.PlayerModel.findByRoomAndSession(roomId, sessionId);
      if (!player) {
        throw new Error('玩家不在房间中');
      }

      const newReadyStatus = !player.is_ready;
      this.PlayerModel.update(player.id, { 
        is_ready: newReadyStatus,
        last_active: new Date().toISOString()
      });

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
   * @param {object} filters - 过滤条件
   * @returns {Array} 房间列表
   */
  getActiveRooms(filters = {}) {
    try {
      const rooms = this.RoomModel.getActiveRooms();
      
      // 按游戏类型过滤
      const gameType = this.getGameType();
      return rooms.filter(room => {
        // 如果房间没有 game_type 字段，为了兼容性暂时允许
        return !room.game_type || room.game_type === gameType;
      }).map(room => ({
        ...room,
        game_type: gameType // 确保返回的房间包含游戏类型
      }));
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取房间详情
   * @param {number} roomId - 房间ID
   * @returns {object} 房间详情 {room, players}
   */
  getRoomDetails(roomId) {
    try {
      const room = this.RoomModel.findById(roomId);
      const players = this.PlayerModel.findByRoomId(roomId);
      const gameStats = this.getRoomStats(roomId);
      
      return { 
        room: {
          ...room,
          game_type: this.getGameType()
        }, 
        players,
        stats: gameStats
      };
    } catch (error) {
      console.error('获取房间详情失败:', error);
      throw error;
    }
  }

  /**
   * 清理房间资源
   * @param {number} roomId - 房间ID
   */
  cleanupRoom(roomId) {
    try {
      // 1. 删除玩家记录
      this.PlayerModel.deleteByRoomId(roomId);

      // 2. 删除房间，释放房间码
      this.RoomModel.delete(roomId);

      // 3. 清理游戏状态/定时器
      this.cleanupGameResources(roomId);

      // 4. 广播房间列表更新
      const broadcastEvent = `${this.getGameType()}_room_list_updated`;
      if (this.wsService?.broadcast) {
        this.wsService.broadcast(broadcastEvent);
      }

      console.log(`${this.getGameType()} 房间 ${roomId} 已删除并释放房间码`);
    } catch (error) {
      console.error('清理房间失败:', error);
    }
  }

  /**
   * 检查所有玩家是否准备就绪
   * @param {number} roomId - 房间ID
   * @returns {object} 准备状态信息
   */
  checkAllPlayersReady(roomId) {
    try {
      const players = this.PlayerModel.findOnlineByRoomId(roomId);
      const readyCount = players.filter(p => p.is_ready).length;
      const totalPlayers = players.length;
      const minPlayers = this.options.defaultGameConfig.minPlayers;
      
      return {
        allReady: readyCount > 0 && readyCount === totalPlayers && totalPlayers >= minPlayers,
        readyCount,
        totalPlayers,
        minPlayers,
        players
      };
    } catch (error) {
      console.error('检查玩家准备状态失败:', error);
      return { 
        allReady: false, 
        readyCount: 0, 
        totalPlayers: 0, 
        minPlayers: 1,
        players: [] 
      };
    }
  }

  /**
   * 扫描并删除空房间
   */
  cleanupEmptyRooms() {
    try {
      const rooms = this.RoomModel.getActiveRooms();
      let removed = 0;
      
      rooms.forEach(room => {
        // 只清理本游戏类型的房间
        if (room.game_type && room.game_type !== this.getGameType()) {
          return;
        }
        
        const online = this.PlayerModel.getPlayerCount(room.id);
        if (online === 0 || online !== room.current_players) {
          if (online === 0) {
            this.cleanupRoom(room.id);
            removed++;
          } else if (online !== room.current_players) {
            this.RoomModel.update(room.id, { current_players: online });
          }
        }
      });
      
      if (removed > 0) {
        const broadcastEvent = `${this.getGameType()}_room_list_updated`;
        if (this.wsService?.broadcast) {
          this.wsService.broadcast(broadcastEvent);
        }
        console.log(`已清理 ${removed} 个空的 ${this.getGameType()} 房间`);
      }
    } catch (e) {
      console.error(`扫描 ${this.getGameType()} 空房间失败`, e);
    }
  }

  /**
   * 开始游戏（子类可重写）
   * @param {number} roomId - 房间ID
   * @param {string} hostSessionId - 房主会话ID
   * @returns {object} 开始结果
   */
  startGame(roomId, hostSessionId) {
    try {
      const room = this.RoomModel.findById(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      if (room.created_by !== hostSessionId) {
        throw new Error('只有房主可以开始游戏');
      }

      const players = this.PlayerModel.findOnlineByRoomId(roomId);
      
      // 对于贪吃蛇共享模式，允许房主随时开始游戏，不需要其他人准备
      const isSnakeSharedMode = this.getGameType() === 'snake' && room.mode === 'shared';
      
      if (isSnakeSharedMode) {
        // 共享模式只需要至少1名玩家，不要求准备状态
        if (players.length < 1) {
          throw new Error('至少需要1名玩家才能开始游戏');
        }
        console.log(`贪吃蛇共享模式开始: 房间 ${roomId}, 玩家数: ${players.length}, 无需等待准备`);
      } else {
        // 其他模式需要检查准备状态
        const readyCheck = this.checkAllPlayersReady(roomId);
        if (!readyCheck.allReady) {
          throw new Error(`还有玩家未准备就绪 (${readyCheck.readyCount}/${readyCheck.totalPlayers})`);
        }
      }

      // 更新房间状态
      this.RoomModel.update(roomId, { status: 'playing' });
      
      // 更新游戏状态
      this.updateGameState(roomId, { 
        status: 'playing',
        startTime: Date.now()
      });

      // 广播游戏开始
      this.broadcastToRoom(roomId, 'game_started', {
        room_id: roomId,
        players: players,
        start_time: Date.now()
      });

      console.log(`${this.getGameType()} 游戏开始: 房间 ${roomId}`);
      return { success: true, players: players };
    } catch (error) {
      console.error('开始游戏失败:', error);
      throw error;
    }
  }

  /**
   * 结束游戏（子类可重写）
   * @param {number} roomId - 房间ID
   * @param {object} gameResult - 游戏结果
   */
  endGame(roomId, gameResult = {}) {
    try {
      // 更新房间状态
      this.RoomModel.update(roomId, { 
        status: 'finished',
        ended_at: new Date().toISOString()
      });
      
      // 更新游戏状态
      this.updateGameState(roomId, { 
        status: 'finished',
        endTime: Date.now(),
        result: gameResult
      });

      // 广播游戏结束
      this.broadcastToRoom(roomId, 'game_ended', {
        room_id: roomId,
        result: gameResult,
        end_time: Date.now()
      });

      console.log(`${this.getGameType()} 游戏结束: 房间 ${roomId}`, gameResult);
      
      // 延迟清理房间（给玩家一些时间查看结果）
      setTimeout(() => {
        this.cleanupRoom(roomId);
      }, 10000); // 10秒后清理
      
    } catch (error) {
      console.error('结束游戏失败:', error);
    }
  }

  /**
   * 生成房间码（重写父类方法以支持数据库检查）
   * @returns {string} 唯一房间码
   */
  generateRoomCode() {
    let roomCode;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      roomCode = super.generateRoomCode();
      attempts++;
    } while (
      attempts < maxAttempts && 
      this.RoomModel.findByRoomCode && 
      this.RoomModel.findByRoomCode(roomCode)
    );

    if (attempts >= maxAttempts) {
      throw new Error('无法生成唯一房间码');
    }

    return roomCode;
  }
}