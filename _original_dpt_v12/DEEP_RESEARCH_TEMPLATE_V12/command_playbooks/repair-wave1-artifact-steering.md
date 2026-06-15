---
title: "Repair Wave 1 Artifact Steering"
role: "write-capable Wave 1 health repair command"
scope: "foreground repair for Wave 1 topic artifacts, question ledger, STATUS/QUEUE receipts, and hook-triggered artifact steering drift"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/QUEUE_CONTRACT.md"
  - "specs/METHODOLOGY.md"
  - "flows/reference-artifact-backfill.md"
  - "flows/queue-agentic-flow.md"
  - "<PROFILE_PATH>"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
  - "<REFERENCE_DIR>/*"
writes:
  - "<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md"
  - "<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/question-list.md"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
---

# Repair Wave 1 Artifact Steering

Use this command inside an active run when Wave 1 references have landed but topic artifacts or artifact steering receipts are missing, stale, thin, or stuck only in Refill Pool.

This is a foreground repair command. It may be invoked manually by the execution agent, or by `hook_wave1_topic_fanin_steering` when `check-queue-receipts`, `check-surfaces`, or `check-runtime` reports missing Wave 1 artifact steering. It is not a read-only check and it is not a source-intake runner.

## When To Use

Use this command when any topic has one of these conditions:

- `topic_unique_ref_count >= 1` and `evidence_summary` or `question_list` is `produced_at_ref_count=0`
- a topic artifact path is recorded but the file is missing
- initial artifact production exists only as a Refill Pool candidate
- `accepted_topic_ref_count - min(evidence_summary.produced_at_ref_count, question_list.produced_at_ref_count) >= 2`
- `check-queue-receipts` reports missing `artifact_steering_current`, `artifact_refresh_not_due`, or `queued_artifact_repair`
- `check-surfaces` reports missing, thin, stale, non-canonical, URL-only, or placeholder Wave 1 artifacts
- Queue is about to run another Wave 1 source-intake, cross-topic handoff, or topic deepening while triggered initial artifacts are still missing

Do not use this command to discover new sources. New retrieval/search/fetch work must go through source-intake and `_cache` first.

## Required Inputs

Reload these files before writing:

- `PROFILE_PATH`
- `PLAN_PATH`
- `STATUS_PATH`
- `QUEUE_PATH`
- `TRACE_PATH`
- affected topic seed files under `TOPIC_ROOT`
- affected accepted local references under `REFERENCE_DIR`
- `REFERENCE_DIR/_INDEX.md`

If a counted reference named by STATUS or an accepted inventory row does not resolve under `REFERENCE_DIR`, return `FAIL_FIX` and queue reference/index repair before artifact writing. If the missing material is external or credential-gated, return `FAIL_BLOCKED` only after no local repair route exists.

## Repair Algorithm

Perform the following steps in order.

1. Identify affected topics from `STATUS_PATH` topic blocks. Select topics where `topic_unique_ref_count >= 1` and either artifact is missing/unproduced, or where produced artifact counts are stale by two or more accepted references.
2. For each affected topic, resolve the canonical artifact directory:
   - `<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md`
   - `<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/question-list.md`
3. Read the topic's counted local references from the Wave 1 accepted inventory and topic seed citations. Use local reference paths as the evidence source; do not use chat memory, candidate cards, URLs, or `_cache` files as artifact evidence.
4. If the topic seed backfill is not `current`, either update the topic seed growth sections first or record a concrete queue-backed seed-backfill repair. Do not produce an artifact that depends on unbackfilled evidence without recording the deferral.
5. Produce or refresh `evidence-summary.md` with these required sections:
   - `Key Evidence`
   - `Mechanism`
   - `Current Judgment`
   - `Limits / Open Issues`
   - `Topic Target Coverage`
6. The `Topic Target Coverage` section must contain a table with:
   - `target_ids`
   - `coverage_status`
   - `backing_refs`
   - `queue_consequence`
   - `last_updated_ref_count`
7. Produce or refresh `question-list.md` with these required sections:
   - `Topic Investigation Targets`
   - `Question Reconciliation`
   - `Emergent Question Protocol`
   - `Exploration / Exploitation Decision`
8. The `Topic Investigation Targets` table must include:
   - `target_id`
   - `target_question`
   - `origin`
   - `status`
   - `profile_relevance`
   - `evidence_refs`
   - `next_action`
   - `last_updated_ref_count`
