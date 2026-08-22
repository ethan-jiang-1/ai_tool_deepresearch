# 06 — Ledger F: e2e Lineage + Seed Projection (rows 5, 10, 11, 14, 17, 18)

> Sources: F2 (a36620c6) rows 10/11/18; F1b (f2d5373f) row 14; F1c (ba622a0e)
> row 17; F1a (b6547304) row 5 PENDING. 2026-08-22.

## rejects historical focus backing and accepts a current submitted increment through the normal Wave1 route
- file:line: `tests/e2e/wave1-focus-coverage-rerun.test.mjs:62`
- measured: 8.490s (row 10)
- assertion: the Wave1 gate FAILS on `per_topic_depth_review_contract`'s `focus_coverage_ref_round_mismatch` (NOT `focus_coverage_limit`, no fallback, no transition) with the rule hint; after re-submitting with a current-round work-unit ref it PASSES (`failed_rule_ids` empty, no `degraded`, `next` → `phases/phase-wave2.md`).
- authority: `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs` → `engine/helpers/wave-contract-evaluators.mjs` → `wave-depth-contracts.mjs:294-295` (`record.rerun_count !== currentRerunCount` → `focus_coverage_ref_round_mismatch`); rule in `gate-wave1-complete.definition.json:37,44-45`; committed-ref preflight binding at `wave-depth-contracts.mjs:280-292`.
- mutation: `focus_coverage_ref_round_mismatch` + current-round count binding (294-295) and ref→commit ledger verification (280-292) persist; `focus_coverage_limit` NOT triggered, no degradation on this failure (:76 asserts absence); no status/transition advance.
- neighbors: direct engine proof `tests/engine/helpers/wave-depth-focus-coverage.test.mjs:158-180`; wave1 gate matrix `tests/integration/cli/wave1-focus-coverage-contract.test.mjs:85,102,133` (rows 13/22/25/34). These two files are the only owners of round-mismatch identity in a rerun context at CLI level.
- disposition: **Keep + profile** (P1) — one real production gate sentinel; optimize setup by sharing `buildHitl2Baseline` snapshot.
- evidence: unique boundary = CLI wiring presenting round-mismatch failure as `failed_rule_ids` + `hints` + no-transition; engine tests cover the rule, not the CLI wiring. Cost: ~62 CLIs, ~8 unique suffix.
- cost drivers: `buildHitl2Baseline` (research-chain-fixture.mjs:313-325) ≈ 35 CLIs (1 instantiate + 7×passAndEnter=21 + stageWave0/1/2 submit/persist/log 13); `enterRerunWave1` (:51-59) ≈ 19 CLIs; unique suffix ≈ 8 (2× runGate :73/:88, stageWave1 :81). No fixed waits; no snapshot reuse — each case builds a fresh baseline.

## keeps historical and current Topic-level focus facts distinct through the production synchronizer
- file:line: `tests/e2e/reference-evidence-map-rerun.test.mjs:85`
- measured: 8.093s (row 11)
- assertion: `sync-reference-index.mjs` renders historical-round blocked focus as `historical context` rows and current-round covered focus as `covered` rows with committed refs; `### Reference relationships` contains NO focus-status rows; if the synchronizer merges round facts or mutates README, the case fails.
- authority: `cli/sync-reference-index.mjs` → `engine/helpers/reference-index-sync.mjs:renderReferenceEvidenceMapFromFacts` (section split via `currentFocusStatus` + `relationships` :330-340; `### Current focus increments` :377; banner :368; dead rule :383); covered/blocked legality from verified focus facts via wave-depth-contracts.
- mutation: two-section split keeps derived/navigation semantics — never attributes focus status to reference rows; never hand-writes (README, `_INDEX.md`, focus coverage, gate results); only refreshes `_INDEX.md` + `README.md` (phase-wave1.md:253 contract); `rb_status`/`_work_units`/commit ledger unmodified (integration test proves via authoritySnapshot).
- neighbors: `tests/integration/cli/reference-evidence-map.test.mjs:79` (same CLI, non-mutation + `reference_topic_binding_legacy_unsupported`, but hand-built minimal bundle, no rerun-round discrimination); `wave1-reference-convergence.test.mjs:90`, `wave1-target-receipt-gate.test.mjs:20`, `handoff-witnessing-lifecycle.test.mjs:605`; template `tests/integration/md/wave1-reference-evidence-map-guidance.test.mjs:19`. Unique CLI-level round-discrimination proof on a full rerun chain.
- disposition: **Keep + profile** (P1) with open sub-question → **Investigate** (`plan_basename` derivation, below).
- evidence: plan row 11 "reuse the same prepared rerun snapshot as related focus tests if isolation holds" — legal IF `plan_basename` survives restore. **Open question: `rb_plan.md` `plan_basename` = `basename(bundle).replace(/^dpt_rb_/, '')` (research-chain-fixture.mjs:56); a copy restored at a DIFFERENT path carries the old plan name. Check whether ANY production gate/checker/synchronizer compares the bundle dir name against `plan_basename`. If none: safe to copy. If some: must restore to the ORIGINAL path (build once per run, snapshot + restore in place) — never relocate.**
- cost drivers: same prefix as case 1 (~35 + ~19 CLIs, fresh per case); unique suffix ≈ 6 (stageWave1 :90) + 2 sync calls (:95,:103). No fixed waits; no snapshot reuse today.

