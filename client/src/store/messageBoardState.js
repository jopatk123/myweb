/**
 * 留言板跨组件共享状态
 *
 * 背景：留言板设置面板（useMessageBoard）与自动打开监听
 * （useMessageBoardAutoOpen，挂在 Home 上、独立于留言板窗口）
 * 分属两个互不感知的组合函数实例，自动打开开关需要在这两者间共享。
 * 服务端不再广播 autoOpenSessions（避免向所有客户端泄露他人会话 ID），
 * 由各客户端依据本地开关自行决定是否自动弹出留言板。
 */
import { reactive } from 'vue';

const STORAGE_KEY = 'message-board:autoOpenEnabled';

function readInitialAutoOpen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // localStorage 不可用（隐私模式等）时退化为内存默认值
    return false;
  }
}

export const messageBoardState = reactive({
  /** 自动打开开关镜像（服务端 user_sessions.auto_open_enabled 的前端缓存） */
  autoOpenEnabled: readInitialAutoOpen(),
  /** 本次页面生命周期内是否已从服务端同步过设置 */
  settingsLoaded: false,
});

/**
 * 由 useMessageBoard 在拉取/更新用户设置时调用，
 * 同步内存共享状态并持久化到 localStorage，
 * 保证下次页面加载后（留言板窗口尚未打开时）开关仍然生效。
 */
export function syncAutoOpenEnabled(value) {
  messageBoardState.autoOpenEnabled = Boolean(value);
  messageBoardState.settingsLoaded = true;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      messageBoardState.autoOpenEnabled ? 'true' : 'false'
    );
  } catch {
    /* 忽略持久化失败，仅保留内存态 */
  }
}
