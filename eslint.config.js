// eslint.config.js
// Strategy 4a — size guardrail ONLY (see governance_system_requirements.md).
// Deliberately does NOT include js.configs.recommended or
// tseslint.configs.recommended: those bring general code-quality rules
// (no-unused-vars, no-explicit-any, no-empty, prefer-const, etc.) that
// are a separate concern from file-size/complexity governance and will
// fire a wave of unrelated errors on an existing codebase. Add them later,
// deliberately, as their own pass — see the note at the bottom of this file.

import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "build/**", "node_modules/**", "coverage/**"],
  },

  // Parser only — no rule set. We need the TS/TSX parser so files with
  // types, generics, and JSX parse correctly; we don't want the rules
  // that come bundled with typescript-eslint's "recommended" config.
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true }],
      complexity: ["warn", { max: 10 }],
    },
  },

  // Rollout carve-out — see STRATEGY_4A_SETUP.md. Shrink this, never grow it.
  {
    files: [
      "src/components/DiffPanel.tsx",
      "src/components/PromptPanel.tsx",
    ],
    rules: {
      "max-lines": "off",
    },
  }
);

// ---------------------------------------------------------------------
// NOTE — general code-quality rules (optional, separate decision):
// Your first eslint run also surfaced ~35 real issues unrelated to size
// governance — mostly unused variables in catch blocks (e.g.
// `catch (err) {}`), which usually means an error is being silently
// swallowed, plus several `any` types. Those are legitimate to fix, but
// they're a different task from file-size governance. If/when you want
// that pass, add back:
//   import js from "@eslint/js";
//   ...
//   js.configs.recommended,
//   ...tseslint.configs.recommended,
// as separate config entries, and tackle the resulting errors in their
// own PR rather than mixed into the governance rollout.
// ---------------------------------------------------------------------