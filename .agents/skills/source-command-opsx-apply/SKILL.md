---
name: source-command-opsx-apply
description: Implement tasks from an OpenSpec change (Experimental).
---

# `/opsx:apply`

Use the project `openspec-apply-change` workflow for the selected change. Before any target edit,
run `openspec status --change "<name>" --json` and
`openspec instructions apply --change "<name>" --json`, then read the returned context files.

When `tasks.md` contains `openspec-feedback:`, require valid `operationGuidance` containing
`change-feedback-loop/apply:`. A failed or missing lookup stops apply before target edits and is
reported with the same instruction command as the rerun coordinate. Read
`guidelines/change-feedback-loop.md`, complete the plan-review marker before target edits, and
write every actionable finding as an ordinary pending task. Guidance is not completion proof.

Implement approved tasks in dependency order, preserve the selected change identity, and mark a
task complete only after its independently observable done condition is satisfied.
