<template>
  <div class="modal-backdrop" v-if="modelValue">
    <div class="modal" ref="modalRef" :style="modalStyle">
      <div class="modal-header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <div class="title">{{ title }}</div>
        <button class="close" @click="$emit('update:modelValue', false)">
          ✖
        </button>
      </div>
      <div class="modal-body">
        <component :is="component" v-if="component" />
        <div v-else class="empty">未找到应用组件</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, nextTick, watch } from 'vue';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '应用窗口' },
    component: { type: Object, default: null },
    storageKey: { type: String, default: '' },
  });

  const emit = defineEmits(['update:modelValue']);

  const finalStorageKey = computed(() =>
    props.storageKey ? `launcherPos:${props.storageKey}` : 'launcherPos:default'
  );

  // This component has a dynamic key, so we can't pass a static string.
  // A simple implementation is to re-create the composable when the key changes,
  // but for now we will just use the initial key.
  const { modalRef, modalStyle, onHeaderPointerDown } = useDraggableModal(
    finalStorageKey.value
  );

  watch(
    () => props.modelValue,
    val => {
      if (val) {
        // Re-center logic might be needed here if the modal's content changes size
      }
    }
  );
</script>

<style scoped>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  .modal {
    background: #fff;
    width: 520px;
    max-width: 95vw;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
  }
  .title {
    font-weight: 600;
  }
  .close {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 16px;
  }
  .modal-body {
    padding: 12px;
  }
  .empty {
    color: #888;
    text-align: center;
    padding: 40px 0;
  }
</style>
