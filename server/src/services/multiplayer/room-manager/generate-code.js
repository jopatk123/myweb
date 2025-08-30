// 房间码生成逻辑
export function generateCodeFactory(Service){
  Service.prototype.generateRoomCode = function(){
    let roomCode;
    let attempts = 0;
    const maxAttempts = 10;

    // 获取父类原始实现（兼容多层继承）
    const parentProto = Object.getPrototypeOf(Service.prototype);
    const parentGenerate = parentProto && parentProto.generateRoomCode
      ? parentProto.generateRoomCode
      : () => Math.random().toString(36).substring(2, 8).toUpperCase();

    do {
      roomCode = parentGenerate.call(this);
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
  };
}
