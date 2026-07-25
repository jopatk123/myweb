import { describe, expect, it, beforeEach } from 'vitest';
import { useGlobalToast } from '@/composables/useGlobalToast.js';

describe('useGlobalToast', () => {
  let toast;

  beforeEach(() => {
    toast = useGlobalToast();
    toast.hideToast();
  });

  it('exposes toastState, showToast and hideToast', () => {
    expect(toast.toastState).toBeDefined();
    expect(typeof toast.showToast).toBe('function');
    expect(typeof toast.hideToast).toBe('function');
    expect(typeof toast.showSuccess).toBe('function');
    expect(typeof toast.showError).toBe('function');
    expect(typeof toast.showInfo).toBe('function');
  });

  it('initial state is hidden with empty message', () => {
    expect(toast.toastState.visible).toBe(false);
    expect(toast.toastState.message).toBe('');
    expect(toast.toastState.type).toBe('info');
  });

  describe('showToast', () => {
    it('sets visible=true and stores message/type/duration', () => {
      toast.showToast('hello', 'success', 5000);

      expect(toast.toastState.visible).toBe(true);
      expect(toast.toastState.message).toBe('hello');
      expect(toast.toastState.type).toBe('success');
      expect(toast.toastState.duration).toBe(5000);
    });

    it('increments key on each call to trigger reactivity', () => {
      const initialKey = toast.toastState.key;

      toast.showToast('first');
      const afterFirst = toast.toastState.key;
      expect(afterFirst).toBe(initialKey + 1);

      toast.showToast('second');
      expect(toast.toastState.key).toBe(afterFirst + 1);
    });

    it('defaults type to info and duration to 2200', () => {
      toast.showToast('default');
      expect(toast.toastState.type).toBe('info');
      expect(toast.toastState.duration).toBe(2200);
    });

    it('does nothing when message is empty', () => {
      const before = toast.toastState.key;
      toast.showToast('');
      expect(toast.toastState.key).toBe(before);
      expect(toast.toastState.visible).toBe(false);
    });

    it('does nothing when message is null/undefined', () => {
      const before = toast.toastState.key;
      toast.showToast(null);
      toast.showToast(undefined);
      expect(toast.toastState.key).toBe(before);
    });
  });

  describe('hideToast', () => {
    it('sets visible to false', () => {
      toast.showToast('then hide');
      expect(toast.toastState.visible).toBe(true);

      toast.hideToast();
      expect(toast.toastState.visible).toBe(false);
    });
  });

  describe('convenience helpers', () => {
    it('showSuccess uses success type', () => {
      toast.showSuccess('ok');
      expect(toast.toastState.type).toBe('success');
      expect(toast.toastState.message).toBe('ok');
      expect(toast.toastState.duration).toBe(2200);
    });

    it('showError uses error type and longer default duration', () => {
      toast.showError('bad');
      expect(toast.toastState.type).toBe('error');
      expect(toast.toastState.duration).toBe(3200);
    });

    it('showInfo uses info type', () => {
      toast.showInfo('note');
      expect(toast.toastState.type).toBe('info');
    });

    it('convenience helpers respect custom duration', () => {
      toast.showError('bad', 9999);
      expect(toast.toastState.duration).toBe(9999);
    });
  });

  describe('state sharing', () => {
    it('multiple useGlobalToast instances share the same state', () => {
      const another = useGlobalToast();
      another.showToast('shared');

      expect(toast.toastState.visible).toBe(true);
      expect(toast.toastState.message).toBe('shared');
    });
  });
});
