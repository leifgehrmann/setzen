// Used in order to work around a known limitation in ESLint.
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/eslint-config-airbnb-with-typescript',
  ],
  parserOptions: {
    project: [
      './tsconfig.json',
      './tsconfig.lint.json',
    ],
  },
};
