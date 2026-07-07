---
node_type: phase
id: phase-wave1
phase: wave1
gate: wave1-complete
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: work_unit_required
  delegated_role_keys:
    - dpt-evidence-extractor
requires:
  - shared/shared-profile
  - shared/shared-schemas
  - shared/shared-silent-execution
  - shared/shared-subagent-protocol
  - shared/shared-anti-cheating-rules
suggested_context:
  - phases/subagent-dpt-evidence-extractor
---

# Phase: Wave1 — Topic-Specific Deepening

## 0. Execution Brief

- **Objective**: produce `evidence-summary.md`, `question-list.md`, and topic-scoped reference files for every topic.
- **Start here**: load Wave0 outputs, seed topics, queue state, profile thresholds, and `dpt-evidence-extractor` role guidance.
- **Delegated path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit submit` -> submitted ledger row -> gate.
- **Completion check**: `check-gate-wave1-complete.mjs` passes for `phases/phase-wave1.md`.
- **Failure posture**: do not direct-search new Wave1 evidence from the Phase Agent. Repair rejected submits or refill with new work units.

## 1. Stage Goal

For each topic:

- Write `artifacts/wave1/{topic}/evidence-summary.md`.
- Write `artifacts/wave1/{topic}/question-list.md`.
- Write rich reference files at `reference/{topic}-<source-slug>.md`.
- Immediately backfill seed topic tokens from the submitted outputs.

Wave1 output is real topic-specific deepening, not placeholder skeletons.

## 2. Required Inputs

- Active bundle that passed `wave0-complete`.
- `rb_plan.md` topic registry.
- `rb_profile.yaml` research style params, including `wave1_per_topic_ref_floor`, `counterexample_search`, and `cross_verification`.
- Wave0 reference and seed-topic artifacts.
- `DPT_FRAMEWORK/cli/operate-queue.mjs`.
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs`.
- `shared-subagent-protocol.md` for work-unit envelope and Sub-agent rules.

## 3. Allowed Actions

### 3.1 Fill Queue

If queue is empty or thin, enqueue one delegated deepening queue item per topic.

Task card template:

```json
{
  "queue_item_id": "wave1-deepen-{topic.slug}",
  "title": "Deepen topic: {topic.title}",
  "targets": {
    "controller": "main-agent",
    "delegates": {
      "to": "sub-agent",
      "role_key": "dpt-evidence-extractor",
      "timeout_ms": 600000
    }
  },
  "kind": "wave1_topic_deepening",
  "producer_rule": "topic_deepening",
  "priority_class": "P4_progressive_artifact_or_seed_backfill",
  "action": "Use seed topic guardrails and open questions to search topic-specific evidence. Fetch page content, write evidence-summary.md, question-list.md, reference/{topic.slug}-<source-slug>.md, and leaf cache trails under _cache/wave1/primary/{topic.slug}/. Return output_files[] and cache_trails[] for work-unit submit.",
  "writes_to": [
    "artifacts/wave1/{topic.slug}/evidence-summary.md",
    "artifacts/wave1/{topic.slug}/question-list.md",
    "reference/{topic.slug}-<source-slug>.md"
  ],
  "required_receipts": [
    "file:artifacts/wave1/{topic.slug}/evidence-summary.md",
    "file:artifacts/wave1/{topic.slug}/question-list.md"
  ],
  "done_condition": "paired artifacts exist, contain real source URLs and findings, and at least one topic reference exists",
  "verification": {
    "engine": ["work_unit_submit"],
    "agent": ["url_accessible", "reference_metadata_9_fields", "reference_5_sections", "question_list_four_sections"]
  },
  "payload": {
    "topic_slug": "{topic.slug}",
    "topic_title": "{topic.title}",
    "wave": 1
  },
  "lineage": {
    "topic_slug": "{topic.slug}",
    "phase": "wave1"
  }
}
```

Enqueue and check:

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wave1-deepen-{topic.slug}.json
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```

### 3.2 Delegated Drain Loop

Claim and submit delegated work units until drained:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave1 --count 1
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>
```

Sub-agent execution requirements:

