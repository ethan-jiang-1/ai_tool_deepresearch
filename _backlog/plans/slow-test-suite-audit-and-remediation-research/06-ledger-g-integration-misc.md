# 06 — Ledger G: Misc Integration (rows 20, 23, 29)

> Source: parent-agent shallow trace + subagent fragment (2bcced43), 2026-08-22.
> Rows marked "(shallow)" should be re-verified on implementation; dispositions
> follow the plan's inventory.

## submits the public Wave2 conditional template without a hidden source-identity rejection
- file:line: `tests/integration/cli/operate-topic-state-projection.test.mjs:279`
- measured: 4.751s (row 20)
- assertion: the public Wave2 `apply_seed_projection` conditional template submits successfully (no hidden source-identity rejection) after the full Wave0→Wave2 chain is driven through production CLIs; the schema exposes the conditional form and the apply commits.
- authority: `DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs` (schema + apply surface) and `engine/helpers/canonical-topic-state.mjs:applyCanonicalTopicState` (wave2 conditional projection + source-identity checks). (shallow — verify exact module)
- mutation: full chain is driven (instantiate → 6× passAndEnter with stageWave0/1/2 callbacks → runSchema → runApply); no Engine fact hand-authored.
- neighbors: `tests/engine/helpers/canonical-topic-state.test.mjs` (direct matrix); operate-topic-state CLI matrix elsewhere in same file.
- disposition: **Keep + profile** (P2).
- evidence: unique public-template submit regression boundary; only setup/prefix cost may be reduced (reuse a prepared Wave2-ready baseline if byte-safe).
- cost drivers: ≈33 production CLIs per run — 1 instantiate + 6× (gate + enter + advance) + stage callbacks (claim/submit/persist/index/completion) + schema + apply (subagent count, fragment). No fixed waits.

## keeps the setup-only Final boundary empty and free of Subject/native output
- file:line: `tests/integration/md/case-138-standard-final-refinement-contract.test.mjs:66`
- measured: 4.574s (row 23)
- assertion: after the real case-138 setup script runs, the setup-only Final boundary is empty: `current_gate`/`next_gate` reflect the setup stop, and the final-report inventory contains no Subject/native output.
- authority: `experiments_env/shared/prepare-iterative-interaction-case.mjs` (production setup script, invoked with `138 --target-dir`), plus the final-report inventory helper the test reads. (shallow)
- mutation: the setup-only boundary must stay empty — no authored Final content, no Subject output injected.
- neighbors: case-138 playbook registry assertions in the same file (:46); `final-report` inventory helpers under tests/helpers or experiments_env.
- disposition: **Keep + profile** (P2) — "production setup script sentinel; inspect whether fixture creation can start from a frozen baseline".
- evidence: the setup script is the native authority; only the fixture-creation prefix may be optimized (frozen baseline if the script's output is byte-stable).
- cost drivers: 1 heavy setup subprocess (`prepare-iterative-interaction-case.mjs` internally runs gates via the monitor wrapper: 1 test-level launch + nested child gate CLIs). No fixed waits.

## claim_verification → wave1 gate fails with threshold 10 (8c.2)
- file:line: `tests/integration/cli/gate-dynamic-threshold.test.mjs:397`
- measured: 4.147s (row 29)
- assertion: with `wave1_per_topic_ref_floor: 10` and only 5 references present, the wave1 gate fails (`check.passed === false`) and the inspect diagnostic contains "reference floor is 5/10".
- authority: `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs` (or engine evaluator feeding it — the `wave1_per_topic_ref_floor` dynamic threshold + floor diagnostic). (shallow)
- mutation: bundle + submitted references only; gate must fail without mutating.
- neighbors: 5 other 8c.x cases in the same file (397-area table), each building its own bundle + `setupMinimalWave1`; direct threshold matrices under tests/engine.
- disposition: **Keep + profile** (P2) — plan row 29 note: "check whether fixture setup is shared with adjacent table cases".
- evidence: fixture setup is NOT shared — each 8c.x case runs `createBundle` (1 CLI) + `setupMinimalWave1` (several CLIs: claim/submit/inspect + gate) + `runGate` (1 CLI). A shared immutable pre-gate baseline across the 6 rows is the P2/P3 opportunity.
- cost drivers: ~6-10 production CLIs per case (createBundle + setup + gate), repeated 6× across the table. `runGate` has a 10s timeout (bounded, not a fixed wait).

## Cluster summary
- All 3 rows: no fixed waits; cost = production CLI/fixture startup.
- Sharing opportunities: gate-dynamic-threshold's 8c table (6 identical-shape rows) is the cheapest win; operate-topic-state:279 needs a Wave2-ready baseline (riskier); case-138 depends on setup-script byte-stability (verify before touching).
