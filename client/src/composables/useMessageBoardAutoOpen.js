/**
 * 留言板自动打开功能
 */
import { ref, onMounted } from 'vue';
import { useWebSocket } from './useWebSocket.js';
import { useWindowManager } from './useWindowManager.js';
import MessageBoardWindow from '@/components/message-board/MessageBoardWindow.vue';

export function useMessageBoardAutoOpen() {
  const isAutoOpenEnabled = ref(false);
  const { onMessage } = useWebSocket();
  const { createWindow, findWindowByApp, findWindowByAppAll, setActiveWindow, showWindowWithoutFocus } = useWindowManager();

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

  // 打开或显示留言板窗口（可选择不抢占焦点）
  const openMessageBoard = (options = { activate: true }) => {
    // 首先尝试找到任何已存在的留言板窗口（包括最小化或隐藏）
    // 使用与后端 / apps registry 中一致的 slug: 'message-board'
    const existingWindow = findWindowByAppAll('message-board');

    if (existingWindow) {
      if (options.activate) {
        // 要求激活窗口
        setActiveWindow(existingWindow.id);
      } else {
        // 恢复/显示窗口但不改变当前活动窗口
        try {
          showWindowWithoutFocus(existingWindow.id);
        } catch (e) {
          // 回退：直接设置可见并取消最小化
          existingWindow.minimized = false;
          existingWindow.visible = true;
        }
      }
    } else {
      // 窗口不存在：创建新的留言板窗口（可选择不抢占焦点）
      createWindow({
        component: MessageBoardWindow,
        title: '💬 留言板',
        appSlug: 'message-board',
        width: 400,
        height: 600,
        props: {},
        storageKey: 'message-board:pos',
        activate: options.activate,
      });
    }
  };

  // 处理新消息事件（自动打开时不抢占焦点）
  const handleNewMessage = data => {
    const { autoOpenSessions } = data;

    if (shouldAutoOpen(autoOpenSessions)) {
      openMessageBoard({ activate: false });
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
