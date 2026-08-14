# C1b: Retire the Unreferenced Seed-Topic Authoring Pointer

> Candidate change: `retire-unreferenced-seed-topic-pointer`
>
> Planned execution batch: dashboard item 12 `retire-unreferenced-seed-topic-pointer`
>
> Status: governed-archived on 2026-08-14 as `2026-08-14-retire-unreferenced-seed-topic-pointer`; implementation/archive commit `530a25cff`
>
> Risk: L1

## One Question

Should the unused `shared-seed-topic-authoring.md` compatibility pointer remain
as an Agent-readable surface when no current loading or ownership path reaches
it?

## Verified Boundary

`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-seed-topic-authoring.md`
only points to the current seed-topic template and `operate-topic-state`
playbook. A repository-wide allowed-surface search found no external occurrence
of its file/id/scope. It is absent from `workflows/manifest.json`, every phase
`requires` and `suggested_context` list, focused tests, and accepted specs.

`validateWorkflowPackage()` validates manifest entries and explicit dependency
references; it does not enumerate every file in `workflows/nodes/shared/` as an
implicit contract. Current phases already load the real template/playbook paths.

## Proposed Current-Only Result

Remove this one unreferenced pointer. Do not move or duplicate its target
guidance: `templates/seed-topic-template.md` and
`command_playbook/operate-topic-state.md` remain the current owners.

## Effect And Side Effects

| Effect | Consequence |
|---|---|
| One dead Agent-reading path disappears | Less chance an Agent reads a compatibility pointer instead of the concrete template/playbook. |
| No current dependency closure changes | The workflow loader only follows explicit `requires`; none names this file. |
| A manually typed obsolete path stops resolving | This is the intended unsupported-path boundary; there is no known supported consumer to preserve. |

## Proposal Gate

- [x] Explicit manifest/dependency/dynamic-discovery evidence is absent.
- [x] Current template and command-playbook owners are named.
- [x] Global Coverage Gate is complete.
- [x] A fresh repository-wide reference check remains zero immediately before proposal: exact pointer file/id/scope references are absent outside the pointer itself and historical planning/archive records; manifest and every phase `requires` / `suggested_context` omit it; `validate-workflow-package.mjs` passes.
- [x] Proposal keeps the work to this file plus directly necessary verification only: it deletes the pointer, protects the current manifest/dependency/template/playbook/return-map surfaces, and records `skip_specs: true` because no accepted behavior changes.

## Expected Verification

```bash
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
```

## Completed Result

- [x] Repeated the exact current-surface scan immediately before deletion: no
  caller remained, and manifest/phase dependency closure did not name the
  pointer.
- [x] Deleted only `shared-seed-topic-authoring.md`; the current return-map,
  template, playbook, Engine, Gate, and bundle surfaces remained unchanged.
- [x] `validate-workflow-package.mjs`, strict OpenSpec validation, archive
  governance, and governed finalization passed. The archived change is
  [`2026-08-14-retire-unreferenced-seed-topic-pointer`](../../../../../openspec/changes/archive/2026-08-14-retire-unreferenced-seed-topic-pointer/).
