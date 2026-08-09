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
write every actionable finding as an ordinary pending task. That review must inspect
`semantic-closure.yaml` by the current guideline; a structural checker result is not
semantic-completeness proof. Guidance is not completion proof.

When returned `operationGuidance` contains `requirement-reservation/apply:`, run
`node openspec/governance/check-project-reqs.mjs --mode plan` before target edits. A non-zero
result stops apply and uses that command as the rerun coordinate. A passing plan check does not
grant target-edit or archive permission.

For every selected change, after any required plan review and before every target edit, run:

```bash
node openspec/governance/check-verification-routing.mjs --change "<name>" --mode plan
node openspec/governance/check-semantic-closure.mjs --change "<name>" --mode plan
```

Run them in that order. A non-zero result stops apply before other target edits and returns its
repair coordinate plus same-command rerun boundary. No missing-command fallback or absent
feedback-marker exemption exists; a structural pass is not semantic completeness or archive
permission.

Implement approved tasks in dependency order, preserve the selected change identity, and mark a
task complete only after its independently observable done condition is satisfied.
