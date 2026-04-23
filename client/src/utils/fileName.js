const FILE_EMOJI_MAP = Object.freeze({
  // 图片
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  webp: '🖼️',
  svg: '🖼️',
  bmp: '🖼️',
  // 视频
  mp4: '🎬',
  mov: '🎬',
  avi: '🎬',
  mkv: '🎬',
  webm: '🎬',
  flv: '🎬',
  // 音频
  mp3: '🎵',
  wav: '🎵',
  flac: '🎵',
  aac: '🎵',
  ogg: '🎵',
  m4a: '🎵',
  // 文档
  doc: '📝',
  docx: '📝',
  odt: '📝',
  xls: '📊',
  xlsx: '📊',
  csv: '📊',
  ods: '📊',
  ppt: '📽️',
  pptx: '📽️',
  odp: '📽️',
  pdf: '📕',
  txt: '📃',
  md: '📃',
  rtf: '📃',
  // 代码
  js: '💻',
  ts: '💻',
  vue: '💻',
  jsx: '💻',
  tsx: '💻',
  html: '🌐',
  css: '🎨',
  scss: '🎨',
  py: '🐍',
  java: '☕',
  c: '⚙️',
  cpp: '⚙️',
  go: '🐹',
  rs: '🦀',
  json: '📋',
  xml: '📋',
  yaml: '📋',
  yml: '📋',
  // 压缩
  zip: '📦',
  rar: '📦',
  '7z': '📦',
  tar: '📦',
  gz: '📦',
  // 电子书
  epub: '📚',
  mobi: '📚',
  azw3: '📚',
});

export function truncateFileName(name, maxLength) {
  if (!name || maxLength <= 0) return name || '';
  if (name.length <= maxLength) return name;

  const extIndex = name.lastIndexOf('.');
  const ext = extIndex > 0 ? name.slice(extIndex) : '';
  const baseName = name.slice(0, name.length - ext.length);
  const truncateLength = maxLength - ext.length - 3;

  if (truncateLength <= 0) {
    return `${name.slice(0, Math.max(0, maxLength - 3))}...`;
  }

  return `${baseName.slice(0, truncateLength)}...${ext}`;
}

export function getFileEmoji(fileName) {
  if (!fileName) return '📄';

  const ext = fileName.toLowerCase().split('.').pop();
  return FILE_EMOJI_MAP[ext] || '📄';
}
