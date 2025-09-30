export function createMessageRegistry() {
  const externalHandlers = new Map();

  const register = (event, handler) => {
    if (!externalHandlers.has(event)) {
      externalHandlers.set(event, new Set());
    }
    externalHandlers.get(event).add(handler);
  };

  const unregister = (event, handler) => {
    if (!externalHandlers.has(event)) {
      return;
    }
    const handlers = externalHandlers.get(event);
    handlers.delete(handler);
    if (handlers.size === 0) {
      externalHandlers.delete(event);
    }
  };

  const dispatch = (event, payload) => {
    if (!externalHandlers.has(event)) {
      return;
    }
    externalHandlers.get(event).forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`扩展消息处理器错误 [${event}]:`, err);
      }
    });
  };

  const clear = () => {
    externalHandlers.clear();
  };

  return {
    register,
    unregister,
    dispatch,
    clear,
    hasEvent: event => externalHandlers.has(event),
    getEvents: () => Array.from(externalHandlers.keys()),
  };
}
