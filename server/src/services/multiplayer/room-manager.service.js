/**
 * 通用房间管理服务
 * 提供房间的创建、加入、离开等基础功能
 */
import { BaseMultiplayerService } from './base-multiplayer.service.js';
// 拆分后的模块
import { createRoomFactory } from './room-manager/create-room.js';
import { joinLeaveRoomFactory } from './room-manager/join-leave-room.js';
import { playerStatusFactory } from './room-manager/player-status.js';
import { queryRoomFactory } from './room-manager/query-room.js';
import { cleanupRoomFactory } from './room-manager/cleanup-room.js';
import { generateCodeFactory } from './room-manager/generate-code.js';

export class RoomManagerService extends BaseMultiplayerService {
  constructor(wsService, RoomModel, PlayerModel, options = {}) {
    super(wsService, options);
    this.RoomModel = RoomModel;
    this.PlayerModel = PlayerModel;
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
}

// 注入拆分方法
createRoomFactory(RoomManagerService);
joinLeaveRoomFactory(RoomManagerService);
playerStatusFactory(RoomManagerService);
queryRoomFactory(RoomManagerService);
cleanupRoomFactory(RoomManagerService);
generateCodeFactory(RoomManagerService);
