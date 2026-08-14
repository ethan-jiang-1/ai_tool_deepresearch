## Why

`shared-seed-topic-authoring.md` is an unused compatibility pointer. The fresh
current-surface scan recorded in
`_backlog/plans/current-contract-signal-cleanup/changes/C1b-retire-unreferenced-seed-topic-pointer.md`
found no manifest, phase dependency, explicit reader, test, or accepted-spec
consumer. Keeping it exposes a second, obsolete Agent-reading route beside the
actual template and command playbook.

The user has approved deleting this unsupported path. Doing so now removes one
ambiguous surface while the current owners are explicit and verified.

## What Changes

- **BREAKING (unsupported Agent-reading path)**: delete
  `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-seed-topic-authoring.md`.
- Keep `workflows/manifest.json`, all phase `requires` and
  `suggested_context`, `shared/shared-return-map-authoring.md`,
  `templates/seed-topic-template.md`, and `command_playbook/operate-topic-state.md`
  unchanged. The shared return-map guidance retains its current rule, the
  template remains the rendered seed-topic-shape owner, and the playbook remains
  the complete packet/apply/repair owner.
- Do not add an alias, forwarding pointer, dynamic shared-directory discovery,
  compatibility reader, migration, fallback, or replacement guidance.
- Record the deletion and prove the workflow package still validates. The
  normal reasoning stop is direct: use the loaded shared return-map guidance
  where applicable, the template for document shape, and the playbook for
  packet/apply/repair work, not a retired compatibility filename.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `workflow/shared-node-content` | Accepted main spec; fresh pointer-identity scan; `shared-seed-topic-authoring.md` | Verify-only | The accepted shared-content contract does not name this unregistered pointer or promise a compatibility reader. |
| `workflow/workflow-node-contract` | Accepted main spec; `workflows/manifest.json`; `phase-seed-topics.md`; package validator | Verify-only | Manifest lifecycle membership and explicit dependencies remain unchanged; no loader behavior is modified. |
| `workflow/workflow-directory-contract` | Accepted main spec; `workflows/manifest.json`; package validator | Verify-only | The Harness workflow directory remains intact; the file is not a manifest asset or current transition/asset contract. |
| `research/seed-topic-materialization` | Accepted main spec; phase-seed-topics; shared return-map guidance; seed-topic template; operate-topic-state playbook | Verify-only | Current seed materialization continues to use its loaded shared return-map guidance, template, and playbook owners, whose behavior is unchanged. |

No accepted requirement changes. This change uses `skip_specs: true`: it only
removes an unreferenced, non-contractual Markdown pointer and does not create,
remove, or modify a capability behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- Affected target: one unused shared Markdown pointer under the reusable
  Harness.
- Affected reader boundary: manually entering the retired path will no longer
  resolve. No supported current reader is retained through compatibility.
- Protected surfaces: manifest, phase dependency closure, shared return-map
  guidance, template, playbook, deterministic router/Gates, bundle formats,
  Engine behavior, and Agent-flow semantics.
- Responsibility boundary: the user made the retirement decision; the Agent
  performs the bounded deletion and current-surface verification; the Engine
  receives no new state, resolver, verdict, or authority.
