## Why

`guidelines/project-charter.md` has a sound and long-lived core: Agent/Markdown/Engine ownership, fail-closed deterministic authority, anti-fabrication, OpenSpec discipline, and the rejection of a generic controller. The Wave/Gate analysis found only four cross-cutting clarification gaps: a blocking fact can lack a legal producer path; a public boundary can hide required choreography; autonomy can be misread as host/Agent liveness; and a real artifact can be overclaimed as proof.

This change adds those clarifications without treating the existing Charter as structurally defective. Its purpose is to make future incremental changes easier to judge, not to reorganize the guidance suite.

## What Changes

- Add a small constitutional clarification to the existing Project Charter: operational completeness of blocking obligations, bounded public reentry, the separation of authority/capability/permission/responsibility/liveness/evidence, and claim-to-proof proportionality.
- Amend only the Charter sentences and checklist items whose existing wording can imply guaranteed silent execution or unscoped evidence; preserve every existing Charter section and its current routing role.
- Clarify `evolution-simple-reliable-control.md` only where repair feedback assumes a legal writer/retry path exists, and clarify `evolution-helper-oriented-agent.md` only where Agent responsibility could be misread as an liveness guarantee.
- Add an explicit constitutional-admission check so incident-specific commands, byte thresholds, Gate policy, and workflow sequences remain in their owning specs or mechanism changes.

**BREAKING**: None. No runtime behavior, schema, CLI, bundle state, Gate policy, framework version, or existing guidance section is removed, relocated, or reclassified.

## Capabilities

### New Capabilities

- `guidance-constitution`: Defines the small set of stable constitutional clarifications that govern future guidance and design review without creating runtime behavior.

### Modified Capabilities

- None. Existing runtime capability requirements do not change.

## Impact

- Affected guidance only: `guidelines/project-charter.md`, `guidelines/evolution-simple-reliable-control.md`, and `guidelines/evolution-helper-oriented-agent.md`.
- Affected governance only: the `guidance-constitution` requirement registry entries, delta spec, task list, and verification plan.
- Explicitly unaffected: `guidelines/README.md`, mechanism guidance, logging/experiment guidance, `DPT_FRAMEWORK/`, `tests/`, `experiments_playbook/`, accepted runtime specs, bundle schemas, and release/version surfaces.
- The apply review must show an additive, local diff: no removed Charter headings, no relocated documentation, and no added controller, writer, retry, watcher, or proof mechanism.
