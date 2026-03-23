export const BUILTIN_APP_DEFINITIONS = [
  {
    slug: 'calculator',
    name: '计算器',
    description: '科学计算器，支持基本运算和内存功能',
    iconFilename: 'calculator-128.png',
    visible: true,
    preferredSize: { width: 450, height: 680 },
  },
  {
    slug: 'notebook',
    name: '笔记本',
    description: '待办事项管理，记录和跟踪日常任务',
    iconFilename: 'notebook-128.svg',
    visible: true,
    preferredSize: { width: 500, height: 800 },
  },
  {
    slug: 'work-timer',
    name: '下班计时器',
    description: '工作时间管理和下班倒计时',
    iconFilename: 'work-timer-128.svg',
    visible: true,
    preferredSize: { width: 400, height: 700 },
  },
  {
    slug: 'message-board',
    name: '留言板',
    description: '用于站内留言与通知展示',
    iconFilename: 'message-board-128.svg',
    visible: false,
    preferredSize: { width: 530, height: 800 },
  },
];

export function getBuiltinAppDefinition(slug) {
  return BUILTIN_APP_DEFINITIONS.find(app => app.slug === slug) || null;
}

export function getBuiltinAppPublicIconPath(slug) {
  const app = getBuiltinAppDefinition(slug);
  return app?.iconFilename ? `/apps/icons/${app.iconFilename}` : '';
}
