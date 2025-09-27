import http from 'http';
import app from './app.js';
import { createUploadDirs } from './utils/file-helper.js';
import { WebSocketService } from './services/websocket.service.js';

// 端口优先级：PORT（通用） > BACKEND_PORT（专用） > 默认 3000
const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 3000);

// 创建上传目录
await createUploadDirs();

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket服务
const wsService = new WebSocketService();
wsService.init(server);

// 将WebSocket服务实例存储到app中，供控制器使用
app.set('wsServer', wsService);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/ws`);
  console.log(`📁 Upload directory: uploads/wallpapers/`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
