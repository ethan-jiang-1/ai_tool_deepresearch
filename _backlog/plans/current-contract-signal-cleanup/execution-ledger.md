# Current-Contract Cleanup Execution Ledger

> Role: completed-change evidence and durable progress history.  
> Current status and next action belong in [`../current-contract-signal-cleanup.md`](../current-contract-signal-cleanup.md).

## Governed Archives

| Item | Date | Archived change | Key result | Evidence |
|---:|---|---|---|---|
| 01 | 2026-08-12 | `2026-08-12-correct-retired-content-dedup-catalog` | Retired content-dedup is no longer advertised as a current capability | taxonomy and retired-heuristic hygiene passed |
| 02 | 2026-08-12 | `2026-08-12-slim-run-entry-history` | `RUN.md` exposes the current entry without the release-history dump | 32 focused tests plus package/governance checks |
| 03 | 2026-08-13 | `2026-08-13-retire-framework-version-stamp` | New bundles no longer write or require `framework_version` | 60 focused tests plus package/governance checks |
| 04 | 2026-08-13 | `2026-08-13-retire-internal-version-choreography` | Internal target/bump/banner choreography retired | 15 tests in 4 suites plus package/governance checks |
| 05 | 2026-08-13 | `2026-08-13-drop-legacy-bundle-entry-compatibility` | Current operation requires the current entry/map pair; old entry forms are not success paths | unit 27/27, integration 49/49, deterministic E2E 2/2, package/archive governance |
| 06 | 2026-08-13 | `2026-08-13-retire-legacy-research-access-envelope` | Legacy access envelope rejected at current schema/reader boundaries | commit `0884dc205`; 12 selected deterministic assets plus package/archive governance |
| 07 | 2026-08-13 | `2026-08-13-retire-legacy-plan-migration` | Old mutable plan remains human-readable but cannot enter current inspect/reentry/migration | commit `2a79435bb`; selected schema/topic-state/reader/guidance/rerun tests plus governance |
| 08 | 2026-08-14 | `2026-08-14-make-current-reference-authoring-uid-only` | New references use scalar UID, `all`, or an exact UID subset | commit `0f415d92b`; 99 selected tests plus strict OpenSpec and archive governance |
| 09 | 2026-08-14 | `2026-08-14-decide-historic-reference-reader-policy` | Retained `related_topic` Markdown remains human-readable but cannot enter current Engine evidence paths | commit `35daf961f`; 86 selected tests, package validation, strict OpenSpec, delta/main comparison, and governed archive |
| 10 | 2026-08-14 | `2026-08-14-retire-unimplemented-fork-repair-contract` | False shared fork-repair convergence contract no longer appears as current behavior; `FOR-001` is retained only as deprecated history | commit `3ca1339cd`; package validation, strict OpenSpec, requirement/project-spec governance, delta/main comparison, and governed finalizer |
| 11 | 2026-08-14 | `2026-08-14-retire-stale-abstract-gate-fsm` | The unused abstract Gate FSM and its five internal exports no longer present a competing current transition contract; the existing chain/router remains the only current owner | commit `f9e45891e`; 22 current-router tests, workflow-package validation, strict OpenSpec, archive requirement governance, 83 main specs, delta/main comparison, and governed finalizer |
| 12 | 2026-08-14 | `2026-08-14-retire-unreferenced-seed-topic-pointer` | The unregistered seed-topic compatibility pointer is absent; direct template, playbook, and loaded return-map owners remain the only current paths | commit `530a25cff`; exact zero-reference scans, workflow-package validation, strict OpenSpec, archive governance, closeout review, and governed finalizer |
| 13 | 2026-08-14 | `2026-08-14-retire-unreachable-yaml-subset-parser` | The unreachable private YAML-subset parser is absent; exported JSON-first/package-backed YAML parsing remains the only current frontmatter path | commit `513186872`; 39 focused parser tests, workflow-package validation, zero-reference and protected-surface review, strict OpenSpec/governance, closeout review, and governed finalizer |
| 14 | 2026-08-14 | `2026-08-14-retire-archived-case-ledger-helper` | The archive-only case-ledger helper cluster and its archive-path baseline test are absent; the manifest remains the sole runnable-corpus authority | commit `374d86c33`; selected host-tool/Supervisor integration regression, workflow-package validation, zero-reference/protected-surface review, strict OpenSpec/archive governance, closeout review, and governed finalizer |
| 15 | 2026-08-14 | `2026-08-14-decide-retained-experiment-history-policy` | Retained v1 report/audit/selection material is human-readable/diagnostic-only and cannot establish current Supervisor prediction, admission, qualification, group-gap, selection, or launch facts; current-v2 stale-surface qualification remains explicit | commits `1aa0c1c35`, `a407cf980`, `969dbfbcd`, `0ea53de58`; 52 selected deterministic unit/integration tests, delta/main re-comparison, strict OpenSpec/archive governance, closeout review, and governed finalizer |
| 16 | 2026-08-14 | `2026-08-14-retire-legacy-work-unit-attempt-inputs` | Explicit assignment v1/v2, markerless submission history, and actor-unrecorded attempts stop at `unsupported_current_contract`; the complete current work-unit profile remains the sole current authority | commit `7a96ca254`; selected deterministic unit/integration/deterministic-E2E suites, workflow-package validation, delta/main re-comparison, strict OpenSpec/archive governance, closeout review, and governed finalizer |
| 17 | 2026-08-15 | `2026-08-15-retire-transaction-v1-history` | Public transaction authority is v2-only; unsafe v1/invalid bytes still fail closed, while a complete committed v1 file is diagnostic-only and cannot establish acceptance or lineage authority | commit `858cbdb87`; selected schema/unit/integration/deterministic-E2E suites, workflow-package validation, delta/main re-comparison, strict OpenSpec/archive governance, closeout review, and governed finalizer |
| 18 | 2026-08-15 | `2026-08-15-retire-gate-content-dedup-tombstone` | Pure-retired `engine/gate-content-dedup` no longer has a live main-spec/catalog identity; GAC-001..009 remain immutable deprecated registry/archive history only | commit `b0e7d4e96`; hygiene integration 1/1, workflow-package validation, strict OpenSpec, archive requirement/project-spec/taxonomy/discovery, verification-routing/semantic-closure, delta/main comparison, closeout review, and governed finalizer |
| 19 | 2026-08-15 | `2026-08-15-align-current-guidance-contract-guards` | Current routing, HITL1, reference-reader, public logical-actor, and work-unit fixture guards align with existing current contracts; no historical success or compatibility path was added | commit `9030fa785`; selected unit/integration suite 36/36, workflow-package validation, protected-surface review, strict OpenSpec, requirement/project-spec/taxonomy/discovery, verification-routing/semantic-closure, closeout review, and governed finalizer |

