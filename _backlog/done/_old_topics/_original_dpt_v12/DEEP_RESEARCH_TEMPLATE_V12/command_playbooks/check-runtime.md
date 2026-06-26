---
title: "Check Runtime"
role: "execution-phase drift verifier"
scope: "active-run audit of plan/status/queue/trace/reference/artifact/topic seed consistency"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/RESEARCH_PROFILES.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Check Runtime

Use this verifier after execution has begun. It is separate from `command_playbooks/check-instantiation.md`: production qualification checks whether the run bundle was instantiated correctly; runtime qualification checks whether an active run has drifted away from its own plan, queue, evidence, topic seeds, artifacts, gates, and trace.

Do not rewrite history during qualification. Runtime qualification is read-only: it may perform local checks, but it must not update `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, references, artifacts, or topic seeds. If a mismatch is found, return `FAIL_FIX` and require the execution agent to repair the relevant control file or local file set, record retrieval-test results, or append a diagnostic trace entry.

Use runtime qualification rather than clean-instantiation `command_playbooks/check-instantiation.md` for any run that already has execution history, stateful migration history, repaired control files, accepted references, artifacts, or prior trace entries. Do not fail an active or migrated run merely because it no longer has instantiation-start fields.

Before returning `PASS`, runtime qualification must either run `command_playbooks/check-surfaces.md` or complete its checklist as the `local sync integrity` subcheck. A failed local sync check is a runtime `FAIL_FIX`; do not pass runtime while confirmed seed topics, reference files, artifacts, or their control-file sync are known to be malformed.

## Inputs

Runtime qualification requires concrete paths for:

- `PLAN_PATH`
- `PROFILE_PATH`
- `STATUS_PATH`
- `QUEUE_PATH`
- `TRACE_PATH`
- `RUN_DIR`
- `FRAMEWORK_DIR`
- `TOPIC_ROOT`
- `REFERENCE_DIR`
- `ARTIFACT_DIR`

If any required path is missing or ambiguous, return `FAIL_BLOCKED`.

## Results

Return exactly one result:

| result | meaning | next action |
| --- | --- | --- |
| `PASS` | active run files are mutually consistent and gate claims are auditable | continue execution from `QUEUE_PATH`; if Readiness is the active gate and all Readiness items pass, the execution agent may perform the closeout writeback described below |
| `FAIL_FIX` | drift or missing audit evidence exists but can be repaired locally | repair control files or queue work, append trace when diagnostic, then rerun |
| `FAIL_BLOCKED` | required files, evidence paths, or user decisions are unavailable | record blocker and ask only for the missing input |

## PASS Writeback Boundary

Runtime qualification itself remains read-only even when it returns `PASS`.

Readiness closeout is two-phase:

1. `readiness_preflight`: every Readiness item except `Runtime Qualification Result` is already `pass`, `current_gate=wave2_complete`, and runtime qualification may run read-only.
2. `readiness_closeout_writeback`: runtime qualification returned `PASS`; the execution agent, not the verifier, writes the closeout state.

If the execution agent uses a `PASS` result to close Readiness, the execution agent must write a normal control-file update:

- `STATUS_PATH`: record `Runtime Qualification Result`, set `state=completed`, set `current_gate=readiness_passed`, set `next_gate=none`, set `Readiness Check.overall_status=pass`, set `closeout_phase=closed`, set `Operator View.stop_authorization_state=final_delivery`, set `Operator View.unauthorized_stop_next_action=not_applicable`, and set `Resume Checkpoint.safe_to_interrupt=yes`.
- `QUEUE_PATH`: keep the heading `## Active Queue`; set `queue_health=closed`, set `closure_reason=readiness_passed`, set `stop_authorization_state=final_delivery`, set `unauthorized_stop_next_action=not_applicable`, and set all five active slots (`slot_1_current` through `slot_5_tail`) to `none` or `not_applicable_after_readiness_passed`.
- `TRACE_PATH`: append a diagnostic closeout entry only when the closeout changes prior state, corrects drift, records migration repair, or captures a reusable execution lesson.

Do not treat the absence of this PASS writeback as a verifier failure during the read-only pass itself. Treat it as the execution agent's next write if and only if all runtime checks pass.

## Runtime Drift Checklist

Markdown-only validation rule: runtime qualification must return a structured checklist in its response, not a separate file or script. For every section below, record `pass / fail / blocked`, the local evidence inspected, and the required repair when failing. Do not return `PASS` from prose confidence alone.

Before considering `PASS`, actively test for formally valid but actually failing states: gate flags without inventory backing, topic completion without seed backfill, queue closure without refill, synthesis without local backing refs, stale retrieval assertions, post-readiness expansion, and source-intake fan-in boundary leaks. Do not invent failures; record inspected evidence when a category is clean.

Use this response shape:

