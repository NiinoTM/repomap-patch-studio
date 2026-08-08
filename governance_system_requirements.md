# Governance System for AI-Generated Modular Code

## Purpose

AI coding assistants default to monolithic single-file output because it's the
path of least token resistance. This document is a governance system —
prompting patterns, project structure, and *automated enforcement* — for
keeping AI-generated (and human-written) code aligned with the **Single
Responsibility Principle (SRP)** from the start of a project.

**Honest framing:** none of this *guarantees* compliance. An LLM can still
violate every rule in a single long response, and no linter can fully
detect a responsibility violation. What follows are layered mitigations
that catch most violations early and make the rest cheap to fix. Treat this
as risk reduction, not a guarantee.

A critical distinction drives this whole document: **line count measures
size, not responsibility.** A 240-line file can mix API calls, business
logic, and UI rendering and still pass a `max-lines: 250` check. A 260-line
file of nothing but validation schemas is perfectly single-purpose and
would get flagged for no good reason. Size limits are a *useful proxy* and
an early-warning signal, but they cannot enforce architecture on their own.
Enforcing architecture requires rules about which files are *allowed to
import which other files* — that's Strategy 4 below, and it's the part
most governance docs skip.

---

## Strategy 1: The "Golden System Instruction"

Inject this as a system prompt / custom instruction at the start of any
AI coding session:

```text
SYSTEM INSTRUCTION: MANDATORY MODULARITY & SRP GOVERNANCE

You are a Principal Software Architect. You must enforce strict Separation
of Concerns and Single Responsibility Principle (SRP) across all generated
code.

Strict Architectural Rules:

1. NO GOD FILES: No single file may exceed ~250 lines of code. If logic
   grows beyond this, split it into sub-components, custom hooks, or
   utility services. (This is a soft signal to guide your own generation —
   the project's linter enforces the hard limit; see Strategy 4.)

2. ONE DOMAIN PER FILE:
   - UI components MUST NOT contain business logic or raw fetch()/network
     calls. Delegate to hooks or service clients.
   - Separate UI from state/side-effects using Custom Hooks
     (`use[Feature].ts`).
   - Separate API calls into dedicated service clients
     (`api/[domain]Client.ts`).
   - Separate pure algorithms/formatters into pure utility files
     (`utils/[feature].ts`) with no framework imports.

3. BACKEND LAYERING (Express/Node/Go/Python):
   - Controllers/Routes only parse requests and shape HTTP responses.
     They must not contain business rules or direct DB queries.
   - Business logic lives in Service modules (`services/[domain]Service.ts`).
   - Database/filesystem/external-process operations live in Repository
     or Adapter modules (`adapters/[feature]Adapter.ts`).
   - Services may depend on adapters; adapters must never depend on
     services or controllers (no upward or sideways imports).

4. BLUEPRINT FIRST: Before writing implementation code for a new feature
   or project, output the proposed file tree and one-line responsibility
   for each file, and wait for approval before writing code.

5. DECLARE VIOLATIONS: If a request cannot be satisfied without violating
   one of these rules (e.g., "put it all in one file for simplicity"),
   say so explicitly and propose the compliant alternative instead of
   silently complying.
```

Rule 5 matters in practice: a person under deadline pressure will often
ask for the shortcut ("just put it all in one file"), and an assistant
that silently complies defeats the whole system. Making the pushback an
explicit instruction is more reliable than hoping the model infers it.

---

## Strategy 2: The Two-Phase Prompting Workflow

Never ask an AI "write a complete app that does X" — this reliably
produces a monolithic file. Split every non-trivial request into two
phases:

**Phase 1 — Architectural Blueprint (no code)**
> "I want to build [App Description]. Do NOT write any application code
> yet. First, design a modular file/folder structure following strict SRP
> (UI layer, Custom Hooks, API Client, Services, Utilities, and Types).
> Present the file tree and a one-line responsibility for each file."

**Phase 2 — Scoped Implementation (one layer at a time)**
> "The blueprint looks good. Now implement ONLY
> `server/services/patchEngine.ts` and its corresponding types. Do not
> write the UI, routes, or adapters yet."

