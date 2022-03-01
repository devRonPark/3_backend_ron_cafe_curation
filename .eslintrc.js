module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    'airbnb-base',
    "plugin:prettier/recommended"
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
  },
};
