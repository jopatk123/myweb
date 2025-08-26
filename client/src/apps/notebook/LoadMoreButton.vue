<template>
  <div v-if="show" class="load-more">
    <button class="btn btn-load-more" @click="onLoadMore">
      加载更多 ({{ remainingCount }} 条)
    </button>
  </div>
</template>

<script setup>
  defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    remainingCount: {
      type: Number,
      default: 0,
    },
    onLoadMore: {
      type: Function,
      required: true,
    },
  });
</script>

<style scoped>
  .load-more {
    display: flex;
    justify-content: center;
    padding: 16px;
    margin-top: 8px;
  }

  .btn-load-more {
    padding: 8px 20px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .btn-load-more:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }
</style>
