export function useConfirm() {
  const confirmAction = message => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
    return true;
  };

  const notify = message => {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message);
    }
  };

  return {
    confirmAction,
    notify,
  };
}
