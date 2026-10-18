# AI Execution Blueprint: Package Manager Directives (`INSTALL` / `UNINSTALL`)

> **Status:** READY FOR IMPLEMENTATION

## 1. Overview & Objective
When an AI introduces an external library, it frequently edits `package.json` directly. However, editing `package.json` leaves `node_modules` and `package-lock.json` un-synchronized, causing runtime import failures. This blueprint introduces native `INSTALL:` and `UNINSTALL:` directives executed directly by the backend package manager adapter.

### Desired Syntax:
```text
INSTALL: lucide-react@^1.0.0
INSTALL: @testing-library/react@^14.0.0 --dev
UNINSTALL: lodash
```

---

## 2. Architectural Impact Matrix

| Layer | Target File(s) | Responsibility |
| :--- | :--- | :--- |
| **Types** | `src/types/patch.ts` | Add `type: "package"`, `changeType: "INSTALL" \| "UNINSTALL"`, `packageSpec?: { name: string; isDev: boolean }`. |
| **Parser** | `src/features/prompt-builder/utils/diffParser.ts` | Parse `INSTALL:` and `UNINSTALL:` lines. |
| **Backend Adapter** | `server/adapters/packageManagerAdapter.ts` | Implement `installDependency(repoPath, spec, isDev)` and `uninstallDependency(repoPath, name)`. |
| **Pipeline** | `server/services/applyPipeline.ts` | Run package manager commands before lint/typecheck steps so subsequent code edits compile cleanly. |
| **UI** | `src/features/prompt-builder/components/diff/DiffBlockCard.tsx` | Render package directive cards with terminal package icons. |

---

## 3. Failure Modes & Guardrails

1. **Malicious Package Injection**: Whitelist characters in package names (`^[a-zA-Z0-9@/._-]+$`) to prevent shell injection via `execSync`.
2. **Offline / Lockfile Corruption**: Catch non-zero exit codes from `npm`/`pnpm`/`yarn` and capture `stderr` to return to the auto-heal prompt.
3. **Execution Order**: Packages MUST be installed before running linter or AST validation on edited files in the same transaction.

---

## 4. Minimal-Prompt Execution Plan

### Prompt 1: Types & Package Grammar Parser
```text
TASK: Extend patch types and diffParser to support INSTALL and UNINSTALL directives.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/types/patch.ts — need DiffBlock interface to add package properties
- src/features/prompt-builder/utils/diffParser.ts — need parseIdleLine to extract package names and flags

INSTRUCTIONS:
1. In `src/types/patch.ts`:
   - Extend `DiffBlock.type` to include `"package"`.
   - Extend `DiffBlock.changeType` to include `"INSTALL" | "UNINSTALL"`.
   - Add `packageSpec?: { name: string; isDev: boolean }` to `DiffBlock`.
2. In `src/features/prompt-builder/utils/diffParser.ts`:
   - Match `^(INSTALL|UNINSTALL)\s*:?\s*([^\s]+)(?:\s+(--dev|-D))?$/i`.
   - Extract package name and `--dev` flag.
   - Emit a DiffBlock with `type: "package"`, `changeType: "INSTALL" | "UNINSTALL"`.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 2: Adapter Implementation & Pipeline Staging
```text
TASK: Implement package install/uninstall primitives and integrate them into applyPipeline.

REQUIRED FILE CONTEXT (Must be seen before editing):
- server/adapters/packageManagerAdapter.ts — need existing detectPackageManager and execCommand functions
- server/services/applyPatchService.ts — need block sorting to handle package operations
- server/services/applyPipeline.ts — need executeApplyWrites to invoke package operations prior to formatting/linting

INSTRUCTIONS:
1. In `server/adapters/packageManagerAdapter.ts`:
   - Validate package name against `^[a-zA-Z0-9@/._-]+$` to eliminate shell injection.
   - Export `async function installPackage(repoPath: string, pkg: string, isDev: boolean): Promise<string>`.
   - Export `async function uninstallPackage(repoPath: string, pkg: string): Promise<string>`.
2. In `server/services/applyPipeline.ts`:
   - Partition blocks with `type === "package"`.
   - Execute package actions in a new stage `"packages"` before disk writes and formatting.
   - Stream installation stdout/stderr to runner.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 3: UI Feedback Card
```text
TASK: Create a dedicated package action card in the diff review panel.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/features/prompt-builder/components/diff/DiffBlockCard.tsx — need card routing to display package operations
- src/features/prompt-builder/components/diff/StatusBadge.tsx — need StatusBadgeProps to support INSTALL / UNINSTALL

INSTRUCTIONS:
1. Create `src/features/prompt-builder/components/diff/PackageBlockCard.tsx`:
   - Render package icon, package name, version, and `devDependency` pill.
   - Provide toggle ignore and validation error banner.
2. Route `block.type === "package"` in `DiffBlockCard.tsx`.

Emit exact SEARCH/REPLACE blocks.
```

---

## 5. Acceptance Criteria Checklist

- [ ] `INSTALL: zod@^3.22.0` parses into a DiffBlock with `changeType: "INSTALL"`.
- [ ] `INSTALL: vitest --dev` correctly sets `isDev: true`.
- [ ] Backend runs `npm install` (or pnpm/yarn) and updates `package.json` + lockfile on disk.
- [ ] Attempting to pass shell delimiters (`;`, `&&`, `|`) triggers validation rejection.
- [ ] Code edits referencing the new package pass subsequent TypeScript/ESLint checks.