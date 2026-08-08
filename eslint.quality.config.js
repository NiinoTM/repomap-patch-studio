// eslint.quality.config.js
// General code-quality pass — SEPARATE from eslint.config.js (Strategy 4a).
// Deliberately kept in its own file so quality-rule violations never get
// mixed into governance/size-compliance metrics. Run explicitly via
// `npm run lint:quality`, not as part of the default `lint` script.
//
// Run: npx eslint . --config eslint.quality.config.js

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", "build/**", "node_modules/**", "coverage/**"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- Frontend (src/) — browser globals ---
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      // Downgraded from the plugin's default "error" — a hard ban tends to
      // produce `as any` casts and disable-comments instead of real types,
      // which hides the escape hatch rather than removing it. Start as a
      // visible warning, tighten to "error" once existing violations
      // (patchRoutes.ts, syntaxService.ts, patchEngine.ts, etc.) are cleared.
      "@typescript-eslint/no-explicit-any": "warn",

      // Empty catch blocks + unused error variables are the pattern that
      // actually matters here (silently swallowed errors). Keep these as
      // errors — they're the highest-value rules in this file.
      "no-empty": "error",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },

  // --- Backend (server/) — node globals ---
  {
    files: ["server/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": "error",
      "@typescript-eslint/no-unused-vars": "error",
    },
  }
);
