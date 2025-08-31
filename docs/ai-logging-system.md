# AI对话日志系统使用说明

## 功能概述

AI对话日志系统能够完整记录AI的输入和输出，包括请求内容、响应内容、使用的模型、玩家类型以及时间戳信息。日志会同时输出到控制台和保存到文件中。

## 架构组件

### 服务端

1. **日志路由** (`/server/src/routes/internal.logs.routes.js`)
   - `POST /internal/logs/ai` - 接收AI对话日志
   - 将日志写入到 `server/logs/ai-conversations.log` 文件

2. **日志管理API** (`/server/src/routes/log.routes.js`)
   - `GET /api/logs/ai` - 获取AI对话日志（支持搜索和分页）
   - `GET /api/logs/ai/stats` - 获取日志统计信息
   - `DELETE /api/logs/ai` - 清空AI对话日志

3. **日志控制器** (`/server/src/controllers/log.controller.js`)
   - 处理日志的读取、解析、统计等操作

### 客户端

1. **AI日志服务** (`/client/src/services/aiLogService.js`)
   - 提供发送日志到服务器的功能
   - 支持重试机制和队列管理

2. **AI模型服务集成** (`/client/src/apps/gomoku/services/AIModelService.js`)
   - 在AI请求/响应时自动记录日志
   - 支持正常请求和重试请求的日志记录

3. **日志查看器** (`/client/src/components/common/AILogsViewer.vue`)
   - 可视化查看AI对话日志
   - 支持搜索、分页、统计显示
   - 提供清空日志功能

## 使用方式

### 自动日志记录

在五子棋游戏中，当AI进行思考和决策时，系统会自动记录：

- **请求内容**: 发送给AI的完整提示词（包括棋盘状态、游戏历史等）
- **响应内容**: AI返回的原始JSON响应
- **模型信息**: 使用的AI模型名称
- **玩家类型**: 1=黑子，2=白子
- **时间戳**: 记录时间

### 手动查看日志

1. **通过网页界面**: 访问 `http://localhost:3001/ai-logs`
   - 实时查看日志列表
   - 搜索特定内容
   - 查看统计信息
   - 清空历史日志

2. **通过API接口**:
   ```bash
   # 获取最新100条日志（JSON格式）
   curl "http://localhost:3302/api/logs/ai?format=json&lines=100"
   
   # 搜索包含特定关键词的日志
   curl "http://localhost:3302/api/logs/ai?format=json&search=五子棋"
   
   # 获取日志统计信息
   curl "http://localhost:3302/api/logs/ai/stats"
   
   # 清空所有日志
   curl -X DELETE "http://localhost:3302/api/logs/ai"
   ```

3. **直接查看日志文件**:
   ```bash
   # 查看日志文件
   tail -f server/logs/ai-conversations.log
   
   # 搜索特定内容
   grep "deepseek" server/logs/ai-conversations.log
   ```

## 日志格式

日志文件采用以下格式：

```
[2025-08-31T05:44:01.560Z] [Model: deepseek-chat] [Player: 1]
REQUEST:
你是一个五子棋AI助手...
RESPONSE:
{"row": 7, "col": 8, "reasoning": "选择这个位置可以形成威胁"}
================================================================================
```

## 配置选项

### 环境变量

- `ENABLE_AI_LOGGING=true` - 在生产环境中启用AI日志功能
- `VITE_ENABLE_AI_LOGGING=true` - 客户端启用AI日志功能

### 客户端配置

在 `aiLogService.js` 中可以配置：
- 日志队列大小限制
- 重试机制参数
- 是否启用日志功能

## 注意事项

1. **隐私保护**: 日志中可能包含敏感的API密钥信息，请妥善保管日志文件
2. **存储空间**: 长时间运行会产生大量日志，建议定期清理
3. **性能影响**: 日志记录是异步的，对性能影响极小
4. **网络要求**: 需要客户端能够访问服务器的日志API

## 故障排除

1. **日志不显示**:
   - 检查服务器是否启用了内部日志路由
   - 确认 `logs` 目录权限正确
   - 检查网络连接

2. **日志写入失败**:
   - 检查服务器 `logs` 目录是否存在且可写
   - 查看服务器控制台错误信息

3. **前端页面无法访问**:
   - 确认路由已正确配置
   - 检查API接口是否正常响应

## 扩展功能

该日志系统设计为可扩展的，可以轻松添加：
- 日志轮转功能
- 更多日志格式支持
- 实时日志推送
- 日志分析和可视化
- 导出功能
