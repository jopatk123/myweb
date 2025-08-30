// 查询相关逻辑
export function queryRoomFactory(Service){
  Service.prototype.getActiveRooms = function(filters = {}){
    try { const rooms = this.RoomModel.getActiveRooms(); const gameType = this.getGameType(); return rooms.filter(room => { return !room.game_type || room.game_type === gameType; }).map(room => ({ ...room, game_type: gameType })); } catch (error) { console.error('获取房间列表失败:', error); throw error; }
  };

  Service.prototype.getRoomDetails = function(roomId){
    try { const room = this.RoomModel.findById(roomId); const players = this.PlayerModel.findByRoomId(roomId); const gameStats = this.getRoomStats(roomId); return { room: { ...room, game_type: this.getGameType() }, players, stats: gameStats }; } catch (error) { console.error('获取房间详情失败:', error); throw error; }
  };
}
