import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import vueEslintParser from 'vue-eslint-parser';

const vueRecommended = pluginVue.configs['flat/vue3-recommended'] ?? [];
const vueConfigArray = Array.isArray(vueRecommended)
  ? vueRecommended
  : [vueRecommended];

// 单文件有效行数上限：超过 800 行告警，超过 1000 行报错阻断 CI。
const MAX_LINES_WARN = 800;
const MAX_LINES_ERROR = 1000;

/**
 * 收集文件中所有注释的区间（按起始位置升序）。
 * `getAllComments()` 只覆盖 JS 注释；`.vue` 模板里的 `<!-- -->` 被
 * vue-eslint-parser 解析为 `HTMLComment` 节点而非注释 token，需从 AST 补充，
 * 否则模板注释会被当成有效代码行。
 * @param {import('eslint').SourceCode} sourceCode
 * @returns {Array<[number, number]>}
 */
function collectCommentRanges(sourceCode) {
  // 以起始位置为键去重：重复区间会让下面的区间替换逻辑错乱。
  const ranges = new Map();

  const add = range => {
    if (range) {
      ranges.set(range[0], range[1]);
    }
  };

  const walk = node => {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node.type === 'string' && node.type.endsWith('Comment')) {
      add(node.range);
      return;
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;

      walk(node[key]);
    }
  };

  sourceCode.getAllComments().forEach(comment => add(comment.range));
  walk(sourceCode.ast);

  return [...ranges.entries()].sort((a, b) => a[0] - b[0]);
}

/**
 * 统计有效行数：可忽略空行与纯注释行。
 * 注释按区间置为等长空白（保留换行），因此「代码 + 行尾注释」所在行仍会被计入。
 * @param {import('eslint').SourceCode} sourceCode
 * @param {{ skipBlankLines: boolean, skipComments: boolean }} options
 * @returns {number}
 */
function countEffectiveLines(sourceCode, { skipBlankLines, skipComments }) {
  const text = sourceCode.getText();
  let countable = text;

  if (skipComments) {
    let cursor = 0;
    let stripped = '';

    for (const [start, end] of collectCommentRanges(sourceCode)) {
      stripped +=
        text.slice(cursor, start) +
        text.slice(start, end).replace(/[^\n]/g, ' ');
      cursor = end;
    }

    countable = stripped + text.slice(cursor);
  }

  return countable
    .split('\n')
    .filter(line => !(skipBlankLines && line.trim() === '')).length;
}

/**
 * 限制单文件有效行数。
 * ESLint 内置 max-lines 仅支持单一阈值，无法同时表达「告警 + 阻断」，
 * 故本地实现该规则，并注册为两个规则名：报告的严重级别由配置项决定，
 * 无法在同一条规则里按条消息区分 warning / error。
 */
const maxLinesRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '限制单文件有效行数，超出阈值时报告，便于阅读与长期维护',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 1 },
          skipBlankLines: { type: 'boolean' },
          skipComments: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyLines:
        '文件有效行数为 {{count}} 行，超过 {{max}} 行上限，请拆分文件（便于阅读与长期维护）。',
    },
  },
  create(context) {
    const {
      max = MAX_LINES_ERROR,
      skipBlankLines = true,
      skipComments = true,
    } = context.options[0] ?? {};
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      Program(node) {
        const count = countEffectiveLines(sourceCode, {
          skipBlankLines,
          skipComments,
        });

        if (count > max) {
          context.report({
            node,
            messageId: 'tooManyLines',
            data: { count, max },
          });
        }
      },
    };
  },
};

const localPlugin = {
  rules: {
    'max-lines-warn': maxLinesRule,
    'max-lines-error': maxLinesRule,
  },
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'client/public/**',
      'server/logs/**',
      'server/data/**',
      'uploads/**',
      '*.log',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.es2021,
      },
    },
  },
  ...vueConfigArray,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      vue: pluginVue,
    },
    processor: 'vue/vue',
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['client/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        process: 'readonly',
      },
    },
  },
  {
    files: ['server/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    files: [
      '**/vite.config.{js,mjs}',
      '**/jest.config.{js,mjs}',
      '**/eslint.config.{js,mjs}',
      '**/*.config.{js,mjs}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: [
      '**/*.test.{js,mjs}',
      '**/*.spec.{js,mjs}',
      'tests/**/*.{js,mjs}',
      'client/tests/**/*.{js,mjs}',
      'server/tests/**/*.{js,mjs}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.vitest,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{js,vue}'],
    plugins: {
      local: localPlugin,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'local/max-lines-warn': [
        'warn',
        {
          max: MAX_LINES_WARN,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'local/max-lines-error': [
        'error',
        {
          max: MAX_LINES_ERROR,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  eslintConfigPrettier,
];
