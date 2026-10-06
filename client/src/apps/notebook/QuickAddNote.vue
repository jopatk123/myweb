<template>
  <div class="quick-add">
    <input
      v-model="quickAddText"
      type="text"
      placeholder="快速添加：输入 ! 设为高优先级，// 后写描述"
      title="语法：! 前缀设为高优先级；标题后输入 // 描述内容"
      class="quick-add-input"
      @keyup.enter="handleQuickAdd"
      @focus="quickAddFocused = true"
      @blur="quickAddFocused = false"
    />
    <button
      v-if="quickAddText.trim() || quickAddFocused"
      class="quick-add-btn"
      aria-label="添加"
      :disabled="!quickAddText.trim() || submitting"
      @click="handleQuickAdd"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </div>
</template>

<script setup>
  import { ref } from 'vue';

  const props = defineProps({
    onQuickAdd: {
      type: Function,
      required: true,
    },
  });

  const quickAddText = ref('');
  const quickAddFocused = ref(false);
  const submitting = ref(false);

  async function handleQuickAdd() {
    const text = quickAddText.value.trim();
    if (!text || submitting.value) {
      return;
    }

    try {
      submitting.value = true;
      const saved = await props.onQuickAdd(text);
      if (saved !== false) {
        quickAddText.value = '';
      }
    } finally {
      submitting.value = false;
    }
  }
</script>

<style scoped>
  .quick-add {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .quick-add-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .quick-add-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .quick-add-input::placeholder {
    color: #999;
  }

  .quick-add-btn {
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    background: linear-gradient(45deg, #4ade80, #22c55e);
    color: white;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 40px;
  }

  .quick-add-btn:hover:not(:disabled) {
    background: linear-gradient(45deg, #22c55e, #16a34a);
    transform: translateY(-1px);
  }

  .quick-add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    .quick-add {
      padding: 6px;
    }

    .quick-add-input {
      padding: 6px 10px;
      font-size: 16px;
    }

    .quick-add-btn {
      padding: 6px 10px;
      min-width: 36px;
    }
  }
</style>
