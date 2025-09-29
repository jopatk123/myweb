/**
 * 贪吃蛇多人游戏API服务
 */
import { createAxiosClient } from './httpClient.js';

const client = createAxiosClient();

export const snakeMultiplayerApi = {
  /**
   * 获取活跃房间列表
   */
  async getActiveRooms() {
    try {
  const response = await client.get('/snake-multiplayer/rooms');
      const raw = response.data.data || [];
      // 兼容：如果服务端（或某层拦截器）把 snake_case 转成了 camelCase，则这里统一补齐 snake_case，前端其它组件仍可使用 room.room_code
      return raw.map(r => ({
        ...r,
        room_code: r.room_code || r.roomCode,
        max_players: r.max_players || r.maxPlayers,
        current_players: r.current_players || r.currentPlayers,
        created_by: r.created_by || r.createdBy,
        game_settings: r.game_settings || r.gameSettings,
      }));
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw new Error(error.response?.data?.message || '获取房间列表失败');
    }
  },

  /**
   * 获取房间详情
   */
  async getRoomDetail(roomCode) {
    try {
  const response = await client.get(`/snake-multiplayer/rooms/${roomCode.toUpperCase()}`);
      return response.data.data;
    } catch (error) {
      console.error('获取房间详情失败:', error);
      throw new Error(error.response?.data?.message || '获取房间详情失败');
    }
  },


  // Stats and leaderboard API removed

  /**
   * 清理离线玩家
   */
  async cleanupOfflinePlayers(timeoutMinutes = 10) {
    try {
      const response = await client.post('/snake-multiplayer/cleanup', null, {
        params: { timeoutMinutes }
      });
      return response.data.data;
    } catch (error) {
      console.error('清理离线玩家失败:', error);
      throw new Error(
        error.response?.data?.message || '清理离线玩家失败'
      );
    }
  }
};
