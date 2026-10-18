# AI Execution Blueprint: Semantic AST Symbol Rename (`REFACTOR_RENAME`)

> **Status:** READY FOR IMPLEMENTATION

## 1. Overview & Objective
Renaming an exported interface, type, or function that is imported across 10–20 files currently requires the AI to emit dozens of individual text-based `SEARCH/REPLACE` blocks. If any import path or file is missed, compilation breaks. This blueprint introduces a semantic `RENAME SYMBOL:` directive executed using the TypeScript Language Service, updating all references across the codebase in a single atomic transaction.

### Desired Syntax:
```text
RENAME SYMBOL: 'DiffBlock' -> 'PatchBlock' IN 'src/types/patch.ts'
RENAME SYMBOL: 'gitMoveFile' -> 'relocateFile' IN 'server/adapters/gitAdapter.ts' --project
```

---

## 2. Architectural Impact Matrix

| Layer | Target File(s) | Responsibility |
| :--- | :--- | :--- |
| **Backend Service** | `server/services/refactorService.ts` *(new)* | Host a TypeScript `LanguageService` instance; call `findRenameLocations` and calculate workspace file edits. |
| **Parser** | `src/features/prompt-builder/utils/diffParser.ts` | Parse `RENAME SYMBOL:` directive into a structured `DiffBlock`. |
| **Pipeline** | `server/services/applyPipeline.ts`<br>`server/services/applyPatchService.ts` | Apply multi-file refactoring edits to `pendingWrites` before committing. |
| **UI** | `src/features/prompt-builder/components/diff/DiffBlockCard.tsx` | Render a "Symbol Rename" card displaying affected files and reference count. |

---

## 3. Failure Modes & Guardrails

1. **Colliding Symbol Names**: Recheck project diagnostics after renaming to ensure the new symbol does not collide with an existing identifier in any referencing file.
2. **String & Comment False Positives**: Language Service must only rename semantic identifier AST references, leaving matching strings or unrelated variable names intact.
3. **Dirty Workspace**: Abort rename if referenced files have uncommitted non-simulated disk conflicts.

---

## 4. Minimal-Prompt Execution Plan

### Prompt 1: TypeScript Language Service Refactoring Engine
```text
TASK: Implement findRenameLocations using TypeScript LanguageService.

REQUIRED FILE CONTEXT (Must be seen before editing):
- server/services/astMatcher.ts — need TypeScript compiler host setup and ScriptKind resolution
- server/adapters/fsAdapter.ts — need fileExists and readTextFile primitives

INSTRUCTIONS:
1. Create `server/services/refactorService.ts`:
   - Initialize a memory-backed `ts.LanguageService` over the target repository files.
   - Export `function computeSymbolRename(repoPath: string, filePath: string, oldName: string, newName: string): Map<string, string>`:
     - Locate symbol offset in `filePath`.
     - Call `languageService.findRenameLocations(filePath, offset, false, false)`.
     - Apply string substitutions in reverse offset order on each affected file buffer.
     - Return Map of `[filePath, updatedFileContent]`.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 2: Parser & Pipeline Integration
```text
TASK: Parse RENAME SYMBOL directive and integrate computed writes into applyPipeline.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/types/patch.ts — need DiffBlock definition to add rename metadata
- src/features/prompt-builder/utils/diffParser.ts — need parseIdleLine to add regex for RENAME SYMBOL
- server/services/applyPipeline.ts — need executeApplyWrites to fold refactorService writes into pendingWrites

INSTRUCTIONS:
1. In `src/types/patch.ts`:
   - Add `type: "refactor"` and `changeType: "REFACTOR_RENAME"`.
   - Add `renameSpec?: { oldName: string; newName: string; file: string }`.
2. In `src/features/prompt-builder/utils/diffParser.ts`:
   - Match `^RENAME SYMBOL:\s*[`"']?([^`"'\n]+?)[`"']?\s*(?:->|→|to)\s*[`"']?([^`"'\n]+?)[`"']?\s+IN\s+[`"']?([^`"'\n]+?)[`"']?$/i`.
3. In `server/services/applyPipeline.ts`:
   - Prior to regular edit blocks, compute symbol renames and merge resulting buffers into `pendingWrites`.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 3: UI Symbol Rename Card
```text
TASK: Add UI card for semantic symbol refactoring.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/features/prompt-builder/components/diff/DiffBlockCard.tsx — need card routing
- src/features/prompt-builder/components/diff/StatusBadge.tsx — need StatusBadgeProps to display "REFACTOR"

INSTRUCTIONS:
1. Create `src/features/prompt-builder/components/diff/RefactorBlockCard.tsx`:
   - Display old symbol name, arrow, new symbol name, and source file.
   - Show status badge with "Refactor" pill.
2. Route `block.changeType === "REFACTOR_RENAME"` in `DiffBlockCard.tsx`.

Emit exact SEARCH/REPLACE blocks.
```

---

## 5. Acceptance Criteria Checklist

- [ ] `RENAME SYMBOL: 'OldType' -> 'NewType' IN 'src/types.ts'` renames declaration and all cross-file imports.
- [ ] Unrelated variables with the same name in other scopes are unaffected.
- [ ] Matches inside strings or comments are not inadvertently altered.
- [ ] All modified files are staged and committed together cleanly.