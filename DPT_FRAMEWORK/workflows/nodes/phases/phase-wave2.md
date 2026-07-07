---
node_type: phase
id: phase-wave2
phase: wave2
gate: wave2-complete
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: work_unit_required_for_new_evidence
  delegated_role_keys:
    - dpt-topic-scout
    - dpt-evidence-extractor
requires:
  - shared/shared-schemas
  - shared/shared-subagent-protocol
  - shared/shared-silent-execution
  - shared/shared-anti-cheating-rules
suggested_context:
  - phases/subagent-dpt-topic-scout
  - phases/subagent-dpt-evidence-extractor
---

# Phase: Wave2 — Cross-Topic Synthesis

## 0. Execution Brief

- **Objective**: produce cross-topic synthesis artifacts and delegate only new search/evidence work through work units.
- **Start here**: load Wave1 artifacts, `finding-index.yaml` expectations, queue state, profile thresholds, and Wave2 role guidance.
- **Pure synthesis path**: Phase Agent reads existing submitted evidence and writes synthesis artifacts.
- **Delegated evidence path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit submit` -> submitted ledger row -> gate.
- **Completion check**: `check-gate-wave2-complete.mjs` passes for `phases/phase-wave2.md`.
- **Failure posture**: do not direct-search new evidence from the Phase Agent. Use targeted work units, explicit HITL2 deferral, or bounded refill.

## 1. Stage Goal

Create the Wave2 artifact group:

- `artifacts/wave2/synthesis.md`
- `artifacts/wave2/cross-topic-ledger.md`
- `artifacts/wave2/finding-index.yaml`

Wave2 is cross-topic cognition, not just prose. It triages findings, records search decisions, and routes new evidence gaps through work units.

## 2. Required Inputs

- Wave0 reference index and source metadata.
- Wave1 `evidence-summary.md` and `question-list.md` for every topic.
- `rb_profile.yaml` Wave2 params: `wave2_cross_topic_depth`, `wave2_emergent_search_rounds`, `p0p1_independent_backing`, `quality_min_tier`, `quality_min_substance`.
- `shared-schemas.md` for Wave2 artifact paths and finding-index schema.
- `operate-queue` and `operate-work-unit` CLIs.

## 3. Allowed Actions

### 3.1 Filling

If queue is empty, enqueue:

1. One non-delegated synthesis queue item:

```json
{
  "queue_item_id": "wave2-synthesis",
  "title": "Cross-topic synthesis",
  "targets": { "controller": "main-agent" },
  "producer_rule": "cross_topic_synthesis",
  "priority_class": "P2_close_open_loop",
  "required_receipts": [
    "file:artifacts/wave2/synthesis.md",
    "file:artifacts/wave2/cross-topic-ledger.md",
    "file:artifacts/wave2/finding-index.yaml"
  ],
  "action": "Read existing Wave0/Wave1 evidence, build cross-topic scan matrix, triage findings, write synthesis.md, cross-topic-ledger.md, and finding-index.yaml. Do not perform new external search inside this task."
}
```

2. One non-delegated backfill queue item per topic:

```json
{
  "queue_item_id": "wave2-backfill-{topic.slug}",
  "title": "Wave2 seed backfill: {topic.title}",
  "targets": { "controller": "main-agent" },
  "producer_rule": "seed_topic_backfill_wave2",
  "priority_class": "P4_progressive_artifact_or_seed_backfill",
  "required_receipts": ["file:seed_topics/{topic.slug}.md"],
  "action": "Backfill seed topic tokens from cross-topic-ledger.md and finding-index.yaml projections, not from narrative prose alone."
}
```

3. Targeted delegated evidence queue items only when findings require new search:

```json
{
  "queue_item_id": "wave2-targeted-{finding_id}",
  "title": "Targeted evidence for {finding_id}",
  "targets": {
    "controller": "main-agent",
    "delegates": {
      "to": "sub-agent",
      "role_key": "dpt-topic-scout",
      "timeout_ms": 600000
    }
  },
  "kind": "wave2_targeted_evidence",
  "producer_rule": "targeted_evidence_search",
  "priority_class": "P1_state_or_gate_repair",
  "required_receipts": [],
  "action": "Search only the assigned finding gap. Write reference/00-cross-<slug>.md and leaf cache trails when new evidence is found. Update finding-index.yaml refs/status. Return output_files[] and cache_trails[] for work-unit submit.",
  "payload": {
    "finding_id": "{finding_id}",
    "wave": 2
  }
}
```

### 3.2 Execution Loop

This is the finding triage loop: classify each candidate, decide whether existing evidence is enough, route new evidence gaps to targeted work units, read JS/CLI feedback checkpoints, and repeat until convergence.

L0 checkpoint: schema/file readiness. Use local parsing and gate/queue/check outputs to confirm the three Wave2 artifacts exist and are structurally readable.

L1 checkpoint: provenance and targeted-evidence coverage. Use `operate-work-unit submit`, Wave2 gate JSON, and work-unit inspection feedback to confirm delegated targeted evidence is covered by submitted ledger rows.

Convergence criteria: no P0/P1 finding remains without a decision, no finding marked `exploit_search` or `explore_search` lacks either submitted targeted evidence or explicit deferral, and all gate `inspect` items are repaired or consciously routed to HITL2/final limitations.

#### 3.2.1 Pure Synthesis

For the synthesis queue item, the Phase Agent:

1. Reads all Wave1 evidence summaries and question lists.
2. Builds a cross-topic scan matrix with dimensions such as `shared_pattern`, `contradiction`, `resolution_opportunity`, and `emergent_question`.
3. Writes all findings into `cross-topic-ledger.md` and `finding-index.yaml`.
4. Sets each finding decision to one of: `use_existing_evidence`, `exploit_search`, `explore_search`, `defer_hitl2`, `requires_internal_data`, `record_only`.
5. Writes `synthesis.md` as a narrative projection grounded in existing references, citing `W2F-xxx` finding ids.
6. Completes the non-delegated queue item through the normal queue path.

No delegated ledger row is required for pure synthesis artifacts.

#### 3.2.2 Targeted Evidence

For any finding with `decision=exploit_search` or `decision=explore_search`, enqueue and drain a targeted evidence work unit:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave2 --count 1
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>
```

