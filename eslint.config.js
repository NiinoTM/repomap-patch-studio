// eslint.config.js
// Strategy 4 — size (4a) + layering/boundary (4b) guardrails.
// See governance_system_requirements.md.
//
// Rewritten after the src/features/prompt-builder migration. Element
// patterns below match the ACTUAL current tree (audited, not assumed):
//   src/features/*/components/**   (includes nested components/prompt/*,
//                                    components/diff/* subfolders)
//   src/features/*/hooks/*
//   src/features/*/utils/*
//   src/api/*
// The old src/components/*, src/hooks/*, src/utils/* patterns are GONE —
// they matched zero files after the move and made two rules silently
// inert. Don't reintroduce literal old paths; if files move again,
// update the patterns here in the same commit, not after.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

const boundaryElements = [
  { type: "adapters", pattern: "server/adapters/*" },
  { type: "services", pattern: "server/services/*" },
  { type: "routes", pattern: "server/routes/*" },
  { type: "feature-components", pattern: "src/features/*/components/**" },
  { type: "feature-hooks", pattern: "src/features/*/hooks/*" },
  { type: "feature-utils", pattern: "src/features/*/utils/*" },
  { type: "api", pattern: "src/api/*" },
  { type: "types", pattern: "src/types/**" },
];

export default tseslint.config(
  {
    ignores: ["dist/**", "build/**", "node_modules/**", "coverage/**"],
  },

  // Governance (size) + code quality, now merged and blocking — confirmed
  // decision, not an accident. js.configs.recommended and
  // tseslint.configs.recommended bring no-unused-vars, no-explicit-any,
  // no-empty, prefer-const, etc.
  js.configs.recommended,
  ...tseslint.configs.recommended,
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

      // Calibrated, not defaults: a hard "error" ban on `any` tends to
      // produce `as any` casts or disable-comments instead of real types,
      // which hides the escape hatch rather than removing it. Tighten to
      // "error" once existing violations are cleared.
      "@typescript-eslint/no-explicit-any": "warn",
      // These two stay "error" — swallowed errors are the highest-value
      // catch in the quality pass, not a style nit.
      "no-empty": "error",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },

  // .tsx gets a higher ceiling than .ts. Audited before adding this (see
  // DiffBlockCard.tsx, DiffPanel.tsx): JSX/Tailwind markup genuinely
  // inflates line count without indicating mixed responsibilities — both
  // files were confirmed pure-presentational (props in, JSX out, no hooks
  // beyond local UI state, no API calls) before this override was added.
  // This is NOT a blanket excuse for logic-heavy .tsx files — PromptPanel
  // .tsx was 414 lines and got extracted down to 247 rather than exempted,
  // because it had real mixed concerns (file-selection state, token math,
  // a direct API call) hiding inside the line count, not just markup. If
  // a .tsx file needs this override to pass, check what's actually inside
  // it first — don't assume it's "just JSX."
  {
    files: ["src/**/*.tsx"],
    rules: {
      "max-lines": ["error", { max: 350, skipBlankLines: true, skipComments: true }],
    },
  },

  // --- 4b: zero current violations — enforced as "error". ---
  {
    files: [
      "server/adapters/**/*.ts",
      "server/services/**/*.ts",
      "src/features/*/utils/**/*.{ts,tsx}",
    ],
    plugins: { boundaries },
    settings: { "boundaries/elements": boundaryElements },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "allow",
        policies: [
          {
            from: { element: { type: "adapters" } },
            disallow: [
              { to: { element: { type: "services" } } },
              { to: { element: { type: "routes" } } },
              { to: { element: { type: "feature-components" } } },
              { to: { element: { type: "feature-hooks" } } },
            ],
            message: "Adapters are the lowest layer and cannot import upwards.",
          },
          {
            from: { element: { type: "feature-utils" } },
            disallow: [
              { to: { element: { type: "services" } } },
              { to: { element: { type: "routes" } } },
              { to: { element: { type: "adapters" } } },
              { to: { element: { type: "feature-components" } } },
              { to: { element: { type: "feature-hooks" } } },
              { to: { element: { type: "api" } } },
            ],
            message: "Utils must remain pure — no app-layer or API imports.",
          },
          {
            from: { element: { type: "services" } },
            disallow: [{ to: { element: { type: "routes" } } }],
            message: "Services cannot import routes (downward flow only).",
          },
        ],
      }],
    },
  },

  // --- 4b: known debt — "warn" only. routes → adapters ---
  // All three route files currently import adapters directly; no service
  // layer sits between them yet. Promote to "error" once
  // services/patchService.ts exists and routes go through it instead.
  {
    files: ["server/routes/**/*.ts"],
    plugins: { boundaries },
    settings: { "boundaries/elements": boundaryElements },
    rules: {
      "boundaries/dependencies": ["warn", {
        default: "allow",
        policies: [
          {
            from: { element: { type: "routes" } },
            disallow: [{ to: { element: { type: "adapters" } } }],
            message: "Routes should not import adapters directly (Technical Debt) — go through services.",
          },
        ],
      }],
    },
  },

  // --- 4b: known debt — "warn" only. components → api ---
  // Uses boundaries (module-resolution based) instead of a
  // no-restricted-imports relative-depth hack, so it stays correct
  // regardless of how deeply a component file is nested
  // (components/prompt/*, components/diff/*, etc. all covered by the
  // same rule — no per-depth pattern to maintain).
  {
    files: ["src/features/*/components/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: { "boundaries/elements": boundaryElements },
    rules: {
      "boundaries/dependencies": ["warn", {
        default: "allow",
        policies: [
          {
            from: { element: { type: "feature-components" } },
            disallow: [{ to: { element: { type: "api" } } }],
            message: "Components should use hooks, not API directly (Technical Debt).",
          },
        ],
      }],
    },
  }
);