# 桌面图标框选与批量移动 需求文档

## 目标

在桌面（Home 页面）上实现类似操作系统的“矩形框选”图标功能，支持：

- 在空白区域按下并拖拽绘制选框（鼠标/触控支持）；
- 框选后高亮选中若干桌面图标（应用图标、文件图标）；
- 支持按住单个被选中图标拖动以进行批量移动；
- 批量移动释放后图标吸附网格并避免重叠；
- 选区结果在前端持久化（或在内存中保持直到刷新），并与现有的单图标位置存储兼容。

## 已实现部分

- 单图标的长按拖动、释放时吸附到网格、位置持久化（`AppIcons.vue`、`FileIcons.vue`）。
- `AppIcons.vue` 已扩展：
  - 增加了 `selectedIds` 状态支持多选；
  - 提供了批量拖动的内部实现（当按下的图标属于选中集合时，会同时移动所有选中图标）；
  - 暴露了 `setSelectedIds(ids)` 方法，供父组件设置选中集合；
  - 修复了 `defineExpose` 的重复调用问题。

## 未实现/待完成部分

- 在 `Home.vue` 添加矩形选框 UI 与逻辑（绘制、更新、隐藏）；
- 在 `Home.vue` 计算与分发被选图标 id 到 `AppIcons` 与 `FileIcons`（通过 `setSelectedIds`）；
- 在 `FileIcons.vue` 添加与 `AppIcons` 对齐的多选支持与批量拖动实现（包括 `setSelectedIds`、在按下时判断是否为多选并同步移动）；
- 处理键盘修饰（Ctrl/Shift）多选规则（可选）；
- UX 优化与边界测试（阈值、触控、性能优化、视觉反馈）。

## 关键实现细节（MVP）

1. 选框绘制：
   - 在 `Home.vue` 根容器监听 `mousedown`（仅当点击目标不是 `.icon-item` 时开始）、`mousemove`（更新矩形）和 `mouseup`（结束并计算选中）。
   - 使用 reactive 对象 `selectionRect = { x, y, w, h, visible }`，模板渲染一个固定定位的半透明 div（如 `position: fixed; z-index: 20;`）。

2. 选中判定：
   - 在 `mouseup` 时遍历 DOM：`document.querySelectorAll('.icon-item')`，使用 `getBoundingClientRect()` 判断矩形相交（rectIntersect）。
   - 收集匹配元素的 `data-id`（需要在 `AppIcons`/`FileIcons` 的根节点加上 `:data-id="id"`）。

3. 分发选中：
   - 调用 `appIconsRef.value?.setSelectedIds(ids)` 与 `fileIconsRef.value?.setSelectedIds(ids)`（`Home.vue` 已有 `ref`）。

4. 批量拖动：
   - 子组件（`AppIcons`/`FileIcons`）在 `mousedown` 时检测被按下的 id 是否在 `selectedIds` 中：是则记录所有选中图标的起始位置并在 `mousemove` 时一起移动；否则按单个图标逻辑处理。
   - 在 `mouseup` 时调用 `finalizeDrag`，支持传入数组以对每个图标进行格点吸附并避免冲突。

## 难点、风险与解决方案

- 事件冲突：图标自身的 `mousedown`/长按拖动与桌面的空白区 `mousedown` 可能冲突。  
  解决：桌面层只在 `e.target.closest('.icon-item')` 为 null 的情况下开始选框；图标的事件优先处理自身拖动。

- 性能：mousemove 时频繁触发布局/测量会造成卡顿。  
  解决：仅在 `mousemove` 中更新选框样式（不做大量 DOM 检测），真正的相交计算延迟到 `mouseup`。如需实时高亮，可做节流（throttle）并仅在必要时检测部分图标。

- 位置坐标一致性：图标可能既有持久化位置（fixed/absolute）又有网格默认布局（CSS grid）。  
  解决：以 DOM rect 为判定基础（更通用）；在 finalize 阶段把移动后的坐标转为网格位置并保存。

- 批量移动冲突：多个图标同时移动时可能重叠或与其他静态图标冲突。  
  解决：在 finalize 阶段把目标单元格视为已占用集合（occupied），顺序为每个移动图标寻找最近空位。

## 开发与验证计划（建议）

1. 实现 MVP（约 1–2 小时）：`Home.vue` 选框 + 分发选中 + `FileIcons.vue` 的 `setSelectedIds`。
2. 实现 `FileIcons.vue` 的批量拖动（约 1–2 小时）。
3. 基本手动测试：桌面框选、单选、批量拖动、自动排列、页面刷新后位置持久化。
4. UX 打磨（键盘修饰、触控支持、性能调优，2–4 小时）。

## 文档末尾：变更记录

- 初始创建：新增该文件以描述桌面框选与批量移动的需求、已实现/未实现项、方案与风险分析。
