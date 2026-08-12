## Why

[`openspec/specs/README.md`](../../specs/README.md) currently presents
`engine/gate-content-dedup` as a current deterministic production capability,
while its authoritative [main spec](../../specs/engine/gate-content-dedup/spec.md)
and every `GAC-*` registry entry identify it as a retired traceability
tombstone. That false navigation signal makes a reader spend time evaluating a
nonexistent implementation path.

This is the approved first slice from
[`_backlog/plans/current-contract-signal-cleanup.md`](../../../_backlog/plans/current-contract-signal-cleanup.md)
and its [C1 card](../../../_backlog/plans/current-contract-signal-cleanup/changes/C1-retire-inactive-contract-surfaces.md).
It corrects the projection without conflating it with the separate decisions
about deleting historical records or changing current Gate behavior.

## What Changes

- Replace only the `engine/gate-content-dedup` row in the Capability Catalog
  with wording that identifies it as a retired traceability tombstone for
  historical content-dedup heuristics, not a current Gate or production
  capability.
- Keep the existing main spec, all deprecated `GAC-*` registry entries, the
  seven-column catalog shape, and the existing related-capability links.
- Do not change any Harness code, schema, CLI, Gate, bundle format, test
  semantics, Agent flow, or accepted capability requirement.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change is a correction to a non-authoritative navigation projection,
not a change to an accepted requirement or observable behavior. `skip_specs:
true` is set in `.openspec.yaml` because a delta spec would incorrectly imply a
new or modified behavior contract.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/gate-content-dedup` | `openspec/specs/engine/gate-content-dedup/spec.md`, catalog row in `openspec/specs/README.md`, and deprecated `GAC-001` through `GAC-009` in `openspec/governance/req-registry.yaml` | Verify-only | The accepted main spec already defines this surface as retired traceability-only. The catalog must accurately project that existing conclusion; no requirement changes. |
| `governance/requirement-traceability` | `openspec/specs/governance/requirement-traceability/spec.md` and `openspec/governance/check-capability-taxonomy.mjs` | Verify-only | Existing governance already owns the one-row-per-main-spec catalog rule and the catalog's non-authoritative role. This change corrects one row under that existing contract. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` and `tests/integration/md/retired-content-heuristic-hygiene.test.mjs` | Verify-only | The existing focused integration test remains a regression check that retired heuristics do not regain current implementation or runtime-guidance authority; no route or test taxonomy changes. |
| `engine/gate-state-machine` | Related catalog entry and `openspec/specs/engine/gate-state-machine/spec.md` | Excluded | Its active Gate lifecycle behavior is not changed; the catalog relation remains intact. |
| `research/evidence-extraction` | Related catalog entry and `openspec/specs/research/evidence-extraction/spec.md` | Excluded | Its current evidence-format authority is not changed; the catalog relation remains intact. |

## Impact

Apply changes one catalog row in `openspec/specs/README.md`. The direct Sources
of Record remain the retired main spec and requirement registry; the catalog is
only an Agent navigation projection. The shortest legal loop is to correct that
projection, run the existing catalog and retired-heuristic checks, and review
the one-row diff.

No named state, projection, command, schema, runtime fact, or deterministic
verdict is introduced or materially changed. The semantic-precision question
has an existing answer: a reader deciding whether a capability is current can
stop at the main spec's explicit retired status rather than infer authority from
the catalog. This avoids a false second behavior source and introduces no
control branch, fallback, migration, or user decision. The Agent makes the
authorized documentation edit and runs verification; current Engine verdicts
and runtime authority remain unchanged. No Harness behavior changes, so no
version bump, `CHANGELOG.md` update, or `RUN.md` banner update is required.
