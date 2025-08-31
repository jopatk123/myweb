<template>
  <div class="player-config">
    <h4 v-if="title">{{ title }}</h4>

    <!-- 预设配置选择 -->
    <div class="preset-section" v-if="presetConfigs && presetConfigs.length">
      <label>预设配置:</label>
      <select @change="e => handlePreset(e.target.value)" :value="''" class="preset-select">
        <option value="">选择预设配置</option>
        <option v-for="preset in presetConfigs" :key="preset.id" :value="preset.id">
          {{ preset.name }}
        </option>
      </select>
    </div>

    <!-- 详细配置 -->
    <div class="config-form">
      <div class="form-group">
        <label>API URL:</label>
        <input type="text" v-model="modelValue.apiUrl" placeholder="https://api.openai.com/v1/chat/completions" />
      </div>
      <div class="form-group">
        <label>API Key:</label>
        <input type="password" v-model="modelValue.apiKey" placeholder="输入API Key" />
      </div>
      <div class="form-group">
        <label>模型名称:</label>
        <input type="text" v-model="modelValue.modelName" placeholder="deepseek-chat" />
      </div>
      <div class="form-group">
        <label>玩家名称:</label>
        <input type="text" v-model="modelValue.playerName" :placeholder="`AI玩家${playerNumber}`" />
      </div>

      <div class="form-actions">
        <button @click="emit('test', playerNumber)" :disabled="isTesting" class="btn btn-info btn-sm">
          {{ isTesting ? '测试中...' : '测试连接' }}
        </button>
        <button @click="emit('save', playerNumber)" class="btn btn-success btn-sm">保存配置</button>
      </div>

      <div v-if="testResult" class="test-result">
        <div :class="['result-message', testResult.success ? 'success' : 'error']">{{ testResult.message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  playerNumber: { type: Number, required: true },
  modelValue: { type: Object, required: true },
  presetConfigs: { type: Array, default: () => [] },
  testResult: { type: Object, default: null },
  isTesting: { type: Boolean, default: false },
  title: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'apply-preset', 'test', 'save']);

function handlePreset(presetId) {
  if (!presetId) return;
  emit('apply-preset', { playerNumber: props.playerNumber, presetId });
}
</script>

<style scoped>
.player-config { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; }
.player-config h4 { margin: 0 0 20px 0; color: #333; }
.preset-section { margin-bottom: 20px; }
.preset-section label { display: block; margin-bottom: 8px; font-weight: 500; color: #555; }
.preset-select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.config-form { display: flex; flex-direction: column; gap: 15px; }
.form-group { display: flex; flex-direction: column; }
.form-group label { margin-bottom: 5px; font-weight: 500; color: #555; }
.form-group input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.form-group input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 2px rgba(102,126,234,.2); }
.form-actions { display: flex; gap: 10px; margin-top: 10px; }
.test-result { margin-top:10px; }
.result-message { padding:8px 12px; border-radius:4px; font-size:14px; }
.result-message.success { background:#d4edda; color:#155724; border:1px solid #c3e6cb; }
.result-message.error { background:#f8d7da; color:#721c24; border:1px solid #f5c6cb; }
</style>