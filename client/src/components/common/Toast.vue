<template>
  <transition name="fade">
    <div v-if="visibleInternal" class="toast" :class="`toast-${type}`">
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
  }
  .toast-success {
    color: #065f46;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.16);
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
