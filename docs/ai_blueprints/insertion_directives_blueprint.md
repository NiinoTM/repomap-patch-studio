# AI Execution Blueprint: Zero-Drift Insertion Directives

> **Status:** READY FOR IMPLEMENTATION

## 1. Overview & Objective
This blueprint specifies additive insertion primitives (`INSERT AFTER`, `PREPEND TO`, and `APPEND TO`). These commands eliminate the need for an LLM to reproduce 10–20 lines of verbatim context in a `SEARCH` block merely to insert an import, add an interface, or register a new route, eliminating whitespace drift and search failures.

### Desired Syntax:
```text
INSERT AFTER "import { DiffBlock } from './patch';" IN 'src/utils/engine.ts'
<<<<<<< INSERT
import { DeleteBlock } from './delete';
>>>>>>> INSERT

APPEND TO 'src/types/patch.ts'
<<<<<<< CONTENT
export interface RollbackOptions {
  force?: boolean;
}
>>>>>>> CONTENT

PREPEND TO 'src/index.css'
<<<<<<< CONTENT
@import './theme.css';
>>>>>>> CONTENT
```

---

## 2. Architectural Impact Matrix

| Layer | Target File(s) | Responsibility |
| :--- | :--- | :--- |
| **Types** | `src/types/patch.ts`<br>`src/utils/patchMatcher.ts` | Add `"insert" \| "append" \| "prepend"` to `type` and `"INSERT" \| "APPEND" \| "PREPEND"` to `changeType`. |
| **Parser** | `src/features/prompt-builder/utils/diffParser.ts` | Match `INSERT AFTER`, `APPEND TO`, `PREPEND TO` headers and capture insert payload. |
| **Engine** | `src/utils/patchMatcher.ts`<br>`server/services/applyPatchService.ts` | Locate anchor string and splice payload into content string without fuzzy-token comment stripping. |
| **UI** | `src/features/prompt-builder/components/diff/DiffBlockCard.tsx`<br>`StatusBadge.tsx` | Render amber/violet placement cards showing anchor location and inserted lines. |

---

## 3. Failure Modes & Guardrails

1. **Missing Anchor in `INSERT AFTER`**: If the target anchor line is not found, preflight must fail with an unambiguous error: `"Anchor snippet not found in target file"`.
2. **Duplicate Insertion**: If the exact content to insert already exists in the file, treat as a no-op or collision to prevent infinite duplication upon re-runs.
3. **Empty Payloads**: Reject empty insertions at parse time.

---

## 4. Minimal-Prompt Execution Plan

### Prompt 1: Types & Grammar Lexer
```text
TASK: Extend patch grammar and parser to support INSERT AFTER, APPEND TO, and PREPEND TO.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/types/patch.ts — need DiffBlock definition to extend type and changeType
- src/utils/patchMatcher.ts — need DiffBlockInput interface to accept anchor and insertion types
- src/features/prompt-builder/utils/diffParser.ts — need parseIdleLine and parseDiffBlocks to add insertion state transitions

INSTRUCTIONS:
1. In `src/types/patch.ts` and `src/utils/patchMatcher.ts`:
   - Extend `type?: "edit" | "move" | "delete" | "insert" | "append" | "prepend"`.
   - Extend `changeType: "CREATE" | "EDIT" | "MOVE" | "RENAME" | "DELETE" | "INSERT" | "APPEND" | "PREPEND"`.
   - Add optional `anchor?: string` to DiffBlock and DiffBlockInput.
2. In `src/features/prompt-builder/utils/diffParser.ts`:
   - Add regex matching:
     - `/^INSERT AFTER\s+[`"'](.+?)[`"']\s+IN\s+[`"']?([^`"'\n]+?)[`"']?$/i`
     - `/^(APPEND|PREPEND)\s+TO\s+[`"']?([^`"'\n]+?)[`"']?$/i`
   - Handle transitions for `<<<<<<< INSERT` and `<<<<<<< CONTENT` ending in `>>>>>>> INSERT` or `>>>>>>> CONTENT`.
   - Stamp blocks with appropriate type, anchor, and replace payload.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 2: Core Splicing Engine & Validation
```text
TASK: Implement deterministic content insertion in patchMatcher and applyPatchService.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/utils/patchMatcher.ts — need applyBlockToContent to branch on insert/append/prepend
- src/features/prompt-builder/utils/blockMatcher.ts — need validateBlocks to simulate insertions into in-memory state
- server/services/applyPatchService.ts — need resolveEditWrites to ensure insertions apply in sequence

INSTRUCTIONS:
1. In `src/utils/patchMatcher.ts`:
   - Add `applyInsertion(content: string, block: DiffBlockInput): ApplyBlockResult`:
     - For `prepend`: Prepend `block.replace + "\n"` to content.
     - For `append`: Append `"\n" + block.replace` to content.
     - For `insert`: Find index of `block.anchor`. Splice `block.replace` directly after the anchor line. Return error if anchor missing.
   - Dispatch `applyInsertion` within `applyBlockToContent`.
2. In `src/features/prompt-builder/utils/blockMatcher.ts`:
   - Update `validateBlocks` to simulate insertions into `simulatedContents`.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 3: UI Card & Visual Diff
```text
TASK: Render insertion cards with anchor indicators in the diff review panel.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/features/prompt-builder/components/diff/DiffBlockCard.tsx — need card routing to render insertion blocks
- src/features/prompt-builder/components/diff/StatusBadge.tsx — need StatusBadgeProps to display "INSERT" / "APPEND" badges

INSTRUCTIONS:
1. In `StatusBadge.tsx`: Support badges for "Insert", "Append", and "Prepend".
2. In `DiffBlockCard.tsx`: When `block.type === "insert" | "append" | "prepend"`, render an insertion header displaying the target file and anchor line, showing only green added lines without red deletions.

Emit exact SEARCH/REPLACE blocks.
```

---

## 5. Acceptance Criteria Checklist

- [ ] `INSERT AFTER "..." IN 'file.ts'` accurately places lines after the anchor.
- [ ] `APPEND TO 'file.ts'` places lines at end of file with proper trailing newline.
- [ ] `PREPEND TO 'file.ts'` places lines at top of file.
- [ ] Missing anchor yields a preflight warning without touching the file.
- [ ] Sequential insertions into the same file stack deterministically.