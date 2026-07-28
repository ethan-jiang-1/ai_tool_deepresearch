# Apply Target Manifest: Wave1 Reference Projection Convergence

## Admission Record

- Change: `converge-wave1-reference-projections`
- Required pre-edit check:
  `node openspec/governance/check-verification-routing.mjs --change converge-wave1-reference-projections --mode plan`
- Current proposal position: planning artifacts are complete; this manifest is
  an implementation ownership aid, not a runtime authority.

Accepted capability specs and the selected runtime bundle's direct facts remain
authoritative. No target code, tests, experiment bundle, or backlog record has
been modified by this change during propose.

## Added Or Consolidated Control Surfaces

| Surface | Planned target | Direct Source of Record | Responsibility boundary |
| --- | --- | --- | --- |
| Canonical Wave1 locator and pure convergence evaluator | New focused helper beneath `DPT_FRAMEWORK/engine/helpers/`, integrated by `ref-count.mjs` and `wave-contract-evaluators.mjs` | Current canonical Topic registry; reviewed depth-review refs resolved to hash-valid submitted Wave1 ledger rows; each row's manifest-embedded, hash-bound queue snapshot; submitted source/cache/degraded facts; committed references; index; profile floor; queue | Extracts one shared reviewed-backing reader and URL normalizer, then returns one root-first classification and exact coordinates. A closed projection must bind its normalized metadata URL and body backing refs to that exact candidate rather than to a generic submitted row. It does not persist state, author prose, select research, or create source/queue authority. |
| Exact selected-path numeric count and Wave1 gate wiring | `ref-count.mjs`, `wave-contract-evaluators.mjs`, `schema/gate_definitions/gate-wave1-complete.definition.json`, `inspect-wave1-output.mjs`, `gates/check-gate-wave1-complete.mjs` | Existing narrow numeric eligibility and gate rule identities | Removes Wave1's parallel broad-glob interpretation while retaining `per_topic_ref_md_count_floor` and its accepted degradation policy only for a true post-repair shortfall. |
| Narrow index renderer/synchronizer | New focused reference-index helper/CLI plus `artifact-persistence.mjs` / `operate-artifact-persistence.mjs` reuse | Committed flat reference files, parsed accepted metadata, and fail-closed path classification | Renders only `reference/_INDEX.md`: `00-shared-*` and `00-cross-*` classify directly, while every other flat file must resolve to exactly one Topic without borrowing the index layer being repaired. It precompares exact UTF-8 bytes before staging; a changed target uses the observed digest at the existing CAS and returns only committed/blocked. It does not alter reference bodies, source/cache/receipt/ledger facts, queue, or gate attempts. |
| Supplementary floor objective and task projection | `schema/contracts/queue.mjs`, queue admission/lifecycle, `work-unit-assignment-contract.mjs`, `work-unit-envelope.mjs` | Hash-bound queue snapshot after normal admission | Carries a validated positive objective only on supplementary Wave1 demand and renders it read-only. It is not a resolver selector, output/receipt/result rule, or pass assertion. |
| Wave1 closeout/template guidance | `workflows/nodes/shared/shared-reference-template.md`, `workflows/nodes/phases/phase-wave1.md`, related index/readme scaffolds and existing packet playbook cues | Accepted reference shape, convergence feedback, and existing packet writer protocol | Teaches materialize/persist -> sync index -> packet ref refresh -> same inspect, or existing supplementary path. It is not an evidence authority, index writer implementation, controller, or direct Seed editor. |
| Focused proof assets | New/extended files under `tests/engine/`, `tests/integration/cli/`, and `tests/integration/md/` | Real deterministic module behavior and temporary-bundle command results | Proves the direct convergence contract, not Agent research quality or a slow unrelated multi-wave flow. |

## Avoided Or Removed Complexity

| Avoided surface | Reason |
| --- | --- |
| A new Wave1 queue kind, controller, watcher, retry tree, lifecycle state, or generic repair state | Existing queue/work-unit lifecycle already owns durable research demand; convergence is a pure fact classification consumed by existing inspect/gate and Phase flow. |
| A second source catalog, URL normalizer, metadata parser, index authority, or numeric counter | The extracted reviewed-backing reader reuses one submitted-backing URL normalizer; existing reference/index parsers, authority classifier, and `countReferences()` remain the direct owners. |
| Broad `reference/*{topic}*.md` success matching | It cannot distinguish exact current canonical identity from legacy/misnamed files or explain how to repair a low count. |
| Per-wave hand-authored index row updates | One renderer/CAS operation repairs empty/stale tables and preserves all reference families. |
| Direct Seed/index/ledger/receipt/cache edits or bulk legacy renames | Existing packet writer and artifact persistence preserve legal mutation boundaries; historical paths may be read/indexed but are never blindly moved. |
| Long deterministic E2E or Agent-flow proof | Focused unit and temporary-bundle integration directly exercise the changed deterministic contract without creating slow test debt. |

## Requirement Traceability

| Requirement | Planned implementation and proof ownership |
| --- | --- |
| `AGQ-013`, `DEW-004` | Queue snapshot validation and read-only work-unit task objective. |
| `REF-001`, `REF-003`, `REF-005`, `REF-008` | Canonical locator/path classes, all-family index synchronization, and backing-preserving guidance. |
| `RWG-005`, `RWG-012`, `RWG-017`, `RWG-018` | One pure convergence result shared by Wave1 inspect/gate, root ordering, stable rule IDs, and control simplification. |
| `RWP-010`, `RWP-015`, `RWP-016`, `RWP-017` | Wave1 Phase closeout sequence, template/protocol separation, and profile floor planning versus post-submit convergence. |
| `WAI-005`, `WAI-008` | Submitted backing/depth boundary and Phase-owned canonical reference materialization. |

All listed IDs already exist in `openspec/governance/req-registry.yaml`. No new
requirement ID is allocated for a helper, path class, CLI, queue payload field,
test fixture, or guidance cue.
