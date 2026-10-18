# AI Execution Blueprint: Closed-Loop Test Execution (`RUN_TEST` / `VERIFY`)

> **Status:** READY FOR IMPLEMENTATION

## 1. Overview & Objective
This blueprint implements a test verification directive and feedback loop. While syntax and linter checks catch malformed syntax, they cannot verify runtime logic. By allowing the AI or user to trigger targeted test runs during the apply pipeline, any test failure `stdout`/`stderr` is directly piped into the `buildPipelineAutoHealPrompt`, allowing the AI to fix its own logical regressions before committing.

### Desired Syntax:
```text
TEST: 'src/features/prompt-builder/utils/diffParser.test.ts'
VERIFY: npm run test:unit
```

---

## 2. Architectural Impact Matrix

| Layer | Target File(s) | Responsibility |
| :--- | :--- | :--- |
| **Adapters** | `server/adapters/testRunnerAdapter.ts` *(new)* | Execute test commands (Vitest/Jest) with timeout and captured output streams. |
| **Pipeline** | `server/services/applyPipeline.ts` | Add optional post-apply test execution stage; pipe failed test assertions into auto-heal prompt. |
| **Types & API** | `src/types/api.ts`<br>`server/routes/patchRoutes.ts` | Support `runTests` option in `ApplyPayload` and return test assertion summaries in `ApplyResponse`. |
| **UI** | `src/features/prompt-builder/components/Footer.tsx`<br>`useApplyChanges.ts` | Add "Run Tests on Apply" checkbox and render test failure diagnostics drawer. |

---

## 3. Failure Modes & Guardrails

1. **Infinite Test Loops**: Limit test execution to a strict 30-second timeout to kill hanging processes or infinite loops.
2. **Flaky Tests**: Allow separating assertion failures from unexpected environment errors.
3. **Sensitive Test Output**: Truncate test output to 100 lines before embedding into the auto-heal prompt to prevent context exhaustion.

---

## 4. Minimal-Prompt Execution Plan

### Prompt 1: Backend Test Runner Adapter
```text
TASK: Create test runner adapter and route options for targeted test execution.

REQUIRED FILE CONTEXT (Must be seen before editing):
- server/adapters/packageManagerAdapter.ts — need execCommand pattern and cwd handling
- server/services/applyPipeline.ts — need ApplyPipelineOptions interface to extend options
- src/types/api.ts — need ApplyPayload to add test runner parameters

INSTRUCTIONS:
1. Create `server/adapters/testRunnerAdapter.ts`:
   - Export `async function runTargetedTest(repoPath: string, testTarget: string): Promise<{ success: boolean; output: string }>`:
     - Run `npx vitest run [target]` with 30s timeout.
     - Capture and format failed test assertions.
2. In `server/services/applyPipeline.ts`:
   - Add `testTarget?: string` to `ApplyPipelineOptions`.
   - In `executeApplyWrites`, add post-write stage `"test"` running `runTargetedTest`.
   - If tests fail, append test output to `validationErrors` so `buildPipelineAutoHealPrompt` embeds it.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 2: Auto-Heal Test Integration
```text
TASK: Enrich the auto-heal prompt generator with Vitest assertion diffs.

REQUIRED FILE CONTEXT (Must be seen before editing):
- server/services/applyPipeline.ts — need buildPipelineAutoHealPrompt to format test errors
- server/services/applyPatchService.ts — need buildValidationErrorResponse to include test failure sections

INSTRUCTIONS:
1. In `server/services/applyPipeline.ts`:
   - Enhance `buildPipelineAutoHealPrompt` to parse assertion diffs (e.g., `Expected: ... Received: ...`) and format them clearly under a `TEST ASSERTION FAILURES:` section.
   - Ensure the AI receives clear guidance to update the implementation rather than deleting test assertions.

Emit exact SEARCH/REPLACE blocks.
```

### Prompt 3: UI Trigger & Test Drawer
```text
TASK: Add test execution controls to the footer and display test failure details.

REQUIRED FILE CONTEXT (Must be seen before editing):
- src/features/prompt-builder/components/Footer.tsx — need action buttons to add "Verify Tests" toggle
- src/features/prompt-builder/hooks/useApplyChanges.ts — need apply options payload to send testTarget

INSTRUCTIONS:
1. In `src/features/prompt-builder/components/Footer.tsx`:
   - Add an optional "Run Tests" toggle button next to "Apply Changes".
2. In `src/features/prompt-builder/hooks/useApplyChanges.ts`:
   - Pass `testTarget` into API apply payload.
   - Surface test failure outputs into the existing validation error drawer.

Emit exact SEARCH/REPLACE blocks.
```

---

## 5. Acceptance Criteria Checklist

- [ ] Specifying `TEST: 'file.test.ts'` triggers Vitest execution after files are applied to disk.
- [ ] Passing tests allow commit stage to proceed uninterrupted.
- [ ] Failing test output is captured and returned in the pipeline response.
- [ ] The generated `autoHealPrompt` contains the exact assertion mismatch diff.
- [ ] Tests timeout safely after 30 seconds if code enters an infinite loop.