| runtime check | result | local evidence inspected | repair if failing |
| --- | --- | --- | --- |
| local sync integrity | `<pass/fail/blocked>` | `<check-surfaces result or seed/reference/artifact checklist>` | `<repair or none>` |
| canonical runtime state | `<pass/fail/blocked>` | `<status/queue fields>` | `<repair or none>` |
| runtime command entrypoint | `<pass/fail/blocked>` | `<PLAN Runtime Command Entrypoint, local COMMANDS.md, local CLI helper, root control-file bindings>` | `<repair or none>` |
| topic root alignment | `<pass/fail/blocked>` | `<topic_root/reference_dir/artifact_dir paths>` | `<repair or none>` |
| seed topic intake drift | `<pass/fail/blocked>` | `<topic intake fields/seed files/status gaps/queue candidates>` | `<repair or none>` |
| topology delta integrity | `<pass/fail/blocked>` | `<STATUS Topology Delta / PLAN Topic Registry / QUEUE refill / TRACE topology entry / topic seed file / gate reopen fields>` | `<repair or none>` |
| research profile | `<pass/fail/blocked>` | `<specs/RESEARCH_PROFILES.md; PROFILE configured parameters; PLAN projected profile/configured floors; STATUS audit targets; QUEUE gate rules>` | `<repair or none>` |
| gate audit integrity | `<pass/fail/blocked>` | `<audit surfaces>` | `<repair or none>` |
| wave 1 evidence inventory | `<pass/fail/blocked>` | `<inventory/topic blocks>` | `<repair or none>` |
| webpage diagnostic and pruning | `<pass/fail/blocked>` | `<inventory diagnostic fields/reference bodies/excluded inventory>` | `<repair or none>` |
| artifact layout and freshness | `<pass/fail/blocked>` | `<artifact paths/files/produced_at_ref_count>` | `<repair or none>` |
| wave 2 synthesis integrity | `<pass/fail/blocked>` | `<matrix/artifacts>` | `<repair or none>` |
| anti-stall budget | `<pass/fail/blocked>` | `<budget fields/P0-P1 limitations>` | `<repair or none>` |
| trace checkpoint continuity | `<pass/fail/blocked>` | `<TRACE entries / STATUS Trace Pointer / gate closeout fields>` | `<repair or none>` |
| queue work-unit receipts | `<pass/fail/blocked>` | `<QUEUE active slots, Refill Pool candidate fields, receipt_check_phase, required_receipts / completion_receipt, named branch receipts, artifact steering receipts, TRACE transition receipt>` | `<repair or none>` |
| queue task lineage / PROFILE-PLAN-STATUS-QUEUE | `<pass/fail/blocked>` | `<PROFILE intent / PLAN targets / STATUS gaps / gate failures / active queue task fields>` | `<repair or none>` |
| Rolling Task Projection / User-Visible Stop Authorization | `<pass/fail/blocked>` | `<QUEUE Active Queue projection/autonomy fields, STATUS Operator View stop authorization, blocked/final/empty-queue state, post-gate continuation trace>` | `<repair or none>` |
| source-intake fan-in boundary | `<pass/fail/blocked>` | `<runner mode/cache paths/fan-in notes>` | `<repair or none>` |
| queue continuity | `<pass/fail/blocked>` | `<active queue/promotions>` | `<repair or none>` |
| retrieval continuity | `<pass/fail/blocked>` | `<tested route/status record>` | `<repair or none>` |

### 1. Canonical Runtime State

- `STATUS_PATH.Current Execution Snapshot.state` uses only `not_started / in_progress / blocked / completed`
- `current_wave` uses only `Instantiation / Wave 0 / Wave 1 / Wave 2 / Readiness Check`
- `current_gate` uses only `instantiation_complete / setup_ready / wave0_complete / wave1_complete / wave2_complete / readiness_passed`
- `next_gate` uses only `instantiation_complete / setup_ready / wave0_complete / wave1_complete / wave2_complete / readiness_passed / none`; pseudo-gates such as `wave1_start` are invalid
- `QUEUE_PATH.Active Queue.execution_mode` uses only `sequential`
- `QUEUE_PATH.Active Queue.queue_health` uses only `ready / thin / blocked / closed`; `closed` is valid only after `readiness_passed`
- `QUEUE_PATH.Active Queue.stop_authorization_state` and `STATUS_PATH.Operator View.stop_authorization_state` use only `unauthorized_continue_required / final_delivery / decision_blocker / empty_queue_after_refill`
- `QUEUE_PATH.Blocked State.interrupt_condition_matched` uses only `not_applicable / mainline_blockage / high_risk_action`
- `topic_stop_decision` uses only `not_assessed / continue / complete / early_saturation / suspend / archive / redirect`
- branch dispositions use only `discard / compress / suspend / archive / redirect`
- any historical non-canonical value is clearly marked historical and is not the active state
- `setup_ready` is used only as a non-research transition gate after the execution workspace is initialized and before Wave 0 evidence work starts

### 2. Topic Root Alignment

- `RUN_DIR/_framework/` exists and remains free of run-specific state
- `RUN_DIR/_framework/` contains a complete local command set, including `COMMANDS.md`, `command_playbooks/`, and `cli_tools/`
- `TOPIC_ROOT`, `REFERENCE_DIR`, and `ARTIFACT_DIR` remain aligned: `TOPIC_ROOT = RUN_DIR/seed_topics`, `REFERENCE_DIR = RUN_DIR/seed_topics/_reference`, and `ARTIFACT_DIR = RUN_DIR/seed_topics/_artifacts`
- optional `original_topic/` remains outside `_framework/` and is not counted as a formal topic root
- `topics/` is not used as an active V12 topic root
- all accepted reference paths and artifact paths used by status/gate audits resolve under the active `REFERENCE_DIR` and `ARTIFACT_DIR`, not a mixed non-canonical root

