# AI Execution Blueprint: Bounded Context Reads (`READ_RANGE` / `INSPECT_SYMBOL`)

> **Status:** COMPLETED / IN PRODUCTION

## 1. Overview & Objective
Large source files (300–800 lines) quickly consume LLM context windows and slow down response generation. Frequently, an AI only needs to inspect a single helper function or an interface definition within a large file. This blueprint introduces bounded context directives that extract only specific line ranges or AST symbol bodies, cutting context token usage by up to 80%.

### Desired Syntax:
```text
READ: 'server/adapters/gitAdapter.ts:[160-200]'
INSPECT: 'gitMoveFile' IN 'server/adapters/gitAdapter.ts'
```

---

## 2. Architectural Impact Matrix

| Layer | Target File(s) | Responsibility |
| :--- | :--- | :--- |
| **Backend Service** | `server/services/contractExtractorService.ts` | Implement AST node lookup by identifier name; extract symbol text with leading JSDoc. |
| **Backend Route** | `server/routes/repoRoutes.ts` | Add endpoint `/api/inspect-symbol` and `/api/read-range`. |
| **Frontend API** | `src/api/repoApi.ts`<br>`src/types/api.ts` | Add query client methods for bounded context requests. |
| **Prompt Builder** | `src/features/prompt-builder/hooks/usePromptActions.ts`<br>`utils/promptTemplates.ts` | Format bounded symbol snippets into active prompt context with file range headers. |

---

## 3. Failure Modes & Guardrails

1. **Symbol Not Found**: If an identifier name is not found in the file, fallback cleanly to returning the top-level contract signatures rather than throwing an error.
2. **Out-of-Bounds Range**: If requested lines exceed file bounds, clamp the range automatically (`Math.min(end, totalLines)`).
3. **Context Truncation Ambiguity**: Bounded snippets must include a header indicating partial extraction: `// Content extracted from lines 40-75 of path/file.ts`.

---

## 4. Minimal-Prompt Execution Plan

### Prompt 1: AST Node Locator & Range Reader
```text
TASK: Implement symbol extraction and line-slice utilities in contractExtractorService.

REQUIRED FILE CONTEXT (Must be seen before editing):
- server/adapters/fsAdapter.ts — need readTextFile and fileExists utilities
- server/services/contractExtractorService.ts — need existing TypeScript SourceFile parsing logic

INSTRUCTIONS:
1. In `server/services/contractExtractorService.ts`:
   - Export `function extractSymbolBody(content: string, filePath: string, symbolName: string): string | null`:
     - Parse AST with TypeScript compiler.
     - Traverse AST to find FunctionDeclaration, VariableDeclaration, ClassDeclaration, or InterfaceDeclaration matching `symbolName`.
     - Return full source text of that declaration including comments.
   - Export `function extractLineRange(content: string, startLine: number, endLine: number): string`:
     - Extract clamped line slice and format with file range comment banner.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 2: API Route & Endpoint Wiring
```text
TASK: Expose bounded context endpoints in repoRoutes.

REQUIRED FILE CONTEXT (Must be seen before editing):
- server/routes/repoRoutes.ts — need router setup and request parameter conventions
- src/types/api.ts — need request/response interface shapes

INSTRUCTIONS:
1. In `server/routes/repoRoutes.ts`:
   - Add POST `/api/bounded-read` accepting `{ repoPath, filePath, range?: [number, number], symbolName?: string }`.
   - Validate input with Zod schema.
   - Return `{ content: string, linesCount: number }`.
2. In `src/types/api.ts` & `src/api/repoApi.ts`:
   - Add `fetchBoundedContext(...)` client helper.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 3: Prompt Assembler & Mention Dropdown
```text
TASK: Allow prompt builder to inject partial file hunks into the active prompt context.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/features/prompt-builder/utils/promptTemplates.ts — need formatActiveFilesContext to support ranged snippets
- src/features/prompt-builder/hooks/usePromptActions.ts — need context fetching workflow

INSTRUCTIONS:
1. In `src/features/prompt-builder/utils/promptTemplates.ts`:
   - Enhance `formatActiveFilesContext` to render ranged headers: `--- START OF RANGE [L40-L75] in path.ts ---`.
2. In `src/features/prompt-builder/hooks/usePromptActions.ts`:
   - Support parsing `@filename:[10-50]` mentions and fetching bounded content.

Emit exact SEARCH/REPLACE blocks.
```

---

## 5. Acceptance Criteria Checklist

- [ ] Requesting `READ: 'file.ts:[10-40]'` returns exactly lines 10 through 40.
- [ ] Requesting `INSPECT: 'applyBlocksSequentially' IN 'patchEngine.ts'` extracts the complete function body without the rest of the file.
- [ ] Out-of-bounds line numbers are safely clamped without throwing.
- [ ] Partial file contexts contain clear boundary headers so the LLM understands it is seeing a snippet.