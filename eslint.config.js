import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import vueEslintParser from 'vue-eslint-parser';

const vueRecommended = pluginVue.configs['flat/vue3-recommended'] ?? [];
const vueConfigArray = Array.isArray(vueRecommended) ? vueRecommended : [vueRecommended];

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
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
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
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
    files: ['server/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    files: [
      '**/vite.config.{js,mjs,cjs}',
      '**/jest.config.{js,mjs,cjs}',
      '**/eslint.config.{js,mjs,cjs}',
      '**/*.config.{js,mjs,cjs}',
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
      '**/*.test.js',
      '**/*.spec.js',
      'tests/**/*.js',
      'client/tests/**/*.js',
      'server/tests/**/*.js',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{js,vue}'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  eslintConfigPrettier,
];