9. Reconcile existing seed questions before adding new `[涌现]` questions. Use state markers such as `[已解决]`, `[部分进展]`, `[仍开放]`, `[需内部数据]`, and `[涌现]`.
10. The `Question Reconciliation` section must include either reconciled prior questions or `no_prior_questions_to_reconcile`, plus local reference paths where evidence changed the state.
11. The `Emergent Question Protocol` section must show all four checks:
    - `new_concept`
    - `contradiction`
    - `missing_information_gap`
    - `noise_pattern`
12. The `Emergent Question Protocol` result must be either `[涌现]` questions with trigger evidence, or `no_new_questions_after_protocol` with the four checks named explicitly.
13. The `Exploration / Exploitation Decision` section must contain exactly one canonical `exploration_exploitation_decision` value:
    - `continue`
    - `exploit_current_line`
    - `explore_new_line`
    - `topology_candidate`
    - `complete`
    - `early_saturation_review`
    - `suspend`
    - `archive`
    - `redirect`
14. The decision record must include:
    - `decision`
    - `trigger_refs`
    - `unresolved_questions`
    - `counterexample_failure_search`
    - `queue_consequence`
    - `next_action`
    - `last_updated_ref_count`
15. Set both artifact files' `produced_at_ref_count` to the current `accepted_topic_ref_count` unless the command records a concrete partial repair and keeps the topic blocked from Wave 1 advancement.
16. Update `STATUS_PATH` for each repaired topic:
    - `evidence_summary: produced_at_ref_count=<accepted_topic_ref_count>`
    - `evidence_summary_path: <canonical path>`
    - `question_list: produced_at_ref_count=<accepted_topic_ref_count>`
    - `question_list_path: <canonical path>`
    - `topic_target_wave1_status`
    - `topic_target_wave2_synthesis_status`
    - `question_reconciliation_state`
    - `emergent_question_protocol_state`
    - `exploration_exploitation_decision`
    - `exploration_trigger_refs`
    - `exploration_queue_consequence`
    - `no_new_questions_after_protocol`
    - `emergent_questions_added`
    - `gap`
17. Update `QUEUE_PATH` so missing-initial-artifact work is no longer only in Refill Pool. If artifacts are now produced, remove or mark superseded same-topic initial artifact candidates and let the rolling window continue. If a topic remains unrepaired, put its two-artifact production task in `slot_1_current` or `slot_2_next` before any Wave 1 source-intake, cross-topic handoff, or topic deepening.
18. Set or preserve stop authorization as `unauthorized_continue_required` unless this command discovers a real blocker. A repaired artifact is not a user-visible stop state.
19. Append `TRACE_PATH` only when the repair corrects drift, preempts pending work, or records why a partial repair remains. Use a label such as `wave1_artifact_steering_repair`.

## Minimum `question-list.md` Shape

Use this shape when producing or repairing `question-list.md`. Keep the headings and field names stable so `check-runtime` and `check-gate-wave1-complete` can verify the exploration ledger.

```markdown
# Question List - Topic {topic-id}: {topic-slug}

produced_at_ref_count: {accepted_topic_ref_count}
last_updated: {YYYY-MM-DD}

## Topic Investigation Targets

| target_id | target_question | origin | status | profile_relevance | evidence_refs | next_action | last_updated_ref_count |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {topic-id}-T01 | {topic-local must-answer or promoted target} | seed / root_lens_link / emergent / profile_critical / evidence_gap | candidate / confirmed / answered / partial / downgraded / unknown_classified / synthesis_pending / queued / blocked / retired | {profile relevance} | {REFERENCE_DIR path or none} | {next action or queue consequence} | {accepted_topic_ref_count} |

## Question Reconciliation

- [已解决] / [部分进展] / [仍开放] / [需内部数据] {prior question}: {state change and local reference path}.
- no_prior_questions_to_reconcile: {only when no prior questions existed; name target rows still owning uncertainty}.

## Emergent Question Protocol

- new_concept: checked; {new object/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- contradiction: checked; {contradiction/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- missing_information_gap: checked; {gap/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- noise_pattern: checked; {source-noise route/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- result: [涌现] {new question with trigger evidence} / no_new_questions_after_protocol.

## Exploration / Exploitation Decision

- decision: {continue / exploit_current_line / explore_new_line / topology_candidate / complete / early_saturation_review / suspend / archive / redirect}
- trigger_refs: {local reference paths, excluded-source pattern, contradiction, missing-information gap, or cross-topic dependency}
- unresolved_questions: {active unresolved targets/questions or none-after-protocol with reason}
- counterexample_failure_search: {attempted route, queued route, or exhausted public-source route}
- queue_consequence: {next Queue work, artifact refresh, topology triage, stop-exception record, or concrete no-further-public-source reason}
- next_action: {immediate Queue or Wave 2 action}
- last_updated_ref_count: {accepted_topic_ref_count}
```