Committing to a folder structure before generating code is the single
highest-leverage step in this whole system — it constrains every
subsequent generation to fit a shape that was already agreed on, rather
than leaving the model to invent structure under the pressure of also
writing logic. Keep phases small: one file or one tightly-scoped module
per request, not "now write the whole backend."

---

## Strategy 3: A Feature-Driven Directory Template

Start every project from a pre-built skeleton rather than a flat folder,
so there's no "figure out the structure later" moment for the AI to
default into a single file.

```
src/
├── api/                     # Pure API client layer (fetch/axios abstraction)
│   ├── client.ts
│   └── repoApi.ts
├── features/                # Feature-driven modular domains
│   └── prompt-builder/
│       ├── components/      # Presentation-only components (<100 lines each)
│       │   ├── FileTree.tsx
│       │   └── MentionPortal.tsx
│       ├── hooks/           # State, side-effects, event handlers
│       │   ├── useMentionSearch.ts
│       │   └── useSuggestedContext.ts
│       ├── utils/           # Pure algorithms (no React/framework imports)
│       │   ├── fuzzySearch.ts
│       │   └── promptTemplates.ts
│       └── PromptPanel.tsx  # Lightweight layout orchestrator (<100 lines)
├── types/                   # Shared TypeScript interfaces
└── utils/                   # App-wide global helpers (no feature-specific logic)
```

Backend equivalent:

```
server/
├── routes/         # Parse request, call one service, shape response — nothing else
├── services/        # Business logic, orchestration
├── adapters/         # DB, filesystem, external API, git, OS calls
├── types/
└── utils/
```

---

## Strategy 4: Automated Guardrails (Size *and* Architecture)

This is the part that actually enforces the rules above instead of just
stating them. It has two layers: a **size check** (cheap, catches the
obvious cases) and a **dependency/boundary check** (does the real work of
enforcing SRP and layering).

### 4a. Size check — ESLint `max-lines`

Use one number consistently across every tool in the pipeline. Pick a
single threshold — don't let the prompt say 250 and the pre-commit hook
say 300, since that just moves the goalposts and confuses contributors.
This document uses **250** everywhere.

**Use flat config, not `.eslintrc.json`.** Since ESLint v9 (April 2024),
flat config (`eslint.config.js` / `.mjs` / `.cjs`) is the default and the
legacy `.eslintrc.*` format is deprecated, with full removal planned for
v10. A new project should not start on a format that's already on its way
out — and if you're on ESLint 8 or earlier, flip `ESLINT_USE_FLAT_CONFIG`
or plan the migration rather than building new tooling on the old system.

```js
// eslint.config.js
export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true }],
      "complexity": ["warn", { max: 10 }]
    }
  }
];
```

Two practical differences from the old `.eslintrc.json` that matter once
you also add TypeScript/React plugins (Strategy 4b uses one):
- Plugins are imported as JS modules and referenced by object, not by
  string lookup in `node_modules` — e.g.
  `import boundaries from "eslint-plugin-boundaries"` then
  `plugins: { boundaries }`, instead of `"plugins": ["boundaries"]`.
- There's no directory-based cascade anymore. Flat config is one file at
  the project root with an array of config objects scoped by `files:`
  globs, rather than `.eslintrc` files inheriting from parent
  directories. This is actually a good fit for this document's goals —
  it makes it obvious, in one file, exactly which rules apply where,
  rather than leaving layering rules implicit in a directory tree.

Treat this as a smoke alarm, not a fire suppressant: it flags files worth
looking at, it does not confirm they're well-designed.

### 4b. Boundary check — the part most guides skip

Line count cannot tell you that a React component is making a raw
`fetch()` call, or that a controller is querying the database directly.
For that you need a tool that understands your folder structure as an
architecture and blocks illegal imports between layers. Two good options:

**Option A — `dependency-cruiser`** (framework-agnostic, works for
frontend or backend):

