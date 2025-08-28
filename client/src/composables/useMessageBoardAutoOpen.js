/**
 * 留言板自动打开功能
 */
import { ref, onMounted } from 'vue';
import { useWebSocket } from './useWebSocket.js';
import { useWindowManager } from './useWindowManager.js';
import MessageBoardWindow from '@/components/message-board/MessageBoardWindow.vue';

export function useMessageBoardAutoOpen() {
  const isAutoOpenEnabled = ref(true);
  const { onMessage } = useWebSocket();
  const { createWindow, findWindowByApp, setActiveWindow } = useWindowManager();

  // 获取会话ID
  const getSessionId = () => {
    return localStorage.getItem('sessionId');
  };

  // 检查是否应该自动打开
  const shouldAutoOpen = autoOpenSessions => {
    const sessionId = getSessionId();
    return (
      isAutoOpenEnabled.value &&
      sessionId &&
      autoOpenSessions.includes(sessionId)
    );
  };

  // 打开或激活留言板窗口
  const openMessageBoard = () => {
    // 检查是否已经有留言板窗口
    const existingWindow = findWindowByApp('messageBoard');

    if (existingWindow) {
      // 如果已存在，激活窗口
      setActiveWindow(existingWindow.id);
    } else {
      // 创建新的留言板窗口
      createWindow({
        component: MessageBoardWindow,
        title: '💬 留言板',
        appSlug: 'messageBoard',
        width: 400,
        height: 600,
        props: {},
        storageKey: 'messageBoardPos',
      });
    }
  };

  // 处理新消息事件
  const handleNewMessage = data => {
    const { autoOpenSessions } = data;

    if (shouldAutoOpen(autoOpenSessions)) {
      openMessageBoard();
    }
  };

  // 手动打开留言板
  const manualOpenMessageBoard = () => {
    openMessageBoard();
  };

  // 设置自动打开状态
  const setAutoOpenEnabled = enabled => {
    isAutoOpenEnabled.value = enabled;
    localStorage.setItem('messageBoardAutoOpen', enabled ? 'true' : 'false');
  };

  // 初始化
  onMounted(() => {
    // 从本地存储恢复自动打开设置
    const saved = localStorage.getItem('messageBoardAutoOpen');
    if (saved !== null) {
      isAutoOpenEnabled.value = saved === 'true';
    }

    // 注册WebSocket事件处理器
    onMessage('newMessage', handleNewMessage);
  });

  return {
    isAutoOpenEnabled,
    setAutoOpenEnabled,
    manualOpenMessageBoard,
  };
}
