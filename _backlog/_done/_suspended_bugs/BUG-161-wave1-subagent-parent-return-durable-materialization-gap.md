---
bug_id: BUG-161
title: Wave1 evidence actor returns particles to parent instead of durable work-unit outputs
severity: P2
phase: wave1
source: current Codex run, OpenSpec evolution/popularity/user-demands bundle
surfaced_at: 2026-07-29
---

# BUG-161: Wave1 actor parent-return bypasses required durable materialization

## What happened

During the first Wave1 deepening batch, work unit `wu-w1-b000-deep-i0005`
(`wave1-deepen-05_user-capability-requirements`) fetched six current sources and
produced evidence particles, but the actor treated durable output as a parent
Agent responsibility instead of writing the assigned work-unit files.

The assigned receipt records:

- `result_draft_started` with `durable_result_write: not_performed`
- `result_draft_written` with `surface: parent_return` and `cache_trails_materialized: 0`
- `agent_result_ready` with `reason: ... durable cache/result materialization is parent-owned`
- `verification_done` with `invalid_result` and `direct_target_missing`

At observation time, the claimed envelope had no `result.json`, no Wave1 paired
artifacts, and no declared cache leaf. The work unit therefore remained
`claimed` and could not reach the dry-submit/formal-submit boundary.

## Expected behavior

The `dpt-evidence-extractor` role and generated Completion Contract require the
native actor to write, under the active bundle:

- `artifacts/wave1/05_user-capability-requirements/evidence-summary.md`
- `artifacts/wave1/05_user-capability-requirements/question-list.md`
- declared cache leaves containing `websearch.json`, `page.md`, and `meta.json`
- `_work_units/wave1/wu-w1-b000-deep-i0005/result.json`

The actor must then emit truthful receipt events and return the durable result
path. Parent-side materialization is not an accepted substitute; the Phase
Agent must not fabricate actor-owned evidence, cache, receipt, or result data.

## Impact

The actor can perform real retrieval work yet still leave the delegated attempt
unsubmittable. This blocks the queue drain and Wave1 gate, and it tempts a
Phase Agent to copy parent-returned particles into authority surfaces. The
correct immediate response is to repair the same claimed work unit through the
actor contract, not to alter Engine code or hand-write ledger data.

## Classification and model note

This observation is primarily a weak-model/actor-guidance failure, not proof of
a deterministic Engine defect: the current contract already states that the
actor owns filesystem writes. The Coding Agent running this bundle is Codex;
the runtime-visible model family is GPT-5, while the exact deployment ID and
delegated actor model are not exposed in the work-unit receipt. Do not attribute
the behavior to a narrower model without a runtime fact.

## Reproduction evidence

Bundle:
`dpt_rb_openspec-evolution-popularity-user-demands`

Work-unit receipt:
`_work_units/wave1/wu-w1-b000-deep-i0005/runtime-receipt.jsonl`

Relevant direct facts:

- `status`: `claimed`
- `result.json`: absent at the first repair checkpoint
- `cache_trails_materialized`: `0`
- dry-submit diagnostic: `invalid_result`, `direct_target_missing`

## Disposition

Do not modify framework code in this run. Repair only the same work-unit data
through a role-matching actor, then rerun dry-submit. Keep this card open until
the actor contract has a focused guidance or framework proposal with a fresh
regression path; a manually materialized bundle must not be treated as a bug
fix or as evidence that the contract is robust.
