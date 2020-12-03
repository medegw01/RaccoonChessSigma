module.exports = {
  root: true,
  plugins: ["@typescript-eslint", "sonarjs"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
  },
  settings: {
    jsdoc: {
      mode: "typescript",
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:sonarjs/recommended",
  ],
  rules: {
    //"no-console": 2, //TODO
  },
};
