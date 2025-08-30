// 清理相关逻辑
export function cleanupRoomFactory(Service){
  Service.prototype.cleanupRoom = function(roomId){
    try { this.PlayerModel.deleteByRoomId(roomId); this.RoomModel.delete(roomId); this.cleanupGameResources(roomId); const broadcastEvent = `${this.getGameType()}_room_list_updated`; if (this.wsService?.broadcast) { this.wsService.broadcast(broadcastEvent); } console.log(`${this.getGameType()} 房间 ${roomId} 已删除并释放房间码`); } catch (error) { console.error('清理房间失败:', error); }
  };

  Service.prototype.cleanupEmptyRooms = function(){
    try { const rooms = this.RoomModel.getActiveRooms(); let removed = 0; rooms.forEach(room => { if (room.game_type && room.game_type !== this.getGameType()) return; const online = this.PlayerModel.getPlayerCount(room.id); if (online === 0 || online !== room.current_players) { if (online === 0) { this.cleanupRoom(room.id); removed++; } else if (online !== room.current_players) { this.RoomModel.update(room.id, { current_players: online }); } } }); if (removed > 0) { const broadcastEvent = `${this.getGameType()}_room_list_updated`; if (this.wsService?.broadcast) { this.wsService.broadcast(broadcastEvent); } console.log(`已清理 ${removed} 个空的 ${this.getGameType()} 房间`); } } catch (e) { console.error(`扫描 ${this.getGameType()} 空房间失败`, e); }
  };
}
