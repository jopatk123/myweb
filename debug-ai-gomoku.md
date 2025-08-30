# AI五子棋系统调试指南

## 问题诊断

### 1. AI不下棋的问题

**可能原因：**
- AI配置不正确或缺失
- API密钥无效或过期
- 网络连接问题
- AI服务初始化失败

**调试步骤：**

1. **检查AI配置**
   ```javascript
   // 在浏览器控制台检查
   console.log('AI配置:', aiConfig.value);
   console.log('游戏模式:', gameMode.value);
   ```

2. **验证AI服务初始化**
   ```javascript
   // 检查GameModeService状态
   console.log('AI服务:', gameModeService.getAIService(2));
   console.log('玩家配置:', gameModeService.getPlayer(2));
   ```

3. **测试API连接**
   - 使用配置面板的"测试连接"功能
   - 检查网络请求是否成功
   - 验证API响应格式

### 2. AI思考过程不显示

**检查要点：**
- `currentThinking` 状态是否正确更新
- `onThinkingUpdate` 回调是否被调用
- AIThinkingPanel组件是否正确渲染

**调试代码：**
```javascript
// 在handleAITurn函数中添加日志
const aiResult = await gameModeService.getAIMove(
  currentPlayer.value,
  board.value,
  [],
  (thinkingUpdate) => {
    console.log('思考更新:', thinkingUpdate);
    currentThinking.value = thinkingUpdate;
  }
);
```

### 3. AI对AI模式问题

**常见问题：**
- 只有一个AI配置生效
- AI轮流下棋逻辑错误
- 游戏卡在某个AI回合

**解决方案：**
1. 确保两个AI都正确配置
2. 检查`handleAITurn`递归调用逻辑
3. 验证`currentPlayer`状态切换

## 测试流程

### 1. 基础功能测试

1. **启动应用**
   ```bash
   cd client
   npm run dev
   ```

2. **访问五子棋页面**
   - 打开 http://localhost:3000
   - 点击五子棋应用图标

3. **配置AI**
   - 点击"AI配置"按钮
   - 选择游戏模式（人机对战/AI对AI）
   - 填写API配置信息
   - 测试连接

4. **开始游戏**
   - 点击"开始游戏"
   - 观察AI思考过程
   - 验证AI是否正确下棋

### 2. AI对AI模式测试

1. **配置两个AI**
   - 选择"AI对AI"模式
   - 分别配置AI1和AI2
   - 可以使用相同或不同的模型

2. **观察对战**
   - 启动游戏后AI应自动开始对战
   - 左侧面板显示当前思考的AI
   - 右侧面板显示双方状态

3. **验证功能**
   - 思考过程是否正确显示
   - AI是否轮流下棋
   - 游戏结束逻辑是否正确

### 3. 错误处理测试

1. **无效API配置**
   - 使用错误的API地址
   - 使用无效的API密钥
   - 验证错误提示是否正确

2. **网络异常**
   - 断开网络连接
   - 模拟API超时
   - 检查降级逻辑是否生效

## 性能优化建议

### 1. AI响应时间优化

```javascript
// 在AIModelService中添加超时控制
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const response = await fetch(this.apiUrl, {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({ /* ... */ }),
  signal: controller.signal
});

clearTimeout(timeoutId);
```

### 2. 思考过程优化

```javascript
// 减少不必要的状态更新
const throttledUpdate = throttle((update) => {
  if (onThinkingUpdate) {
    onThinkingUpdate(update);
  }
}, 200);
```

### 3. 内存管理

```javascript
// 限制思考历史记录数量
if (thinkingHistory.value.length > 50) {
  thinkingHistory.value = thinkingHistory.value.slice(-30);
}
```

## 常见问题解决

### Q1: AI配置保存后刷新页面丢失
**A:** 检查localStorage存储逻辑，确保API密钥安全处理

### Q2: AI思考时间过长
**A:** 调整AI模型参数，减少max_tokens或增加temperature

### Q3: AI回复格式解析失败
**A:** 增强parseAIResponse函数的容错性，添加多种解析策略

### Q4: 移动端显示问题
**A:** 检查响应式CSS，确保三栏布局在小屏幕上正确折叠

## 开发工具

### 1. 浏览器调试
```javascript
// 在控制台中访问Vue组件实例
const app = document.querySelector('#app').__vueParentComponent;
console.log('游戏状态:', app.setupState);
```

### 2. 网络请求监控
- 使用浏览器开发者工具的Network标签
- 监控AI API请求和响应
- 检查请求头和响应格式

### 3. 性能分析
- 使用Vue DevTools扩展
- 监控组件渲染性能
- 分析状态更新频率

## 部署注意事项

1. **API密钥安全**
   - 不要在客户端硬编码API密钥
   - 考虑使用代理服务器

2. **CORS配置**
   - 确保AI API服务支持跨域请求
   - 配置正确的CORS头

3. **错误监控**
   - 添加错误上报机制
   - 监控AI API调用成功率

4. **缓存策略**
   - 合理缓存AI配置
   - 避免重复的API调用