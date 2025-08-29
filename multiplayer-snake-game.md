# 多人贪吃蛇游戏功能需求与当前进度
本文档记录多人贪吃蛇（multiplayer snake）的需求、已完成改动、当前进度与下一步的明确任务清单，便于继续拆分与集成工作。

## 任务接收与计划（简短）
我要把仓库当前实现状态写回文档：先列出从代码库能确认“已完成”的工作，再列出仍需完成的具体任务与验证步骤（含可运行命令）。随后给出下一步优先级与短期计划。

下面先给出核对清单（requirements）并在文档中逐项映射状态。

## 核对清单（从原需求提取）
- 支持共享模式（多人控制一条蛇）与竞技模式（双人对战）。
- 使用 WebSocket 做实时同步，提供房间管理（创建/加入/离开/准备/开始/房间列表）。
- 自动弹窗/自动打开逻辑（受浏览器权限限制）。
- 将大型文件拆分（前端：`SnakeLobby.vue`、`SnakeMultiplayerGame.vue`、`SnakeRoom.vue`；后端：`snake-multiplayer.service.js`）。
- 抽离通用模块（房间系统、玩家列表、通用 WebSocket/房间管理逻辑、可复用 UI 组件、组合式 hooks/composables）。

## 当前可确认的已完成工作（仓库现状快照）
以下为从代码库实际检查后能确认已经存在或已创建的工作项：

- 环境与数据库
	- 开发环境可以启动（client & server）。
	- 数据库迁移已应用，存在表：`snake_rooms`, `snake_players`, `snake_game_records`。

- 后端（已存在/拆分）
	- `server/src/services/multiplayer/base-multiplayer.service.js`（通用基础服务）已存在。
	- `server/src/services/multiplayer/room-manager.service.js`（通用房间管理）已存在。
	- `server/src/services/snake-game.service.js`（贪吃蛇专属 service）已存在。
	- 备注：`server/src/services/snake-multiplayer.service.js` 仍在仓库中（兼容/历史），路由/控制器尚未全部切换到新 service。

- 前端（已创建或抽离的组件/组合）
	- 新建通用大厅组件：`client/src/components/multiplayer/lobby/GameLobby.vue`（已存在）。
	- 新建并提交以下可复用组件：
		- `client/src/components/multiplayer/RoomCard.vue`
		- `client/src/components/multiplayer/CreateRoomModal.vue`
		- `client/src/components/multiplayer/PlayerList.vue`
		- `client/src/components/multiplayer/ReadyControls.vue`
	- 新建导出点：`client/src/components/multiplayer/index.js`（已创建，注意：文件内部对 `useMultiplayerRoom` 的 import 路径需要校验/修正，见“问题/待修复”）。
	- 通用组合式函数：`client/src/composables/multiplayer/useMultiplayerRoom.js` 已存在（封装了 connect/create/join/leave/toggleReady/startGame 等）。

- 其它
	- `client/src/apps/snake/SnakeLobby.vue` 文件仍然存在并且体量很大（尚未完全替换为 `GameLobby` + 小组件适配层）。

## 已完成但需注意或小幅修复的问题
- `client/src/components/multiplayer/index.js` 中导出 `useMultiplayerRoom` 的相对路径目前写为 `../composables/multiplayer/useMultiplayerRoom.js`，从 `client/src/components/multiplayer` 相对到 `client/src/composables/...` 应该是 `../../composables/multiplayer/useMultiplayerRoom.js`，需要修正一个相对路径（属于低风险小改动）。

## 尚未完成 / 待继续实现（优先级排序）

高优先级
- (进行中) 将 `SnakeLobby.vue` 拆分：已创建 `SnakeLobbyAdapter.vue` 复用 `GameLobby`，旧大厅保留等待进一步抽离统计/排行弹窗。
- (已完成核心) 后端通过 `snake-multiplayer.adapter.js` 适配到 `SnakeGameService`，WebSocket 已切换，旧 service 暂留。
- (新增完成) 竞技模式核心循环与移动指令在 `SnakeGameService` 中实现，适配器已接通 `handleMove`。

中优先级
- (已完成) `useMultiplayerRoom` 重构使用 `useWebSocket` 的 on/offMessage，加入 `registerHandler/unregisterHandler` 扩展 API。
- (已完成) 新增通用组件：`VoteButtons.vue`、`SharedGamePanel.vue`、`CompetitiveGamePanel.vue`。`VotersDisplay.vue` / `GameCanvasWrapper.vue` 尚未实现。
- (待办) 将统计/排行榜抽离为独立可复用弹窗组件；补充 `VotersDisplay.vue` 显示实时投票详情。

低优先级
- 编写前端单元/集成测试（happy path：创建房间、加入、切换 ready、开始、结束）。
- 实现自动弹窗/通知逻辑（限于浏览器能力：可实现桌面通知或引导自动打开，但无法跨设备强制打开窗口，若需跨设备自动打开需额外方案）。
- 整理并发布 `client/src/components/multiplayer` 组件库导出点与示例 README，便于其它小游戏复用。

## 问题与风险清单（需要确认）
- 是否允许一次性删除旧的 `snake-multiplayer.service.js`，还是保留兼容层并逐步迁移？（建议逐步迁移并保留兼容层以降低回滚风险）
- 浏览器端“自动打开另一个人的游戏窗口”受限于权限/浏览器策略——只能做通知/引导，不能强制跨终端打开。

## 验证步骤（如何本地快速复现当前状态并继续开发）
1) 启动后端（示例，项目根的 server 目录）：

```bash
cd /home/ubuntu22/code/myweb/server
npm start
```

2) 启动前端开发模式（在项目根）：

```bash
cd /home/ubuntu22/code/myweb
npm run dev
```

3) 用 sqlite 检查迁移表是否存在：

```bash
cd /home/ubuntu22/code/myweb/server
sqlite3 data/myweb.db ".tables"
```

5) 快速检查已新增的前端组件文件是否存在并能被编译（在 dev 模式中观察控制台错误，特别注意 `client/src/components/multiplayer/index.js` 的导入路径错误）。

- 修复 `client/src/components/multiplayer/index.js` 的相对 import 路径（低风险）。
- 把 `SnakeLobby.vue` 逐步替换为 `GameLobby` 的适配层：先替换房间列表区的渲染为 `RoomCard`，并把创建房间弹窗替换为 `CreateRoomModal`（这会显著减少 `SnakeLobby.vue` 的体量，便于后续拆分）。
- 在完成前端替换后，执行一轮 smoke test（启动 dev，创建房间、加入房间、切换 ready、开始游戏的基本流程）。


要删除/替换原始 snake-multiplayer.service.js
自动弹窗“自动打开另一个人的贪吃蛇窗口”的行为在浏览器中有权限与 UX 限制（只能做通知或引导用户打开页面，无法跨设备强制打开窗口）——若需要跨终端自动弹出，需要额外的客户端/桌面 Agent 方案（超出当前实现，需确认需求边界）。
复用组件的 API 设计（props / events / slots 细节）以便其它小游戏能方便复用（我可以按照目前抽象做一套推荐 API，如果你同意我会直接实现）。


接下来将把 SnakeLobby.vue、SnakeRoom.vue、SnakeMultiplayerGame.vue 三个文件中已抽出的部分继续拆成上面列出的具体小组件（RoomCard.vue、PlayerCard.vue、CreateRoomModal.vue、VoteButtons.vue、SharedGamePanel.vue 等），并在 snake 中创建适配层组件将这些小组件组合回原来的功能。
同时把后端控制器路由切换到 snake-game.service.js，并在 WebSocket 处理处注入/调用新 Service。