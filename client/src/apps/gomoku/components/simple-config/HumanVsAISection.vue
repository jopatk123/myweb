<template>
  <div class="ai-config-section">
    <h4>AI配置</h4>
    <SimpleAISettingsForm
      v-model="innerConfig"
      @preset="$emit('preset', $event)"
    />
    <div class="test-section">
      <button
        @click="$emit('test')"
        :disabled="!canTest || testing"
        class="btn btn-info btn-sm"
      >
        {{ testing ? '测试中...' : '测试连接' }}
      </button>
      <div v-if="testResult" class="test-result" :class="testResult.type">
        {{ testResult.message }}
      </div>
    </div>
  </div>
</template>
<script setup>
  import { computed } from 'vue';
  import SimpleAISettingsForm from '../common/SimpleAISettingsForm.vue';
  const props = defineProps({
    config: { type: Object, required: true },
    canTest: Boolean,
    testing: Boolean,
    testResult: Object,
  });
  const emit = defineEmits(['update:config', 'preset', 'test']);
  const innerConfig = computed({
    get: () => props.config,
    set: v => emit('update:config', v),
  });
</script>
<style scoped>
  /* 复用父级样式, 此处仅可放局部覆盖 */
</style>
