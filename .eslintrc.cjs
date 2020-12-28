module.exports = {
  parser: "babel-eslint",
  extends: [
    "eslint:recommended",
    "plugin:json/recommended"
  ],
  env: {
    es6: true,
    node: true
  },
  rules: {
    "no-undef": 0,
    "no-console": 0
  },
  ignorePatterns: [
    'lib/'
  ]
};
