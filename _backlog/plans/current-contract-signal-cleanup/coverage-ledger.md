# Current-Contract Signal Cleanup: Coverage Ledger

> Status: audit coverage complete; item 18 (C7) is governed-archived; only item 19 (C8 current decision) remains
>
> Purpose: prove audit coverage before any new cleanup proposal, not count keyword hits as evidence.

This ledger is the anti-omission control for the current-contract cleanup. A
family is not `closed` merely because it has a change card, a grep result, or a
candidate deletion. It is closed only when every known candidate in that family
has an owner-based classification and any remaining uncertainty is recorded as
a bounded next investigation.

## Classification Vocabulary

| Classification | Meaning |
|---|---|
| `bounded cleanup candidate` | A concrete current surface may be removed or rewritten after its decision card passes and the applicable execution batch enters proposal. |
| `protected current semantic` | Required current runtime, recovery, provenance, experiment, or guidance behavior; not a cleanup target. |
| `current rejection boundary` | A current contract intentionally rejects old/malformed input; retain or rewrite only as current observable behavior. |
| `history-only documentation` | Archive/tombstone material that does not present a positive current path. |
| `false positive / not applicable` | Token resembles version/history/compatibility language but is unrelated to legacy support. |
| `unresolved` | A producer, reader, owner, or consequence is still unknown. It blocks the global proposal gate. |

## Scope Evidence

| Primary surface | Mechanical inventory | Semantic classification status |
|---|---:|---|
| `DEEP_RESEARCH_HARNESS/` | 227 tracked files: 222 non-empty assets plus 5 empty placeholders/templates | complete: file-level inventory and candidate-cluster classification assign every broad-scan term an owner/disposition |
| accepted `openspec/specs/**/spec.md` | 85 specs enumerated and classified one by one | complete: per-spec current owner/action inventory; individual C1-C6 facts are linked without treating keyword hits as evidence |
| root `CONTEXT.md` | directly read with routing/test/link context | complete: bounded glossary remains protected; future C8 wording work is a policy slice, not an unclassified audit gap |
| direct supporting surfaces | root `AGENTS.md`, `openspec/config.yaml`, `CHANGELOG.md`, focused tests/playbooks coupled to each candidate | complete: direct routing/governance and candidate-coupled verification surfaces have owner classifications |

The audit intentionally does not inspect `.exp-bundles/` or other prohibited
backlog/run-bundle paths without explicit user authorization.

## Family Ledger

| Family | Known-surface status | Classification result | Remaining work before global closure |
|---|---|---|---|
| C1 inactive contract surfaces | archived | C1a/C1b/C1c/C1d/C1e/C1f are governed-archived; C1f retired only an archive-path helper/test cluster after its merge gate with C5b failed; gate-loop/fork and return-map are protected; bundle entry was closed by C3 | no remaining C1 work |
| C2 internal versioning / entry history | archived | C2a, C2b, and C2c are governed-archived as dashboard items 02-04; schema discriminators remain protected/other-family | no remaining C2 work |
| C3 bundle entry compatibility | archived | dashboard item 05 removed the legacy-entry success paths and retained one current entry/map contract | no remaining C3 work |
| C4 profile/topic compatibility | archived | dashboard items 06-07 retired the legacy research-access envelope and legacy mutable-plan migration while preserving current direct-sample states and `previous_layouts[]` lineage | no remaining C4 work |
| C5 reference / experiment formats | archived | items 08-09 made current writers UID-only and retired historic reference-reader evidence; C1f retired archive-only experiment-ledger scaffolding; C5b retired v1 retained-history input to current Supervisor prediction/admission/selection without reading or rewriting real retained history | no remaining C5 work |
| C6 work-unit historical contracts | archived | C6a/C6b/C6c are governed-archived as the complete-current work-unit profile; C6d policy A has retired positive v1 authority while preserving raw fail-closed unsafe-journal detection; `legacy_non_work_unit_rows` stays protected | no remaining C6 work |
| C7 main specs as current state | archived | `engine/gate-content-dedup` live main spec/catalog residual is removed; GAC-001..009 remain immutable deprecated registry/archive history | no remaining C7 work |
| C8 context / routing | current item 19 | direct routing surfaces and guards are classified, but current-doc omissions/stale assertions and two current-profile fixtures have a distinct scope | classify each test/doc/fixture fact; do not weaken a behavior guard merely to remove an old literal |
| Other broad-scan clusters | audit closed | fallback, version discriminator, recovery/history, and current rejection terms are classified as protected semantics, rejection boundaries, or false positives | no unowned cluster remains; future discovery is added as a new bounded row |

## Global Gate

- [x] Every broad-scan candidate cluster has a family owner and one classification.
- [x] Every accepted main spec has a direct per-spec classification record.
- [x] Every current-positive historical/compatibility reader has a producer-reader consequence trace.
- [x] Every protected current semantic has a named owner and does not remain in a deletion candidate bucket.
- [x] `CONTEXT.md` and directly affected routing/test surfaces have current-owner classifications.
- [x] Unclassified candidate count: **0**.

The Global Gate now permits an approved execution batch to enter proposal. It
does not approve every card in that batch: the user must still decide each risky
policy one at a time, each card's Go / No-go evidence must hold, and the batch
merge gate must still be true. The
already archived C1a/C2a slices remain historical exceptions, not a precedent
for proposal-first discovery.
