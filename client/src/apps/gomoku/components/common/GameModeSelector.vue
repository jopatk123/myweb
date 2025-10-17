<template>
  <div class="game-mode-selector">
    <h4>🎮 游戏模式</h4>
    <div class="mode-options">
      <div
        class="mode-option"
        :class="{ active: modelValue === 'human_vs_ai' }"
        @click="selectMode('human_vs_ai')"
      >
        <div class="mode-icon">👤🤖</div>
        <div class="mode-info">
          <h5>人机对战</h5>
          <p>挑战AI大模型</p>
        </div>
      </div>

      <div
        class="mode-option"
        :class="{ active: modelValue === 'ai_vs_ai' }"
        @click="selectMode('ai_vs_ai')"
      >
        <div class="mode-icon">🤖🤖</div>
        <div class="mode-info">
          <h5>AI对AI</h5>
          <p>观看AI智慧对决</p>
        </div>
      </div>
    </div>

    <div v-if="modelValue === 'ai_vs_ai'" class="ai-vs-ai-note">
      <div class="note-icon">💡</div>
      <p>在AI对AI模式下，你需要为两个AI玩家分别配置不同的模型参数</p>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    modelValue: {
      type: String,
      default: 'human_vs_ai',
    },
  });

  const emit = defineEmits(['update:modelValue']);

  function selectMode(mode) {
    emit('update:modelValue', mode);
  }
</script>

<style scoped>
  .game-mode-selector {
    margin-bottom: 25px;
  }

  .game-mode-selector h4 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 1.1rem;
  }

  .mode-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .mode-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #f8f9fa;
  }

  .mode-option:hover {
    border-color: #667eea;
    background: #f0f2ff;
  }

  .mode-option.active {
    border-color: #667eea;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .mode-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .mode-info h5 {
    margin: 0 0 5px 0;
    font-size: 0.95rem;
  }

  .mode-info p {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .ai-vs-ai-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 15px;
    padding: 12px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    color: #856404;
  }

  .note-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .ai-vs-ai-note p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .mode-options {
      grid-template-columns: 1fr;
    }

    .mode-option {
      flex-direction: column;
      text-align: center;
      gap: 8px;
    }
  }
</style>
