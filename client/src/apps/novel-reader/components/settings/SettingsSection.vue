<template>
  <section class="setting-group">
    <header class="setting-title">{{ title }}</header>
    <div class="setting-body">
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
  .setting-group {
    margin-bottom: 24px;
  }

  .setting-group:last-child {
    margin-bottom: 0;
  }

  .setting-title {
    font-weight: bold;
    color: #333;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #f0f0f0;
  }

  .setting-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
