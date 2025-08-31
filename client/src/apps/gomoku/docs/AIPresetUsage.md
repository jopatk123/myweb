# AI预设统一管理系统使用指南

## 概述

为了简化五子棋中AI预设的管理，我们创建了一个统一的AI预设管理系统。现在所有的AI预设配置都集中在一个地方管理，避免了在多个文件中重复定义的问题。

## 核心文件

### 1. AIPresetService.js
统一的AI预设管理服务，提供以下功能：
- 预设配置的增删改查
- 预设应用到配置对象
- 玩家名称生成
- 预设验证

### 2. useAIPresets.js
Vue组合式函数，提供便捷的预设管理功能：
- 预设列表获取
- 预设应用
- 状态管理

## 使用方法

### 在组件中使用预设

```vue
<template>
  <div>
    <!-- 预设选择 -->
    <select v-model="selectedPreset" @change="handlePresetChange">
      <option value="">选择预设...</option>
      <option v-for="preset in presetList" :key="preset.id" :value="preset.id">
        {{ preset.name }}
      </option>
    </select>
    
    <!-- 配置表单 -->
    <div v-if="aiConfig">
      <input v-model="aiConfig.apiUrl" placeholder="API URL" />
      <input v-model="aiConfig.apiKey" type="password" placeholder="API Key" />
      <input v-model="aiConfig.modelName" placeholder="模型名称" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAIPresets } from '../composables/useAIPresets.js';

const { selectedPreset, presetList, applyPreset } = useAIPresets();
const aiConfig = ref({});

function handlePresetChange() {
  if (selectedPreset.value) {
    const result = applyPreset(selectedPreset.value, aiConfig.value);
    if (result.success) {
      aiConfig.value = result.config;
    }
  }
}
</script>
```

### 在服务中使用预设

```javascript
import { aiPresetService } from './AIPresetService.js';

// 获取所有预设
const allPresets = aiPresetService.getAllPresets();

// 应用预设到配置
const config = aiPresetService.applyPreset('deepseek', {
  apiKey: 'your-api-key'
});

// 生成AI对战玩家名称
const playerName = aiPresetService.generatePlayerName('deepseek', 1, true); // "Deepseek AI(黑子)"
```

### 添加自定义预设

```javascript
import { aiPresetService } from './AIPresetService.js';

// 添加自定义预设
aiPresetService.addCustomPreset({
  id: 'my-custom-ai',
  name: '我的自定义AI',
  apiUrl: 'https://api.example.com/v1',
  modelName: 'my-model',
  playerName: '自定义AI',
  description: '我的自定义AI模型'
});
```

## 预设配置结构

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

## 迁移指南

### 从旧系统迁移

1. **替换导入语句**：
   ```javascript
   // 旧方式
   import { PRESET_AI_CONFIGS } from '../services/AIModelService.js';
   
   // 新方式
   import { aiPresetService, PRESET_AI_CONFIGS } from '../services/AIPresetService.js';
   ```

2. **使用组合式函数**：
   ```javascript
   // 旧方式
   const presets = { /* 硬编码的预设对象 */ };
   
   // 新方式
   const { presets, applyPreset } = useAIPresets();
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

## 优势

1. **统一管理**：所有预设配置集中在一个地方
2. **易于维护**：添加新预设只需修改一个文件
3. **类型安全**：提供预设验证功能
4. **扩展性强**：支持动态添加和移除预设
5. **向后兼容**：保持与旧代码的兼容性

## 注意事项

1. 预设ID必须唯一
2. 添加预设时必须包含必需的字段（id, name, apiUrl, modelName）
3. 预设配置会被缓存，修改后需要重新加载页面
4. 自定义预设仅在当前会话中有效，页面刷新后会丢失