### 2A. Runtime Command Entrypoint

- `PLAN_PATH -> Runtime Command Entrypoint` is present and points to local `RUN_DIR/_framework/COMMANDS.md`
- the entrypoint points to local `RUN_DIR/_framework/cli_tools/check_framework.mjs`
- `runtime_plan`, `runtime_status`, `runtime_queue`, and `runtime_trace` point to the instantiated root control files, not `_framework/output_templates/*.md`
- `_framework/output_templates/*.md` may contain placeholders because they are skeletons; root control files must not contain unresolved instantiation placeholders, and runtime metavariables may appear only in explicit schema/template/pattern guidance, never active values
- if `_framework` is incomplete and the source framework family/version matches exactly with no existing-file content drift, repair through `command_playbooks/repair-framework-snapshot.md`; if family/version differs or any existing required framework file differs from the current source package, require explicit framework migration

### 3. Seed Topic Intake Drift

- topic seed setup distinguishes missing lower growth-tail headings, which may be repaired during setup, from missing upper-section intake substance on confirmed topics, which must remain visible as `topic_intake_gap`, assumption, or queue-backed clarification work; pending candidates remain outside Topic Registry until confirmed
- `PLAN_PATH -> Seed Topic Intake Matrix` or explicit topic-goal fields remain the stable intake-readiness surface for `must_answer`, `why_now`, `boundary`, `evidence_anchors`, `why_it_matters`, `intake_status`, `intake_gap`, and `queue_consequence`; this surface must not replace `Topic Registry` as the id/slug Source of Record
- topic intake status is assessed before the topic is treated as fully ready for Wave 1 deepening; `seed_topic_intake_ready=gap_queue_backed` is valid only during setup when unresolved intake gaps have a concrete queue consequence, and it must not be treated as a passing Wave 0 topic-start row or Wave 1-ready state
- topic seed upper sections still preserve enough identity, must-answer, boundary, why-now, evidence-anchor, and why-it-matters context for later agents; execution backfill must not erase the intake surface

### 3A. Topology Delta Integrity

