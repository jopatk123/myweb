# AGENTS.md

本仓库完全由 agent 进行开发和维护。目标不是“尽快改完”，而是保证每次变更都清晰、可验证、可长期维护。

## 工作原则

- 优先修根因，不做只为了消掉表面 warning 的绕路修改。
- 遇到明显的错误或异常，优先顺便修复，而不是绕过。
- 任何行为变更都要同步更新测试和文档，不能只改实现不改说明。
- 如果改了脚本、路由、环境变量、默认端口或契约文件，必须同时检查 README、`.env.example`、OpenAPI 和相关测试。
- 不要提交生成物、日志、临时报告或缓存文件，除非它们本身就是源代码的一部分。

## 修改节奏

- 先看最近的实现、测试和文档，再决定动哪一层。
- 先做最小可验证修改，再决定是否扩大范围。
- 如果一个任务会影响对外行为，优先补测试，再补文档，最后再考虑额外的清理。
- 如果当前 slice 不确定，先做能暴露差异的最小修改，不要一次展开很多邻近改动。

## 验证约定

- 客户端单测优先用 `npm run test:client`。
- 服务端单测优先用 `npm run test:server`。
- OpenAPI 变更优先用 `npm run contract-test`。
- 只有在确实需要时再扩大到 `npm test`、`npm run lint` 或覆盖率检查。
- 先跑最窄的验证，再根据结果决定是否继续扩展范围。
- 如果验证失败，先修当前修改点，再重跑同一个验证，而不是先扩大搜索面。

## OpenAPI 约定

- `server/openapi.yaml` 必须和 `server/src/routes/**` 保持一致。
- `server/openapi/paths/**` 负责路径级描述；`server/openapi/components/**` 放复用 schema。
- 真实的路径漂移、缺失 description、缺失 tags、错误引用，都应该直接修掉，不要靠压低规则掩盖。
- `contract-report.json` 只是生成产物，不应提交。

## 前后端约定

- 客户端默认开发端口是 5173。
- 后端默认监听 `PORT` / `BACKEND_PORT`，默认 3000。
- 客户端测试使用 Vitest 的 run 模式，避免把 `npm test` 误当成 watch。
- 服务端测试使用 Jest，并依赖 `NODE_OPTIONS=--experimental-vm-modules` 处理 ESM。
- 改认证、路由、上传、持久化或 WebSocket 行为时，必须确认相关测试仍然通过。

## 给后续 agent 的提示

- 先找最近的决定代码路径，再改最小的面。
- 如果 OpenAPI 出 warning，优先修 spec 本身，而不是调低规则。
- 如果需要扩大范围，先说明原因，再继续。
