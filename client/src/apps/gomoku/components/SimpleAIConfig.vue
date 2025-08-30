<template>
  <div class="simple-ai-config">
    <div class="config-header">
      <h3>🤖 AI大模型配置</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </div>

    <div class="config-content">
      <GameModeSelector v-model="gameMode" />

      <!-- 拆分后的子块 -->
      <HumanVsAISection
        v-if="gameMode === 'human_vs_ai'"
        v-model:config="config"
        :can-test="canTest"
        :testing="testing"
        :test-result="testResult"
        @preset="onPreset"
        @test="testConnection"
      />

      <AIVsAISection
        v-else-if="gameMode === 'ai_vs_ai'"
        v-model:ai1-config="ai1Config"
        v-model:ai2-config="ai2Config"
        :can-test-ai1="canTestAI1"
        :can-test-ai2="canTestAI2"
        :testing-ai1="testingAI1"
        :testing-ai2="testingAI2"
        :ai1-test-result="ai1TestResult"
        :ai2-test-result="ai2TestResult"
        @preset-ai1="onPreset1"
        @preset-ai2="onPreset2"
        @test-ai1="testAI1Connection"
        @test-ai2="testAI2Connection"
      />

      <div class="config-actions">
        <button @click="saveAndStart" class="btn btn-success btn-md start-btn">开始游戏</button>
        <button @click="resetConfig" class="btn btn-muted btn-md reset-btn">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import GameModeSelector from './common/GameModeSelector.vue';
import HumanVsAISection from './simple-config/HumanVsAISection.vue';
import AIVsAISection from './simple-config/AIVsAISection.vue';

const emit = defineEmits(['close', 'start-game', 'config-saved']);

// 基础状态
const gameMode = ref('human_vs_ai');
const config = ref({ apiUrl: '', apiKey: '', modelName: 'gpt-3.5-turbo', playerName: 'AI大师' });
const ai1Config = ref({ apiUrl: '', apiKey: '', modelName: 'gpt-3.5-turbo', playerName: 'AI黑子' });
const ai2Config = ref({ apiUrl: '', apiKey: '', modelName: 'gpt-3.5-turbo', playerName: 'AI白子' });

// 测试状态
const testing = ref(false); const testResult = ref(null);
const testingAI1 = ref(false); const testingAI2 = ref(false);
const ai1TestResult = ref(null); const ai2TestResult = ref(null);

// 预设
const presets = {
  openai: { apiUrl: 'https://api.openai.com/v1/chat/completions', modelName: 'gpt-3.5-turbo', playerName: 'GPT助手' },
  claude: { apiUrl: 'https://api.anthropic.com/v1/messages', modelName: 'claude-3-sonnet-20240229', playerName: 'Claude助手' }
};

// 计算属性
const canTest = computed(() => config.value.apiUrl && config.value.apiKey);
const canTestAI1 = computed(() => ai1Config.value.apiUrl && ai1Config.value.apiKey);
const canTestAI2 = computed(() => ai2Config.value.apiUrl && ai2Config.value.apiKey);

// 预设应用
function onPreset(k){ if(presets[k]) Object.assign(config.value,{ apiUrl:presets[k].apiUrl, modelName:presets[k].modelName, playerName:presets[k].playerName }); }
function onPreset1(k){ if(presets[k]) Object.assign(ai1Config.value,{ apiUrl:presets[k].apiUrl, modelName:presets[k].modelName, playerName:presets[k].playerName+'(黑子)' }); }
function onPreset2(k){ if(presets[k]) Object.assign(ai2Config.value,{ apiUrl:presets[k].apiUrl, modelName:presets[k].modelName, playerName:presets[k].playerName+'(白子)' }); }

