<template>
  <div class="ai-vs-ai-config">
    <div class="ai-config-section">
      <h4>⚫ AI玩家1 (黑子)</h4>
      <SimpleAISettingsForm
        v-model="innerAI1"
        @preset="$emit('preset-ai1', $event)"
      />
    </div>
    <div class="ai-config-section">
      <h4>⚪ AI玩家2 (白子)</h4>
      <SimpleAISettingsForm
        v-model="innerAI2"
        @preset="$emit('preset-ai2', $event)"
      />
    </div>
    <div class="test-section">
      <div class="test-buttons">
        <button
          @click="$emit('test-ai1')"
          :disabled="!canTestAi1 || testingAi1"
          class="btn btn-info btn-sm"
        >
          {{ testingAi1 ? '测试中...' : '测试AI1' }}
        </button>
        <button
          @click="$emit('test-ai2')"
          :disabled="!canTestAi2 || testingAi2"
          class="btn btn-info btn-sm"
        >
          {{ testingAi2 ? '测试中...' : '测试AI2' }}
        </button>
      </div>
      <div v-if="ai1TestResult" class="test-result" :class="ai1TestResult.type">
        AI1: {{ ai1TestResult.message }}
      </div>
      <div v-if="ai2TestResult" class="test-result" :class="ai2TestResult.type">
        AI2: {{ ai2TestResult.message }}
      </div>
    </div>
  </div>
</template>
<script setup>
  import { computed } from 'vue';
  import SimpleAISettingsForm from '../common/SimpleAISettingsForm.vue';
  const props = defineProps({
    ai1Config: { type: Object, required: true },
    ai2Config: { type: Object, required: true },
    canTestAi1: Boolean,
    canTestAi2: Boolean,
    testingAi1: Boolean,
    testingAi2: Boolean,
    ai1TestResult: Object,
    ai2TestResult: Object,
  });
  const emit = defineEmits([
    'update:ai1Config',
    'update:ai2Config',
    'preset-ai1',
    'preset-ai2',
    'test-ai1',
    'test-ai2',
  ]);

  const innerAI1 = computed({
    get: () => props.ai1Config,
    set: v => emit('update:ai1Config', v),
  });
  const innerAI2 = computed({
    get: () => props.ai2Config,
    set: v => emit('update:ai2Config', v),
  });
</script>
<style scoped>
  /* 覆盖或新增局部样式 */
</style>
