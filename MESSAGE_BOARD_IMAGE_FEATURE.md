# 留言板图片功能

## 功能概述

为留言板添加了图片支持功能，用户可以通过以下方式添加图片：

1. **Ctrl+V 粘贴截图**：直接从剪贴板粘贴图片
2. **点击添加图片按钮**：选择本地图片文件

## 功能特性

### 图片上传
- 支持多种图片格式（JPG、PNG、GIF、SVG等）
- 单次最多上传5张图片
- 单张图片大小限制5MB
- 图片自动压缩和优化
- **支持单独发送图片（无需文字内容）**
- **智能图片压缩：超过5MB的图片自动压缩**

### 图片显示
- 缩略图网格布局显示
- 单张图片时显示较大尺寸
- 多张图片时自动排列
- 响应式设计，适配不同屏幕

### 图片查看
- 双击图片打开全屏查看器
- 支持键盘导航（左右箭头切换图片）
- 支持ESC键关闭查看器
- 多图片时显示导航指示器
- **支持保存图片到本地**
- **右键菜单快速操作**

## 技术实现

### 后端
- 数据库迁移：为messages表添加images和image_type字段
- 图片上传API：`POST /api/messages/upload-image`
- 文件存储：`uploads/message-images/`目录
- 文件命名：UUID + 原文件扩展名

### 前端
- 图片预览组件：`ImagePreview.vue`
- 剪贴板监听：监听paste事件
- 文件选择：支持多文件选择
- 图片上传：FormData上传到后端
- 图片压缩工具：`imageCompressor.js`
- 智能压缩：自动压缩超过5MB的图片
- 图片保存功能：支持多种方式保存图片到本地
- 右键菜单：提供快速操作选项

## 使用方法

### 粘贴图片
1. 复制图片到剪贴板（截图、复制图片等）
2. 在留言板输入框中按 `Ctrl+V`
3. 图片会自动添加到待发送列表

### 选择图片文件
1. 点击输入框下方的 📷 按钮
2. 选择本地图片文件（可多选）
3. 图片会显示在预览区域

### 发送带图片的留言
1. 输入文字内容（可选）
2. 添加图片（可选）
3. 点击发送按钮
4. 图片会以缩略图形式显示在留言中

### 查看图片
1. 点击留言中的图片缩略图
2. 图片会在全屏查看器中打开
3. 使用左右箭头或点击指示器切换图片
4. 按ESC键或点击关闭按钮退出

### 保存图片
1. **全屏查看器保存**：点击图片右上角的 💾 按钮
2. **右键菜单保存**：右键点击缩略图，选择"保存图片"
3. **键盘快捷键**：在全屏查看器中按 `S` 键保存当前图片
4. 图片会自动下载到本地，文件名格式：`message-image-时间戳.扩展名`

## 数据库结构

```sql
-- messages表新增字段
ALTER TABLE messages ADD COLUMN images TEXT; -- JSON格式存储图片信息
ALTER TABLE messages ADD COLUMN image_type VARCHAR(20); -- 图片类型：paste, upload
```

## API接口

### 上传图片
```
POST /api/messages/upload-image
Content-Type: multipart/form-data

参数：
- images: 图片文件数组（最多5个）

返回：
{
  "code": 200,
  "message": "图片上传成功",
  "data": [
    {
      "filename": "uuid.svg",
      "originalName": "test.svg",
      "mimeType": "image/svg+xml",
      "size": 190,
      "path": "uploads/message-images/uuid.svg"
    }
  ]
}
```

### 发送带图片的留言
```
POST /api/messages
Content-Type: application/json

参数：
{
  "content": "留言内容",
  "images": [图片信息数组],
  "imageType": "upload"
}
```

## 文件结构

```
client/src/components/message-board/
├── MessageBoard.vue          # 主留言板组件
└── ImagePreview.vue          # 图片预览组件

server/src/
├── controllers/message.controller.js    # 消息控制器（新增图片上传）
├── models/message.model.js              # 消息模型（支持图片字段）
├── services/message.service.js          # 消息服务（图片验证）
├── routes/messages.routes.js            # 消息路由（新增上传路由）
└── migrations/005_add_message_images.js # 数据库迁移
```

## 注意事项

1. 图片文件存储在服务器本地，生产环境建议使用CDN
2. 定期清理未使用的图片文件
3. 考虑添加图片压缩功能以节省存储空间
4. 可以添加图片水印或版权保护功能
5. 建议添加图片格式验证和病毒扫描
