# 应用图标准备说明

命名建议：
- 使用应用 slug 作为文件名，例如 `{slug}.svg` 或 `{slug}-128.png`
- 示例：`snake.svg` 或 `snake-128.png`

尺寸建议：
- 首选 SVG（可缩放）
- 如用 PNG，建议 128x128（可选 256x256）

背景：
- 建议透明背景

放置位置：
- 将图标放入此目录（client/public/apps/icons/）
- 运行时后端托管目录为 `/uploads/apps/icons/`，`icon_filename` 建议与文件同名

命名约束：
- 仅小写字母、数字与中划线（与 slug 保持一致），正则：`^[a-z0-9-]+$`

示例：
- 贪吃蛇：`snake.svg` 或 `snake-128.png`
