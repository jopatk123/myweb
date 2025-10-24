/**
 * 壁纸动画执行器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  useWallpaperAnimation,
  AnimationState,
} from '@/composables/useWallpaperAnimation.js';
import { AnimationType } from '@/constants/wallpaperAnimations.js';

describe('useWallpaperAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      const animation = useWallpaperAnimation();

      expect(animation).toHaveProperty('animationState');
      expect(animation).toHaveProperty('currentAnimationType');
      expect(animation).toHaveProperty('currentAnimationConfig');
      expect(animation).toHaveProperty('isAnimating');
      expect(animation).toHaveProperty('playAnimation');
      expect(animation).toHaveProperty('cancelAnimation');
      expect(animation).toHaveProperty('reset');
    });

    it('初始状态应该是 IDLE', () => {
      const animation = useWallpaperAnimation();

      expect(animation.animationState.value).toBe(AnimationState.IDLE);
      expect(animation.currentAnimationType.value).toBeNull();
      expect(animation.currentAnimationConfig.value).toBeNull();
      expect(animation.isAnimating.value).toBe(false);
    });
  });

  describe('playAnimation', () => {
    it('应该能播放指定的动画', () => {
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation(AnimationType.FADE);

      expect(result).not.toBeNull();
      expect(result.type).toBe(AnimationType.FADE);
      expect(result.config).toBeDefined();
      expect(result.style).toBeDefined();
    });

    it('应该更新动画状态为 PLAYING', () => {
      const animation = useWallpaperAnimation();
      animation.playAnimation(AnimationType.FADE);

      expect(animation.animationState.value).toBe(AnimationState.PLAYING);
      expect(animation.isAnimating.value).toBe(true);
    });

    it('应该设置当前动画类型和配置', () => {
      const animation = useWallpaperAnimation();
      animation.playAnimation(AnimationType.FADE);

      expect(animation.currentAnimationType.value).toBe(AnimationType.FADE);
      expect(animation.currentAnimationConfig.value).not.toBeNull();
      expect(animation.currentAnimationConfig.value.type).toBe(
        AnimationType.FADE
      );
    });

    it('应该生成正确的动画样式', () => {
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation(AnimationType.FADE);

      expect(result.style).toHaveProperty('animationName');
      expect(result.style).toHaveProperty('animationDuration');
      expect(result.style).toHaveProperty('animationTimingFunction');
      expect(result.style).toHaveProperty('animationFillMode');

      expect(result.style.animationName).toBe(AnimationType.FADE);
      expect(result.style.animationFillMode).toBe('both');
    });

    it('未指定类型时应该随机选择动画', () => {
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation();

      expect(result).not.toBeNull();
      expect(result.type).toBeTruthy();
      expect(typeof result.type).toBe('string');
    });

    it('应该在动画结束后更新状态', async () => {
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation(AnimationType.FADE);

      expect(animation.animationState.value).toBe(AnimationState.PLAYING);

      // 快进到动画结束
      vi.advanceTimersByTime(result.config.duration);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.COMPLETED);
    });

    it('应该调用 onAnimationStart 回调', () => {
      const onAnimationStart = vi.fn();
      const animation = useWallpaperAnimation({ onAnimationStart });

      animation.playAnimation(AnimationType.FADE);

      expect(onAnimationStart).toHaveBeenCalledTimes(1);
      expect(onAnimationStart).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AnimationType.FADE,
        })
      );
    });

    it('应该调用 onAnimationEnd 回调', async () => {
      const onAnimationEnd = vi.fn();
      const animation = useWallpaperAnimation({ onAnimationEnd });

      const result = animation.playAnimation(AnimationType.FADE);

      expect(onAnimationEnd).not.toHaveBeenCalled();

      vi.advanceTimersByTime(result.config.duration);
      await nextTick();

      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });

    it('应该在完成后延迟重置到 IDLE 状态', async () => {
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation(AnimationType.FADE);

      // 到达动画结束时间
      vi.advanceTimersByTime(result.config.duration);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.COMPLETED);

      // 额外延迟后应该重置为 IDLE
      vi.advanceTimersByTime(50);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.IDLE);
      expect(animation.currentAnimationType.value).toBeNull();
    });

    it('对于无效的动画类型应该返回 null', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const animation = useWallpaperAnimation();

      const result = animation.playAnimation('invalidType');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应该清理之前的动画定时器', () => {
      const animation = useWallpaperAnimation();

      const result1 = animation.playAnimation(AnimationType.FADE);
      expect(animation.animationState.value).toBe(AnimationState.PLAYING);

      // 立即开始新动画，应该清理旧定时器
      const result2 = animation.playAnimation(AnimationType.ZOOM_IN);
      expect(animation.currentAnimationType.value).toBe(AnimationType.ZOOM_IN);

      // 快进第一个动画的时长，不应该触发完成
      vi.advanceTimersByTime(result1.config.duration);

      // 应该仍然是播放状态（第二个动画还在进行）
      expect(animation.animationState.value).toBe(AnimationState.PLAYING);
    });
  });

  describe('cancelAnimation', () => {
    it('应该取消正在播放的动画', () => {
      const animation = useWallpaperAnimation();
      animation.playAnimation(AnimationType.FADE);

      expect(animation.animationState.value).toBe(AnimationState.PLAYING);

      animation.cancelAnimation();

      expect(animation.animationState.value).toBe(AnimationState.CANCELLED);
    });

    it('应该在取消后短暂延迟重置状态', async () => {
      const animation = useWallpaperAnimation();
      animation.playAnimation(AnimationType.FADE);

      animation.cancelAnimation();

      expect(animation.animationState.value).toBe(AnimationState.CANCELLED);

      vi.advanceTimersByTime(50);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.IDLE);
      expect(animation.currentAnimationType.value).toBeNull();
    });
  });

  describe('reset', () => {
    it('应该重置所有状态', async () => {
      const animation = useWallpaperAnimation();
      animation.playAnimation(AnimationType.FADE);

      expect(animation.animationState.value).toBe(AnimationState.PLAYING);

      animation.reset();

      vi.advanceTimersByTime(50);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.IDLE);
      expect(animation.currentAnimationType.value).toBeNull();
      expect(animation.currentAnimationConfig.value).toBeNull();
    });
  });

  describe('getCurrentAnimationStyle', () => {
    it('当没有动画时应该返回空对象', () => {
      const animation = useWallpaperAnimation();
      const style = animation.getCurrentAnimationStyle();

      expect(style).toEqual({});
    });

    it('应该返回当前动画的样式', () => {
      const animation = useWallpaperAnimation();
      animation.playAnimation(AnimationType.FADE);

      const style = animation.getCurrentAnimationStyle();

      expect(style).toHaveProperty('animationName');
      expect(style.animationName).toBe(AnimationType.FADE);
    });
  });

  describe('canStartAnimation', () => {
    it('IDLE 状态下应该返回 true', () => {
      const animation = useWallpaperAnimation();
      expect(animation.canStartAnimation()).toBe(true);
    });

    it('PLAYING 状态下应该返回 false', () => {
      const animation = useWallpaperAnimation();
      animation.playAnimation(AnimationType.FADE);

      expect(animation.canStartAnimation()).toBe(false);
    });

    it('COMPLETED 状态下应该返回 false', async () => {
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation(AnimationType.FADE);

      vi.advanceTimersByTime(result.config.duration);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.COMPLETED);
      expect(animation.canStartAnimation()).toBe(false);
    });
  });

  describe('动画选项配置', () => {
    it('应该使用指定的启用动画列表', () => {
      const enabledAnimations = [AnimationType.FADE, AnimationType.ZOOM_IN];
      const animation = useWallpaperAnimation({ enabledAnimations });

      const available = animation.getAvailableAnimations();
      expect(available).toEqual(enabledAnimations);
    });

    it('应该排除指定的动画', () => {
      const excludedAnimations = [AnimationType.FADE];
      const animation = useWallpaperAnimation({ excludedAnimations });

      const available = animation.getAvailableAnimations();
      expect(available).not.toContain(AnimationType.FADE);
    });

    it('随机选择应该从配置的动画列表中选择', () => {
      const enabledAnimations = [AnimationType.FADE];
      const animation = useWallpaperAnimation({ enabledAnimations });

      const result = animation.playAnimation();

      expect(result.type).toBe(AnimationType.FADE);
    });
  });

  describe('选择器方法', () => {
    it('应该暴露 selectRandomAnimation 方法', () => {
      const animation = useWallpaperAnimation();

      const selected = animation.selectRandomAnimation();
      expect(selected).toBeTruthy();
      expect(typeof selected).toBe('string');
    });

    it('应该暴露 getAvailableAnimations 方法', () => {
      const animation = useWallpaperAnimation();

      const available = animation.getAvailableAnimations();
      expect(Array.isArray(available)).toBe(true);
      expect(available.length).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理 null 作为动画类型', () => {
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation(null);

      // 应该随机选择一个动画
      expect(result).not.toBeNull();
      expect(result.type).toBeTruthy();
    });

    it('应该处理空的启用动画列表', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const animation = useWallpaperAnimation({ enabledAnimations: [] });

      const result = animation.playAnimation();
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('取消未播放的动画应该正常工作', async () => {
      const animation = useWallpaperAnimation();

      expect(() => {
        animation.cancelAnimation();
      }).not.toThrow();

      vi.advanceTimersByTime(50);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.IDLE);
    });
  });

  describe('内存管理', () => {
    it('组件卸载时应该清理定时器', () => {
      // 这个测试需要在 Vue 组件环境中测试 onUnmounted
      // 在单元测试中，我们只验证 cancelAnimation 能清理定时器
      const animation = useWallpaperAnimation();
      const result = animation.playAnimation(AnimationType.FADE);

      // 模拟卸载前取消
      animation.cancelAnimation();

      // 快进时间，验证没有副作用
      vi.advanceTimersByTime(result.config.duration + 100);

      expect(animation.animationState.value).toBe(AnimationState.IDLE);
    });
  });

  describe('连续动画播放', () => {
    it('应该支持连续播放多个动画', async () => {
      const animation = useWallpaperAnimation();

      // 第一个动画
      const result1 = animation.playAnimation(AnimationType.FADE);
      expect(animation.currentAnimationType.value).toBe(AnimationType.FADE);

      // 完成第一个动画
      vi.advanceTimersByTime(result1.config.duration + 50);
      await nextTick();

      expect(animation.animationState.value).toBe(AnimationState.IDLE);

      // 第二个动画
      animation.playAnimation(AnimationType.ZOOM_IN);
      expect(animation.currentAnimationType.value).toBe(AnimationType.ZOOM_IN);
      expect(animation.animationState.value).toBe(AnimationState.PLAYING);
    });

    it('应该支持在动画播放中切换到新动画', () => {
      const animation = useWallpaperAnimation();

      animation.playAnimation(AnimationType.FADE);
      expect(animation.currentAnimationType.value).toBe(AnimationType.FADE);

      // 立即开始新动画
      animation.playAnimation(AnimationType.ZOOM_IN);
      expect(animation.currentAnimationType.value).toBe(AnimationType.ZOOM_IN);
      expect(animation.animationState.value).toBe(AnimationState.PLAYING);
    });
  });
});