Targeted evidence Sub-agents must:

- Search/fetch only the assigned gap.
- Avoid duplicate source URLs.
- Write `reference/00-cross-*.md` only for real, fetched sources.
- Write cache trails under an assigned `_cache/wave2/...` leaf directory.
- Bind receipt/result identity to `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

Wave2 gate fails if targeted evidence/reference outputs exist without submitted work-unit coverage.

#### 3.2.3 Backfill

Backfill seed topics from `cross-topic-ledger.md` and `finding-index.yaml`. Do not backfill from synthesis prose alone.

Each Wave2 backfill replacement must preserve finding lineage as return-map entries:

- `evidence_meaning`: what the finding changed for this seed topic.
- `relationship`: `supports`, `refutes`, `partial`, `opens`, `defers`, or `context`.
- `refs`: include relevant `W2F-xxx` ids plus bundle-relative refs to `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, Wave1/Wave0 source artifacts, references, cache leaves, and work-unit surfaces where available.
- `status`: `supported`, `refuted`, `partial`, `open`, `emergent`, or `deferred`.
- `next_hop`: the next read/repair/handoff path for a future Agent.

### 3.3 Closeout + Gate Readiness

Before gate, ensure `cross-topic-ledger.md` contains the fixed synthesis control sections:

- Cross-Topic Scan Matrix
- Wave1 Legacy Questions
- Cross-Topic Resolutions
- Emergent Cross-Topic Questions
- Exploration Decisions
- HITL2 Handoff

Ensure `finding-index.yaml` records at least `id`, `type`, `status`, `decision`, and refs/origin fields. Finding ids use `W2F-xxx`; finding types include `wave1_legacy_question`, `cross_topic_resolution`, and `cross_topic_emergent_question`. Finding lifecycle status should move through `candidate`, `classified`, and `decision_made` instead of jumping from raw prose to final synthesis.

