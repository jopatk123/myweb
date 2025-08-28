export function useImageDownload() {
  // 保存图片
  const saveImage = async (image, getImageUrl) => {
    try {
      const imageUrl = getImageUrl(image);
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error('图片下载失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;

      // 生成文件名
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      const originalName = image.originalName || 'image';
      const extension = originalName.includes('.')
        ? originalName.split('.').pop()
        : 'jpg';
      const fileName = `message-image-${timestamp}.${extension}`;

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 清理URL
      URL.revokeObjectURL(url);

      // 显示成功提示
      showSaveSuccess();
    } catch (error) {
      console.error('保存图片失败:', error);
      alert('保存图片失败: ' + error.message);
    }
  };

  // 显示保存成功提示
  const showSaveSuccess = () => {
    // 创建一个临时的成功提示
    const successTip = document.createElement('div');
    successTip.className = 'save-success-tip';
    successTip.textContent = '图片已保存';
    document.body.appendChild(successTip);

    // 2秒后移除提示
    setTimeout(() => {
      if (successTip.parentNode) {
        successTip.parentNode.removeChild(successTip);
      }
    }, 2000);
  };

  return {
    saveImage,
    showSaveSuccess,
  };
}
