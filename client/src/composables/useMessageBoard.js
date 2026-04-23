/**
 * 留言板组合式函数
 */
import { ref, reactive, computed, onMounted, onScopeDispose, watch } from 'vue';
import { useWindowManager } from './useWindowManager.js';
import { messageAPI } from '@/api/message.js';
import { useWebSocket } from './useWebSocket.js';

export function useMessageBoard() {
  const messages = ref([]);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref(null);
  const searchQuery = ref('');

  // 用户设置
  const userSettings = reactive({
    nickname: 'Anonymous',
    avatarColor: '#007bff',
    autoOpenEnabled: false,
  });

  // WebSocket连接
  const { isConnected, onMessage, offMessage } = useWebSocket();
  // 目前 messageBoard 通过 API 推送并由 WebSocket 接收广播

  // 分页信息
  const pagination = reactive({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const syncPaginationTotal = total => {
    pagination.total = Math.max(0, total);
    pagination.totalPages = pagination.limit
      ? Math.ceil(pagination.total / pagination.limit)
      : 0;
  };

  const syncMessageBoardWindow = () => {
    try {
      const { findWindowByAppAll, createWindow, showWindowWithoutFocus } =
        useWindowManager();
      const existingWindow = findWindowByAppAll('message-board');
      if (existingWindow) {
        try {
          showWindowWithoutFocus(existingWindow.id);
          return;
        } catch (error) {
          console.warn('显示留言板窗口失败，使用可见回退', error);
          existingWindow.minimized = false;
          existingWindow.visible = true;
        }
        return;
      }

      createWindow({
        component: () =>
          import('@/components/message-board/MessageBoardWindow.vue'),
        title: '💬 留言板',
        appSlug: 'message-board',
        width: 400,
        height: 600,
        props: {},
        storageKey: 'message-board:pos',
        activate: false,
      });
    } catch (error) {
      console.warn('同步留言板窗口失败', error);
    }
  };

  // 获取留言列表
  const fetchMessages = async ({
    page = 1,
    search = searchQuery.value,
  } = {}) => {
    try {
      loading.value = true;
      error.value = null;
      const normalizedSearch = typeof search === 'string' ? search.trim() : '';

      const response = await messageAPI.getMessages({
        page,
        limit: pagination.limit,
        ...(normalizedSearch ? { q: normalizedSearch } : {}),
      });

      if (response.code === 200) {
        messages.value = response.data.messages || [];
        Object.assign(pagination, response.data.pagination || {});
      }
    } catch (err) {
      error.value = err.message || '获取留言失败';
      console.error('Fetch messages error:', err);
    } finally {
      loading.value = false;
    }
  };

  // 发送留言
  const sendMessage = async (content, images = null, imageType = null) => {
    // 允许在没有文字内容的情况下发送，但必须至少有文字或图片
    const normalizedContent = String(content ?? '').trim();
    const hasText = normalizedContent.length > 0;
    const hasImages = images && Array.isArray(images) && images.length > 0;
    if (!hasText && !hasImages) {
      throw new Error('留言内容不能为空');
    }

    try {
      sending.value = true;
      error.value = null;

      const response = await messageAPI.sendMessage({
        content: normalizedContent,
        authorName: userSettings.nickname,
        authorColor: userSettings.avatarColor,
        images,
        imageType,
      });

      if (response.code === 200) {
        // 消息会通过WebSocket实时推送，这里不需要手动添加
        // 同步打开/激活留言板窗口（发送者本地立即可见）
        syncMessageBoardWindow();

        return response.data;
      }
    } catch (err) {
      error.value = err.message || '发送留言失败';
      console.error('Send message error:', err);
      throw err;
    } finally {
      sending.value = false;
    }
  };

  // 删除留言
  const deleteMessage = async messageId => {
    try {
      error.value = null;
      const response = await messageAPI.deleteMessage(messageId);
      if (response.code === 200) {
        // 消息会通过WebSocket实时推送删除事件
        return true;
      }
    } catch (err) {
      error.value = err.message || '删除留言失败';
      console.error('Delete message error:', err);
      throw err;
    }
  };

  // 清除所有留言
  const clearAllMessages = async () => {
    try {
      const response = await messageAPI.clearAllMessages();
      if (response.code === 200) {
        // 清空本地消息列表
        messages.value = [];
        return response.data;
      }
    } catch (err) {
      error.value = err.message || '清除留言板失败';
      console.error('Clear all messages error:', err);
      throw err;
    }
  };

  // 获取用户设置
  const fetchUserSettings = async () => {
    try {
      const response = await messageAPI.getUserSettings();
      if (response.code === 200) {
        Object.assign(userSettings, response.data);
        // 确保autoOpenEnabled是布尔值
        if (typeof userSettings.autoOpenEnabled === 'number') {
          userSettings.autoOpenEnabled = Boolean(userSettings.autoOpenEnabled);
        }
      }
    } catch (err) {
      console.error('Fetch user settings error:', err);
    }
  };

  // 更新用户设置
  const updateUserSettings = async settings => {
    try {
      const response = await messageAPI.updateUserSettings(settings);
      if (response.code === 200) {
        Object.assign(userSettings, response.data);
        // 确保autoOpenEnabled是布尔值
        if (typeof userSettings.autoOpenEnabled === 'number') {
          userSettings.autoOpenEnabled = Boolean(userSettings.autoOpenEnabled);
        }
        return response.data;
      }
    } catch (err) {
      error.value = err.message || '更新设置失败';
      console.error('Update user settings error:', err);
      throw err;
    }
  };

  // 处理新留言
  const handleNewMessage = data => {
    if (isSearching.value) return;
    const { message } = data;
    if (message) {
      // 检查是否已存在（避免重复）
      const exists = messages.value.find(m => m.id === message.id);
      if (!exists) {
        messages.value.push(message);
        syncPaginationTotal(pagination.total + 1);
        // 保持消息数量在合理范围内
        if (messages.value.length > pagination.limit) {
          messages.value.shift();
        }
      }
    }
  };

  // 处理留言删除
  const handleMessageDeleted = data => {
    const { messageId } = data;
    if (messageId) {
      const index = messages.value.findIndex(m => m.id === messageId);
      if (index !== -1) {
        messages.value.splice(index, 1);
      }
      if (!isSearching.value && pagination.total > 0) {
        syncPaginationTotal(pagination.total - 1);
      }
    }
  };

  const handleMessagesCleared = () => {
    messages.value = [];
    syncPaginationTotal(0);
  };

  // 格式化时间
  const formatTime = timestamp => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }

    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }

    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }

    // 超过24小时显示具体时间
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 生成随机头像颜色
  const generateRandomColor = () => {
    const colors = [
      '#007bff',
      '#28a745',
      '#dc3545',
      '#ffc107',
      '#17a2b8',
      '#6f42c1',
      '#e83e8c',
      '#fd7e14',
      '#20c997',
      '#6c757d',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // 上传图片
  const uploadImages = async files => {
    try {
      const response = await messageAPI.uploadImages(files);
      if (response.code === 200) {
        return response.data;
      }
    } catch (err) {
      error.value = err.message || '图片上传失败';
      console.error('Upload images error:', err);
      throw err;
    }
  };

  // 计算属性
  const hasMessages = computed(() => messages.value.length > 0);
  const canLoadMore = computed(() => pagination.page < pagination.totalPages);
  const isSearching = computed(() => searchQuery.value.trim().length > 0);

  const setSearchQuery = value => {
    searchQuery.value = value || '';
  };

  // 初始化
  onMounted(() => {
    // 获取用户设置和留言列表
    fetchUserSettings();
    fetchMessages();

    // 注册WebSocket事件处理器
    onMessage('newMessage', handleNewMessage);
    onMessage('messageDeleted', handleMessageDeleted);
    onMessage('messagesCleared', handleMessagesCleared);
  });

  onScopeDispose(() => {
    offMessage('newMessage', handleNewMessage);
    offMessage('messageDeleted', handleMessageDeleted);
    offMessage('messagesCleared', handleMessagesCleared);
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
  });

  let searchDebounceTimer = null;
  watch(
    searchQuery,
    newQuery => {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        pagination.page = 1;
        fetchMessages({ page: 1, search: newQuery });
      }, 300);
    },
    { flush: 'post' }
  );

  return {
    // 数据
    messages,
    loading,
    sending,
    error,
    userSettings,
    pagination,
    isConnected,
    searchQuery,

    // 计算属性
    hasMessages,
    canLoadMore,
    isSearching,

    // 方法
    fetchMessages,
    sendMessage,
    deleteMessage,
    clearAllMessages,
    updateUserSettings,
    uploadImages,
    formatTime,
    generateRandomColor,
    setSearchQuery,
  };
}