```bash
npm install --save-dev dependency-cruiser
```

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'no-fetch-in-components',
      comment: 'UI components must not call fetch/axios directly — use api/ or hooks/',
      severity: 'error',
      from: { path: '^src/features/.*/components' },
      to: { path: '^src/api' }
    },
    {
      name: 'controllers-no-db-access',
      comment: 'Routes/controllers must not import adapters directly — go through services',
      severity: 'error',
      from: { path: '^server/routes' },
      to: { path: '^server/adapters' }
    },
    {
      name: 'adapters-cannot-import-services',
      comment: 'Adapters are the lowest layer — no upward or sideways imports',
      severity: 'error',
      from: { path: '^server/adapters' },
      to: { path: '^server/(services|routes)' }
    },
    {
      name: 'utils-are-pure',
      comment: 'utils/ must not import framework code (React, Express, etc.)',
      severity: 'error',
      from: { path: '^src/utils' },
      to: { path: 'node_modules/(react|react-dom|express)' }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' }
  }
};
```

```bash
npx depcruise src server --config .dependency-cruiser.cjs
```

This is the piece that turns "controllers only parse requests" from an
aspiration in a prompt into a rule that fails CI when violated.

**Option B — `eslint-plugin-boundaries`** if you want the same enforcement
inside ESLint itself rather than as a separate tool:

```bash
npm install --save-dev eslint-plugin-boundaries
```

```js
// eslint.config.js
import boundaries from "eslint-plugin-boundaries";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "components", pattern: "src/features/*/components/*" },
        { type: "hooks", pattern: "src/features/*/hooks/*" },
        { type: "api", pattern: "src/api/*" }
      ]
    },
    rules: {
      "boundaries/element-types": ["error", {
        default: "disallow",
        rules: [
          { from: "components", allow: ["hooks"] },
          { from: "hooks", allow: ["api"] }
        ]
      }]
    }
  }
];
```

### 4c. Wire both into CI and pre-commit — not just local linting

A rule that only runs when a developer remembers to run it isn't
governance, it's a suggestion. Enforce it at two points:

```bash
# .husky/pre-commit
npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --max-warnings=0"]
  }
}
```

```yaml
# .github/workflows/ci.yml (excerpt)
- run: npx eslint . --max-warnings=0
- run: npx depcruise src server --config .dependency-cruiser.cjs
```

Pre-commit catches violations before they're even pushed; CI is the
backstop for anyone who bypasses hooks locally (`--no-verify`) or opens a
PR from a fork.

---

## What This System Cannot Do

Being direct about the limits, so the checklist below isn't oversold:

- **It cannot verify semantic correctness of a responsibility split.** A
  file can be under 250 lines, pass every dependency-cruiser rule, and
  still be badly designed — e.g., a "service" that's actually two
  unrelated services glued together. Boundary tools catch *layer*
  violations, not *cohesion* problems within a layer. That still needs
  human review.
- **It cannot stop the model from generating a huge single response** if
  a person's prompt explicitly overrides it (e.g., "ignore the file
  splitting, just give me one script"). Guardrails constrain committed
  code; they don't constrain what an assistant says in chat.
- **Thresholds are somewhat arbitrary.** 250 lines is a reasonable
  starting default, not a law of nature — a team with very verbose test
  fixtures or generated types may need a higher number or a per-directory
  override (`overrides` in ESLint config).

---

## Summary Checklist

| Step | Action | What it actually catches |
|---|---|---|
| 1. Prompt | Paste the Golden System Instruction into the AI session, including the "declare violations" rule. | Steers generation *before* code exists; weakest guarantee, cheapest to apply. |
| 2. Design | Require the file tree / blueprint before any code, in small scoped requests. | Prevents the AI from defaulting to one file under generation pressure. |
| 3. Structure | Start from the feature-driven directory skeleton. | Removes ambiguity about where new code belongs. |
| 4a. Size lint | `eslint max-lines: 250`, same number everywhere in the pipeline. | Flags oversized files as a proxy signal. |
| 4b. Boundary lint | `dependency-cruiser` or `eslint-plugin-boundaries` rules per layer. | Actually enforces "UI can't fetch," "controllers can't query DB" — the part size checks can't do. |
| 4c. CI + pre-commit | Run both in Husky pre-commit *and* CI. | Makes enforcement non-optional instead of relying on memory. |
| 5. Review | Human review for cohesion within a layer. | Catches design smells no automated tool can see. |
