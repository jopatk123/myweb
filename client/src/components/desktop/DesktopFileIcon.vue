<template>
  <div class="icon-item" @dblclick="onDblClick">
    <img :src="iconSrc" class="icon" />
    <div class="label">{{ label }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  file: { type: Object, required: true },
  icons: { type: Object, default: () => ({}) },
  onOpen: { type: Function, default: null }
});

const label = computed(() => props.file?.original_name || '文件');
const iconSrc = computed(() => {
  const map = props.icons || {};
  const t = props.file?.type_category || 'other';
  return map[t] || map.other || '/apps/icons/file-128.svg';
});

function onDblClick() {
  if (typeof props.onOpen === 'function') props.onOpen(props.file);
}
</script>

<style scoped>
.icon-item { width: 72px; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: default; user-select: none; }
.icon { width: 48px; height: 48px; object-fit: contain; }
.label { color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.6); font-size: 12px; text-align: center; }
</style>


