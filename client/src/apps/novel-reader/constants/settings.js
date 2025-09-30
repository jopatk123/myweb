export const FONT_OPTIONS = [
  { label: '宋体', value: 'serif' },
  { label: '黑体', value: 'sans-serif' },
  { label: '等宽', value: 'monospace' },
];

export const THEME_OPTIONS = [
  { label: '明亮', value: 'light' },
  { label: '暗黑', value: 'dark' },
  { label: '护眼', value: 'sepia' },
];

export const PRESET_OPTIONS = [
  {
    name: '默认',
    settings: {
      fontSize: 16,
      lineHeight: 1.6,
      fontFamily: 'serif',
      theme: 'sepia',
      pageWidth: 800,
    },
  },
  {
    name: '大字体',
    settings: {
      fontSize: 20,
      lineHeight: 1.8,
      fontFamily: 'sans-serif',
      theme: 'light',
      pageWidth: 900,
    },
  },
  {
    name: '夜间模式',
    settings: {
      fontSize: 16,
      lineHeight: 1.7,
      fontFamily: 'serif',
      theme: 'dark',
      pageWidth: 800,
    },
  },
  {
    name: '护眼模式',
    settings: {
      fontSize: 18,
      lineHeight: 1.8,
      fontFamily: 'serif',
      theme: 'sepia',
      pageWidth: 750,
    },
  },
];

export const FONT_SIZE_RANGE = Object.freeze({ min: 12, max: 32, step: 1 });
export const LINE_HEIGHT_RANGE = Object.freeze({
  min: 1.2,
  max: 2.5,
  step: 0.1,
});
export const PAGE_WIDTH_RANGE = Object.freeze({
  min: 600,
  max: 1200,
  step: 50,
});

export const DEFAULT_READER_SETTINGS = Object.freeze({
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'serif',
  theme: 'sepia',
  pageWidth: 800,
  autoSave: true,
  autoMinimize: false,
});

export const FONT_FAMILY_MAP = Object.freeze({
  serif: '"Times New Roman", "SimSun", serif',
  'sans-serif': '"Helvetica Neue", "Microsoft YaHei", sans-serif',
  monospace: '"Courier New", "Consolas", monospace',
});
