import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "components", pattern: "src/components/*" },
        { type: "hooks", pattern: "src/hooks/*" },
        { type: "utils", pattern: "src/utils/*" },
        { type: "api", pattern: "src/api/*" },
        { type: "features", pattern: "src/features/**/*" },
        { type: "routes", pattern: "server/routes/*" },
        { type: "services", pattern: "server/services/*" },
        { type: "adapters", pattern: "server/adapters/*" },
      ],
    },
    rules: {
      "max-lines": [
        "error",
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true }],
      complexity: ["warn", { max: 10 }],
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: "adapters",
              disallow: [
                "routes",
                "services",
                "utils",
                "components",
                "hooks",
                "api",
                "features",
              ],
              message:
                "Adapters are the lowest layer and cannot import upwards.",
            },
            {
              from: "utils",
              disallow: [
                "components",
                "hooks",
                "api",
                "features",
                "routes",
                "services",
                "adapters",
              ],
              message:
                "Utils must remain pure and cannot import feature or framework logic.",
            },
            {
              from: "services",
              disallow: ["routes"],
              message: "Services cannot import routes (downward flow only).",
            },
          ],
        },
      ],
    },
  },
  {
    // Soft warnings for existing backend debt (Routes -> Adapters)
    files: ["server/routes/**/*"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["*/adapters/*", "../adapters/*", "../../adapters/*"],
              message:
                "Routes should not import adapters directly. Go through services (Technical Debt).",
            },
          ],
        },
      ],
    },
  },
  {
    // Soft warnings for existing frontend debt (Components -> API)
    files: ["src/components/**/*", "src/features/*/components/**/*"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["*/api/*", "../api/*", "../../api/*", "../../../api/*"],
              message:
                "Components should use hooks, not API directly (Technical Debt).",
            },
          ],
        },
      ],
    },
  },
];
