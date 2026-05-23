<template>
  <transition name="fade">
    <div
      v-if="visibleInternal"
      class="toast"
      :class="`toast-${type}`"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </div>
  </transition>
</template>

<script setup>
  import { ref, watch, onUnmounted } from 'vue';

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    message: { type: String, default: '' },
    type: { type: String, default: 'success' },
    duration: { type: Number, default: 2000 },
  });
  const emit = defineEmits(['update:modelValue', 'close']);

  const visibleInternal = ref(props.modelValue);
  let timeoutId = null;

  const clearTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const autoHide = () => {
    clearTimer();
    timeoutId = setTimeout(() => {
      visibleInternal.value = false;
      emit('update:modelValue', false);
      emit('close');
    }, props.duration);
  };

  watch(
    () => props.modelValue,
    v => {
      visibleInternal.value = v;
      if (v) autoHide();
      else clearTimer();
    },
    { immediate: true }
  );

  watch(
    () => [props.message, props.type, props.duration],
    () => {
      if (visibleInternal.value) autoHide();
    }
  );

  watch(visibleInternal, v => {
    emit('update:modelValue', v);
  });

  onUnmounted(() => {
    clearTimer();
  });
</script>

<style scoped>
  .toast {
    position: fixed;
    right: 20px;
    top: 80px;
    padding: 10px 14px;
    border-radius: 6px;
    font-weight: 600;
    z-index: 1200;
    max-width: min(420px, calc(100vw - 32px));
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
  }
  .toast-success {
    color: #065f46;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.16);
  }

  .toast-error {
    color: #991b1b;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.18);
  }

  .toast-info {
    color: #1d4ed8;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.18);
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