- `STATUS_PATH -> Topology Delta` exposes `pending_topic_candidates`, `candidate_dispositions`, `trigger_refs`, `affected_gates`, `new_topic_ids`, `reopen_consequence`, and `formalization_sync_note`
- discovery-stage candidates may be recorded during execution, but runtime qualification cannot pass while a candidate remains pending without disposition; return `FAIL_FIX` and require triage to choose `merge_existing / formalize_new_topic / suspend / archive / redirect`
- `Topology Drift Review.unresolved_new_topic_candidates` cannot carry unresolved candidates that are absent from `Topology Delta.pending_topic_candidates`
- every candidate receives exactly one disposition: `merge_existing / formalize_new_topic / suspend / archive / redirect`; when multiple candidates exist, candidate entries and disposition entries are semicolon-separated in the same order; weak signals that stay as `[涌现]` questions must be recorded as not formalized rather than silently changing the topic count
- `formalize_new_topic` is a runtime controlled mutation of generated `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, and topic seed files; it must not rerun `command_playbooks/instantiate-run-bundle.md` or regenerate the run from output skeletons
- formalized topics append the next stable topic id at the end of `PLAN_PATH -> Topic Registry`; existing topic ids, slugs, seed files, artifact paths, and counters are not renumbered or migrated unless a separate explicit migration trace exists
- each formalized topic appears consistently in `PLAN_PATH -> Topic Registry`, `Seed Topic Intake Matrix`, `Topic Goals`, `STATUS_PATH -> Topology Delta.new_topic_ids`, `QUEUE_PATH` refill work, the new topic seed file physically under `TOPIC_ROOT`, and a `TRACE_PATH` diagnostic entry tagged `topology_formalization`
- `STATUS_PATH -> Plan / Status Sync.topology_sync_state = synced` is valid only after the plan, status, queue, trace, and topic seed file all agree; partial formalization must use a pending sync state and concrete queue repair work
- if `STATUS_PATH` records `gate_reopen_state`, `reopened_from_gate`, `reopen_reason`, or `invalidated_claims`, `QUEUE_PATH` must contain same-wave repair/refill work that names the affected concrete gate or wave and the repair target
- if Wave 1, Wave 2, or Readiness previously passed and the new topic needs evidence or synthesis coverage, runtime qualification fails unless the affected gate is reopened and the queue contains Wave 1/Wave 2 repair work
- after `readiness_passed`, substantive new topic discovery is not post-readiness maintenance; it must reopen the affected earlier wave rather than adding new sources, claims, or research objects under a closed queue

### 4. Research Profile

- `PROFILE_PATH -> Profile Binding.research_profile` remains one of `quick_factual / exploratory_map / claim_verification`
- `PROFILE_PATH`, `PLAN_PATH.Instance Config`, and `PLAN_PATH -> Research Profile Projection` agree on selected profile, configured floors, must-answer policy, critical-claim stance, and any `manual_parameter_overrides`
- configured floors and critical-claim stance match `specs/RESEARCH_PROFILES.md`, unless the run records an explicit manual parameter override reason
- if `quick_factual` is active for management, decision-shaping, compliance, security, medical, legal, financial, irreversible, contested, or weakly sourced work, the run records `research_profile_user_choice=explicit_override`, risk rationale, confidence consequence, and any gate-reopen or migration consequence
- if `quick_factual` is active, `PROFILE_PATH -> Configured Profile Parameters.cost_expectation` records that quick is relative to higher-intensity profiles and still requires configured Wave 0, Wave 1, artifact, Wave 2, HITL2 human decision, and Readiness gates
- `STATUS_PATH` audit targets and `QUEUE_PATH` gate rules use the PROFILE-backed configured floors projected into the plan, not hard-coded default floor numbers
- if a stateful run changed the profile or floor values after execution began, the run records the change as an explicit gate-reopen decision with confidence and queue consequences
- if a stateful run changed source date windows, source families, trust/tier posture, exclusion filters, or webpage diagnostic posture after execution began, the run records the change through `command_playbooks/adjust-profile-parameters.md` or an equivalent trace/status/queue policy adjustment, and affected counted references are re-audited before gate PASS

### 5. Gate Audit Integrity

- gate audit target values match the PROFILE-backed configured floor values projected into `PLAN_PATH.Instance Config`, including the selected `research_profile`; runtime audits must not silently revert to hard-coded default floor numbers
- `current_gate` is supported by the matching audit surface in `STATUS_PATH`
- Wave 0 cannot pass from counters alone; every counted shared reference appears in the Wave 0 accepted shared reference inventory with local path, acceptance status, source type, trust level, source family, tier, evidence role, source date scope, supported claims, seed-backfill status, webpage diagnostic fields, cross-verification required/status, and content retention decision
- counted inventory rows use canonical machine values: `acceptance_status=accepted`, `tier=tier_1 / tier_2 / tier_3 / tier_4`, semicolon-separated `evidence_role` values, `seed_backfill_status=current / deferred_queue_backed / shared_foundation_only / not_applicable`, and `counted_for_floor=yes`
- counted webpage or webpage-derived references cannot pass Wave 0 or Wave 1 without Webpage Material Diagnostic Gate fields, passing substance/marketing checks, and acceptable content retention decision
- counted reference filenames preserve provenance: `00-shared-*.md` for Wave 0 shared foundation and `<topic-id>-*.md` for Wave 1 topic evidence; opaque `ref-NNN-*` names cannot count for a current V12 gate, even if the file body looks usable
- unavailable-after-search records include attempted search route, excluded source notes where any were found, and queue consequence
- Wave 1 cannot pass from loose readable source totals, artifact existence, multi-source reference files counted as multiple sources, or prose confidence
- Wave 0 cannot pass while active topic-start rows hide unresolved intake gaps or zero confirmed topics behind setup-ready state
- Wave 2 cannot pass without the Cross-Topic Conclusion Matrix; for single-topic runs this matrix must contain locally backed rows with `compared_with=not_applicable_single_topic`
- Readiness cannot pass without a recorded 30-second retrieval test route and result
- if a prior gate claim was premature, `TRACE_PATH` contains an append-only correction entry
- if `TRACE_PATH` records a premature claim for the current gate or a later gate, any renewed claim that the same gate passed must show it was re-earned through the matching audit surface rather than project-complete prose, worklog confidence, or artifact existence; otherwise status and queue must show the gate remains unpassed and affected work was refilled
- if later evidence invalidated a passed gate, status records Gate Reopen fields and trace records the diagnostic correction

### 6. Wave 1 Evidence Inventory

For every topic:

- the Wave 1 audit row exists
- `accepted_topic_ref_count` matches the accepted reference inventory
- every counted reference has `local_ref_path`, `acceptance_status=accepted`, `source_type`, `trust_level`, `source_family`, `tier`, `evidence_role`, `source_date_scope`, `supports_claims`, `supports_must_answer`, `supports_mechanism / supports_trend / supports_difficulty / supports_limitation`, `topic_unique_status`, `seed_backfill_status`, `web_substance`, `commercial_intent`, `marketing_risk`, `cross_verification_required`, `cross_verification_status`, `content_retention_decision`, and `counted_for_floor`
- `topic_unique_status` uses `topic_unique / shared_foundation / both / not_applicable`; counted topic-floor rows should use `topic_unique` or `both` unless a scarcity exception records why shared foundation dominates
- spot-check at least 3 counted accepted references across topics and confirm they are not summary-only captures: `Core Content Capture` preserves reusable hard content such as numbers, dates, methods, mechanisms, constraints, case details, definitions, limitations, counterexamples, disputes, or source-specific context; thin captures must be patched before counting
- each topic has at least half of its counted Wave 1 floor from topic-unique references, or the audit records scarcity reason, confidence effect, and queue consequence
- reviewed-but-uncounted sources that affected the decision appear in the excluded reference inventory with reasons
- topic seed backfill is current or explicitly deferred with a concrete queue candidate
- source-family duplicate review is recorded before counted references pass a floor
- evidence summary and question list exist before the topic passes Wave 1; topic targets and evidence-backed entries cite local references, unless a justified stop exception records non-applicability and queue consequence

### 7. Webpage Diagnostic And Pruning

- every counted webpage or webpage-derived reference has populated `web_substance`, `commercial_intent`, `marketing_risk`, `cross_verification_required`, `cross_verification_status`, and `content_retention_decision`; spot-check at least 3 counted webpage references across topics where available
- references with `web_substance=thin / none` cannot count; high-marketing-risk or strong-commercial-intent webpages cannot support neutral factual, market-reality, outcome, benchmark, or P0/P1 claims unless `cross_verification_status=verified`; scarcity exceptions preserve a low-confidence gap but do not make those webpages count for those claims
- when `content_retention_decision=prune_partial`, spot-check the reference body and confirm `Core Content Capture` keeps only qualified, claim-relevant content and does not retain unqualified SEO filler, unsupported promotion, repeated slogans, vague market adjectives, or unverifiable outcome claims
- when `content_retention_decision=exclude_source`, the source appears only in excluded inventory or as a minimal excluded stub, not as reusable evidence body
- excluded reference inventory records reviewed webpage failures that affected search, exclusion, unavailable-after-search reasoning, or gate decisions

### 8. Artifact Layout And Freshness

- **artifact file-existence check**: when a topic status block claims `evidence_summary=done` or `question_list=done`, the file at the path recorded in the status field must exist on disk. Spot-check at least 2 topics. A done claim without a real file is a hard fail - artifacts are not optional cleanup, they are gate-required evidence files.
- **canonical artifact layout check**: topic artifact paths must resolve under `RUN_DIR/seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md` and `RUN_DIR/seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/question-list.md`. Flat topic artifacts or mixed layouts are drift unless explicitly marked historical and replaced by canonical files.
- **artifact staleness check**: initial artifact production is required only after `topic_unique_ref_count >= 1`; shared-foundation-only references do not trigger initial topic artifacts. Once the threshold is met, missing initial artifacts are a fail before any further Wave 1 source-intake, cross-topic handoff, or topic deepening unless the initial two-artifact production task is already in `slot_1_current` or `slot_2_next`; Refill Pool-only production is not enough. When `produced_at_ref_count` is recorded and `produced_at_ref_count < accepted_topic_ref_count`, the artifact is stale. A stale artifact is not an automatic fail, but staleness with delta >= 2 and no queued artifact refresh task is a fail because producer_rule=`topic_ref_count_changed` should have caught this. Check all topics for artifact staleness.
- **artifact citation check**: spot-check at least 2 artifact files. Every cited reference path must exist in `REFERENCE_DIR` and must appear in the topic's accepted reference inventory. Artifacts citing only URLs or external sources without local reference paths fail — artifacts are derived from local evidence, not live search.
- **topic investigation targets check**: when a produced `question-list.md` exists, it must contain Topic Investigation Targets with `target_id`, `target_question`, `origin`, `status`, `profile_relevance`, `evidence_refs`, `next_action`, and `last_updated_ref_count`.
- **question-list exploration ledger check**: when a produced `question-list.md` exists, it must contain the four required sections in substance: `Topic Investigation Targets`, `Question Reconciliation`, `Emergent Question Protocol`, and `Exploration / Exploitation Decision`. It must show reconciliation state markers for pre-existing questions, an Emergent Question Protocol result or explicit `no_new_questions_after_protocol` after the four checks (`new_concept`, `contradiction`, `missing_information_gap`, `noise_pattern`), exactly one canonical exploration/exploitation decision, trigger evidence with local reference paths or excluded-source patterns, and a queue consequence. Empty files, placeholder headings, copied seed questions, or generic brainstorm lists fail.
- **artifact lifecycle check**: when a topic reaches its first topic-unique accepted reference, artifacts must be produced or the initial production task must be foregrounded in `slot_1_current` or `slot_2_next` before the next Wave 1 source-intake/deepening action. When accepted evidence later changes the topic by two or more counted refs, a queued refresh is a repair state during Wave 1 fan-in only; before the topic can pass Wave 1, `produced_at_ref_count` must match `accepted_topic_ref_count`.

### 9. Wave 1 Completion Evidence

- counterexample, limitation, dispute, or failure-mode search is recorded before `complete` or `early_saturation`
- every counted accepted reference has `trust_level` (official/academic/practitioner/community) and `source_type` populated; runtime qualification must spot-check at least 3 references across different topics — missing or placeholder values fail the check
- every counted webpage reference passes the Webpage Material Diagnostic Gate; missing diagnostic fields, unverified high-marketing-risk claims, or unpruned content fail the check
- excluded reference inventory has discard reasons consistent with the signal/noise judgment framework (marketing noise, unverifiable claim, outdated, low alignment, repeat without signal, low-trust without cross-validation); spot-check at least 3 excluded entries
- `STATUS_PATH.Failed Explorations` is populated (not `none_recorded_yet`) when any of the following are observed: trace records a direction change, topic seed describes explored-then-abandoned routes, queue records a suspended/redirected branch, or an excluded inventory documents systematic noise from a source type — these indicate exploration failures that should be recorded to prevent repeated waste
- topic seed `待验证问题` sections may contain `[涌现]` entries when exploration discovers unclassified concepts, contradictions between sources, or "should exist but unfindable" gaps; the absence of emergent questions is not itself a failure, but when must_answer gaps remain and no emergent questions exist across multiple exploration rounds, flag it as possible exploration shallowness
- when accepted references affected a topic, runtime qualification spot-checks that seed backfill happened before topic closure and that Question Reconciliation ran before the Emergent Question Protocol; missing backfill, missing reconciliation, or skipped emergent review is `FAIL_FIX`
- `early_saturation` or `redirect` decisions include the minimum exploration record (three accepted references since last new mechanism or scarcity exception, two distinct search routes or source families for counterexample/limitation/dispute/failure-mode, reviewed-but-uncounted sources, unresolved questions, queue consequence); missing exploration records fail the topic row
- accumulated anti-stall degradations stay within budget with a recorded must-answer claim denominator, or status records evidence-repair queue work/blocker

### 10. Wave 2 Synthesis Integrity

- synthesis artifact exists before `wave2_complete`
- synthesis artifact path follows `ARTIFACT_DIR/wave2/cross-topic-synthesis.md`
- synthesis artifact and matrix cover confirmed `answer_phase=wave2_synthesis` must-answer entries or explicitly record that no synthesis-phase must-answer entries exist
- every topic is represented or has an explicit not-applicable reason
- for `derived_topic_count=1`, the only valid cross-topic not-applicable reason is `not_applicable_single_topic`, and it must be paired with at least one populated matrix row for a locally backed high-leverage synthesis conclusion
- high-leverage judgments are tagged with `claim_type`, `confidence`, and local `backing_refs`
- the cross-topic conclusion matrix has `topic / must_answer_ids / conclusion / compared_with / claim_type / severity / confidence / backing_refs / independent_ref_count / scarcity_exception / conflict_status / synthesis_artifact_anchor`
- every P0/P1 judgment has at least two independent backing references or a scarcity exception with low confidence
- unresolved conflicts have branch disposition and queue follow-up
- `backing_refs` resolve to local files under `REFERENCE_DIR`; short ids such as `ref-060` without local paths fail
- the synthesis artifact contains a conflict/tension reconciliation section and substantive Wave 2 synthesis, not only per-topic summaries; multi-topic runs require cross-topic comparison, while single-topic runs require locally backed synthesis rows with `compared_with=not_applicable_single_topic`
- a single-topic run still has a substantive synthesis artifact and populated matrix; not-applicable comparison does not allow empty Wave 2 output
- Wave 2 completion cannot be accepted when Wave 1 has just closed and the Wave 2 matrix/artifact are empty, pathless, or created only as a status update
- before Readiness passes, `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision` is the HITL2 Source of Record and `STATUS_PATH -> Human Decision Checkpoints`, `STATUS_PATH -> Wave 2`, and `STATUS_PATH -> Wave 2 Human Decision Brief` all agree with `PROFILE hitl2_checkpoint_status=recorded`, `STATUS Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded`, the PROFILE Human Decision Checkpoints `HITL2_wave2_readiness_decision` row `status=recorded`, `human_checkpoint_status=recorded`, readiness-eligible `answerability_class`, `user_decision=proceed_to_readiness`, concrete `final_report_view`, custom label/slug when needed, and deterministic `final_output_dir`; `request_view_revision`, `blocked_repair_required`, `repair_and_rerun`, `stop_blocked`, missing HITL2, or projection drift fails runtime qualification

### 11. Anti-Stall Budget

- `STATUS_PATH.Anti-Stall Budget` exists before `readiness_passed`
- open degraded limitations affecting P0/P1 judgments are within budget or the run records evidence-repair queue work/blocker
- the active must-answer claim denominator is recorded before using the 20% degraded-evidence budget
- degraded P0/P1 claims record confidence effect and queue consequence or handoff consequence

### 11A. Trace Checkpoint Continuity

- Wave 0, Wave 1, Wave 2, and Readiness closeouts each have a distinct trace checkpoint in `TRACE_PATH` when the gate legitimately closes, with exact single `gate_transition` field values `wave0_complete`, `wave1_complete`, `wave2_complete`, and `readiness_passed`
- `STATUS_PATH -> Trace Pointer.last_trace_entry` points to the latest trace entry; stale `not_started`, non-current labels, or missing labels fail
- a trace checkpoint records the gate transition, evidence bundle, queue consequence, and status pointer sync
- Wave 0, Wave 1, and Wave 2 transition checkpoints record `continuation_action_started`, `stop_authorization_state_after_entry`, and `unauthorized_stop_next_action_after_entry`; a checkpoint that only says the wave passed is incomplete
- after Wave 0, the continuation action is concrete Wave 1 work; after Wave 1, it is concrete Wave 2 work; after Wave 2, it is HITL2 brief preparation followed by either the explicit HITL2 `pending_user` decision blocker or the recorded/resume path
- bulk-filled trace after dormant execution is a diagnostic correction, not proof of normal continuity; correction entries and "missed checkpoints" notes do not satisfy missing Wave 0/1/2/Readiness transition coverage; if discovered, runtime qualification returns `FAIL_FIX` until status/queue identify the corrected gate and same-wave repair or re-earned audit path
- gate status, queue promotion, and trace checkpoint are updated in the same closeout unit; a gate cannot pass first and receive trace later as cleanup

### 11B. Queue Task Lineage / PLAN-STATUS-QUEUE

- Each active window task (`slot_1_current`, `slot_2_next`, `slot_3_pending`, `slot_4_pending`, and `slot_5_tail` when present) names why it exists using at least one of: `source_gap`, `status_gap`, `gate_gap`, `plan_target`, or `trigger`.
- Each active task has a concrete `done_condition`, `writes_to`, and `status_sync`; a task that writes nothing must state why no write is expected and how completion will be visible in status or queue.
- Queue tasks derive from `PLAN_PATH` research targets, `STATUS_PATH` gaps/audit failures, source-intake triggers, topology triggers, artifact/reference freshness triggers, or gate reopen records. Generic task text is invalid even when queue length is non-empty.
- Closing a task is invalid until the declared files have been written and the declared status fields are synced. If a write or sync cannot be completed, record the exact gap and refill repair work instead of promoting the next gate.
- `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, and `QUEUE_PATH` remain directional: profile owns run intent and human decisions, plan owns targets, status owns state/gaps/audits, and queue owns executable next actions. Queue may not invent a wave transition that status audits have not earned.

