export function formatUploadSpeed(bytesPerSecond) {
  if (bytesPerSecond === 0 || !isFinite(bytesPerSecond)) return '';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return (
    parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  );
}

export function formatRemainingTime(seconds) {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';

  if (seconds < 60) {
    return `${Math.ceil(seconds)}秒`;
  }

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
}
