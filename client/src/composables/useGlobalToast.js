import { reactive, readonly } from 'vue';

const toastState = reactive({
  visible: false,
  message: '',
  type: 'info',
  duration: 2200,
  key: 0,
});

function showToast(message, type = 'info', duration = 2200) {
  if (!message) return;

  toastState.key += 1;
  toastState.message = message;
  toastState.type = type;
  toastState.duration = duration;
  toastState.visible = true;
}

function hideToast() {
  toastState.visible = false;
}

export function useGlobalToast() {
  return {
    toastState: readonly(toastState),
    showToast,
    hideToast,
    showSuccess(message, duration = 2200) {
      showToast(message, 'success', duration);
    },
    showError(message, duration = 3200) {
      showToast(message, 'error', duration);
    },
    showInfo(message, duration = 2200) {
      showToast(message, 'info', duration);
    },
  };
}
