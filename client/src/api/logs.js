// AI 文件日志功能已移除：此模块保留兼容导出，所有方法返回禁用状态。
const disabled = () => Promise.resolve({ code: 200, data: { logs: [], disabled: true } });

export const logsApi = {
  getAILogs: disabled,
  getAILogStats: () => Promise.resolve({ code: 200, data: { fileExists: false, entries: 0, size: 0, disabled: true } }),
  clearAILogs: () => Promise.resolve({ code: 200, message: 'disabled' })
};
