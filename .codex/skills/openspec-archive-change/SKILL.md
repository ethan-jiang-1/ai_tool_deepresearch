---
name: openspec-archive-change
description: Archive a completed OpenSpec feedback-lifecycle change.
license: MIT
compatibility: Requires OpenSpec CLI and the project governance finalizer.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.7.0"
---

# Archive an OpenSpec Change

1. Select an active change from explicit input, current context, or the sole active change. If
   selection remains ambiguous, run `openspec list --json` and ask the user. Announce the selected
   change and keep its identity unchanged through every step.
2. Run `openspec status --change "<name>" --json`, then run
   `openspec instructions archive --change "<name>" --json` with the same root selection. Read
   current context, artifact paths, task path, and all returned guidance.
3. When the resolved task list contains `openspec-feedback:`, require valid JSON with an
   `operationGuidance` array containing an entry beginning `change-feedback-loop/archive:`. If
   lookup fails, JSON is invalid, or that entry is absent, stop before finalization, report the
   instruction-lookup boundary, and rerun
   `openspec instructions archive --change "<name>" --json` after the existing configuration or
   instruction surface is repaired. An unmarked change is outside this feedback-lifecycle entry.
4. Read `guidelines/change-feedback-loop.md` and perform the Agent-owned closeout review of the
   selected change-scoped actual diff, artifacts, and selected verification evidence. When a
   finding exists, add an ordinary unchecked task, leave the closeout marker open, and return to
   apply. Do not treat the marker or guidance as semantic proof.
5. For every delta spec, perform the Agent-owned sync and re-comparison before finalization. If
   the change cannot be scoped against unrelated local work or a delta/main comparison remains
   unresolved, stop at that boundary.
6. Only after all tasks are complete, make this final mechanical call:

   ```bash
   node openspec/governance/finalize-change-archive.mjs --change "<name>"
   ```

   Read its structured result. On `blocked`, repair only the named legal root and rerun the same
   command. Do not perform a raw move, invoke a separate native success path, or add a retry or
   rollback procedure.
