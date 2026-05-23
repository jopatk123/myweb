<template>
  <Toast
    :key="toastState.key"
    v-model:modelValue="visible"
    :message="toastState.message"
    :type="toastState.type"
    :duration="toastState.duration"
  />
</template>

<script setup>
  import { computed } from 'vue';
  import Toast from '@/components/common/Toast.vue';
  import { useGlobalToast } from '@/composables/useGlobalToast.js';

  const { toastState, hideToast } = useGlobalToast();

  const visible = computed({
    get: () => toastState.visible,
    set: value => {
      if (!value) hideToast();
    },
  });
</script>
