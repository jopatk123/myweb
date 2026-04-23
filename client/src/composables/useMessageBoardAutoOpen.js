/**
 * 留言板自动打开功能
 */
import { onMounted, onScopeDispose, defineAsyncComponent } from 'vue';
import { useWebSocket } from './useWebSocket.js';
import { useWindowManager } from './useWindowManager.js';
import { getAppComponentBySlug } from '@/apps/registry.js';

const messageBoardComponent =
  getAppComponentBySlug('message-board') ||
  defineAsyncComponent(
    () => import('@/components/message-board/MessageBoardWindow.vue')
  );

export function useMessageBoardAutoOpen() {
  const { onMessage, offMessage } = useWebSocket();
  const {
    createWindow,
    findWindowByAppAll,
    setActiveWindow,
    showWindowWithoutFocus,
  } = useWindowManager();

  // 打开或显示留言板窗口（可选择不抢占焦点）
  const openMessageBoard = (options = { activate: true }) => {
    // 首先尝试找到任何已存在的留言板窗口（包括最小化或隐藏）
    // 使用与后端 / apps registry 中一致的 slug: 'message-board'
    const existingWindow = findWindowByAppAll('message-board');

    if (existingWindow) {
      if (options.activate) {
        setActiveWindow(existingWindow.id);
      } else {
        try {
          showWindowWithoutFocus(existingWindow.id);
        } catch {
          // 回退：直接设置可见并取消最小化
          existingWindow.minimized = false;
          existingWindow.visible = true;
        }
      }
    } else {
      createWindow({
        component: messageBoardComponent,
        title: '💬 留言板',
        appSlug: 'message-board',
        width: 530,
        height: 800,
        props: {},
        storageKey: 'message-board:pos',
        activate: options.activate,
      });
    }
  };

  /**
   * 处理新消息事件。
   * 服务端广播时附带 autoOpenSessions（已启用自动打开且近期活跃的会话 ID 列表）。
   * 只有当前会话在该列表中时才弹出窗口，以遵守用户在设置面板中的"自动打开新消息"开关。
   */
  const handleNewMessage = /* istanbul ignore next */ data => {
    const sessionId =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('sessionId')
        : null;
    if (!sessionId) return;

    const { autoOpenSessions } = data || {};
    if (
      !Array.isArray(autoOpenSessions) ||
      !autoOpenSessions.includes(sessionId)
    ) {
      return;
    }

    openMessageBoard({ activate: false });
  };

  // 手动打开留言板
  const manualOpenMessageBoard = () => {
    openMessageBoard();
  };

  // 初始化
  onMounted(() => {
    onMessage('newMessage', handleNewMessage);
  });

  onScopeDispose(() => {
    offMessage('newMessage', handleNewMessage);
  });

  return {
    manualOpenMessageBoard,
  };
}
