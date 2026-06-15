---
title: "Check Seed Intake"
role: "post-instantiation seed readiness verifier"
scope: "verify confirmed seed topic registry, intake, status, and queue alignment before evidence execution"
reads:
  - "specs/METHODOLOGY.md"
  - "specs/CHARTER.md"
writes: []
---

# Check Seed Intake

This command runs after core instantiation passes and before Wave 0 evidence work starts. It includes the reusable seed topic shape check; if confirmed seed files are hand-written or missing refill anchors, run `command_playbooks/repair-seed-topic-shape.md` before treating intake as ready.

It is intentionally separate from `check-instantiation`: a run bundle may be structurally valid while seed topics still need decomposition or intake repair.

## Results

Return exactly one result:

| result | meaning | next action |
| --- | --- | --- |
| `PASS` | seed intake is honestly assessed for the current setup state: confirmed topics are fully ready, or during `current_gate=setup_ready` every semantic gap is queue-backed and not treated as Wave 0 / Wave 1-ready | continue setup repair or proceed only when `seed_topic_intake_ready=yes`; resolve `gap_queue_backed` items before Wave 0 topic-start passage or Wave 1 deepening |
| `FAIL_FIX` | seed intake is incomplete but repairable from local context | repair mutable root files and seed topic files, then rerun |
| `FAIL_BLOCKED` | seed direction or required user context is missing | ask for the missing seed-topic input |

A zero-confirmed-topic state may pass only as an assessed decomposition/intake state: Topic Registry and topic audit rows stay empty, `derived_topic_count=0`, `seed_topic_intake_ready=gap_queue_backed`, and `QUEUE_PATH` points to concrete decomposition or intake clarification. It must not use `seed_topic_intake_ready=yes`, and it does not authorize Wave 0 source intake or any evidence floor work.

## Checks

- Topic Registry contains only confirmed seed topics.
- If there are no confirmed seed topics, the plan/status/queue explicitly route to decomposition or intake clarification instead of inventing Wave 1 topic rows or scheduling Wave 0 source intake.
- Every confirmed topic file passes `check-seed-topic-shape`: real `seed_files` path under `TOPIC_ROOT`, concrete upper intake fields, stable refill/growth headings, no unresolved placeholders, and original-topic normalized anchors where applicable.
- Every confirmed topic has a matching Seed Topic Intake Matrix row.
- Every confirmed topic has concrete `title`, `slug`, seed `must_answer`, initial hypothesis/gap, why-now trigger, boundary/out-of-scope, evidence anchors/source families, why-it-matters, intake status, intake gap, and queue consequence, unless the missing upper-section field is explicitly recorded as `intake_status=assumption` or `intake_status=gap` with concrete repair work during setup. For topics derived from `original_topic/`, both the seed file and `PLAN_PATH -> Seed Topic Intake Matrix` must expose CLI-checkable meaningful original context fields: `source_anchor`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route`. Bare field labels, `TBD`, `todo`, `pending clarification`, `placeholder`, `{...}`, raw-only source anchors, or generic boundary/evidence prose are not meaningful context. PLAN-only or seed-only context is not search-ready; if either surface is missing meaningful values, record a queue-backed context repair to prevent generic external search. Seed intake does not require final Topic Investigation Targets yet; those are initialized during Wave 1 artifact production.
- Every confirmed topic has a corresponding Wave 1 status block and Wave 1 / Wave 2 audit rows initialized as blocked.
- Missing upper-section substance or missing meaningful original-topic context is recorded as an intake gap and queue consequence; it must not be hidden by placeholder growth-tail headings, generic `boundary` / `evidence_anchors` text, or copied field names. When any confirmed topic has such a gap during setup, `STATUS_PATH.Setup Ready Transition.seed_topic_intake_ready` may be `gap_queue_backed`, but not `yes`.
- `seed_topic_intake_ready=gap_queue_backed` is a setup-only state and this check may treat it as passable only while `STATUS_PATH.current_gate=setup_ready`. It requires concrete queue work for clarification, decomposition, intake, seed repair, or original-topic context repair. It does not authorize Wave 0 topic-start rows to pass, Wave 1 evidence deepening to begin for the affected topic, or generic source search that ignores the missing intake field or original context constraints. If the run has advanced past setup and still carries `gap_queue_backed`, return `FAIL_FIX`.

## Non-Goals

This check does not validate reference counts, accepted reference inventory completeness, webpage diagnostics, artifact local citations, Wave gate pass/fail math, or synthesis matrices. Those belong to local-sync/runtime checks after evidence work begins.
