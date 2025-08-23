<template>
  <div class="pagination-controls">
    <button class="btn" :disabled="page <= 1" @click="$emit('prev')">
      上一页
    </button>
    <span class="info">第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
    <button class="btn" :disabled="page >= totalPages" @click="$emit('next')">
      下一页
    </button>
    <select
      v-if="showLimit"
      v-model.number="localLimit"
      @change="onLimitChange"
    >
      <option :value="10">10 / 页</option>
      <option :value="20">20 / 页</option>
      <option :value="50">50 / 页</option>
    </select>
    <span v-if="showTotal">共 {{ total }} 条</span>
  </div>
</template>

<script setup>
  import { ref, watch, computed } from 'vue';
  const props = defineProps({
    page: { type: Number, required: true },
    limit: { type: Number, required: false, default: 20 },
    total: { type: Number, required: false, default: 0 },
    showLimit: { type: Boolean, default: true },
    showTotal: { type: Boolean, default: true },
  });
  const emit = defineEmits(['prev', 'next', 'limit-change']);

  const localLimit = ref(props.limit || 20);

  watch(
    () => props.limit,
    v => {
      localLimit.value = v || 20;
    }
  );

  const totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil((props.total || 0) / (props.limit || localLimit.value || 1))
    )
  );

  function onLimitChange() {
    emit('limit-change', localLimit.value);
  }
</script>

<style scoped>
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pagination-controls .info {
    min-width: 140px;
    text-align: center;
  }
</style>