// 抽取的测试函数
async function genericTest(targetRef, testingRef, resultRef){
  if(!targetRef.value.apiUrl || !targetRef.value.apiKey){ return; }
  testingRef.value = true; resultRef.value = null;
  try { await new Promise(r=>setTimeout(r,1500)); if(!targetRef.value.apiUrl.startsWith('http')) throw new Error('API URL格式不正确'); resultRef.value={ type:'success', message:'连接测试成功！'}; }
  catch(e){ resultRef.value={ type:'error', message:e.message||'连接测试失败'}; }
  finally { testingRef.value=false; }
}
const testConnection = ()=>genericTest(config, testing, testResult);
const testAI1Connection = ()=>genericTest(ai1Config, testingAI1, ai1TestResult);
const testAI2Connection = ()=>genericTest(ai2Config, testingAI2, ai2TestResult);

function saveAndStart(){
  if(gameMode.value==='human_vs_ai'){
    if(!canTest.value){ testResult.value={ type:'error', message:'请填写完整的AI配置'}; return; }
    localStorage.setItem('gomoku_simple_config', JSON.stringify({ gameMode:gameMode.value, config:config.value }));
    emit('config-saved',{ mode:gameMode.value, aiConfig:config.value });
  } else if(gameMode.value==='ai_vs_ai') {
    if(!canTestAI1.value || !canTestAI2.value){
      if(!canTestAI1.value) ai1TestResult.value={ type:'error', message:'请填写完整的AI1配置'};
      if(!canTestAI2.value) ai2TestResult.value={ type:'error', message:'请填写完整的AI2配置'};
      return;
    }
    localStorage.setItem('gomoku_simple_config', JSON.stringify({ gameMode:gameMode.value, ai1Config:ai1Config.value, ai2Config:ai2Config.value }));
    emit('config-saved',{ mode:gameMode.value, ai1Config:ai1Config.value, ai2Config:ai2Config.value });
  }
  emit('start-game'); emit('close');
}

function resetConfig(){
  Object.assign(config.value,{ apiUrl:'', apiKey:'', modelName:'gpt-3.5-turbo', playerName:'AI大师' });
  Object.assign(ai1Config.value,{ apiUrl:'', apiKey:'', modelName:'gpt-3.5-turbo', playerName:'AI黑子' });
  Object.assign(ai2Config.value,{ apiUrl:'', apiKey:'', modelName:'gpt-3.5-turbo', playerName:'AI白子' });
  testResult.value=ai1TestResult.value=ai2TestResult.value=null;
}

function loadConfig(){
  try { const saved=localStorage.getItem('gomoku_simple_config'); if(saved){ const data=JSON.parse(saved); gameMode.value=data.gameMode||'human_vs_ai'; if(data.config){ Object.assign(config.value,{ ...data.config, apiKey:'' }); } }}
  catch(e){ console.error('加载配置失败:',e); }
}
onMounted(loadConfig);
</script>

<style scoped>
.simple-ai-config {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
}

.config-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.config-content {
  padding: 20px;
}

.mode-selection, .ai-config-section {
  margin-bottom: 25px;
}

.mode-selection h4, .ai-config-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.1rem;
}

.mode-options {
  display: flex;
  gap: 20px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.mode-option input[type="radio"] {
  margin: 0;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-group input, .form-group select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.test-section {
  margin-bottom: 20px;
}

/* 测试按钮使用全局 btn-info 工具类, 无需额外样式 */

.test-result {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.test-result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.test-result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

 .ai-vs-ai-config {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.ai-vs-ai-config .ai-config-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  border: 2px solid #e9ecef;
}

.ai-vs-ai-config .ai-config-section h4 {
  margin-top: 0;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 10px;
}

.test-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.config-actions { 
  display: flex; 
  gap: 15px; 
  justify-content: center; 
  padding-top: 20px; 
  border-top: 1px solid #eee; 
}

@media (max-width: 768px) {
  .simple-ai-config {
    width: 95%;
    max-height: 90vh;
  }
  
  .config-content {
    padding: 15px;
  }
  
  .ai-vs-ai-config {
    gap: 20px;
  }
  
  .ai-vs-ai-config .ai-config-section {
    padding: 15px;
  }
  
  .test-buttons {
    flex-direction: column;
    gap: 10px;
  }
  
  .config-actions {
    flex-direction: column;
  }
}
</style>