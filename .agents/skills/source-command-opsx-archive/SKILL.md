---
name: source-command-opsx-archive
description: Archive a completed OpenSpec feedback-lifecycle change.
---

# `/opsx:archive`

Select and preserve one active change identity. Run `openspec status --change "<name>" --json`
and `openspec instructions archive --change "<name>" --json` before finalization. Require valid
`operationGuidance` containing `change-feedback-loop/archive:`. A failed or missing lookup stops
before finalization and uses the same instruction command as its rerun coordinate. Require exactly
one `openspec-feedback:plan-review` task and one `openspec-feedback:closeout-review` task before
finalization. An unmarked or malformed change must add those existing marker tasks and resume
Apply; it must not invoke the finalizer or a native archive command.

Read `guidelines/change-feedback-loop.md`, review the selected change-scoped actual diff and
selected evidence, and write each actionable finding as an ordinary pending task while keeping
the closeout marker open. Complete Agent-owned delta/main sync and re-comparison where
applicable. Review `semantic-closure.yaml` against actual changed surfaces: for `affected`, assess
the bounded fact, resolver, `established_by`, consumers, and overlap; for `not_applicable`, assess
the reason. A structural checker result is not semantic-completeness proof. After every task is
complete, the only final mechanical transition is:

```bash
node openspec/governance/finalize-change-archive.mjs --change "<name>"
```

On a blocked result, repair its named legal root and rerun that command. Do not use a raw move or
an alternate archive success path.
