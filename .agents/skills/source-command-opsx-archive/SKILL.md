---
name: source-command-opsx-archive
description: Archive a completed OpenSpec feedback-lifecycle change.
---

# `/opsx:archive`

Select and preserve one active change identity. Run `openspec status --change "<name>" --json`
and `openspec instructions archive --change "<name>" --json` before finalization. When its
`tasks.md` contains `openspec-feedback:`, require valid `operationGuidance` containing
`change-feedback-loop/archive:`. A failed or missing lookup stops before finalization and uses
the same instruction command as its rerun coordinate.

Read `guidelines/change-feedback-loop.md`, review the selected change-scoped actual diff and
selected evidence, and write each actionable finding as an ordinary pending task while keeping
the closeout marker open. Complete Agent-owned delta/main sync and re-comparison where
applicable. After every task is complete, the only final mechanical transition is:

```bash
node openspec/governance/finalize-change-archive.mjs --change "<name>"
```

On a blocked result, repair its named legal root and rerun that command. Do not use a raw move or
an alternate archive success path.
