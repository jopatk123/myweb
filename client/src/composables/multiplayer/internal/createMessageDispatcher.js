export function createMessageDispatcher({ sendRaw, gameType, error }) {
  return (type, data = {}) => {
    try {
      sendRaw(type, {
        ...data,
        game_type: gameType,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('发送消息失败:', err);
      if (error) {
        error.value = '发送消息失败';
      }
    }
  };
}
