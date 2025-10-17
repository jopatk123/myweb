/**
 * 贪吃蛇多人游戏控制器
 */
import { SnakeRoomModel } from '../models/snake-room.model.js';
import { SnakePlayerModel } from '../models/snake-player.model.js';
import { SnakeGameRecordModel } from '../models/snake-game-record.model.js';

export const SnakeMultiplayerController = {
  /**
   * 获取活跃房间列表
   */
  async getActiveRooms(req, res) {
    try {
      const rooms = await SnakeRoomModel.getActiveRooms();

      // 为每个房间获取玩家信息
      const roomsWithPlayers = await Promise.all(
        rooms.map(async room => {
          const players = await SnakePlayerModel.findOnlineByRoomId(room.id);
          return {
            ...room,
            players: players.map(player => ({
              id: player.id,
              player_name: player.player_name,
              player_color: player.player_color,
              is_ready: player.is_ready,
              joined_at: player.joined_at,
            })),
          };
        })
      );

      res.json({
        success: true,
        data: roomsWithPlayers,
      });
    } catch (error) {
      console.error('获取活跃房间失败:', error);
      res.status(500).json({
        success: false,
        message: '获取房间列表失败',
      });
    }
  },

  /**
   * 获取房间详情
   */
  async getRoomDetail(req, res) {
    try {
      const { roomCode } = req.params;

      const room = await SnakeRoomModel.findByRoomCode(roomCode);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: '房间不存在',
        });
      }

      const players = await SnakePlayerModel.findOnlineByRoomId(room.id);
      const gameRecords = await SnakeGameRecordModel.findByRoomId(room.id);

      res.json({
        success: true,
        data: {
          room,
          players: players.map(player => ({
            id: player.id,
            player_name: player.player_name,
            player_color: player.player_color,
            is_ready: player.is_ready,
            score: player.score,
            snake_length: player.snake_length,
            joined_at: player.joined_at,
          })),
          game_records: gameRecords.slice(0, 10), // 只返回最近10条记录
        },
      });
    } catch (error) {
      console.error('获取房间详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取房间详情失败',
      });
    }
  },

  /**
   * 获取玩家统计信息
   */

  /**
   * 清理离线玩家
   */
  async cleanupOfflinePlayers(req, res) {
    try {
      const { timeoutMinutes = 10 } = req.query;

      const cleanedCount = await SnakePlayerModel.cleanupOfflinePlayers(
        parseInt(timeoutMinutes)
      );

      res.json({
        success: true,
        data: {
          cleaned_players: cleanedCount,
          timeout_minutes: parseInt(timeoutMinutes),
        },
      });
    } catch (error) {
      console.error('清理离线玩家失败:', error);
      res.status(500).json({
        success: false,
        message: '清理离线玩家失败',
      });
    }
  },
};
