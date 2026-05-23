<template>
  <div
    v-if="modelValue"
    class="ctx-root"
    @contextmenu.prevent
    @mousedown.stop
    @mouseup.stop
  >
    <ul
      ref="menuRef"
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
  import {
    onMounted,
    onBeforeUnmount,
    computed,
    nextTick,
    ref,
    watch,
  } from 'vue';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    items: { type: Array, default: () => [] },
  });
  const emit = defineEmits(['update:modelValue', 'select']);
  const openedAt = ref(0);
  const menuRef = ref(null);
  const menuWidth = ref(160);
  const menuHeight = ref(0);
  const viewportWidth = ref(0);
  const viewportHeight = ref(0);
  const EDGE_PADDING = 8;

  function updateViewport() {
    if (typeof window === 'undefined') return;
    viewportWidth.value = window.innerWidth;
    viewportHeight.value = window.innerHeight;
  }

  async function updateMenuMetrics() {
    await nextTick();
    updateViewport();
    const menu = menuRef.value;
    if (!menu) return;
    menuWidth.value = menu.offsetWidth || 160;
    menuHeight.value = menu.offsetHeight || 0;
  }

  watch(
    () => props.modelValue,
    v => {
      if (v) openedAt.value = performance.now();
    }
  );

  watch(
    () => [props.modelValue, props.x, props.y, props.items.length],
    async ([visible]) => {
      if (!visible) return;
      await updateMenuMetrics();
    },
    { flush: 'post' }
  );

  const positionX = computed(() => {
    const maxX = Math.max(
      EDGE_PADDING,
      viewportWidth.value - menuWidth.value - EDGE_PADDING
    );
    return Math.min(Math.max(EDGE_PADDING, props.x), maxX);
  });

  const positionY = computed(() => {
    const maxY = Math.max(
      EDGE_PADDING,
      viewportHeight.value - menuHeight.value - EDGE_PADDING
    );
    return Math.min(Math.max(EDGE_PADDING, props.y), maxY);
  });

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

  function onResize() {
    if (!props.modelValue) {
      updateViewport();
      return;
    }
    void updateMenuMetrics();
  }

  onMounted(() => {
    updateViewport();
    window.addEventListener('click', onGlobalClick);
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('click', onGlobalClick);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
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
