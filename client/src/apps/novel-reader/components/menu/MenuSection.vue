<template>
  <section class="menu-section">
    <header class="section-header">
      <span class="section-title">{{ title }}</span>
      <slot name="action" />
    </header>
    <div class="section-body">
      <slot />
    </div>
  </section>
</template>

<script setup>
  const props = defineProps({
    title: {
      type: String,
      required: true,
    },
  });

  void props;
</script>

<style scoped>
  .menu-section {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
  }

  .section-title {
    font-weight: bold;
    color: #333;
    font-size: 0.9rem;
  }

  .section-body {
    flex: 1;
    overflow-y: auto;
  }
</style>