Backfill placeholders expected to be replaced before gate include `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__`.

#### 3.3.1 Quality Self-Check

Before gate, the Phase Agent checks the five Wave2 profile parameters:

| # | Parameter | Check |
| --- | --- | --- |
| 1 | `p0p1_independent_backing` | P0/P1 findings have enough independent backing refs. |
| 2 | `quality_min_tier` | Backing refs meet source tier floor. |
| 3 | `quality_min_substance` | Backing refs meet substance floor. |
| 4 | `wave2_cross_topic_depth` | Each topic has enough cross-topic scan connections. |
| 5 | `wave2_emergent_search_rounds` | Required emergent search rounds are completed or explicitly deferred. |

These checks are Agent discipline. The gate verifies structural artifacts, references, links, trace expectations, and submitted work-unit coverage for delegated targeted evidence.

## 4. Expected Artifacts

- `artifacts/wave2/synthesis.md`
- `artifacts/wave2/cross-topic-ledger.md`
- `artifacts/wave2/finding-index.yaml`
- `reference/00-cross-*.md` only when real targeted evidence exists
- Submitted work-unit rows for delegated targeted evidence outputs and cache trails
- Seed-topic Wave2 backfill entries preserving `W2F-xxx` finding ids and refs to `cross-topic-ledger.md`, `finding-index.yaml`, and source artifacts used by each finding.
- `rb_trace.jsonl` records the `wave2_completion` event/check surface required by the Wave2 gate definition.

## 5. Gate Command

Run gate when `claim` reports phase drain and non-delegated queue work is done:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md
```

## 6. On Gate Pass

Read the gate CLI JSON output and confirm `check.passed === true`. Then consume `check.next` before synchronizing the just-passed source gate:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave2_complete
```

Continue from the Markdown rendered by `enter-phase`. `advance-status` only records that Wave2 passed; it is not the next-phase loader.

## 7. On Gate Fail

If quality self-check or gate output identifies a search/evidence gap:

1. Enqueue targeted delegated queue items with `kind: "wave2_targeted_evidence"`.
2. Drain through work-unit claim/submit.
3. Update `finding-index.yaml` and `cross-topic-ledger.md`.
4. Rerun self-check and gate.

If a gap cannot be resolved after bounded attempts, record the limitation and route it to HITL2 or final limitations. Do not invent references.

## 8. Stop Behavior

Do not stop for progress, idle/no-work, or partial-completion reporting. Phase completion condition is gate pass: Wave2 structural and work-unit provenance checks must pass through the Wave2 gate CLI. After gate pass, consume `check.next` through `enter-phase` and continue to HITL2/final flow.

## 9. Anti-Cheating Rules

- 禁止把 synthesis prose 当作 `finding-index.yaml` 或 `cross-topic-ledger.md` 的替代品.
- 禁止 direct-search new Wave2 evidence from the Phase Agent; new evidence gaps must use targeted work units.
- 禁止让 `reference/00-cross-*.md` pass provenance without submitted `wave2_targeted_evidence` work-unit rows.
- 禁止手写 result JSON, runtime receipts, ledger rows, or trace events.
- 禁止把 queue/index/filesystem presence treated as delegated evidence authority without submitted ledger rows.
- 禁止把 unresolved P0/P1 findings silently dropped from `finding-index.yaml`.
- 禁止保留 `__BACKFILL_WAVE2_JUDGMENT__` or `__BACKFILL_PENDING_QUESTIONS__` after completed backfill.
- 禁止从 synthesis prose alone 回填 Wave2; backfill must preserve W2F ids, return-map fields, and ledger/index/source refs.
- 禁止 inventing references when targeted search fails; record limitation or route to HITL2.
- 禁止 treating the same submitted reference/cache trail as independent backing for P0/P1 findings.
- 禁止 bypassing gate JSON `inspect`/`advice`; repair, refill, defer, or record limitation from real feedback.
