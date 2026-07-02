---
title: "Gate - Setup Ready"
role: "gate specification"
scope: "non-research transition gate after instantiation and before Wave 0 evidence work"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
writes: []
---

# Gate - Setup Ready

`setup_ready` is a non-research transition gate. It confirms the execution workspace is usable before Wave 0 begins. It is not a research wave, cannot satisfy evidence floors, and does not count as source evidence.

## Pass Surface

The `Setup Ready Transition` section in `STATUS_PATH` must show:

- `setup_ready_status=ready`
- `execution_workspace_ready=yes`
- `navigation_stubs_ready=yes`
- `topic_root_alignment_ready=yes`
- `seed_growth_sections_ready=yes`
- `seed_topic_intake_ready=yes` when `derived_topic_count > 0` and every confirmed topic meets the Seed Topic Intake Standard, or `seed_topic_intake_ready=gap_queue_backed` when every missing upper-section field or original-topic context field is explicit in plan/status and backed by concrete queue repair work. For `derived_topic_count=0`, use `seed_topic_intake_ready=gap_queue_backed` only with concrete decomposition/intake clarification work; `yes` is invalid because no confirmed topic intake exists to call ready.
- `status_queue_sync_ready=yes`

`QUEUE_PATH` must expose a sequential active queue and point to executable Wave 0 or setup repair work. If `seed_topic_intake_ready=gap_queue_backed`, the next executable work must include the specific intake/decomposition repair, all five active queue slots must avoid source intake, native search, Exa search, retrieval, fetch, promotion, Wave 0 evidence, and Wave 1 deepening work, and the run must not treat the affected topic as fully ready for Wave 1 deepening. If `derived_topic_count=0`, the active queue must stay on decomposition/intake clarification and must not schedule Wave 0 source intake. `REFERENCE_DIR` and `ARTIFACT_DIR` navigation anchors should exist before retrieval work starts.

The focused `check-gate-setup-ready` CLI is a composite setup preflight, not a field-only checker. It must inspect the target run directory and local content surfaces before setup can pass:

- `seed_topics/` navigation and confirmed seed files, including the refill/backfill shape enforced by `check-seed-topic-shape`
- `seed_topics/_reference/README.md` and `seed_topics/_reference/_INDEX.md`
- the `_artifacts/` scaffold and topic artifact path bindings
- `_framework` presence, required snapshot paths, template family/version, same-version content drift, run-root AGENTS/CLAUDE contracts, root control file placement, Instance Config path bindings, and runtime command entrypoint
- `PLAN_PATH -> Topic Registry` and `Seed Topic Intake Matrix`
- `STATUS_PATH` topic blocks and Wave 1 / Wave 2 audit rows
- `QUEUE_PATH` repair work when seed intake is `gap_queue_backed`

For topics derived from `original_topic/`, setup preflight must inspect both the seed file and `PLAN_PATH -> Seed Topic Intake Matrix`. Both surfaces must preserve meaningful `source_anchor`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route` values. Bare field labels, `TBD`, `todo`, `pending clarification`, `placeholder`, `{...}`, raw-only source anchors, or generic boundary/evidence prose are not enough to prevent later generic search.

When `seed_topic_intake_ready=gap_queue_backed`, the active queue must repair seed intake, decomposition, or original-topic context before any source-intake runner, native search, Exa search, retrieval, fetch, promotion, or Wave 0 evidence task starts. This is a setup-only repair state; once `STATUS_PATH.current_gate` advances beyond `setup_ready`, lingering `gap_queue_backed` seed intake is a local-sync/gate failure, not a passable assessed state. The default search provider remains `native_search`; `exa_search` is active only when explicitly selected or when the intake request requires Exa-specific capabilities.

## Fail Rules

Fail if setup-ready is claimed while root directories, navigation stubs, seed growth sections, seed topic refill anchors, topic intake assessment, meaningful original-topic context, or status/queue sync are missing. Missing upper-section seed-topic substance or original-topic context may pass setup only as `seed_topic_intake_ready=gap_queue_backed`; it remains a Wave 0 topic-start and Wave 1 blocker until repaired, and must be visible in plan/status/queue rather than hidden by empty growth headings, copied field names, or placeholder values.
