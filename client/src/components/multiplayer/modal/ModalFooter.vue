<template>
  <div class="modal-footer">
    <button class="btn-secondary" @click="$emit('cancel')">取消</button>
    <button
      class="btn-primary"
      :disabled="loading || !canCreate"
      @click="$emit('create')"
    >
      {{ loading ? '创建中...' : '创建房间' }}
    </button>
  </div>
</template>

<script setup>
  defineProps({
    loading: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: true },
  });

  defineEmits(['cancel', 'create']);
</script>

<style scoped>
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 25px;
    border-top: 1px solid #e1e8ed;
    background: #f8f9fa;
  }

  .btn-secondary,
  .btn-primary {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
  }

  .btn-secondary {
    background: #e1e8ed;
    color: #2c3e50;
  }

  .btn-secondary:hover {
    background: #d1d9e0;
  }

  .btn-primary {
    background: #667eea;
    color: white;
    min-width: 100px;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5a6fd8;
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    .modal-footer {
      padding: 16px 20px;
    }

    .btn-secondary,
    .btn-primary {
      flex: 1;
    }
  }
</style>
