# 06 — Ledger D: Wave1 Focus Coverage Contract

> Source: subagent analysis (faaeb291), 2026-08-22, verified against
> `tests/integration/cli/wave1-focus-coverage-contract.test.mjs` (148 lines;
> anchors :85/:102/:133 all current — no stale anchors).

All four variants descend from the same `prepareWave1Bundle` (lines 26–37): a
full Wave1-ready bundle built from production predecessors (instantiate →
gate/enter/advance through wave0-complete → stageWave1), after which only the
test rewrites `artifacts/wave1/topic-a/depth-review.yaml` and re-runs the
production Gate/Inspect CLI. `prepareWave1Bundle` ≈ **24 production CLIs** per
bundle (1 instantiate + 9 gate/enter/advance + ~7 stageWave0
submits/persists/index/completion + ~7 stageWave1).

## keeps missing focus and covered focus on the existing clean Wave1 path
- file:line: `tests/integration/cli/wave1-focus-coverage-contract.test.mjs:85`
- measured: 7.767s (plan row 13)
- assertion: `focus_coverage_limit` does NOT fail when `focus_coverage` is absent or `outcome: covered` with a valid covered commitment (`check.passed === true`, `failed_rule_ids` excludes `focus_coverage_limit`).
- authority: `DEEP_RESEARCH_HARNESS/engine/helpers/wave-depth-contracts.mjs:evaluateWave1FocusCoverage` (absent → `{status:'none', passed:true}`, lines 172–174; covered matrix lines 300–318); `focus_coverage_limit` branch in `wave-contract-evaluators.mjs:985–1001` (valid `limited` is the only fail); driven by `cli/gates/check-gate-wave1-complete.mjs`; definition rule `schema/gate_definitions/gate-wave1-complete.definition.json:44–51`.
- mutation: two independent, test-run-local bundles stay clean — no authored depth-review mutation for `noFocus`; only `writeFocusCoverage(covered)` for `covered`. No Engine fact hand-authored.
- neighbors: `tests/e2e/wave1-focus-coverage-rerun.test.mjs:62` (clean current-round covered route, rank 10); `tests/integration/cli/check-gate-wave1-complete.test.mjs` (broad wave1 gate matrix); `tests/engine/helpers/wave-degradation-eligibility.test.mjs`; `wave-contract-evaluators.test.mjs`; `tests/engine/wave-depth-contracts.test.mjs`.
- disposition: **Share setup** (P1).
- evidence: byte snapshot built through production predecessors in the current run; `noFocus` is the untouched baseline itself; `covered` is baseline + one depth-review write; both still pass on a real retained Wave1 Gate sentinel.
- cost drivers: ~50 production CLIs = 2 × (~24 `prepareWave1Bundle`) + 2 `runWave1Gate`. Repeated full-bundle setup dominates; focused suffix is trivial.

## blocked emits only the existing definition-owned degradable limit
- file:line: `:102` (generated in `for (const outcome of ['partial','blocked'])` loop, lines 101–131)
- measured: 4.641s (plan row 22)
- assertion: `blocked` declaration (only a `limited` commitment) → Inspect and failed Gate both report `failed_rule_ids` exactly `['focus_coverage_limit']`, not masked; `attempt:3` Gate passes `degraded:true` with `degraded_rules === ['focus_coverage_limit']`.
- authority: `wave-contract-evaluators.mjs:985–1001` (`status === 'limited'` → single `focus_coverage_limit` finding) + `focusCoverageLimitFinding` (:98); definition rule `gate-wave1-complete.definition.json:44–51` (`degradation_eligible:true`, `blocking_basis: required_floor`, `finding.source: definition`); degradation handoff `wave-degradation-eligibility.mjs:evaluateWaveDegradationEligibility` (isEligibleFloorFinding lines 8–14) via `check-gate-wave1-complete.mjs`, `--attempt` passed through CLI.
- mutation: the `limited` boundary declaration survives unmodified; degradation flows only through the existing definition-owned policy (no focus-specific route, no masked limit).
- neighbors: `partial` sibling (same loop :102); `tests/e2e/wave1-focus-coverage-rerun.test.mjs:76`; `wave-degradation-eligibility.test.mjs:55–98`; `wave-contract-evaluators.test.mjs`.
- disposition: **Share setup** (P1).
- evidence: blocked = baseline + one `focus_coverage` write; one immutable pre-Wave1 baseline cloned for it; real Gate sentinel for both failed (status 1) and degraded (attempt 3) paths.
- cost drivers: ~27 production CLIs = ~24 setup + 3 (`inspectWave1` :118, `runWave1Gate expectedStatus:1` :119, `runWave1Gate attempt:3` :126). No fixed waits.

