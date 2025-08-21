<template>
  <div class="calculator-header">
    <div class="header-content">
      <h2 class="title">计算器</h2>
      <div class="subtitle">科学计算器</div>
    </div>
  </div>
</template>

<script setup>
// 无需额外的逻辑
</script>

<style scoped>
.calculator-header {
  margin-bottom: 16px;
  text-align: center;
}

.header-content {
  color: white;
}

.title {
  margin: 0 0 4px 0;
  font-size: 1.8rem;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 0.9rem;
  opacity: 0.8;
  font-weight: 300;
}

@media (max-width: 768px) {
  .title {
    font-size: 1.5rem;
  }
  
  .subtitle {
    font-size: 0.8rem;
  }
}
</style>
