---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change.
license: MIT
compatibility: Requires OpenSpec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.7.0"
---

# Apply an OpenSpec Change

1. Select an active change from explicit input, current context, or the sole active change. If
   selection remains ambiguous, run `openspec list --json` and ask the user. Announce the selected
   change.
2. Run `openspec status --change "<name>" --json`. Stop for a blocked artifact state; use the
   returned planning root, task path, and context-file paths rather than guessing paths.
3. Run `openspec instructions apply --change "<name>" --json` with the same root selection.
   Read `context`, context files, current tasks, and every applicable guidance entry.
4. When the resolved task list contains `openspec-feedback:`, guidance is required before any
   target edit. Require valid JSON with an `operationGuidance` array containing an entry beginning
   `change-feedback-loop/apply:`. If lookup fails, JSON is invalid, or that entry is absent, stop
   before target edits, report the instruction-lookup boundary, and rerun
   `openspec instructions apply --change "<name>" --json` after the existing configuration or
   instruction surface is repaired.
5. For a feedback-lifecycle change, read `guidelines/change-feedback-loop.md`, complete the
   plan-review marker before the first target edit, and keep every actionable finding as an
   ordinary unchecked task. Guidance delivers current work context; it is not review proof or a
   deterministic verdict.
6. Implement the approved tasks in dependency order. Read the files named by OpenSpec before
   changing their owners, keep edits scoped, and mark each completed task `[x]` only after its
   done condition has real evidence. Pause for a new semantic/risk/permission decision or a
   design conflict.
7. Report progress and remaining tasks. Do not convert a guidance lookup, a conversation summary,
   or a completed review marker into evidence that implementation or verification passed.
