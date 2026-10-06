<template>
  <svg
    class="notebook-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    :width="size"
    :height="size"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    name: {
      type: String,
      required: true,
      validator: value =>
        [
          'check',
          'circle',
          'pencil',
          'trash',
          'plus',
          'compact',
          'detailed',
          'clearDone',
        ].includes(value),
    },
    size: {
      type: [Number, String],
      default: 16,
    },
  });

  // 统一的线性图标路径（feather 风格），currentColor 继承文字颜色
  const ICON_PATHS = {
    check: ['M20 6L9 17l-5-5'],
    circle: ['M12 3a9 9 0 100 18 9 9 0 000-18z'],
    pencil: ['M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z'],
    trash: [
      'M3 6h18',
      'M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2',
      'M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
      'M10 11v6',
      'M14 11v6',
    ],
    plus: ['M12 5v14', 'M5 12h14'],
    compact: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
    detailed: ['M4 5h16v5H4z', 'M4 14h16v5H4z'],
    clearDone: ['M2 12l4 4 8-8', 'M9 15l2 2 9-9'],
  };

  const paths = computed(() => ICON_PATHS[props.name] || []);
</script>

<style scoped>
  .notebook-icon {
    display: block;
    flex-shrink: 0;
  }
</style>
