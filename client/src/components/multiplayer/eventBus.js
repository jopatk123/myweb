// 自定义事件总线，用于多人游戏组件之间通信
export class MultiplayerEventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
  }

  off(event, handler) {
    if (this.events.has(event)) {
      this.events.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Event handler error [${event}]:`, err);
        }
      });
    }
  }

  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export const multiplayerEvents = new MultiplayerEventBus();