## runs Wave0 → Wave1 → Wave2 with packet → inspect → completion → gate ordering
- file:line: `tests/e2e/seed-topic-projection-materialization.test.mjs:47`
- measured: 4.985s (row 18)
- assertion: for each wave: packet materialization (`applyCanonicalTopicState` replaces `__BACKFILL_*__` tokens) → production `inspect-<wave>-output.mjs` passes → `log-event` completion → gate passes with `check.next` honored and `enter-phase`/`advance-status` advance; final seed_topics/topic-a.md has no `__BACKFILL_*__` tokens, contains the backfill card read-only constraint, `current_node === 'phases/phase-hitl2.md'`.
- authority: production CLIs `instantiate-run-bundle.mjs`, `inspect-wave0/1/2-output.mjs`, `log-event.mjs`, `check-gate-wave*-complete.mjs` + `enter-phase.mjs` + `advance-status.mjs`; token replacement via `engine/helpers/canonical-topic-state.mjs:applyCanonicalTopicState` (fixture 141-155, 206-216, 238-252); token inventory in `workflows/nodes/templates/seed-topic-template.md`; final seed assertion also plain file read (:65-73).
- mutation: (packet→inspect→completion→gate, `check.next` → `enterPhase` → `advanceStatus`) chain order fully preserved; all five `__BACKFILL_*__` tokens + backfill-card read-only warning preserved; packet writer upsert/one-shot consumption not bypassable by hand-authoring.
- neighbors: `tests/engine/helpers/seed-topic-projection.test.mjs:208,248` (packet atomicity, idempotent upsert, no CLI), `canonical-topic-state.test.mjs:76-104` (token inventory/contract); CLI routes `operate-topic-state-projection.test.mjs:279` (row 20), check-gate-wave1/2-complete matrices; `tests/integration/md/phase-wave2-md-structure.test.mjs:71`.
- disposition: **Keep** (P2) — representative end-to-end ordering canary; no split/retire/duplicate.
- evidence: the full-chain manifest is the only asset proving cross-wave packet→inspect→completion→gate order; direct matrices and template neighbors all rely on it as wiring proof.
- cost drivers: ≈38 CLIs, nearly all on the chain path (no redundant prefix): instantiate 1 + advanceToWave0 ≈17 + per-wave inspect 1 + log-event 1 + passAndEnter/stageNext ≈14 + final wave2-complete 3. No fixed waits; no snapshot reuse; fresh instantiate per case.

