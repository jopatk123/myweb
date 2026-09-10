/**
 * 留言板自动打开功能
 */
import { onMounted, onScopeDispose, defineAsyncComponent } from 'vue';
import { useWebSocket } from './useWebSocket.js';
import { useWindowManager } from './useWindowManager.js';
import { getAppComponentBySlug, getAppMetaBySlug } from '@/apps/registry.js';
import { messageBoardState } from '@/store/messageBoardState.js';

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
      const preferred = getAppMetaBySlug('message-board')?.preferredSize || {
        width: 610,
        height: 800,
      };
      createWindow({
        component: messageBoardComponent,
        title: '留言板',
        appSlug: 'message-board',
        width: preferred.width,
        height: preferred.height,
        props: {},
        storageKey: 'message-board:pos',
        activate: options.activate,
      });
    }
  };

  /**
   * 处理新消息事件。
   * 服务端仅广播消息本身，是否自动弹出由客户端本地开关
   * （messageBoardState.autoOpenEnabled，随用户设置拉取/更新而同步）
   * 决定，遵守用户在设置面板中的"自动打开新消息"偏好。
   * 不再依赖服务端广播 autoOpenSessions 列表——该列表会把其他
   * 活跃会话的 sessionId 泄露给所有客户端。
   */
  const handleNewMessage = () => {
    if (!messageBoardState.autoOpenEnabled) return;
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
