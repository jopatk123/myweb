# AI提示词统一管理系统使用指南

## 概述

为了简化五子棋中AI提示词的管理，我们创建了一个统一的AI提示词管理系统。现在所有的AI提示词模板都集中在一个地方管理，支持多种游戏类型，并且可以轻松自定义和扩展。

## 核心文件

### 1. AIPromptService.js
统一的AI提示词管理服务，提供以下功能：
- 提示词模板的增删改查
- 多种游戏类型的提示词支持
- AI回复解析和验证
- 提示词模板验证

### 2. useAIPrompts.js
Vue组合式函数，提供便捷的提示词管理功能：
- 提示词模板选择
- 提示词构建
- AI回复解析
- 请求载荷构建

### 3. PromptTemplateSelector.vue
提示词模板选择器组件，提供用户界面：
- 模板选择和预览
- 自定义模板添加
- 模板内容编辑

## 使用方法

### 在组件中使用提示词

```vue
<template>
  <div>
    <!-- 提示词模板选择器 -->
    <PromptTemplateSelector 
      v-model="selectedTemplate" 
      @template-change="handleTemplateChange" 
    />
    
    <!-- 游戏状态显示 -->
    <div v-if="gameData">
      <h3>当前游戏状态</h3>
      <pre>{{ gamePrompt }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAIPrompts } from '../composables/useAIPrompts.js';
import PromptTemplateSelector from './common/PromptTemplateSelector.vue';

const { 
  selectedTemplate, 
  buildGamePrompt, 
  parseAIResponse,
  buildRequestPayload 
} = useAIPrompts();

const gameData = ref({
  board: Array(15).fill().map(() => Array(15).fill(0)),
  gameHistory: [],
  playerType: 1
});

const gamePrompt = computed(() => {
  return buildGamePrompt(selectedTemplate.value, gameData.value);
});

function handleTemplateChange(templateId) {
  console.log('选择的模板:', templateId);
}
</script>
```

### 在服务中使用提示词

```javascript
import { aiPromptService } from './AIPromptService.js';

// 获取系统提示词
const systemPrompt = aiPromptService.getSystemPrompt('gomoku-system');

// 构建游戏状态提示词
const gameData = {
  board: boardArray,
  gameHistory: moveHistory,
  playerType: 2
};
const gamePrompt = aiPromptService.buildGamePrompt('gomoku-system', gameData);

// 解析AI回复
const aiResponse = '{"row": 7, "col": 8, "reasoning": "最佳位置"}';
const result = aiPromptService.parseAIResponse(aiResponse, 'gomoku');
console.log('AI决策:', result); // { row: 7, col: 8, reasoning: "最佳位置" }
```

### 添加自定义提示词模板

```javascript
import { aiPromptService } from './AIPromptService.js';

// 添加自定义模板
aiPromptService.addCustomTemplate({
  id: 'my-gomoku-template',
  name: '我的五子棋模板',
  description: '自定义的五子棋AI提示词模板',
  template: `你是一个专业的五子棋AI选手。

规则说明：
- 棋盘大小：15x15
- 目标：连成5子获胜
- 策略：优先防守，寻找机会进攻

回复格式：
{
  "row": 数字,
  "col": 数字,
  "reasoning": "详细分析"
}`
});
```

## 支持的提示词模板

### 1. 五子棋系统提示词 (gomoku-system)
- **用途**: 五子棋AI的系统角色定义
- **特点**: 包含完整的五子棋规则和策略指导
- **回复格式**: JSON格式的坐标和推理

### 2. 贪吃蛇系统提示词 (snake-system)
- **用途**: 贪吃蛇AI的系统角色定义
- **特点**: 包含移动策略和安全考虑
- **回复格式**: JSON格式的方向和推理

### 3. 通用游戏系统提示词 (general-game-system)
- **用途**: 通用游戏AI的系统角色定义
- **特点**: 适用于各种游戏类型
- **回复格式**: JSON格式的行动和推理

## 提示词模板结构