## delivers the base, refines in place, and accepts C5 only after an explicit expansion request
- file:line: `tests/e2e/final-refinement-continuity.test.mjs:106`
- measured: 6.019s (row 14)
- assertion: 3 publishes (base→final.md, v1→final_v1.md, v2→technical_deep_dive) leave earlier revisions byte-identical and trace free of any `gate_attempt`/`phase_transition`→final/satisfaction; C5 (`post_final_rerun` apply) is `committed` only after a request JSON with `action: 'post_final_rerun'` + inspection `request_bindings`.
- authority: `engine/helpers/post-final-recovery.mjs:inspectInternal` (:350; eligible verdict :379-383 requires quiescent bundle + rerun-limit headroom), `apply` gate `exactRequestMatchesFacts` (:406), `POST_FINAL_RECOVERY_ACTION = 'post_final_rerun'` (:50, `decision_source: 'explicit_post_final_request'` :397); C5 entry authority via `check-reentry.mjs:808`.
- mutation: no F→D flip; the falsifiable behavior is byte-immutability of committed final revisions (all prior bytes re-read after each publish and after apply) and absence of authority events before the explicit request.
- neighbors: `post-final-rerun-lineage-continuity.test.mjs:204` (same `inspectPostFinalRecovery` + production C5 apply); sibling :92 (premature final rejection); `tests/integration/md/self-documenting-workflow-nodes.test.mjs:98`.
- disposition: **Keep + profile**
- evidence: 34 production CLI launches (1 instantiate + 21 passAndEnter triples + apply-research-style + hitl2 gate + readiness gate + 2 enter/advance into final + 3 publish + check-reentry + post-final-recovery apply); measured ~6s is launch-bound, not wait-bound.
- cost drivers: fresh `instantiate-run-bundle.mjs` baseline rebuilt per test (~22 launches in `buildHitl2Baseline`) + `reachEmptyFinal`/`enterAndSynchronizeFinal` (5+2) + 3 publishes + 1 reentry + 1 C5 apply ≈ 34 CLI launches; no sleeps/fixed waits.
- unique boundary: only the actual CLI chain can prove the negative fact (no C5 transition before an explicit expansion request) and revision byte-immutability; absence-of-trace assertions cannot be unit-stubbed.

## rejects a premature primary-looking file before Final entry without entry mutation
- file:line: `tests/e2e/final-refinement-continuity.test.mjs:92`
- measured: 5.064s (row 17)
- assertion: `enter-phase.mjs` exits 1 with stdout matching `/requires an empty primary inventory/i` when final/final.md exists pre-entry.
- authority: `engine/helpers/handoff-helpers.mjs:evaluateFinalEntryAdmission` (:762; empty-inventory gate :788-794, called from `cli/enter-phase.mjs:113`).
- mutation: `rb_status.json` and `rb_trace.jsonl` are byte-identical before/after the rejected entry (no state mutation).
- neighbors: `tests/integration/cli/enter-phase.test.mjs:259` (same `/requires an empty primary inventory/` reason, engine/CLI level); :260 (no continuation cues leak).
- disposition: **Retain**
- evidence: `evaluateFinalEntryAdmission` returns `{ok:false, reason:'first Final entry requires an empty primary inventory…'}` solely because `inventory.primary_series.classification !== 'empty'`; on reject, enter-phase aborts before any status/trace write.
- cost drivers: ≈25 production CLI launches — `buildHitl2Baseline` ≈24 (8 × passAndEnter triples + instantiate/log-event), `reachEmptyFinal` adds apply-research-style + readiness runGate, test runs 1 enter-phase; no waits/polling.
- unique boundary: the only e2e proof that a failed Final entry is side-effect free (status+trace bytes unchanged) through the real CLI contract — cannot be mocked.

