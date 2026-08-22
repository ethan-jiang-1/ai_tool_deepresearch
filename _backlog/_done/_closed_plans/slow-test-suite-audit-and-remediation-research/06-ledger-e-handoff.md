# 06 — Ledger E: Handoff Witnessing Lifecycle (row 2)

> Source: subagent analysis (ae4f269f), 2026-08-22. Anchor verified (`it()` at :988).

## prevents status laundering across normal, HITL2 rerun, and superseded-pass paths
- file:line: `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs:988`
- measured: 22.838s (plan row 2)
- assertion: a newer gate_attempt at the same (gate, currentNodeRef) supersedes an older passed attempt, preventing stale-pass status laundering through enter-phase and advance-status; the superseded path is rejected, the normal path completes through Final, and the HITL2 rerun path routes through rerun-ready → seed-topics.
- authority: `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs:supersededBy` (:180, scans later trace events for gate_attempt at same gate+currentNodeRef that is not passed or has different `next`); `latestLegalPassedHandoff` (:717, reverse walk, `makeHandoff` :669 calls `supersededBy` first); `validateEnterPhaseTarget` (:831, blocks enter-phase when latest handoff targets a different node); `validateSourceGateStatusSync` (:881, blocks advance-status on source-gate mismatch); `cli/advance-status.mjs:169`; `cli/enter-phase.mjs`.
- mutation: `rb_trace.jsonl` gate_attempt sequence must not be hand-edited/reordered — each attempt at same (gate, currentNodeRef) compared by trace index; newer non-passing or differently-routed attempt invalidates the older pass. `rb_status.json` current_gate/next_gate window stays Engine-owned.
- neighbors: `tests/engine/handoff-helpers.test.mjs:217` (rejects superseded source pass), :227 (superseded predecessor pass preflight), :139 (stale enter-phase target), :195 (stale status-window preflight); e2e `rerun-round-continuity.test.mjs:470` (receipt-bound replay rejection); `post-final-rerun-lineage-continuity.test.mjs:241` (C5/Final lineage).
- disposition: **Keep + profile / Share setup (P1)** — the three branches are a unique lifecycle proof (no single branch covers normal→Final, HITL2→rerun→seed, superseded-pass rejection); branches are NOT deduplicable. But the identical `prepareThroughWave0Entry` + `passWave0WithDiagnostics` prefix (20 spawnSync × 3 = 60) and `stageWave1Pass` (21 × 2 = 42 duplicated) can be a legal immutable predecessor snapshot shared across branches.
- evidence: byte snapshot at post-`passWave0WithDiagnostics` boundary (all trace/status production-authored); each branch mutates independently from there through production CLIs. One before/after serial timing; all three branches still pass.
- cost drivers: 140 `runNode` spawnSync calls (normal 58, rerun 56, superseded 23) + 34 `runGate` nested gate processes ≈ **174 Node processes**; 84/140 (60%) perform identical cross-branch work. `runHealthChecks` (line 939, `finally` at :1000): 3 `verify-bundle-health.mjs` spawns, diagnostic only — confirmed health-check duplication. **No fixed waits**; no explicit fixture copies (each branch builds its own bundle via `new-disposable-bundle.mjs`).

## First independent mutation per branch (share-setup boundary)
- Normal (:821): `advanceStatus(bundle, 'wave0_complete', { expectSuccess: false })` — unwitnessed status sync rejection.
- Rerun (:890): `stageHitl2(bundle, 'rerun')` — writes `user_decision: rerun` into `rb_profile.yaml`.
- Superseded (:914): `runGate(bundle, 'wave0-complete', ...)` — new Wave0 gate_attempt that fails (after `stageWave0ParseFailure` re-applied), superseding the older passed attempt.

## File-level economics
- Duplicated prefix: `prepareThroughWave0Entry` 42 spawns (14×3, all identical), `passWave0WithDiagnostics` 18 (6×3), `stageWave1Pass` 42 (21×2 between normal/rerun) = 102 of 140 spawns duplicated or near-duplicated.
- Health checks: 3 production spawns in `finally`, no proof obligation — safe to drop or consolidate.
- Snapshot boundary `post-passWave0WithDiagnostics` is guardrail-clean: every gate/enter/advance is a production CLI invocation; each branch's first mutation is production-authored.
