/**
 * 壁纸切换动画配置
 * 定义多种动画效果及其CSS动画参数
 */

/**
 * 动画类型枚举
 * @readonly
 * @enum {string}
 */
export const AnimationType = {
  FADE: 'fade',
  SLIDE_LEFT: 'slideLeft',
  SLIDE_RIGHT: 'slideRight',
  SLIDE_UP: 'slideUp',
  SLIDE_DOWN: 'slideDown',
  ZOOM_IN: 'zoomIn',
  ZOOM_OUT: 'zoomOut',
  ROTATE_IN: 'rotateIn',
  FLIP_HORIZONTAL: 'flipHorizontal',
  FLIP_VERTICAL: 'flipVertical',
  BLUR_FADE: 'blurFade',
  SCALE_FADE: 'scaleFade',
};

/**
 * 动画配置接口
 * @typedef {Object} AnimationConfig
 * @property {string} name - 动画名称
 * @property {string} type - 动画类型
 * @property {number} duration - 动画持续时间（毫秒）
 * @property {string} timingFunction - 动画缓动函数
 * @property {Object} keyframes - CSS关键帧定义
 */

/**
 * 所有可用的动画效果配置
 * @type {Object.<string, AnimationConfig>}
 */
export const WALLPAPER_ANIMATIONS = {
  [AnimationType.FADE]: {
    name: '淡入淡出',
    type: AnimationType.FADE,
    duration: 800,
    timingFunction: 'ease-in-out',
    keyframes: {
      from: {
        opacity: 0,
      },
      to: {
        opacity: 1,
      },
    },
  },

  [AnimationType.SLIDE_LEFT]: {
    name: '从右滑入',
    type: AnimationType.SLIDE_LEFT,
    duration: 1000,
    timingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    keyframes: {
      from: {
        transform: 'translateX(100%)',
        opacity: 0,
      },
      to: {
        transform: 'translateX(0)',
        opacity: 1,
      },
    },
  },

  [AnimationType.SLIDE_RIGHT]: {
    name: '从左滑入',
    type: AnimationType.SLIDE_RIGHT,
    duration: 1000,
    timingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    keyframes: {
      from: {
        transform: 'translateX(-100%)',
        opacity: 0,
      },
      to: {
        transform: 'translateX(0)',
        opacity: 1,
      },
    },
  },

  [AnimationType.SLIDE_UP]: {
    name: '从下滑入',
    type: AnimationType.SLIDE_UP,
    duration: 1000,
    timingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    keyframes: {
      from: {
        transform: 'translateY(100%)',
        opacity: 0,
      },
      to: {
        transform: 'translateY(0)',
        opacity: 1,
      },
    },
  },

  [AnimationType.SLIDE_DOWN]: {
    name: '从上滑入',
    type: AnimationType.SLIDE_DOWN,
    duration: 1000,
    timingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    keyframes: {
      from: {
        transform: 'translateY(-100%)',
        opacity: 0,
      },
      to: {
        transform: 'translateY(0)',
        opacity: 1,
      },
    },
  },

  [AnimationType.ZOOM_IN]: {
    name: '缩放进入',
    type: AnimationType.ZOOM_IN,
    duration: 1200,
    timingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: {
      from: {
        transform: 'scale(0.5)',
        opacity: 0,
      },
      to: {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
  },

  [AnimationType.ZOOM_OUT]: {
    name: '放大进入',
    type: AnimationType.ZOOM_OUT,
    duration: 1200,
    timingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: {
      from: {
        transform: 'scale(1.5)',
        opacity: 0,
      },
      to: {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
  },

  [AnimationType.ROTATE_IN]: {
    name: '旋转进入',
    type: AnimationType.ROTATE_IN,
    duration: 1200,
    timingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: {
      from: {
        transform: 'rotate(-180deg) scale(0.5)',
        opacity: 0,
      },
      to: {
        transform: 'rotate(0deg) scale(1)',
        opacity: 1,
      },
    },
  },

  [AnimationType.FLIP_HORIZONTAL]: {
    name: '水平翻转',
    type: AnimationType.FLIP_HORIZONTAL,
    duration: 1000,
    timingFunction: 'ease-in-out',
    keyframes: {
      from: {
        transform: 'perspective(1000px) rotateY(-90deg)',
        opacity: 0,
      },
      to: {
        transform: 'perspective(1000px) rotateY(0deg)',
        opacity: 1,
      },
    },
  },

  [AnimationType.FLIP_VERTICAL]: {
    name: '垂直翻转',
    type: AnimationType.FLIP_VERTICAL,
    duration: 1000,
    timingFunction: 'ease-in-out',
    keyframes: {
      from: {
        transform: 'perspective(1000px) rotateX(-90deg)',
        opacity: 0,
      },
      to: {
        transform: 'perspective(1000px) rotateX(0deg)',
        opacity: 1,
      },
    },
  },

  [AnimationType.BLUR_FADE]: {
    name: '模糊淡入',
    type: AnimationType.BLUR_FADE,
    duration: 1000,
    timingFunction: 'ease-out',
    keyframes: {
      from: {
        filter: 'blur(20px)',
        opacity: 0,
      },
      to: {
        filter: 'blur(0px)',
        opacity: 1,
      },
    },
  },

  [AnimationType.SCALE_FADE]: {
    name: '缩放淡入',
    type: AnimationType.SCALE_FADE,
    duration: 1000,
    timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    keyframes: {
      from: {
        transform: 'scale(0.95)',
        opacity: 0,
      },
      '50%': {
        transform: 'scale(1.02)',
      },
      to: {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
  },
};

/**
 * 获取所有动画类型数组
 * @returns {string[]} 动画类型数组
 */
export function getAllAnimationTypes() {
  return Object.keys(WALLPAPER_ANIMATIONS);
}

/**
 * 根据类型获取动画配置
 * @param {string} type - 动画类型
 * @returns {AnimationConfig|null} 动画配置对象，如果不存在则返回null
 */
export function getAnimationConfig(type) {
  return WALLPAPER_ANIMATIONS[type] || null;
}

/**
 * 检查动画类型是否有效
 * @param {string} type - 动画类型
 * @returns {boolean} 是否有效
 */
export function isValidAnimationType(type) {
  return type in WALLPAPER_ANIMATIONS;
}

/**
 * 生成CSS关键帧动画规则
 * @param {string} animationName - 动画名称
 * @param {Object} keyframes - 关键帧定义
 * @returns {string} CSS动画规则字符串
 */
export function generateKeyframesCSS(animationName, keyframes) {
  const rules = Object.entries(keyframes)
    .map(([key, styles]) => {
      const styleStr = Object.entries(styles)
        .map(([prop, value]) => {
          // 转换驼峰命名为连字符命名
          const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `    ${cssProp}: ${value};`;
        })
        .join('\n');
      return `  ${key} {\n${styleStr}\n  }`;
    })
    .join('\n');

  return `@keyframes ${animationName} {\n${rules}\n}`;
}