### 12. Source-Intake Fan-In Boundary

- source intake runner mode uses only `inline_main_agent / foreground_subagent_runner / not_applicable`
- `foreground_subagent_runner` is foreground queue-visible source intake inside sequential execution, not detached background work
- source intake writes only exact assigned run-local `_cache/intake/<batch-id>/intake-request.md`, `_cache/intake/<batch-id>/retrieval-results.md`, `_cache/intake/<batch-id>/candidate-cards.md`, `_cache/intake/<batch-id>/capture-manifest.md`, and `_cache/excluded/<batch-id>-excluded.md` staging paths until main-agent fan-in; optional concrete captures are listed by `capture-manifest.md`, not predeclared as queue write targets; no absolute external `_cache`, traversal `_cache`, nested scratch `_cache`, `_framework/_cache`, `_cache/promote-log.md`, direct `REFERENCE_DIR`, topic seed, artifact, or shared control-file writes during intake
- no delegated runner updates `REFERENCE_DIR/_INDEX.md`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, shared artifacts, topic seed files, or counted evidence inventories
- main agent performs fan-in quality review before promotion, evidence counting, gate passage, or final citation; fan-in and terminal source-intake closeout tasks must write `_cache/promote-log.md`; only main-agent fan-in/promotion or terminal closeout may write `_cache/promote-log.md`
- promoted material enters `REFERENCE_DIR/*.md`; `_cache` remains staging and cannot count as evidence
- retrieval/search/fetch/find-source/discover-source/browse/query/download tasks do not write directly to `REFERENCE_DIR`; direct reference creation is valid only when the task explicitly says the source is already-known local/user-provided and states all three negatives: no retrieval, no search, and no fetch
- STATUS/QUEUE source-intake split is preserved: `QUEUE.Active Queue` fields are active control state only, while `STATUS.Directory / Integration State.source_intake_status` records lifecycle state
- while `QUEUE.source_intake_wait_state` is `running` or `fan_in_ready`, STATUS must mirror runner mode, concrete batch id, wait state, and the same valid run-local `_cache/intake/<batch-id>/candidate-cards.md`
- after source-intake closeout, QUEUE active fields reset exactly to `not_applicable / not_applicable / not_started`; `none`, `unknown`, and `n/a` are not valid reset substitutes; STATUS records the latest terminal outcome in `source_intake_status`, latest concrete batch id, `source_intake_wait_state=not_started`, candidate-card path when available, and `_cache/promote-log.md`
- fan-in candidate-card paths are validated as run-local `_cache` paths, not just text: reject external absolute cache paths, traversal paths, nested scratch `_cache`, `_framework/_cache`, wrong batch ids, placeholders, and arbitrary prose

