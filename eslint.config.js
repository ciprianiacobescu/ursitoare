// Gate configuration (L4 treats this file as gate config: a unit cannot change it; a person can).
// Architecture rules that units own are tests under test/arch/, not lint rules here.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["seed/**", "dist/**", "**/node_modules/**", "web/dist/**", "e2e/**", ".l4/**", ".l4-out/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    files: ["web/**/*.ts", "web/**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["test/**/*.ts", "**/*.test.ts", "scripts/**"],
    rules: { "no-console": "off" },
  },
);
