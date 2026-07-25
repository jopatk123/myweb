/**
 * 壁纸动画选择器测试
 */

import { describe, it, expect, vi } from 'vitest';
import { useWallpaperAnimationSelector } from '@/composables/useWallpaperAnimationSelector.js';
import { AnimationType } from '@/constants/wallpaperAnimations.js';

describe('useWallpaperAnimationSelector', () => {
  describe('基本功能', () => {
    it('应该正确初始化', () => {
      const selector = useWallpaperAnimationSelector();

      expect(selector).toHaveProperty('lastAnimationType');
      expect(selector).toHaveProperty('selectRandomAnimation');
      expect(selector).toHaveProperty('getAvailableAnimations');
      expect(selector).toHaveProperty('reset');
      expect(selector).toHaveProperty('setLastAnimationType');
    });

    it('初始状态下 lastAnimationType 应该为 null', () => {
      const selector = useWallpaperAnimationSelector();
      expect(selector.lastAnimationType.value).toBeNull();
    });
  });

  describe('getAvailableAnimations', () => {
    it('默认情况下应该返回所有动画类型', () => {
      const selector = useWallpaperAnimationSelector();
      const animations = selector.getAvailableAnimations();

      expect(Array.isArray(animations)).toBe(true);
      expect(animations.length).toBeGreaterThan(0);
      expect(animations).toContain(AnimationType.FADE);
      expect(animations).toContain(AnimationType.SLIDE_LEFT);
    });

    it('应该返回指定的启用动画', () => {
      const enabledAnimations = [AnimationType.FADE, AnimationType.ZOOM_IN];
      const selector = useWallpaperAnimationSelector({ enabledAnimations });
      const animations = selector.getAvailableAnimations();

      expect(animations).toEqual(enabledAnimations);
      expect(animations.length).toBe(2);
    });

    it('应该排除指定的动画', () => {
      const excludedAnimations = [AnimationType.FADE];
      const selector = useWallpaperAnimationSelector({ excludedAnimations });
      const animations = selector.getAvailableAnimations();

      expect(animations).not.toContain(AnimationType.FADE);
      expect(animations.length).toBeGreaterThan(0);
    });

    it('应该同时处理启用和排除列表', () => {
      const enabledAnimations = [
        AnimationType.FADE,
        AnimationType.ZOOM_IN,
        AnimationType.SLIDE_LEFT,
      ];
      const excludedAnimations = [AnimationType.FADE];
      const selector = useWallpaperAnimationSelector({
        enabledAnimations,
        excludedAnimations,
      });
      const animations = selector.getAvailableAnimations();

      expect(animations).toEqual([
        AnimationType.ZOOM_IN,
        AnimationType.SLIDE_LEFT,
      ]);
      expect(animations).not.toContain(AnimationType.FADE);
    });

    it('应该过滤掉无效的动画类型', () => {
      const enabledAnimations = [
        AnimationType.FADE,
        'invalidType',
        AnimationType.ZOOM_IN,
      ];
      const selector = useWallpaperAnimationSelector({ enabledAnimations });
      const animations = selector.getAvailableAnimations();

      expect(animations).toEqual([AnimationType.FADE, AnimationType.ZOOM_IN]);
      expect(animations).not.toContain('invalidType');
    });
  });

  describe('selectRandomAnimation', () => {
    it('应该返回一个有效的动画类型', () => {
      const selector = useWallpaperAnimationSelector();
      const selected = selector.selectRandomAnimation();

      expect(selected).toBeTruthy();
      expect(typeof selected).toBe('string');
    });

    it('应该更新 lastAnimationType', () => {
      const selector = useWallpaperAnimationSelector();
      const selected = selector.selectRandomAnimation();

      expect(selector.lastAnimationType.value).toBe(selected);
    });

    it('默认情况下应该避免连续选择相同的动画', () => {
      const selector = useWallpaperAnimationSelector();

      // 使用足够多的样本来测试（至少有2个可选动画时）
      const availableAnimations = selector.getAvailableAnimations();
      if (availableAnimations.length > 1) {
        const first = selector.selectRandomAnimation();
        let differentCount = 0;

        // 测试多次，应该至少有一次不同
        for (let i = 0; i < 20; i++) {
          const next = selector.selectRandomAnimation();
          if (next !== first) {
            differentCount++;
          }
        }

        expect(differentCount).toBeGreaterThan(0);
      }
    });

    it('当 allowRepeat=true 时应该允许重复', () => {
      const enabledAnimations = [AnimationType.FADE, AnimationType.ZOOM_IN];
      const selector = useWallpaperAnimationSelector({ enabledAnimations });

      selector.selectRandomAnimation();
      const second = selector.selectRandomAnimation(true);

      expect([AnimationType.FADE, AnimationType.ZOOM_IN]).toContain(second);
    });

    it('只有一个可选动画时应该总是返回那个动画', () => {
      const enabledAnimations = [AnimationType.FADE];
      const selector = useWallpaperAnimationSelector({ enabledAnimations });

      const first = selector.selectRandomAnimation();
      const second = selector.selectRandomAnimation();

      expect(first).toBe(AnimationType.FADE);
      expect(second).toBe(AnimationType.FADE);
    });

    it('没有可用动画时应该返回 null', () => {
      const selector = useWallpaperAnimationSelector({
        enabledAnimations: [],
      });

      const selected = selector.selectRandomAnimation();
      expect(selected).toBeNull();
    });

    it('应该记录警告当没有可用动画时', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const selector = useWallpaperAnimationSelector({
        enabledAnimations: [],
      });

      selector.selectRandomAnimation();
      expect(consoleSpy).toHaveBeenCalledWith('没有可用的动画类型');

      consoleSpy.mockRestore();
    });

    it('应该从可用动画中随机选择', () => {
      const enabledAnimations = [
        AnimationType.FADE,
        AnimationType.ZOOM_IN,
        AnimationType.SLIDE_LEFT,
      ];
      const selector = useWallpaperAnimationSelector({ enabledAnimations });

      const selections = new Set();
      // 多次选择，应该能选到不同的动画
      for (let i = 0; i < 30; i++) {
        const selected = selector.selectRandomAnimation(true);
        selections.add(selected);
      }

      // 至少应该选到2种不同的动画（概率极高）
      expect(selections.size).toBeGreaterThan(1);
    });
  });

  describe('reset', () => {
    it('应该重置 lastAnimationType 为 null', () => {
      const selector = useWallpaperAnimationSelector();

      selector.selectRandomAnimation();
      expect(selector.lastAnimationType.value).not.toBeNull();

      selector.reset();
      expect(selector.lastAnimationType.value).toBeNull();
    });
  });

  describe('setLastAnimationType', () => {
    it('应该设置有效的动画类型', () => {
      const selector = useWallpaperAnimationSelector();

      selector.setLastAnimationType(AnimationType.FADE);
      expect(selector.lastAnimationType.value).toBe(AnimationType.FADE);
    });

    it('应该忽略无效的动画类型', () => {
      const selector = useWallpaperAnimationSelector();

      selector.setLastAnimationType('invalidType');
      expect(selector.lastAnimationType.value).toBeNull();
    });

    it('应该影响后续的随机选择', () => {
      const enabledAnimations = [AnimationType.FADE, AnimationType.ZOOM_IN];
      const selector = useWallpaperAnimationSelector({ enabledAnimations });

      selector.setLastAnimationType(AnimationType.FADE);

      // 下次选择应该避免 FADE（如果有其他选项）
      const selections = new Set();
      for (let i = 0; i < 10; i++) {
        const selected = selector.selectRandomAnimation();
        selections.add(selected);
      }

      expect(selections.has(AnimationType.ZOOM_IN)).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的排除列表', () => {
      const selector = useWallpaperAnimationSelector({
        excludedAnimations: [],
      });

      const animations = selector.getAvailableAnimations();
      expect(animations.length).toBeGreaterThan(0);
    });

    it('应该处理 null 作为启用动画列表', () => {
      const selector = useWallpaperAnimationSelector({
        enabledAnimations: null,
      });

      const animations = selector.getAvailableAnimations();
      expect(animations.length).toBeGreaterThan(0);
    });

    it('应该处理重复的排除项', () => {
      const excludedAnimations = [
        AnimationType.FADE,
        AnimationType.FADE,
        AnimationType.ZOOM_IN,
      ];
      const selector = useWallpaperAnimationSelector({ excludedAnimations });

      const animations = selector.getAvailableAnimations();
      expect(animations).not.toContain(AnimationType.FADE);
      expect(animations).not.toContain(AnimationType.ZOOM_IN);
    });
  });

  describe('随机性测试', () => {
    it('多次调用应该产生不同的分布', () => {
      const enabledAnimations = [
        AnimationType.FADE,
        AnimationType.ZOOM_IN,
        AnimationType.SLIDE_LEFT,
        AnimationType.SLIDE_RIGHT,
      ];
      const selector = useWallpaperAnimationSelector({ enabledAnimations });

      const counts = {};
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const selected = selector.selectRandomAnimation(true);
        counts[selected] = (counts[selected] || 0) + 1;
      }

      // 每个动画至少应该被选中一次
      enabledAnimations.forEach(type => {
        expect(counts[type]).toBeGreaterThan(0);
      });

      // 不应该有某个动画被选中了所有次数
      enabledAnimations.forEach(type => {
        expect(counts[type]).toBeLessThan(iterations);
      });
    });
  });
});