### 13. Queue Continuity

- active queue is not empty unless `readiness_passed` or a real blocker is recorded
- `slot_1_current` has concrete done conditions, write targets when it writes, status sync, and promotion path
- while `queue_health=ready / thin` and executable slots exist, `current_gap_or_blocker=none`, `safe_to_interrupt=yes`, or a report/wait slot is invalid
- after `readiness_passed`, `QUEUE_PATH` must keep the `## Active Queue` section as the stable anchor and express closure through `queue_health=closed` and `closure_reason=readiness_passed`; do not rename the anchor to a separate closed-queue heading
- failed audits refill same-wave work rather than advancing the gate
- Wave 0 closeout must promote or start concrete Wave 1 continuation work; Wave 1 closeout must promote or start concrete Wave 2 continuation work; Wave 2 closeout must enter HITL2 brief preparation and then either activate the explicit HITL2 `pending_user` decision blocker or record/resume the HITL2 decision. Otherwise return `FAIL_FIX` unless a concrete blocker is recorded.
- Readiness failures refill Wave 2 or earlier queue work; no Wave 3 or post-readiness required stage is introduced
- `wave2_complete` does not close the run; if readiness is `partial`, `fail`, missing, or stale, queue cannot collapse to only "await user review" unless a real blocker is recorded
- post-readiness maintenance, if present, is limited to URL or metadata repair for already accepted references and cannot add sources, claims, research objects, or gate passage without reopening the affected wave
- topology drift review is recorded before Wave 1 audit, before Wave 2 audit, and during Readiness; unresolved new topic candidates have formalization or branch disposition
- readiness items marked `partial` are treated as failures until repaired to `pass`

