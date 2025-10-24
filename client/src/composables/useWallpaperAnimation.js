/**
 * 壁纸动画执行器
 * 负责管理动画的执行、状态和生命周期
 */

import { ref, computed, onUnmounted } from 'vue';
import { getAnimationConfig } from '@/constants/wallpaperAnimations.js';
import { useWallpaperAnimationSelector } from './useWallpaperAnimationSelector.js';

/**
 * 动画状态枚举
 */
export const AnimationState = {
  IDLE: 'idle',
  PLAYING: 'playing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * 壁纸动画执行器 Composable
 * @param {Object} options - 配置选项
 * @param {string[]} options.enabledAnimations - 启用的动画类型
 * @param {string[]} options.excludedAnimations - 排除的动画类型
 * @param {Function} options.onAnimationStart - 动画开始回调
 * @param {Function} options.onAnimationEnd - 动画结束回调
 * @returns {Object} 动画执行器方法和状态
 */
export function useWallpaperAnimation(options = {}) {
  const {
    enabledAnimations = null,
    excludedAnimations = [],
    onAnimationStart = null,
    onAnimationEnd = null,
  } = options;

  // 使用动画选择器
  const animationSelector = useWallpaperAnimationSelector({
    enabledAnimations,
    excludedAnimations,
  });

  // 当前动画状态
  const animationState = ref(AnimationState.IDLE);
  const currentAnimationType = ref(null);
  const currentAnimationConfig = ref(null);

  // 动画定时器
  let animationTimer = null;

  // 计算属性：是否正在播放动画
  const isAnimating = computed(
    () => animationState.value === AnimationState.PLAYING
  );

  /**
   * 生成动画样式对象
   * @param {Object} config - 动画配置
   * @returns {Object} CSS样式对象
   */
  const generateAnimationStyle = config => {
    if (!config) return {};

    return {
      animationName: config.type,
      animationDuration: `${config.duration}ms`,
      animationTimingFunction: config.timingFunction,
      animationFillMode: 'both',
    };
  };

  /**
   * 清理动画定时器
   */
  const clearAnimationTimer = () => {
    if (animationTimer) {
      clearTimeout(animationTimer);
      animationTimer = null;
    }
  };

  /**
   * 开始播放动画
   * @param {string} animationType - 指定的动画类型，如果为null则随机选择
   * @returns {Object} 包含动画配置和样式的对象
   */
  const playAnimation = (animationType = null) => {
    // 清理之前的定时器
    clearAnimationTimer();

    // 选择动画类型
    const selectedType =
      animationType || animationSelector.selectRandomAnimation();

    if (!selectedType) {
      console.warn('无法选择动画类型');
      return null;
    }

    // 获取动画配置
    const config = getAnimationConfig(selectedType);

    if (!config) {
      console.warn(`无效的动画类型: ${selectedType}`);
      return null;
    }

    // 更新状态
    animationState.value = AnimationState.PLAYING;
    currentAnimationType.value = selectedType;
    currentAnimationConfig.value = config;

    // 触发开始回调
    if (typeof onAnimationStart === 'function') {
      onAnimationStart(config);
    }

    // 生成动画样式
    const animationStyle = generateAnimationStyle(config);

    // 设置定时器，在动画结束后更新状态
    animationTimer = setTimeout(() => {
      animationState.value = AnimationState.COMPLETED;

      // 触发结束回调
      if (typeof onAnimationEnd === 'function') {
        onAnimationEnd(config);
      }

      // 延迟重置到空闲状态
      setTimeout(() => {
        if (animationState.value === AnimationState.COMPLETED) {
          animationState.value = AnimationState.IDLE;
          currentAnimationType.value = null;
          currentAnimationConfig.value = null;
        }
      }, 50);
    }, config.duration);

    return {
      config,
      style: animationStyle,
      type: selectedType,
    };
  };

  /**
   * 取消当前动画
   */
  const cancelAnimation = () => {
    clearAnimationTimer();
    animationState.value = AnimationState.CANCELLED;

    // 短暂延迟后重置状态
    setTimeout(() => {
      animationState.value = AnimationState.IDLE;
      currentAnimationType.value = null;
      currentAnimationConfig.value = null;
    }, 50);
  };

  /**
   * 重置动画状态
   */
  const reset = () => {
    cancelAnimation();
    animationSelector.reset();
  };

  /**
   * 获取当前动画样式
   * @returns {Object} CSS样式对象
   */
  const getCurrentAnimationStyle = () => {
    return generateAnimationStyle(currentAnimationConfig.value);
  };

  /**
   * 检查是否可以开始新动画
   * @returns {boolean}
   */
  const canStartAnimation = () => {
    return animationState.value === AnimationState.IDLE;
  };

  // 清理：组件卸载时清理定时器
  onUnmounted(() => {
    clearAnimationTimer();
  });

  return {
    // 状态
    animationState,
    currentAnimationType,
    currentAnimationConfig,
    isAnimating,

    // 方法
    playAnimation,
    cancelAnimation,
    reset,
    getCurrentAnimationStyle,
    canStartAnimation,

    // 选择器方法
    selectRandomAnimation: animationSelector.selectRandomAnimation,
    getAvailableAnimations: animationSelector.getAvailableAnimations,
  };
}
