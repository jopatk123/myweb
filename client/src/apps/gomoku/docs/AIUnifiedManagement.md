# AI统一管理系统总结

## 概述

为了解决五子棋中AI预设和提示词配置分散、维护困难的问题，我们创建了一个完整的AI统一管理系统。该系统将AI预设配置和提示词模板集中管理，提供了统一的API接口和用户界面。

## 系统架构

### 核心服务

1. **AIPresetService.js** - AI预设管理服务
   - 统一管理所有AI预设配置
   - 支持多种AI模型（Moonshot、Deepseek、OpenAI、Claude等）
   - 提供预设的增删改查功能
   - 自动生成AI对战玩家名称

2. **AIPromptService.js** - AI提示词管理服务
   - 统一管理所有AI提示词模板
   - 支持多种游戏类型（五子棋、贪吃蛇等）
   - 提供提示词构建和AI回复解析
   - 支持自定义提示词模板

### 组合式函数

1. **useAIPresets.js** - AI预设管理组合式函数
   - 提供Vue组件中使用的预设管理功能
   - 状态管理和响应式数据
   - 简化预设应用流程

2. **useAIPrompts.js** - AI提示词管理组合式函数
   - 提供Vue组件中使用的提示词管理功能
   - 提示词模板选择和构建
   - AI请求载荷构建

### 用户界面组件

1. **SimpleAISettingsForm.vue** - AI设置表单
   - 预设选择和配置
   - API参数设置
   - 连接测试功能

2. **PromptTemplateSelector.vue** - 提示词模板选择器
   - 模板选择和预览
   - 自定义模板添加
   - 模板内容编辑

## 功能特性

### AI预设管理

#### 支持的AI模型
- **Moonshot系列**: moonshot-8k, kimi
- **Deepseek系列**: deepseek
- **OpenAI系列**: openai, gpt-5-mini
- **Claude系列**: claude

#### 预设配置结构
```javascript
{
  id: 'preset-id',           // 唯一标识符
  name: '预设名称',          // 显示名称
  apiUrl: 'https://...',     // API地址
  modelName: 'model-name',   // 模型名称
  playerName: 'AI玩家',      // 默认玩家名称
  maxTokens: 1000,           // 最大Token数
  temperature: 0.1,          // 温度参数
  description: '描述信息'    // 预设描述
}
```

#### 核心功能
- 预设列表获取和选择
- 预设应用到配置对象
- 动态添加和移除预设
- 预设验证和错误处理
- AI对战玩家名称生成

### AI提示词管理

#### 支持的提示词模板
- **五子棋系统提示词** (gomoku-system)
- **贪吃蛇系统提示词** (snake-system)
- **通用游戏系统提示词** (general-game-system)

#### 提示词模板结构
```javascript
{
  id: 'template-id',           // 唯一标识符
  name: '模板名称',            // 显示名称
  description: '模板描述',     // 详细描述
  template: '提示词内容'       // 实际的提示词模板
}
```

#### 核心功能
- 提示词模板获取和选择
- 游戏状态提示词构建
- AI回复解析和验证
- 自定义模板添加
- 多游戏类型支持

## 使用示例

### 在组件中使用

```vue
<template>
  <div>
    <!-- AI预设配置 -->
    <SimpleAISettingsForm 
      v-model="aiConfig" 
      @preset="handlePreset" 
    />
    
    <!-- 提示词模板选择 -->
    <PromptTemplateSelector 
      v-model="selectedTemplate" 
      @template-change="handleTemplateChange" 
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAIPresets } from '../composables/useAIPresets.js';
import { useAIPrompts } from '../composables/useAIPrompts.js';
import SimpleAISettingsForm from './common/SimpleAISettingsForm.vue';
import PromptTemplateSelector from './common/PromptTemplateSelector.vue';

const { applyPreset } = useAIPresets();
const { buildGamePrompt, parseAIResponse } = useAIPrompts();

const aiConfig = ref({});
const selectedTemplate = ref('gomoku-system');

function handlePreset(presetId) {
  const result = applyPreset(presetId, aiConfig.value);
  if (result.success) {
    aiConfig.value = result.config;
  }
}

function handleTemplateChange(templateId) {
  console.log('选择的提示词模板:', templateId);
}
</script>
```

