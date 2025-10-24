/**
 * 壁纸动画选择器
 * 负责随机选择动画效果
 */

import { ref } from 'vue';
import {
  getAllAnimationTypes,
  isValidAnimationType,
} from '@/constants/wallpaperAnimations.js';

/**
 * 动画选择器 Composable
 * @param {Object} options - 配置选项
 * @param {string[]} options.enabledAnimations - 启用的动画类型数组，默认为全部
 * @param {string[]} options.excludedAnimations - 排除的动画类型数组
 * @returns {Object} 选择器方法和状态
 */
export function useWallpaperAnimationSelector(options = {}) {
  const { enabledAnimations = null, excludedAnimations = [] } = options;

  // 上次使用的动画类型，用于避免连续重复
  const lastAnimationType = ref(null);

  /**
   * 获取可用的动画类型列表
   * @returns {string[]} 过滤后的动画类型数组
   */
  const getAvailableAnimations = () => {
    let animations = enabledAnimations || getAllAnimationTypes();

    // 过滤掉被排除的动画
    if (excludedAnimations.length > 0) {
      animations = animations.filter(
        type => !excludedAnimations.includes(type)
      );
    }

    // 验证所有动画类型是否有效
    animations = animations.filter(type => isValidAnimationType(type));

    return animations;
  };

  /**
   * 从数组中随机选择一个元素
   * @param {Array} array - 待选择的数组
   * @returns {*} 随机选中的元素
   */
  const randomSelect = array => {
    if (!array || array.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  };

  /**
   * 随机选择一个动画类型（避免与上次相同）
   * @param {boolean} allowRepeat - 是否允许重复上次的动画，默认false
   * @returns {string|null} 选中的动画类型
   */
  const selectRandomAnimation = (allowRepeat = false) => {
    const availableAnimations = getAvailableAnimations();

    if (availableAnimations.length === 0) {
      console.warn('没有可用的动画类型');
      return null;
    }

    // 如果只有一个动画或允许重复，直接随机选择
    if (availableAnimations.length === 1 || allowRepeat) {
      const selected = randomSelect(availableAnimations);
      lastAnimationType.value = selected;
      return selected;
    }

    // 过滤掉上次使用的动画，避免连续重复
    const candidateAnimations = lastAnimationType.value
      ? availableAnimations.filter(type => type !== lastAnimationType.value)
      : availableAnimations;

    const selected = randomSelect(
      candidateAnimations.length > 0 ? candidateAnimations : availableAnimations
    );

    lastAnimationType.value = selected;
    return selected;
  };

  /**
   * 重置选择器状态
   */
  const reset = () => {
    lastAnimationType.value = null;
  };

  /**
   * 设置上次使用的动画类型
   * @param {string} type - 动画类型
   */
  const setLastAnimationType = type => {
    if (isValidAnimationType(type)) {
      lastAnimationType.value = type;
    }
  };

  return {
    // 状态
    lastAnimationType,

    // 方法
    selectRandomAnimation,
    getAvailableAnimations,
    reset,
    setLastAnimationType,
  };
}
