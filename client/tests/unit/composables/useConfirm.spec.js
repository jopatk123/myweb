import { describe, expect, it, vi } from 'vitest';
import { useConfirm } from '@/composables/useConfirm.js';
import { useGlobalToast } from '@/composables/useGlobalToast.js';

describe('useConfirm', () => {
  it('returns confirmAction and notify functions', () => {
    const { confirmAction, notify } = useConfirm();
    expect(typeof confirmAction).toBe('function');
    expect(typeof notify).toBe('function');
  });

  describe('confirmAction', () => {
    it('calls window.confirm with the message', () => {
      const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { confirmAction } = useConfirm();

      const result = confirmAction('确定要删除吗？');

      expect(spy).toHaveBeenCalledWith('确定要删除吗？');
      expect(result).toBe(true);
    });

    it('returns false when user cancels', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { confirmAction } = useConfirm();

      expect(confirmAction('确定？')).toBe(false);
    });

    it('returns true when window is undefined', () => {
      // Simulate no window.confirm
      const saved = window.confirm;
      delete window.confirm;

      const { confirmAction } = useConfirm();
      const result = confirmAction('test');

      window.confirm = saved;
      expect(result).toBe(true);
    });
  });

  describe('notify', () => {
    it('writes the message into the global toast state', () => {
      const { notify } = useConfirm();
      const { toastState, hideToast } = useGlobalToast();

      hideToast();

      notify('操作成功');

      expect(toastState.visible).toBe(true);
      expect(toastState.message).toBe('操作成功');
      expect(toastState.type).toBe('info');
    });
  });
});
