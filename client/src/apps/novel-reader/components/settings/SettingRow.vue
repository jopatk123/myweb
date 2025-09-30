<template>
  <div class="setting-item" :class="{ 'align-start': align === 'start' }">
    <label v-if="label" class="setting-label">{{ label }}</label>
    <div class="setting-control">
      <slot />
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    label: {
      type: String,
      default: '',
    },
    align: {
      type: String,
      default: 'end',
      validator: value => ['start', 'end'].includes(value),
    },
  });

  void props;
</script>

<style scoped>
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .setting-label {
    font-size: 0.9rem;
    color: #555;
    min-width: 80px;
  }

  .setting-control {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }

  .setting-item.align-start .setting-control {
    justify-content: flex-start;
  }

  @media (max-width: 768px) {
    .setting-item {
      flex-direction: column;
      align-items: flex-start;
    }

    .setting-control {
      width: 100%;
      justify-content: flex-start;
    }
  }
</style>
