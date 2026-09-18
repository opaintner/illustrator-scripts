// eslint.config.js
const sharedRules = {
  // Disallow trailing commas everywhere:
  // arrays, objects, imports, exports, function calls, and parameters.
  "comma-dangle": ["error", "never"],

  "no-undef": "error",
  "no-unused-vars": "warn"
};

const globals = {
  app: "readonly",
  alert: "readonly",
  File: "readonly",
  Folder: "readonly",
  Window: "readonly",
  UnitValue: "readonly",
  doc: "readonly",
  SpotColor: "readonly",
  Transformation: "readonly",
  Justification: "readonly",
  TextType: "readonly",
  $: "readonly"
};

module.exports = [
  {
    files: ["src/**/*.js"],

    languageOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
      globals
    },

    rules: sharedRules
  },

  {
    files: ["dist/**/*.jsx"],

    languageOptions: {
      ecmaVersion: 3,
      sourceType: "script",
      globals
    },

    rules: sharedRules
  }
];