### 14. Rolling Task Projection And User-Visible Stop Authorization

- No-Empty-Queue is necessary but insufficient: it keeps work available, while User-Visible Stop Authorization authorizes or denies user-visible output
- `QUEUE_PATH.Active Queue` records `task_window_mode=rolling_execution_window`, `platform_task_projection=available_required_else_queue_only` or `unavailable_queue_only`, `projection_authority`, `projection_surfaces`, the active executable window, `projection_minimum`, `completion_requires`, and `slash_command_boundary`
- native todo/task/plan surfaces are projections of `QUEUE_PATH`; if a native surface is available, it must mirror the active executable window: `slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail`
- source-intake active fields use `source_intake_runner_mode`, `source_intake_batch_id`, and `source_intake_wait_state`; `running` means `slot_1_current` is source intake and writes only exact run-local cache files; `fan_in_ready` means `slot_1_current` is main-agent review/promotion for a concrete batch and names `_cache/intake/<batch-id>/candidate-cards.md` plus `_cache/promote-log.md`; `integrated / failed / suspended` are STATUS lifecycle outcomes and QUEUE active fields must reset exactly to `not_applicable / not_applicable / not_started` unless `slot_1_current` is still closing fan-in
- slash commands such as `/goal` may be used manually by the user but are not framework-controlled queue actions
- `QUEUE_PATH.Active Queue` records `autonomy_mode=strict_silent_autonomous`, `pre_response_gate=required`, `allowed_output_states=final_delivery / decision_blocker / empty_queue_after_refill`, `stop_authorization_state`, `unauthorized_stop_next_action`, `default_if_gate_fails=continue_with_next_tool_or_file_action`, `batch_boundary_rule`, `forbidden_output_states`, and `forbidden_user_prompts`
- `STATUS_PATH.Operator View` records `user_visible_output_authorized`, `routine_progress_location`, `stop_authorization_state`, and `unauthorized_stop_next_action`
- while `stop_authorization_state=unauthorized_continue_required`, `STATUS_PATH.Resume Checkpoint.safe_to_interrupt` must be `no` and `unauthorized_stop_next_action` must name a concrete tool/file/search/check/refill/promotion action
- `safe_to_interrupt=yes` is allowed only for `final_delivery`, concrete `decision_blocker`, or documented `empty_queue_after_refill`
- a concrete decision blocker is the prepared HITL2 `pending_user` decision state, another missing user decision that cannot be inferred, missing credential/access/material required for the mainline, high-risk irreversible external action, or no executable queue item after documented refill/suspend/archive/redirect attempts
- routine report work such as `report progress`, `summarize and wait`, `ask user to continue`, `recap then continue`, `tell user next task`, or `use /goal` is invalid queue work; it is not a decision blocker or final delivery
- wait/review work such as `await user review` is invalid unless the run is at final delivery, has a concrete decision blocker, or has no executable queue item after documented refill/suspend/archive/redirect attempts
- milestone completion, gate passage, artifact refresh, status sync, batch completion, and knowing the next task authorize queue promotion and continued execution, not chat output
- user-facing prompts such as "continue?", "continue or adjust direction?", "adjust direction?", or "await user review" fail when executable queue work exists before HITL2 or final delivery
- if the next task is known, the correct runtime action is to execute it

### 15. Retrieval Continuity

Perform a real 30-second local evidence retrieval test during qualification, but do not write the result yourself:

1. start from `TOPIC_ROOT/README.md` or `STATUS_PATH`
2. locate `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, and `REFERENCE_DIR/_INDEX.md`
3. locate at least one key reference path used by a high-leverage claim
4. locate the related topic seed file
5. locate the related artifact path
6. compare route, elapsed time, result, and gaps against `STATUS_PATH.Readiness Check`

An assertion that retrieval "should work" is a fail. If the test result is missing or stale, return `FAIL_FIX` and require the execution agent to record the route in `STATUS_PATH.Readiness Check`.

## Outcome Rule

Return `PASS` only if every applicable item passes. Return `FAIL_FIX` when local repairs can restore consistency. Return `FAIL_BLOCKED` only when the missing piece cannot be inferred or repaired from local files.
