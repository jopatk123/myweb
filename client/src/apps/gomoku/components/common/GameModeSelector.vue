<template>
  <div class="mode-section">
    <h4><slot name="title">游戏模式</slot></h4>
    <div class="mode-options">
      <label class="mode-option" v-for="opt in options" :key="opt.value">
        <input
          type="radio"
          :value="opt.value"
          :name="name"
          :checked="modelValue === opt.value"
          @change="onChange(opt.value)"
        />
        <span>{{ opt.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { GAME_MODES } from '../../services/GameModeService.js';

const props = defineProps({
  modelValue: { type: String, required: true },
  name: { type: String, default: 'game-mode' },
  options: {
    type: Array,
    default: () => ([
      { value: GAME_MODES.HUMAN_VS_AI, label: '人机对战' },
      { value: GAME_MODES.AI_VS_AI, label: 'AI对AI' }
    ])
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

function onChange(val) {
  emit('update:modelValue', val);
  emit('change', val);
}
</script>

<style scoped>
.mode-section { margin-bottom: 30px; }
.mode-options { display: flex; gap: 20px; flex-wrap: wrap; }
.mode-option { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.mode-option input { margin: 0; }
</style>