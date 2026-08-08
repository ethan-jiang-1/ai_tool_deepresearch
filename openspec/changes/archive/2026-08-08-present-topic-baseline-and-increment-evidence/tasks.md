## 1. Apply Readiness

- [x] 1.1 Complete `openspec-feedback:plan-review` before the first target edit: re-read `REF-003`, `REF-004`, `RWP-002`, the reference synchronizer, and P2 focus-coverage boundary; convert each actionable scoped finding into an unchecked repair task with an observable done condition.
- [x] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change present-topic-baseline-and-increment-evidence --mode plan` before target edits; PASS is required for the selected deterministic proof routes and the explicit `agent_flow_e2e: not_applicable` boundary.

## 2. Derived Navigation Renderer

- [x] 2.1 Implement `REF-003`: extend the reference renderer to derive a stable README Reference Evidence Map from reference metadata/path classification, canonical Topic resolution, current profile round, and direct Wave1 depth-review/focus-coverage facts; render only the specified relationship and Topic-level increment labels with durable relative coordinates.
- [x] 2.2 Implement `REF-003`: preserve `_INDEX.md` table behavior while adding independent per-target compare-and-swap persistence for `_INDEX.md` and README, exact `committed|unchanged|blocked` aggregate results, committed/blocked target detail, and same-command convergence after a partial projection; do not add atomic rollback or merge behavior.
- [x] 2.3 Implement `REF-004`: update the reference README template with the explicit non-evidentiary pre-sync empty state, then update renderer output so the generated map identifies its derived-navigation/non-authority boundary, direct coordinates, `unknown`, `not declared`, historical context, and visible limited outcomes.

## 3. Agent Flow And Release Surfaces

- [x] 3.1 Implement `RWP-002`: update Wave1 phase guidance so a legal current `focus_coverage` author/update runs the existing synchronizer before the same inspect; preserve the existing work-unit/submit/depth-review loop and prohibit manual README/index repair or a focus-specific route.
- [x] 3.2 Publish the planned `v0.81` reader-navigation change in `CHANGELOG.md` and synchronize the version banner/latest behavior summary in `DEEP_RESEARCH_HARNESS/RUN.md`; state the projection-only evidence boundary without claiming Agent-flow proof.

## 4. Routed Deterministic Proof

- [x] 4.1 Add the selected unit asset `tests/engine/helpers/reference-evidence-map.test.mjs` for `REF-003`/`REF-004`: relationship direct-fact classes; current focus `covered|partial|blocked|not declared|historical context|unknown` including malformed/mismatched/future-round `unknown`; no per-reference increment attribution; deterministic output; unclassifiable-map `unknown`; and the non-evidentiary template empty state.
- [x] 4.2 Extend the selected unit asset `tests/engine/helpers/reference-index-sync.test.mjs` for `REF-003`: paired-target idempotence and a later-target CAS block/retry with no merge or rollback claim.
- [x] 4.3 Add the selected integration asset `tests/integration/cli/reference-evidence-map.test.mjs` for `REF-003`/`REF-004`: invoke the production synchronizer CLI against an isolated temporary bundle and assert paired navigation persistence and structured outcomes without mutating submitted/Gate authority.
- [x] 4.4 Add the selected integration asset `tests/integration/md/wave1-reference-evidence-map-guidance.test.mjs` for `RWP-002`: assert the Wave1 legal focus-update synchronization instruction and its manual-edit/new-route prohibitions.
- [x] 4.5 Add the selected deterministic E2E asset `tests/e2e/reference-evidence-map-rerun.test.mjs` for `REF-003`/`REF-004`: exercise a temporary rerun-shaped bundle through the production synchronizer, keeping historical and current Topic-level focus facts distinct without a hand-written map.

## 5. Verification And Closeout

- [x] 5.1 Run the selected unit, integration, and deterministic E2E assets; record native `node:test` results and any residual reader risk without representing fixtures as Subject-Agent research evidence.
- [x] 5.2 Run `node openspec/governance/check-verification-routing.mjs --change present-topic-baseline-and-increment-evidence --mode assets`, `openspec validate present-topic-baseline-and-increment-evidence --strict`, `node openspec/governance/check-project-reqs.mjs`, `node openspec/governance/check-project-specs.mjs`, and `git diff --check`; each must PASS before archive preparation.
- [x] 5.3 Complete `openspec-feedback:closeout-review` after implementation evidence and delta/main-spec comparison: resolve each actionable scoped finding as an ordinary unchecked repair task and re-run the affected native or governance evidence before archive.
- [x] 5.4 Synchronize the accepted `REF-003`, `REF-004`, and `RWP-002` delta requirements into main specs, re-read the synchronized requirements, and record the reader/evidence boundary in implementation evidence.
After every checkbox above is complete, invoke only
`node openspec/governance/finalize-change-archive.mjs --change present-topic-baseline-and-increment-evidence`
and use its structured result as archive evidence. This is an operation instruction rather
than a checkbox because the governed finalizer requires every ordinary task to be complete
before it can perform the archive transition.
