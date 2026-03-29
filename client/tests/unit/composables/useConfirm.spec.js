import { describe, expect, it, vi } from 'vitest';
import { useConfirm } from '@/composables/useConfirm.js';

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
      const originalWindow = globalThis.window;
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
    it('calls window.alert with the message', () => {
      const spy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { notify } = useConfirm();

      notify('操作成功');

      expect(spy).toHaveBeenCalledWith('操作成功');
    });
  });
});