## Notable Sequencing Decisions

- C2b archived before C2c so the stamp writer disappeared before the internal version choreography.
- C3 then removed legacy bundle-entry success behavior.
- C4a and C4b were separate because profile access and plan migration had different readers and failure consequences.
- C5a-1 changed current writers only; historic reference-reader policy remained explicitly deferred to item 09.
- C5a-2 then retired the historic reader branch without rewriting retained Markdown; the C1 inactive-surface cards may now be evaluated independently.
- C1d retired the unimplemented fork-repair promise without adding compatibility or changing current runtime behavior; C1c then removed its separately approved stale internal API without changing current routing. C1b then removed its independently verified zero-caller pointer without changing the loaded Seed Topics closure; C1e then removed its independently verified private parser without changing the exported parser contract. C1f then retired the archive-only case-ledger reader/validator/test cluster without changing current manifest or Supervisor behavior. C5b remained separate because it decided current retained-history selection policy; it is now archived before the work-unit reader decisions begin.

## Metrics Snapshot

The baseline audit found 227 tracked Harness files, 85 accepted main specs, roughly 623
requirements, roughly 2,580 scenarios, and zero unclassified candidate clusters after the coverage
ledger closed. Counts are diagnostic only; a change succeeds by reducing current contract ambiguity
without deleting required behavior.

| Date | Item | Observable cleanup | Verification outcome |
|---|---|---|---|
| 2026-08-12 | Baseline | Initial inventory and current-only policy | PASS |
| 2026-08-12 | 01 | One misleading current catalog projection removed | PASS |
| 2026-08-12 | 02 | `RUN.md` reduced from 299 to 53 lines | PASS |
| 2026-08-13 | 03 | One new-bundle stamp writer chain and CMI-007 retired | PASS |
| 2026-08-13 | 04 | Internal target/changelog/banner projections retired | PASS |
| 2026-08-13 | 05 | Three legacy-only bundle entry paths removed | PASS |
| 2026-08-13 | 06 | Legacy URL/fetch/search/candidate/source-class/access envelope removed | PASS |
| 2026-08-13 | 07 | Legacy plan schema union and migration readers/writers removed | PASS |
| 2026-08-14 | 08 | `related_topic` removed from current rich-reference authoring | PASS |
| 2026-08-14 | 09 | `related_topic` rejected as current reference evidence while historical bytes stay untouched | PASS |
| 2026-08-14 | 10 | Shared fork-repair convergence current contract and navigation retired | PASS |
| 2026-08-14 | 11 | Stale abstract Gate FSM, exports, tests, and current projections retired while the chain/router stays current | PASS |
| 2026-08-14 | 12 | Unreferenced seed-topic compatibility pointer retired while explicit current owners and package closure remain unchanged | PASS |
| 2026-08-14 | 13 | Unreachable private YAML-subset parser retired while the exported JSON/YAML frontmatter contract remains unchanged | PASS |
| 2026-08-14 | 14 | Archive-only case-ledger reader/validator/test cluster retired while current manifest/V2/Supervisor paths remain unchanged | PASS |
| 2026-08-14 | 15 | Retained v1 experiment material made diagnostic-only; current Supervisor strategy input is complete v2 only | PASS |
| 2026-08-14 | 16 | Legacy work-unit attempt inputs rejected before current authority computation; the complete current profile remains usable | PASS |
| 2026-08-15 | 17 | Positive transaction-v1 authority removed; unsafe raw bytes remain fail-closed and committed v1 is diagnostic-only | PASS |
| 2026-08-15 | 18 | Pure-retired GAC main spec/catalog entry removed while historical IDs remain registry/archive-only | PASS |
| 2026-08-15 | 19 | Current guidance/test projections aligned to existing contracts; complete current work-unit fixtures remain strict and incomplete legacy construction publishes no envelope artifacts | PASS |

## Update Template

Append one row only after governed archive and commit. Record the actual archive name, current
behavior removed or protected, commit when known, selected verification, and any residual decision
that moves to the next dashboard item. Do not rewrite older evidence to improve the narrative.
