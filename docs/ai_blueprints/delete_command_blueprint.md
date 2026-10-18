# AI Execution Blueprint: First-Class `DELETE` Command
> **Status:** COMPLETED / IN PRODUCTION

## 1. Overview & Objective
This blueprint defines the architectural changes, validation rules, and atomic execution prompts required to introduce a native `DELETE` directive to the patch engine.

### Desired Syntax:
```text
DELETE: 'path/to/file.ext'
# or
RM: path/to/file.ext
```

### Key Principles:
1. **Symmetry with `MOVE`**: Structural file operations (move, rename, delete) must remain one-line directives evaluated outside the search-and-replace text matching engine.
2. **Transactional Integrity**: Like file edits, deletions must be validated upfront during the preflight phase and only executed if all batch changes pass validation.
3. **Safety Guardrails**: Critical system configuration files (`package.json`, `tsconfig.json`, `server/index.ts`) must be protected from accidental automated deletion.

---

## 2. Architectural Impact Matrix

| Layer | Target File(s) | Responsibility |
| :--- | :--- | :--- |
| **Contracts & Types** | `src/types/patch.ts` | Extend `DiffBlock.type` (`"delete"`) and `DiffBlock.changeType` (`"DELETE"`). |
| **Parser** | `src/features/prompt-builder/utils/diffParser.ts` | Parse `DELETE:` and `RM:` idle lines into structured `DiffBlock` instances. |
| **Client Validation** | `src/features/prompt-builder/utils/blockMatcher.ts` | Validate file existence in candidate tree; prevent redundant duplicate deletions. |
| **OS / Git Adapters** | `server/adapters/fsAdapter.ts`<br>`server/adapters/gitAdapter.ts` | Add `deleteFile` (`fs.unlinkSync`) and `gitRemoveFile` (`git rm -f`). |
| **Server Engine** | `server/services/applyPatchService.ts` | Implement `validateDeleteBlocks` & `applyDeleteBlocks` within the write pipeline. |
| **UI Components** | `src/features/prompt-builder/components/diff/DiffBlockCard.tsx`<br>`DiffBlockList.tsx` | Render deletion cards with distinct visual cues (danger styling, destination omitted). |

---

## 3. Critical Failure Modes & Protections

1. **Deletion of Non-Existent Files**: Preflight validation must flag warnings or errors if `fileExists(path)` is false.
2. **Deleting Critical Repository Anchor Files**: Rejection if target matches `CRITICAL_FILES` list unless an override flag is present.
3. **Ordering Dependency (Edit then Delete vs Delete then Edit)**:
   - If a prompt specifies an `EDIT` on a file and also a `DELETE`, the preflight validator must fail immediately with a collision error.
4. **Git Staging Cleanliness**: Use `git rm` where applicable to ensure git tracks the removal in the upcoming commit stage.

---

## 4. Minimal-Prompt Execution Plan (3 Atomic Prompts)

To achieve maximum LLM precision with zero hallucination and no offset drift, implement this feature across three isolated, sequential prompts.

---

### Prompt 1 of 3: Types & Parser Foundation
```text
TASK: Extend patch types and diffParser to support DELETE commands.

1. In `src/types/patch.ts`:
   - Extend DiffBlock.type to include "delete":
     type?: "edit" | "move" | "delete";
   - Extend DiffBlock.changeType to include "DELETE":
     changeType: "CREATE" | "EDIT" | "MOVE" | "RENAME" | "DELETE";

2. In `src/features/prompt-builder/utils/diffParser.ts`:
   - In `parseIdleLine`:
     Add regex matching for DELETE directives:
     /^(DELETE|RM|Delete|Rm)\s*:?\s*[`"']?([^`"'\n]+?)[`"']?$/i
   - Return a `deleteBlock?: DiffBlock` when matched:
     {
       id: "",
       file: targetPath,
       status: "match",
       search: "",
       replace: "",
       type: "delete",
       changeType: "DELETE"
     }
   - In `parseDiffBlocks`:
     Register and assign index to `deleteBlock` identically to how `moveBlock` is handled.

Emit exact SEARCH/REPLACE blocks for both files.
```

---

### Prompt 2 of 3: Adapters & Backend Application Pipeline
```text
TASK: Implement backend deletion execution and transaction validation.

1. In `server/adapters/fsAdapter.ts`:
   - Export `deleteFile(targetPath: string): void` using `fs.unlinkSync` (guarding against missing file errors).

2. In `server/adapters/gitAdapter.ts`:
   - Export `gitRemoveFile(repoPath: string, relativePath: string): void` executing `git rm -f --ignore-unmatch`.

3. In `server/services/applyPatchService.ts`:
   - Import `deleteFile` from `../adapters/fsAdapter` and `gitRemoveFile` from `../adapters/gitAdapter`.
   - Export `validateDeleteBlocks(targetRepoPath: string, deleteBlocks: DiffBlockInput[]): string[]`:
     - Error if `block.file` does not exist on disk.
     - Error if `block.file` matches any of `CRITICAL_FILES`.
   - Export `applyDeleteBlocks(targetRepoPath: string, deleteBlocks: DiffBlockInput[]): string[]`:
     - Try `gitRemoveFile`; fallback to `deleteFile` if untracked.
     - Return array of deleted file paths.
   - Integrate `validateDeleteBlocks` and `applyDeleteBlocks` into the main apply transaction flow.

Emit exact SEARCH/REPLACE blocks.
```

---

### Prompt 3 of 3: UI Visualization & Client Preflight Validation
```text
TASK: Add UI card and preflight validation for DELETE blocks.

1. In `src/features/prompt-builder/utils/blockMatcher.ts`:
   - In `validateBlocks`:
     - If `block.type === "delete"` or `block.changeType === "DELETE"`, ensure file exists in known file list.
     - Detect conflicting edits (cannot EDIT and DELETE the same file).

2. In `src/features/prompt-builder/components/diff/DiffBlockCard.tsx` (or a sibling `DeleteBlockCard.tsx`):
   - Render a dedicated red/rose banner for "DELETE FILE":
     - Clearly displays: "File will be permanently removed: [file path]"
     - Suppresses search/replace diff body lines since content is empty.
     - Supports toggle ignore and error display.

Emit exact SEARCH/REPLACE blocks.
```

---

## 5. Acceptance Criteria Checklist

- [x] `DELETE: 'src/oldFile.ts'` parses into a `DiffBlock` with `changeType: "DELETE"`.
- [x] `RM: src/oldFile.ts` (without quotes) parses identically.
- [x] File exists check runs during preflight; missing file raises clear validation error.
- [x] Attempting to delete `package.json` or `tsconfig.json` triggers a critical file rejection.
- [x] Applying changes calls `git rm` and deletes the file from disk.
- [x] The committed git changeset records the file deletion cleanly.