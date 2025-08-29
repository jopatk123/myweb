import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3302/ws');

ws.on('open', function open() {
  console.log('WebSocket连接已建立');
  
  // 发送创建房间消息
  ws.send(JSON.stringify({
    type: 'snake_create_room',
    data: {
      playerName: '测试玩家',
      mode: 'shared',
      gameSettings: {}
    }
  }));
});

ws.on('message', function message(data) {
  const msg = JSON.parse(data.toString());
  console.log('收到消息:', msg);
  
  if (msg.type === 'snake_room_created') {
    console.log('房间创建成功:', msg.data.room.room_code);
    ws.close();
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket错误:', err);
});

ws.on('close', function close() {
  console.log('WebSocket连接已关闭');
});