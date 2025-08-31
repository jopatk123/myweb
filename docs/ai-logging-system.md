# AI对话日志系统（精简版）

## 功能概述

当前系统仅在服务器控制台输出 AI 请求与响应的摘要信息，不再写入 `server/logs/ai-conversations.log` 文件，也不再提供读取/清空日志的后端 API。

## 架构组件

### 服务端（现状）

- `POST /internal/logs/ai`：仍可被客户端调用，但仅做控制台输出（详见 `internal.logs.routes.js`）。
- 原文件日志写入、统计、清空等功能已移除。

### 客户端

1. **AI日志服务** (`/client/src/services/aiLogService.js`) 仍会发送数据到 `/internal/logs/ai`。
2. **日志查看器** (`/client/src/components/common/AILogsViewer.vue`) 现在显示“功能已禁用”提示，不再拉取真实数据。
### 手动查看（现状）

仅能通过服务器运行控制台输出查看（例如 docker logs 或 pm2 logs），不再提供文件及 HTTP API 检索。
   
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

## 控制台输出格式（示例）

```
================ [AI CONVERSATION] ================
{ ts: '2025-08-31T10:00:00.000Z', model: 'deepseek-chat', playerType: '2', requestChars: 1200, responseChars: 400 }
REQUEST:
...原始提示词...
RESPONSE:
...模型原始响应...
===================================================
```

## 配置选项

### 环境变量（部分仍可保留但已不再影响文件写入）

- `ENABLE_AI_LOGGING` / `VITE_ENABLE_AI_LOGGING`：仅用于前端/客户端是否发送；后端不再持久化。
- `AI_LOG_MAX_PROMPT` 等截断相关变量现已无实际作用。

### 客户端配置

在 `aiLogService.js` 中可以配置：
- 日志队列大小限制
- 重试机制参数
- 是否启用日志功能

## 注意事项

1. 不再产生持久化文件，隐私风险降低。
2. 若仍需长期审计，需重新实现持久化（见下方扩展建议）。
3. 控制台输出仍可能较长，必要时可在部署层面进行日志采集筛选。

## 故障排除

1. 控制台无输出：确认客户端仍有发送 POST /internal/logs/ai。
2. 输出太多：可在路由中自定义减少字段，或在部署层过滤。
3. 前端查看器空白：属预期（功能禁用）。

## 扩展功能

如需恢复/增强：
- 重新引入文件/数据库持久化层
- 添加 WebSocket 实时推送
- 接入 ELK / Loki / OpenSearch
- 结构化（JSON）日志方便聚合分析