### 在服务中使用

```javascript
import { aiPresetService } from './AIPresetService.js';
import { aiPromptService } from './AIPromptService.js';

// 应用AI预设
const config = aiPresetService.applyPreset('deepseek', {
  apiKey: 'your-api-key'
});

// 构建游戏提示词
const gameData = {
  board: boardArray,
  gameHistory: moveHistory,
  playerType: 2
};
const prompt = aiPromptService.buildGamePrompt('gomoku-system', gameData);

// 解析AI回复
const aiResponse = '{"row": 7, "col": 8, "reasoning": "最佳位置"}';
const result = aiPromptService.parseAIResponse(aiResponse, 'gomoku');
```

## 迁移指南

### 从旧系统迁移

1. **替换导入语句**：
   ```javascript
   // 旧方式
   import { PRESET_AI_CONFIGS } from '../services/AIModelService.js';
   
   // 新方式
   import { aiPresetService, PRESET_AI_CONFIGS } from '../services/AIPresetService.js';
   import { aiPromptService } from '../services/AIPromptService.js';
   ```

2. **使用组合式函数**：
   ```javascript
   // 旧方式
   const presets = { /* 硬编码的预设对象 */ };
   
   // 新方式
   const { presets, applyPreset } = useAIPresets();
   const { buildGamePrompt, parseAIResponse } = useAIPrompts();
   ```

3. **应用预设**：
   ```javascript
   // 旧方式
   if (presets[presetId]) {
     Object.assign(config, presets[presetId]);
   }
   
   // 新方式
   const result = applyPreset(presetId, config);
   if (result.success) {
     config = result.config;
   }
   ```

4. **构建提示词**：
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

## 系统优势

### 1. 统一管理
- 所有AI预设配置集中在一个地方
- 所有提示词模板集中在一个地方
- 单一数据源，避免同步问题

### 2. 易于维护
- 添加新预设只需修改 `AIPresetService.js`
- 添加新提示词模板只需修改 `AIPromptService.js`
- 清晰的API接口，便于扩展

### 3. 功能增强
- 支持动态添加和移除预设/模板
- 提供完整的验证和错误处理
- 自动生成AI对战玩家名称
- 支持多种游戏类型

### 4. 用户友好
- 提供可视化的配置界面
- 支持预设和模板的实时预览
- 简化的操作流程

### 5. 向后兼容
- 保持与现有代码的兼容性
- 导出相同的接口名称
- 渐进式迁移，不影响现有功能

### 6. 类型安全
- 提供预设和模板验证功能
- 完整的错误处理和提示
- 支持自定义扩展

## 测试覆盖

### 预设服务测试
- 预设初始化和获取
- 预设应用和验证
- 自定义预设管理
- 玩家名称生成

### 提示词服务测试
- 提示词模板管理
- 游戏状态提示词构建
- AI回复解析和验证
- 多游戏类型支持

## 文档

提供了完整的使用文档：
- `AIPresetUsage.md` - AI预设使用指南
- `AIPromptUsage.md` - AI提示词使用指南
- `AIPresetRefactor.md` - AI预设重构总结
- `AIUnifiedManagement.md` - AI统一管理总结

## 总结

通过这次重构，我们成功解决了AI预设和提示词配置分散的问题，实现了：

1. **统一管理** - 所有AI配置集中管理
2. **易于维护** - 单一数据源，清晰API
3. **功能增强** - 更多实用功能
4. **用户友好** - 可视化配置界面
5. **向后兼容** - 不影响现有代码
6. **完整测试** - 确保功能正确性
7. **详细文档** - 便于后续维护

这个统一的AI管理系统为五子棋应用提供了更稳定、更易维护、更易扩展的基础架构，同时也为其他AI游戏功能的开发提供了可复用的框架。
