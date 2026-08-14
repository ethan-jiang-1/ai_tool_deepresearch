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

## Notable Sequencing Decisions

- C2b archived before C2c so the stamp writer disappeared before the internal version choreography.
- C3 then removed legacy bundle-entry success behavior.
- C4a and C4b were separate because profile access and plan migration had different readers and failure consequences.
- C5a-1 changed current writers only; historic reference-reader policy remained explicitly deferred to item 09.
- C5a-2 then retired the historic reader branch without rewriting retained Markdown; the C1 inactive-surface cards may now be evaluated independently.

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

## Update Template

Append one row only after governed archive and commit. Record the actual archive name, current
behavior removed or protected, commit when known, selected verification, and any residual decision
that moves to the next dashboard item. Do not rewrite older evidence to improve the narrative.