`Topic Investigation Targets` is the topic-local must-answer projection. `Question Reconciliation` may only revise already-known questions. `Emergent Question Protocol` may only generate incremental questions after reconciliation. `Exploration / Exploitation Decision` must route a Queue consequence; a prose summary is not a substitute.

## Artifact Content Rules

Artifacts must be useful without reopening chat history.

- Cite local paths under `REFERENCE_DIR`, not URLs, short ids, or source names alone.
- Do not cite `_cache` files as evidence.
- Do not paste raw candidate cards into artifacts.
- Do not create placeholder shells just to satisfy file existence.
- Do not count artifact files as references.
- Do not advance Wave 1 just because artifact files exist; they must be substantive, synchronized with STATUS, and carry the four-section exploration ledger.

If a local reference is summary-only, too thin, missing required accepted-reference fields, or lacks reusable hard content, record reference quality repair first. A topic artifact built from unusable reference files does not make Wave 1 healthy.

## Queue Work Unit Shape

When this command is represented as foreground Queue work, use this shape:

```markdown
### slot_1_current

- work_id: `wave1-artifact-steering-repair-<topic-id>`
- action: `repair Wave 1 artifact steering for <topic-id>/<topic-slug>: produce or refresh evidence-summary.md and the four-section question-list exploration ledger from accepted local refs`
- producer_rule: `topic_ref_count_changed`
- trigger: `topic_unique_ref_count>=1 and missing/stale artifact steering`
- why_this_matters: `Wave 1 cannot choose the next evidence/deepening move without local artifact steering`
- impact_scope: `<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>; <STATUS_PATH>; <QUEUE_PATH>; <TRACE_PATH>`
- required_receipts: `status:topic_unique_ref_count>=1`
- done_condition: `both topic artifacts exist at canonical paths, cite local refs, expose Topic Target Coverage and the four-section question-list exploration ledger, and produced_at_ref_count equals accepted_topic_ref_count`
- verification: `check-surfaces and check-queue-receipts pass for artifact steering, or the remaining gap is queued in slot_1_current/slot_2_next`
- writes_to: `<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md; <ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/question-list.md; <STATUS_PATH>; <QUEUE_PATH>; <TRACE_PATH> when diagnostic repair is recorded`
- status_sync: `evidence_summary/question_list produced_at_ref_count, artifact paths, topic_target fields, question reconciliation, emergent protocol result, exploration decision, trigger refs, queue consequence, gap`
- completion_receipt: `artifact_steering_current:<topic-id>/<topic-slug>`
- failure_route: `record artifact repair gap; keep or promote this repair before any further Wave 1 source-intake, cross-topic handoff, or topic deepening`
```

For several affected topics, either execute one topic per Queue work unit or make `impact_scope`, `writes_to`, `status_sync`, and `completion_receipt` name every topic explicitly. Do not hide multiple topic repairs behind a generic "fix artifacts" task.

## Verification

After writing, run the read-only checks from the run root:

```bash
node _framework/cli_tools/check_framework.mjs --gate check-queue-receipts .
node _framework/cli_tools/check_framework.mjs --gate check-surfaces .
```

Run `check-runtime` as well when the repair crosses a gate boundary, changes inventory counts, repairs source-intake closeout, or changes Wave 1/Wave 2 eligibility:

```bash
node _framework/cli_tools/check_framework.mjs --gate check-runtime .
```

The helper output is diagnostic only. The execution agent must still ensure the files were written and the Queue window is refilled before continuing.

## Results

Return exactly one result:

| result | meaning | next action |
| --- | --- | --- |
| `PASS` | all affected Wave 1 artifact steering is current or correctly not due, and Queue can continue without user-visible output | continue from `QUEUE_PATH` |
| `FAIL_FIX` | local reference, seed backfill, artifact body, STATUS, QUEUE, or TRACE repair remains possible | keep or promote concrete repair work and rerun this command |
| `FAIL_BLOCKED` | the repair needs unavailable user input, credentials, or missing local source material that cannot be reconstructed from the run | record a decision blocker only for the missing input |

## Non-Goals

- Do not run source discovery.
- Do not promote `_cache` material into references unless a separate fan-in task owns that work.
- Do not pass Wave 1 from artifact existence alone.
- Do not ask the user to review candidate cards, continue, or approve routine artifact repair.
- Do not rerun instantiation or copy skeletons over generated control files.
