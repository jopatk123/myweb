import { useGlobalToast } from '@/composables/useGlobalToast.js';

export function useConfirm() {
  const { showInfo } = useGlobalToast();

  const confirmAction = message => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
    return true;
  };

  const notify = message => {
    showInfo(message);
  };

  return {
    confirmAction,
    notify,
  };
}
