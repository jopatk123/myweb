module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@babel/eslint-parser',
    requireConfigFile: false,
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/eslint-config-prettier'
  ],
  plugins: ['vue'],
  rules: {
    'no-unused-vars': 'warn'
  },
  overrides: [
    {
      files: ['**/*.js'],
      rules: {
        'no-unused-vars': 'warn'
      }
    }
  ]
};
