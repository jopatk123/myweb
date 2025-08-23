exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('apps')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('apps').insert([
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
      ]);
    });
};
