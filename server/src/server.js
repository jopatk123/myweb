import app from './app.js';
import { createUploadDirs } from './utils/file-helper.js';

const PORT = process.env.PORT || 3002;

// 创建上传目录
await createUploadDirs();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: uploads/wallpapers/`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});