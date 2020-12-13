module.exports = {
  root: true,
  plugins: ["@typescript-eslint", "sonarjs"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    project: ["./tsconfig.json"],
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
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:sonarjs/recommended",
  ],
  rules: {
    // security
    "sonarjs/cognitive-complexity": ["error", 50],
    "sonarjs/no-unused-collection": "off",

    // ESlint Default
    "no-warning-comments": [
      2,
      { terms: ["todo", "fixme", "bug"], location: "anywhere" },
    ],
    "no-multiple-empty-lines": "error",
    "no-proto": "error",

    // typescript-eslint
    "@typescript-eslint/no-empty-function": [
      "error",
      { allow: ["arrowFunctions"] },
    ],
    "@typescript-eslint/explicit-module-boundary-types": ["error"],
    "@typescript-eslint/no-non-null-assertion": ["error"],
    "@typescript-eslint/no-explicit-any": ["error"],
    "@typescript-eslint/no-non-null-assertion": "off",
    "sonarjs/no-duplicate-string": "off",
  },
};
