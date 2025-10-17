// 五子棋提示功能组合式函数
import { ref } from 'vue';

export function useGomokuHint() {
  // 提示状态
  const showHint = ref(false);
  const hintPosition = ref(null);

  // 显示提示
  function displayHint(position) {
    if (!position) return;

    hintPosition.value = position;
    showHint.value = true;
  }

  // 关闭提示
  function closeHint() {
    showHint.value = false;
    hintPosition.value = null;
  }

  // 切换提示显示状态
  function toggleHint(getHintCallback) {
    if (showHint.value) {
      closeHint();
    } else {
      const hint = getHintCallback();
      if (hint) {
        displayHint(hint);
      }
    }
  }

  return {
    // 状态
    showHint,
    hintPosition,

    // 方法
    displayHint,
    closeHint,
    toggleHint,
  };
}
