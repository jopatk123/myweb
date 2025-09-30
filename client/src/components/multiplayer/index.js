/**
 * 多人游戏通用组件库聚合入口
 * 导出所有可复用的多人游戏组件、工具与配置
 */

export * from './exports.js';
export * from './constants.js';
export * from './gameTypeConfigs.js';
export * from './themes.js';
export { gameUtils } from './gameUtils.js';
export { MultiplayerEventBus, multiplayerEvents } from './eventBus.js';
export { COMPONENT_PRESETS } from './presets.js';
export { useMultiplayerRoom } from '../../composables/multiplayer/useMultiplayerRoom.js';
