/**
 * 壁纸动画配置测试
 */

import { describe, it, expect } from 'vitest';
import {
  AnimationType,
  WALLPAPER_ANIMATIONS,
  getAllAnimationTypes,
  getAnimationConfig,
  isValidAnimationType,
  generateKeyframesCSS,
} from '@/constants/wallpaperAnimations.js';

describe('wallpaperAnimations', () => {
  describe('AnimationType', () => {
    it('应该定义所有动画类型常量', () => {
      expect(AnimationType.FADE).toBe('fade');
      expect(AnimationType.SLIDE_LEFT).toBe('slideLeft');
      expect(AnimationType.SLIDE_RIGHT).toBe('slideRight');
      expect(AnimationType.SLIDE_UP).toBe('slideUp');
      expect(AnimationType.SLIDE_DOWN).toBe('slideDown');
      expect(AnimationType.ZOOM_IN).toBe('zoomIn');
      expect(AnimationType.ZOOM_OUT).toBe('zoomOut');
      expect(AnimationType.ROTATE_IN).toBe('rotateIn');
      expect(AnimationType.FLIP_HORIZONTAL).toBe('flipHorizontal');
      expect(AnimationType.FLIP_VERTICAL).toBe('flipVertical');
      expect(AnimationType.BLUR_FADE).toBe('blurFade');
      expect(AnimationType.SCALE_FADE).toBe('scaleFade');
    });
  });

  describe('WALLPAPER_ANIMATIONS', () => {
    it('应该包含所有动画类型的配置', () => {
      const allTypes = Object.values(AnimationType);
      allTypes.forEach(type => {
        expect(WALLPAPER_ANIMATIONS).toHaveProperty(type);
      });
    });

    it('每个动画配置应该包含必需的属性', () => {
      Object.entries(WALLPAPER_ANIMATIONS).forEach(([key, config]) => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('type');
        expect(config).toHaveProperty('duration');
        expect(config).toHaveProperty('timingFunction');
        expect(config).toHaveProperty('keyframes');

        expect(typeof config.name).toBe('string');
        expect(typeof config.type).toBe('string');
        expect(typeof config.duration).toBe('number');
        expect(typeof config.timingFunction).toBe('string');
        expect(typeof config.keyframes).toBe('object');

        expect(config.duration).toBeGreaterThan(0);
        expect(config.type).toBe(key);
      });
    });

    it('每个动画的 keyframes 应该至少包含 from 和 to', () => {
      Object.values(WALLPAPER_ANIMATIONS).forEach(config => {
        const hasFromTo =
          Object.prototype.hasOwnProperty.call(config.keyframes, 'from') &&
          Object.prototype.hasOwnProperty.call(config.keyframes, 'to');
        const hasPercentages = Object.keys(config.keyframes).some(key =>
          key.includes('%')
        );

        // keyframes 应该有 from/to 或者百分比
        expect(hasFromTo || hasPercentages).toBe(true);
      });
    });
  });

  describe('getAllAnimationTypes', () => {
    it('应该返回所有动画类型的数组', () => {
      const types = getAllAnimationTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('fade');
      expect(types).toContain('slideLeft');
      expect(types).toContain('zoomIn');
    });

    it('返回的数组长度应该等于 AnimationType 的数量', () => {
      const types = getAllAnimationTypes();
      const enumSize = Object.keys(AnimationType).length;
      expect(types.length).toBe(enumSize);
    });
  });

  describe('getAnimationConfig', () => {
    it('应该返回有效类型的配置', () => {
      const config = getAnimationConfig(AnimationType.FADE);
      expect(config).not.toBeNull();
      expect(config.type).toBe(AnimationType.FADE);
      expect(config.name).toBe('淡入淡出');
    });

    it('应该返回所有已知类型的配置', () => {
      const types = getAllAnimationTypes();
      types.forEach(type => {
        const config = getAnimationConfig(type);
        expect(config).not.toBeNull();
        expect(config.type).toBe(type);
      });
    });

    it('对于无效类型应该返回 null', () => {
      const config = getAnimationConfig('invalidType');
      expect(config).toBeNull();
    });

    it('对于 undefined 或 null 应该返回 null', () => {
      expect(getAnimationConfig(undefined)).toBeNull();
      expect(getAnimationConfig(null)).toBeNull();
    });
  });

  describe('isValidAnimationType', () => {
    it('应该识别有效的动画类型', () => {
      expect(isValidAnimationType(AnimationType.FADE)).toBe(true);
      expect(isValidAnimationType(AnimationType.SLIDE_LEFT)).toBe(true);
      expect(isValidAnimationType(AnimationType.ZOOM_IN)).toBe(true);
    });

    it('应该拒绝无效的动画类型', () => {
      expect(isValidAnimationType('invalidType')).toBe(false);
      expect(isValidAnimationType('')).toBe(false);
      expect(isValidAnimationType(null)).toBe(false);
      expect(isValidAnimationType(undefined)).toBe(false);
      expect(isValidAnimationType(123)).toBe(false);
    });

    it('应该验证所有已知类型', () => {
      const types = getAllAnimationTypes();
      types.forEach(type => {
        expect(isValidAnimationType(type)).toBe(true);
      });
    });
  });

  describe('generateKeyframesCSS', () => {
    it('应该生成简单的 CSS 关键帧规则', () => {
      const keyframes = {
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const css = generateKeyframesCSS('testAnimation', keyframes);

      expect(css).toContain('@keyframes testAnimation');
      expect(css).toContain('from');
      expect(css).toContain('to');
      expect(css).toContain('opacity: 0');
      expect(css).toContain('opacity: 1');
    });

    it('应该将驼峰命名转换为连字符命名', () => {
      const keyframes = {
        from: {
          backgroundColor: 'red',
          fontSize: '16px',
        },
      };

      const css = generateKeyframesCSS('testAnimation', keyframes);

      expect(css).toContain('background-color: red');
      expect(css).toContain('font-size: 16px');
    });

    it('应该处理百分比关键帧', () => {
      const keyframes = {
        '0%': { opacity: 0 },
        '50%': { opacity: 0.5 },
        '100%': { opacity: 1 },
      };

      const css = generateKeyframesCSS('testAnimation', keyframes);

      expect(css).toContain('0%');
      expect(css).toContain('50%');
      expect(css).toContain('100%');
    });

    it('应该处理包含多个属性的关键帧', () => {
      const keyframes = {
        from: {
          transform: 'scale(0)',
          opacity: 0,
          filter: 'blur(10px)',
        },
      };

      const css = generateKeyframesCSS('testAnimation', keyframes);

      expect(css).toContain('transform: scale(0)');
      expect(css).toContain('opacity: 0');
      expect(css).toContain('filter: blur(10px)');
    });

    it('生成的 CSS 应该有正确的格式和缩进', () => {
      const keyframes = {
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const css = generateKeyframesCSS('testAnimation', keyframes);

      expect(css).toMatch(/@keyframes testAnimation \{/);
      expect(css).toMatch(/\n\}/);
    });

    it('应该能够生成实际动画配置的 CSS', () => {
      const fadeConfig = getAnimationConfig(AnimationType.FADE);
      const css = generateKeyframesCSS('fade', fadeConfig.keyframes);

      expect(css).toContain('@keyframes fade');
      expect(css).toContain('opacity');
    });
  });

  describe('动画配置完整性测试', () => {
    it('所有动画的持续时间应该在合理范围内', () => {
      Object.values(WALLPAPER_ANIMATIONS).forEach(config => {
        expect(config.duration).toBeGreaterThanOrEqual(300);
        expect(config.duration).toBeLessThanOrEqual(3000);
      });
    });

    it('所有动画应该有非空的名称', () => {
      Object.values(WALLPAPER_ANIMATIONS).forEach(config => {
        expect(config.name).toBeTruthy();
        expect(config.name.length).toBeGreaterThan(0);
      });
    });

    it('所有动画应该有有效的缓动函数', () => {
      const validTimingFunctions = [
        'ease',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'linear',
      ];

      Object.values(WALLPAPER_ANIMATIONS).forEach(config => {
        const isBuiltIn = validTimingFunctions.includes(config.timingFunction);
        const isCubicBezier = config.timingFunction.startsWith('cubic-bezier');

        expect(isBuiltIn || isCubicBezier).toBe(true);
      });
    });
  });
});