## RETAINS the accepted C5 audit lineage through a newer Final handoff and appends globally
- file:line: `tests/e2e/post-final-rerun-lineage-continuity.test.mjs:241`
- measured: 14.961s (row 5)
- assertion: after `applyC5(bundle, 'new-final')`, the accepted `post_final_reentry` event is retained as the audit witness through a NEWER Final handoff: the test drives the accepted rerun to a new readiness (`driveAcceptedRerunToNewReadiness`), proves a fail-closed branch (primary drift → `enterPhase` rejected with `/prior-inventory digest|inventory drifted/i`, status+trace byte-identical), then enters/advances through `newer_final_loaded_pending_status` → `newer_final_delivery_pending`, publishes `final/final_v1.md` (`verdict: committed`, report bytes exact), reaches `eligible` at `phases/phase-final.md`, and finally asserts the trace's `post_final_reentry` event is deepEqual to the ORIGINAL accepted event (:291) — lineage retained and appended globally; a later explicit evidence-expansion request then applies again (lines 293+).
- authority: `engine/helpers/post-final-recovery.mjs` `inspectPostFinalRecovery` (stages `newer_final_entry_pending` / `newer_final_loaded_pending_status` / `newer_final_delivery_pending` / `eligible`), `cli/operate-post-final-recovery.mjs apply` (C5 apply, `action: post_final_rerun`), `cli/enter-phase.mjs` (prior-inventory digest check — BUG-236: non-primary presentation drift no longer blocks primary-series-bound C5), `cli/operate-artifact-persistence.mjs publish-final-report`, `cli/advance-status.mjs`, plus the full rerun gate chain (rerun-ready → seed-topics → wave0/1/2 → hitl2 → readiness).
- mutation: fail-closed branch must NOT mutate status/trace on drifted pre-load; the accepted C5 event object must survive a newer Final handoff identically; final_v1 published byte-exact; current_node reaches `phases/phase-final.md`; no hand-authored trace/ledger fact.
- neighbors: `final-refinement-continuity.test.mjs:106/:92` (rows 14/17 — same `inspectPostFinalRecovery` stage machinery on the first Final); sibling tests in this file (:228 count-only style params); B-cluster `rerun-round-continuity` (different: pre-Final reruns vs post-Final C5). The only post-Final lineage-append proof through a NEWER Final handoff.
- disposition: **Keep + profile** (P1) — "high-value C5/Final lineage proof; optimize copied snapshot and CLI count only".
- evidence: unique boundary = accepted-C5-event retention + fail-closed pre-load + global append through a newer Final, all through real production CLIs; the in-test `cpSync` snapshot (:255) is already the legal-predecessor pattern — extend it to the whole file (build the post-C5 baseline once, restore per branch) rather than rebuilding the full rerun chain per case.
- cost drivers: ≈100+ production CLI launches — `applyC5` (1 operate-post-final-recovery apply + enter + advance), `driveAcceptedRerunToNewReadiness` (7× runGate/enterPhase/advanceStatus triples + 5× stageWave0 + 5× stageWave1 + stageSeed/stageWave2/stageHitl2 with submit/persist/log internals + applyStyle), fail-closed enterPhase, enter/advance, publish-final-report, then a second C5 apply for global append. No fixed waits.
- unique boundary: only the real CLI chain can prove lineage retention through a newer Final + fail-closed pre-load; cannot be unit-stubbed.

## File-level economics (rows 10/11/18 — from F2)

- **No snapshot reuse today** in these three files: every case builds its own
  bundle fresh in-run via production predecessors
  (`instantiate-run-bundle.mjs` → gate/enter/advance chain → submit fixture
  (`claimAndSubmitFixtureWorkUnit`, experiments_env/shared/work-unit-playbook-utils.mjs:921-936: ~3 CLIs per submit) → `persistPhaseReference` (operate-artifact-persistence + sync-reference-index: 2 CLIs) → `log-event.mjs`).
  `snapshotBundle`/`restoreBundle` (deterministic-chain-harness.mjs:47-57)
  exist but are unused by these files (the rerun-round-continuity family uses them).
- Full CLI counts: wave1-focus-coverage-rerun case ≈62 (35+19+8);
  reference-evidence-map-rerun case ≈62; seed-topic case ≈38 (nearly all on-chain).
- **Cross-file sharing legality:** cases 10 and 11 share the SAME
  `buildHitl2Baseline` checkpoint (Wave2 complete → HITL2 reached, rerun
  decision pending) — exactly plan rows 10/11's hint. Branches diverge only
  after the checkpoint (stageHitl2 `rerun` identical; only suffix
  focus-r2 vs evidence-map-r2 differs, in post-checkpoint stageWave0/1
  content, on separate restored copies). Build once per run, byte-snapshot at
  original path, restore before each independent mutation = legal (plan P1.1).
  **Caveat (Investigate): `plan_basename` is derived from the bundle dir
  name; verify no production checker compares dir name vs `plan_basename`
  before allowing copied restores; otherwise restore in place only.** Case 18's
  baseline shape (pre-Wave0) differs from 10/11 (Wave2+HITL2) — cannot share;
  its cost is inherent to its canary role.