## partial emits only the existing definition-owned degradable limit
- file:line: `:102` (same generated loop)
- measured: 4.322s (plan row 25)
- assertion: `partial` (one covered + one `limited` commitment, lines 113–114) → Inspect and failed Gate both report exactly `['focus_coverage_limit']`, not masked; `attempt:3` passes `degraded` with `degraded_rules === ['focus_coverage_limit']`.
- authority: identical to blocked — `wave-contract-evaluators.mjs:985–1001`; `evaluateWave1FocusCoverage` partial matrix (:302–303); degradation via `wave-degradation-eligibility.mjs`; `check-gate-wave1-complete.mjs`.
- mutation: the mixed covered+limited declaration persists; only `focus_coverage_limit` fails, unmasked; degradation honors only that rule.
- neighbors: `blocked` sibling (same loop); e2e rerun covered-route; direct matrix `wave-depth-contracts.test.mjs`.
- disposition: **Share setup** (P1 — same baseline opportunity as rank 22).
- evidence: partial = baseline + one `focus_coverage` write; shares the same immutable pre-Wave1 baseline as blocked; real Gate sentinel retains Inspect(fail) + Gate(fail) + degraded-attempt paths.
- cost drivers: ~27 production CLIs = ~24 setup + 3 (same as blocked).

## keeps an invalid focus declaration under the non-degradable depth contract and masks the limit
- file:line: `:133`
- measured: 3.885s (plan row 34)
- assertion: a `covered` declaration bound to a non-canonical `topic_uid` (:137), with `--attempt 3`, fails as `per_topic_depth_review_contract` in `failed_rule_ids`, does NOT add `focus_coverage_limit` to failures, masks `focus_coverage_limit:topic-a` in `masked_rule_ids`, and is NOT `degraded`.
- authority: `wave-depth-contracts.mjs:evaluateWave1FocusCoverage` topic-binding (:187–195, `focus_coverage_topic_mismatch`); masking exactly `wave-contract-evaluators.mjs:985–1001` (`if (!check || !focusCoverage || !check.passed || !focusCoverage.passed) → maskedRuleIds.push(scopedRuleId('focus_coverage_limit', topic)); result = { passed: true }`); gate CLI `check-gate-wave1-complete.mjs`; definition `per_topic_depth_review_contract` (`gate-wave1-complete.definition.json:37–42`, `finding.source: checker`, not degradation-eligible).
- mutation: the depth-review contract, not the limit rule, owns this failure and masks the limit; degradation does not apply (ineligible rule stays blocking).
- neighbors: `tests/e2e/wave1-focus-coverage-rerun.test.mjs:75–78` (historical backing also surfaces `per_topic_depth_review_contract` with limit masked); `check-gate-wave1-complete.test.mjs:909,981–986`; `wave-depth-contracts.test.mjs:395`.
- disposition: **Share setup** (P1 — reuse the focus contract baseline).
- evidence: invalid = baseline + one `focus_coverage` write with only `topic_uid` mutated; mask/checker/degraded facts come from a real Gate run.
- cost drivers: ~25 production CLIs = ~24 setup + 1 `runWave1Gate attempt:3 expectedStatus:1` (:141). No fixed waits.

## File-level baseline-cloning feasibility (plan P1.1)

**Verdict: YES — this cluster is the cleanest P1.1 fit.** Every variant starts
from the identical output of `prepareWave1Bundle`, built purely through
production predecessors (no Engine fact hand-authored; only the Phase-owned
`depth-review.yaml` `focus_coverage` declaration is written after the
baseline). Build once per test run (~24 CLIs), byte-snapshot with the existing
`snapshotBundle`/`restoreBundle` (`deterministic-chain-harness.mjs:47–57`),
restore to the ORIGINAL path before each variant's independent mutation.
Estimated saving: ~3× the ~24-CLI setup ≈ **15s of the cluster's 20.6s**.

First independent mutation per variant:
- 13 (`noFocus`): none — pristine baseline; (`covered` mutates after its own clone).
- 13 (`covered`): `writeFocusCoverage(bundle, focus)` at :95.
- 22 (`blocked`): `writeFocusCoverage` at :116 (`[limitation]`).
- 25 (`partial`): `writeFocusCoverage` at :116 (`[coveredCommitment, limitation]`).
- 34 (`invalid`): `writeFocusCoverage` at :139 (sabotaged `topic_uid`).

CLI count with shared baseline: 13 → ~50→~26; 22/25 → ~27→~4; 34 → ~25→~2.

**Open items before a `safe` verdict (mark unknown until verified):**
1. `instantiateBundle` embeds a fresh unique `dpt_rb_<name>`; receipts/work-unit
   rows may bind absolute bundle paths — snapshot must restore to the same
   original path; check `rb_plan.md`/rebundling under a copied name.
2. The e2e sibling (`wave1-focus-coverage-rerun:62`) has a different pre-Wave1
   shape (HITL2 rerun baseline) — do NOT merge families; keep separate baselines.
3. Confirm byte-stability of the `phase-wave1.md` checkpoint (after
   `stageWave1`, before the wave1 Gate) with zero re-runs in current code.

**Guardrail check:** cloning only cpSyncs an immutable, gate-passing bundle and
then writes the independent `focus_coverage` declaration — copies a legal
predecessor, never hand-authors an Engine gate/transition/ledger/receipt fact.
No violation.

**Summary:** rows 13/22/25/34 all → **Share setup**. None is Deduplicate/
Retire/Split; the retained real boundary is `check-gate-wave1-complete.mjs` (+
`inspect-wave1-output.mjs`) evaluating `focus_coverage_limit` vs
`per_topic_depth_review_contract` — the definition-owned degradable vs
non-degradable distinction.
