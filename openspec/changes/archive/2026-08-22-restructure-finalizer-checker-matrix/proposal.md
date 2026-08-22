## Why

`tests/integration/governance/change-feedback-finalizer.test.mjs` measures
**52.7s / 25 heavy subprocess launches** (08-cost-table). The dominant cost
is the rank-1 leaf (24.2s, plan 69.2s): one fixture is progressively repaired
across **six production finalizer runs**, and because the finalizer is a
serial short-circuit chain, each run replays `openspec status` + `openspec
validate` + every earlier checker subprocess to reach the next boundary
(4+5+6+7+8+9 = 39 checker launches). The plan's finding 1 states it directly:
"The short-circuit contract is valuable; proving every checker by rerunning
all earlier subprocesses is not." The rank-3 leaf (22.7s) additionally pays
for four separate `openspec instructions` CLI launches whose rule/guidance
fragments are static source text (plan P0.5).

## What Changes

In `tests/integration/governance/change-feedback-finalizer.test.mjs`:

- **Rank 1 (`short-circuits every governance checker`)** — keep the full
  progressive-repair fixture, but replace the six finalizer runs with:
  - **Sentinel 1** (initial fixture): finalizer run → `requirement_governance_failed`
    + 4-check prefix (proves the chain stops at the first checker).
  - **Direct checker matrix** (main-spec, taxonomy, discovery, routing):
    after each repair, run the specific governance checker **directly** with
    the finalizer's exact production invocation
    (`node openspec/governance/check-*.mjs <root> [--mode archive --change
    demo-change | --change demo-change | --mode assets]`) and assert its
    native non-zero failure. No finalizer replay.
  - **Sentinel 2** (fully repaired except semantic-closure): finalizer run →
    `semantic_closure_failed` + the complete 9-check ordered array (proves
    the full chain order and last boundary).
  - **Static mapping assertion**: the finalizer source's checker-script →
    failure-code pairs are pinned statically (consistent with the existing
    static source-order assertions at `:540-541`).
- **Rank 3 (`feedback marker task instructions and operation guidance`)** —
  keep the generated-change fixture and the **tasks + apply** `openspec
  instructions` projections (the two with unique facts: marker rules, and
  apply operationGuidance incl. closure ordering); drop the **proposal** and
  **archive** projections, moving their rule/guidance fragment assertions to
  direct static reads of the repo sources that feed them
  (`openspec/operations/change-feedback-loop.md` — already read by this test,
  `openspec/governance/requirement-reservation-contract.mjs`,
  `openspec/governance/semantic-fact-closure-contract.mjs`,
  `openspec/config.yaml`). The retained projections prove the CLI wires repo
  guidance into generated instructions.
- **Ranks 4, 6 (archive file), 7, 12 and the static-route tests: unchanged**
  (unique production-path sentinels; optimization would risk their proofs).

Expected saving: rank-1 24.2s → ~10s; rank-3 22.7s → ~16s; file 52.7s → ~33s
(~20s, plan P0.4/P0.5).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-harness-only change; `finalize-change-archive.mjs` and
all governance checkers are untouched.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | Existing test classes and proof boundaries only; no route change. |
| `governance/change-feedback-loop` | `openspec/specs/governance/change-feedback-loop/spec.md` | Verify-only | Finalizer short-circuit and archive semantics are the facts being tested, not modified. |
| `governance/requirement-traceability` | `openspec/specs/governance/requirement-traceability/spec.md` | Verify-only | Requirement-checker failure identity is proven directly instead of via finalizer replay. |

## Impact

Target edits are limited to `tests/integration/governance/change-feedback-finalizer.test.mjs`
and this change's verification assets. No npm dependencies, production
Harness modules, governance checkers, schemas, CLI behavior, or runtime
bundles are changed. The repository test command remains `npm test`.
