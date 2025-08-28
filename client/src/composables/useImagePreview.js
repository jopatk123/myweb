import { ref } from 'vue';

export function useImagePreview() {
  // 获取图片URL
  const getImageUrl = image => {
    if (image.path) {
      // 如果路径以 uploads/ 开头，直接使用相对路径（不添加API前缀）
      if (image.path.startsWith('uploads/')) {
        return `/${image.path}`;
      }
      // 其他路径使用API前缀
      const apiBase = import.meta.env.VITE_API_BASE || '';
      return apiBase.endsWith('/')
        ? `${apiBase}${image.path}`
        : `${apiBase}/${image.path}`;
    }
    return image.url || image;
  };

  // 图片加载完成
  const onImageLoad = () => {
    // 可以在这里添加加载完成的处理逻辑
  };

  // 图片加载失败
  const onImageError = event => {
    event.target.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNEN0Q3RDciLz4KPHBhdGggZD0iTTQwIDQwSDUwVjUwSDQwVjQwWiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K';
  };

  return {
    getImageUrl,
    onImageLoad,
    onImageError,
  };
}