- Use real search and fetch; do not treat snippets as evidence.
- Reference files must follow `shared-reference-template.md`: metadata block, no YAML frontmatter, nine required metadata fields, five standard sections, concrete source URLs, and at least five key facts.
- `question-list.md` must include the four sections: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, Exploration / Exploitation Decision.
- Receipt events must bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- Output files and cache trails must appear in the submitted result.

Rejected submit does not finish the attempt. Repair the same claimed `work_id` when possible, or close it with `fail`, `timeout`, or `abandon`.

### 3.3 Inline Backfill

After each successful submit, before claiming another work unit, update the corresponding seed topic:

1. Replace `__BACKFILL_WAVE1_MECHANISMS__` with mechanism findings from the submitted `evidence-summary.md`.
2. Replace `__BACKFILL_WAVE1_TRENDS__` with trend and limitation observations.
3. Replace `__BACKFILL_PENDING_QUESTIONS__` with canonical status labels only: `[开放]`, `[部分解答]`, `[涌现]`.

Do not append below the token; replace the token line.

### 3.4 Quality Self-Check

Before gate, the Phase Agent checks:

| # | Condition | Source |
| --- | --- | --- |
| 1 | Core object list stable | `question-list.md` target table |
| 2 | Must-answer entries backed or downgraded | profile + evidence summaries |
| 3 | Wave2 synthesis entries routed | `question-list.md` decision section |
| 4 | Limitation/dispute/failure-mode search attempted | evidence-summary findings |
| 5 | Counterexample search honored when profile requires it | `rb_profile.yaml` + question protocol |
| 6 | Cross-verification honored when profile requires it | reference backing refs |
| 7 | Remaining unknowns listed | question reconciliation |

These are Agent discipline checks. The gate enforces structural and provenance checks, plus configured count floors; it does not replace semantic judgment.

## 4. Expected Artifacts

- `artifacts/wave1/{topic}/evidence-summary.md`.
- `artifacts/wave1/{topic}/question-list.md`.
- `reference/{topic}-*.md` with complete metadata and source content capture.
- Submitted work-unit ledger rows covering delegated outputs and cache trails.
- `rb_trace.jsonl` records the `wave1_completion` event/check surface required by the Wave1 gate definition.

## 5. Gate Command

When `claim` reports `phase_drained: true`, run:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md
```

## 6. On Gate Pass

Read the gate CLI JSON output and confirm `check.passed === true`. Then consume `check.next` before synchronizing the just-passed source gate:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave1_complete
```

Continue from the Markdown rendered by `enter-phase`. `advance-status` only records that Wave1 passed; it is not the next-phase loader.

## 7. On Gate Fail

If the gate reports a `per_topic_ref_md_count_floor` gap:

1. Identify the topic and missing count from gate `inspect`.
2. Enqueue a supplementary delegated queue item with `kind: "wave1_topic_deepening"` and `priority_class: "P1_state_or_gate_repair"`.
3. Require the Sub-agent to avoid duplicate source URLs and append only real new references.
4. Drain via work-unit claim/submit and rerun the gate.

If all count floors pass but another rule fails, repair that rule directly and rerun the gate.

## 8. Stop Behavior

Do not stop for progress, idle/no-work, or partial-completion reporting. Phase completion condition is gate pass: Wave1 structural and work-unit provenance checks must pass through the Wave1 gate CLI. After gate pass, consume `check.next` through `enter-phase` and continue to Wave2.

## 9. Anti-Cheating Rules

- 禁止把 direct Wave1 files or cache leaves counted as delegated evidence without submitted work-unit ledger rows.
- 禁止用 `operate-queue complete` 完成 delegated topic deepening.
- 禁止手写 result JSON, runtime receipts, ledger rows, or trace events to satisfy gate provenance.
- 禁止把 search snippets, titles, or summaries without fetched source content treated as evidence.
- 禁止让 duplicate source URLs satisfy per-topic reference floors.
- 禁止保留 `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, or `__BACKFILL_PENDING_QUESTIONS__` after submitted-output backfill.
- 禁止把 Agent numeric claims about ref counts used as gate evidence.
- 禁止修改 `_work_units/_index.json` or queue state by hand to repair submit rejection.
- 禁止跳过 gate JSON `inspect`/`advice` when a rule fails.
- 禁止把 fixture-backed experiment behavior described as real Wave1 Agent research quality.