```javascript
{
  id: 'template-id',           // 唯一标识符
  name: '模板名称',            // 显示名称
  description: '模板描述',     // 详细描述
  template: '提示词内容'       // 实际的提示词模板
}
```

## 游戏数据类型

### 五子棋游戏数据
```javascript
{
  board: Array(15).fill().map(() => Array(15).fill(0)), // 棋盘状态
  gameHistory: [{ row: 7, col: 7, player: 1 }],         // 历史记录
  playerType: 1                                          // 玩家类型 (1=黑子, 2=白子)
}
```

### 贪吃蛇游戏数据
```javascript
{
  snake: [{ x: 10, y: 10 }],    // 蛇身位置
  food: { x: 5, y: 5 },         // 食物位置
  direction: 'up'               // 当前方向
}
```

## AI回复格式

### 五子棋AI回复
```json
{
  "row": 7,
  "col": 8,
  "reasoning": "此位置有助于我快速连成五子，或阻止对手获胜。"
}
```

### 贪吃蛇AI回复
```json
{
  "direction": "up",
  "reasoning": "向上移动可以吃到食物，同时避免撞墙。"
}
```

## 高级功能

### 构建完整的AI请求

```javascript
import { useAIPrompts } from '../composables/useAIPrompts.js';

const { buildRequestPayload } = useAIPrompts();

// 构建OpenAI格式的请求载荷
const payload = buildRequestPayload('gomoku-system', gameData, {
  apiUrl: 'https://api.openai.com/v1',
  modelName: 'gpt-4',
  maxTokens: 1000,
  temperature: 0.1
});

// 发送请求
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

### 自定义回复解析

```javascript
import { aiPromptService } from './AIPromptService.js';

// 添加自定义回复解析器
const customResponse = 'AI决定下在(7,8)位置，因为这里是最佳选择';
const result = aiPromptService.parseAIResponse(customResponse, 'gomoku');
```

## 迁移指南

### 从旧系统迁移

1. **替换提示词获取**：
   ```javascript
   // 旧方式
   const systemPrompt = aiModelService.getSystemPrompt();
   const gamePrompt = aiModelService.buildPrompt(board, history, playerType);
   
   // 新方式
   const systemPrompt = aiPromptService.getSystemPrompt('gomoku-system');
   const gamePrompt = aiPromptService.buildGamePrompt('gomoku-system', {
     board, gameHistory: history, playerType
   });
   ```

2. **替换回复解析**：
   ```javascript
   // 旧方式
   const result = aiModelService.parseAIResponse(response);
   
   // 新方式
   const result = aiPromptService.parseAIResponse(response, 'gomoku');
   ```

3. **使用组合式函数**：
   ```javascript
   // 旧方式
   // 直接调用服务方法
   
   // 新方式
   const { getSystemPrompt, buildGamePrompt, parseAIResponse } = useAIPrompts();
   ```

## 优势

1. **统一管理**：所有提示词模板集中在一个地方
2. **多游戏支持**：支持五子棋、贪吃蛇等多种游戏
3. **易于扩展**：可以轻松添加新的游戏类型和模板
4. **类型安全**：提供完整的验证和错误处理
5. **用户友好**：提供可视化的模板选择器
6. **向后兼容**：保持与现有代码的兼容性

## 注意事项

1. 模板ID必须唯一
2. 添加模板时必须包含必需的字段（id, name, template）
3. AI回复必须符合预定义的JSON格式
4. 自定义模板仅在当前会话中有效
5. 提示词内容会影响AI的行为，请谨慎修改

## 扩展指南

### 添加新的游戏类型

1. 在 `AIPromptService.js` 中添加新的模板
2. 实现对应的 `buildXXXPrompt` 方法
3. 添加回复验证逻辑
4. 更新 `parseAIResponse` 方法

### 添加新的提示词变量

1. 修改模板内容，使用占位符
2. 在构建方法中替换占位符
3. 更新文档和测试

这个统一的提示词管理系统为AI游戏功能提供了更灵活、更易维护的基础架构。
