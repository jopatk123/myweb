<template>
  <div class="panel-actions">
    <button @click="$emit('start')" class="btn btn-primary btn-md start-btn">
      开始游戏
    </button>
    <button @click="$emit('reset')" class="btn btn-muted btn-md reset-btn">
      重置配置
    </button>
  </div>
</template>

<script setup></script>

<style scoped>
  .panel-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }

  @media (max-width: 768px) {
    .panel-actions {
      flex-direction: column;
    }
  }
</style>
