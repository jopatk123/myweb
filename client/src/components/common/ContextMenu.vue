<template>
  <div v-if="modelValue" class="ctx-root" @contextmenu.prevent>
    <ul
      class="ctx-menu"
      :style="{ left: `${positionX}px`, top: `${positionY}px` }"
      role="menu"
    >
      <li
        v-for="item in items"
        :key="item.key"
        class="ctx-item"
        :class="{ disabled: item.disabled, danger: item.danger }"
        role="menuitem"
        @click.stop.prevent="onSelect(item)"
      >
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    items: { type: Array, default: () => [] },
  });
  const emit = defineEmits(['update:modelValue', 'select']);
  const openedAt = ref(0);
  watch(
    () => props.modelValue,
    v => {
      if (v) openedAt.value = performance.now();
    }
  );

  const positionX = computed(() => Math.max(0, props.x));
  const positionY = computed(() => Math.max(0, props.y));

  function close() {
    emit('update:modelValue', false);
  }

  function onGlobalClick(e) {
    // 点击菜单外部关闭
    // 忽略刚打开瞬间触发的点击
    if (performance.now() - openedAt.value < 50) return;
    const menu = e.target.closest('.ctx-menu');
    if (!menu) close();
  }

  function onSelect(item) {
    if (item.disabled) return;
    emit('select', item.key);
    close();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  onMounted(() => {
    window.addEventListener('click', onGlobalClick);
    window.addEventListener('keydown', onKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('click', onGlobalClick);
    window.removeEventListener('keydown', onKeydown);
  });
</script>

<style scoped>
  .ctx-root {
    position: fixed;
    inset: 0;
    z-index: 2000;
  }
  .ctx-menu {
    position: fixed;
    min-width: 160px;
    background: rgba(30, 30, 30, 0.95);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    padding: 6px 0;
    backdrop-filter: blur(8px);
  }
  .ctx-item {
    padding: 8px 14px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .ctx-item:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  .ctx-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ctx-item.danger:hover {
    background: rgba(220, 38, 38, 0.25);
    color: #fecaca;
  }
</style>
