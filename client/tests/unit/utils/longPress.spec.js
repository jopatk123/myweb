import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLongPress, LONG_PRESS_MS } from '@/utils/longPress.js';

afterEach(() => {
  vi.useRealTimers();
});

function touch(overrides = {}) {
  return {
    pointerType: 'touch',
    pointerId: 1,
    isPrimary: true,
    clientX: 20,
    clientY: 30,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  };
}

describe('createLongPress', () => {
  it('fires after a stationary touch and consumes the following click', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const press = createLongPress(onLongPress);
    const event = touch();

    press.onPointerDown(event);
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledWith(event);

    const click = touch();
    expect(press.consumeClick(click)).toBe(true);
    expect(click.preventDefault).toHaveBeenCalled();
    expect(press.consumeClick(touch())).toBe(false);
  });

  it('ignores mouse pointers', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const press = createLongPress(onLongPress);

    press.onPointerDown(touch({ pointerType: 'mouse' }));
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels when the finger moves past the tolerance', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const press = createLongPress(onLongPress);

    press.onPointerDown(touch());
    press.onPointerMove(touch({ clientX: 40, clientY: 30 }));
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does not fire after the pointer is released early', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const press = createLongPress(onLongPress);

    press.onPointerDown(touch());
    press.onPointerUp(touch());
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
    expect(press.consumeClick(touch())).toBe(false);
  });
});
