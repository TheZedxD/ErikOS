export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: { window: 'readonly', document: 'readonly', navigator: 'readonly' }
    },
    rules: {}
  }
];
