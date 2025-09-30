import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiplayerEventBus } from '@/components/multiplayer/eventBus.js';

describe('MultiplayerEventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new MultiplayerEventBus();
  });

  it('registers and emits events to handlers', () => {
    const handler = vi.fn();
    bus.on('joined', handler);

    bus.emit('joined', { player: 'Alice' });

    expect(handler).toHaveBeenCalledWith({ player: 'Alice' });
  });

  it('removes handler when off is called', () => {
    const handler = vi.fn();
    bus.on('left', handler);
    bus.off('left', handler);

    bus.emit('left', 'Bob');

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all handlers for a specific event', () => {
    const handler = vi.fn();
    bus.on('ready', handler);

    bus.clear('ready');
    bus.emit('ready');

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all registered events when called without argument', () => {
    const handler = vi.fn();
    bus.on('ping', handler);

    bus.clear();
    bus.emit('ping');

    expect(handler).not.toHaveBeenCalled();
  });

  it('guards handler errors and logs to console', () => {
    const error = new Error('handler failed');
    const faultyHandler = vi.fn(() => {
      throw error;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('update', faultyHandler);
    bus.emit('update', { foo: 'bar' });

    expect(faultyHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Event handler error [update]:',
      error
    );

    consoleSpy.mockRestore();
  });
});
