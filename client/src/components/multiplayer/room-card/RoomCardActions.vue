<template>
  <div class="room-actions">
    <button
      v-if="canJoin"
      class="btn-join"
      :disabled="disabled"
      @click="$emit('join')"
    >
      🚪 {{ joinButtonText }}
    </button>
    <button
      v-else-if="canSpectate"
      class="btn-spectate"
      :disabled="disabled"
      @click="$emit('spectate')"
    >
      👁️ 观战
    </button>
    <button v-else class="btn-disabled" disabled>
      {{ disabledText }}
    </button>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    canJoin: {
      type: Boolean,
      default: false,
    },
    canSpectate: {
      type: Boolean,
      default: false,
    },
    joinButtonText: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    getDisabledText: {
      type: Function,
      required: true,
    },
  });

  defineEmits(['join', 'spectate']);

  const disabledText = computed(() => props.getDisabledText());
</script>

<style scoped>
  .room-actions {
    display: flex;
    gap: 8px;
  }

  .btn-join,
  .btn-spectate,
  .btn-disabled {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .btn-join {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  .btn-join:hover:not(:disabled) {
    background: linear-gradient(135deg, #218838, #1c9872);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  }

  .btn-spectate {
    background: linear-gradient(135deg, #17a2b8, #138496);
    color: white;
  }

  .btn-spectate:hover:not(:disabled) {
    background: linear-gradient(135deg, #138496, #0f6674);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
  }

  .btn-disabled {
    background: #e9ecef;
    color: #6c757d;
    cursor: not-allowed;
  }
</style>
