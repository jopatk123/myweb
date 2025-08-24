export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('apps').del();
  // Inserts seed entries
  await knex('apps').insert([
    {
      name: '贪吃蛇',
      slug: 'snake',
      description: '经典小游戏（本地实现示例）',
      icon_filename: 'snake-128.png',
      is_visible: 1,
      is_builtin: 1,
    },
    {
      name: '计算器',
      slug: 'calculator',
      description: '科学计算器',
      icon_filename: 'calculator-128.png',
      is_visible: 1,
      is_builtin: 1,
    },
    {
      name: '笔记本',
      slug: 'notebook',
      description: '待办事项管理',
      icon_filename: 'notebook-128.svg',
      is_visible: 1,
      is_builtin: 1,
    },
    {
      name: '小说阅读器',
      slug: 'novel-reader',
      description: '用于阅读本地小说文件，支持章节与进度管理',
      icon_filename: 'novel-reader.svg',
      is_visible: 1,
      is_builtin: 1,
    },
    {
      name: '下班计时器',
      slug: 'work-timer',
      description: '工作时间管理和下班倒计时',
      icon_filename: 'work-timer-128.svg',
      is_visible: 1,
      is_builtin: 1,
    },
    {
      name: '五子棋',
      slug: 'gomoku',
      description: '五子棋对战，挑战AI',
      icon_filename: 'gomoku-128.svg',
      is_visible: 1,
      is_builtin: 1,
    },
  ]);
}
