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

- **Objective**: produce submitted `evidence-summary.md`, `question-list.md`, source backing, Phase-owned topic reference projections, and Phase-owned `depth-review.yaml` for every topic.
- **Start here**: load Wave0 outputs, seed topics, queue state, profile thresholds, and `dpt-evidence-extractor` role guidance.
- **Delegated path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit submit` -> submitted ledger row -> gate.
- **Completion check**: side-effect-free `inspect-wave1-output.mjs` passes first, then `check-gate-wave1-complete.mjs` passes for `phases/phase-wave1.md`.
- **Failure posture**: do not direct-search new Wave1 evidence from the Phase Agent. Repair rejected submits, produce a visible `blocked_contract`, or refill with supplementary work units.

## 1. Stage Goal

For each topic:

- Write `artifacts/wave1/{topic}/evidence-summary.md`.
- Write `artifacts/wave1/{topic}/question-list.md`.
- Phase Agent materializes rich reference files at `reference/{topic.slug}-<source-slug>.md` after successful submit.
- Review submitted source/depth evidence into `artifacts/wave1/{topic}/depth-review.yaml`.
- Immediately backfill seed topic tokens from the submitted outputs.

Wave1 output is real topic-specific deepening, not placeholder skeletons or a Wave0 recap. Wave0 URLs are allowed as context but never count toward the Wave1 new-source floor.

For each delegated topic-deepening task, derive the initial candidate URL/source target from explicit profile/runtime floors plus a conservative small margin. Use `wave1_per_topic_ref_floor`, `topic_unique_ratio`, and the depth-review `new_source_floor` semantics as the floor basis. The margin is only a planning buffer for inaccessible pages, duplicate URLs, Wave0 duplicates, and non-countable sources; it is not a gate threshold, profile field, quality override, or permission to lower coverage.

## 2. Required Inputs

- Active bundle that passed `wave0-complete`.
- `rb_plan.md` topic registry.
- `rb_profile.yaml` research style params, including `wave1_per_topic_ref_floor`, `topic_unique_ratio`, `counterexample_search`, and `cross_verification`.
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
  "action": "Use seed topic guardrails, Wave0 source URLs as context only, and open questions to search topic-specific new evidence. Fetch page content, write evidence-summary.md and question-list.md, declare them in output_files[] with roles evidence_summary and question_list, and return structured source_claims[], accepted_source_urls[], source candidates, and leaf cache trails under _cache/wave1/primary/{topic.slug}/. Reserve role other for extra non-blocking outputs. Cover mechanism, trend/difficulty, limitation/dispute/failure-mode, and profile-required counterexample/cross-verification checks. Phase Agent materializes reference/{topic.slug}-<source-slug>.md after successful submit from submitted backing.",
  "writes_to": [
    "artifacts/wave1/{topic.slug}/evidence-summary.md",
    "artifacts/wave1/{topic.slug}/question-list.md"
  ],
  "required_receipts": [
    "file:artifacts/wave1/{topic.slug}/evidence-summary.md",
    "file:artifacts/wave1/{topic.slug}/question-list.md"
  ],
  "done_condition": "submitted paired artifacts exist, contain real new source URLs and depth findings, expose structured accepted source claims, and accepted source backing is suitable for Phase-owned reference materialization or explicit limitation",
  "verification": {
    "engine": ["work_unit_submit"],
    "agent": ["url_accessible", "source_claims_structured", "question_list_four_sections", "depth_dimensions_covered", "reference_materialization_backing_available"]
  },
  "status_sync": ["wave1_topic_deepening_submitted"],
  "completion_receipt": "work_unit:submitted-ledger",
  "failure_route": "work_unit_repair",
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

Claim and submit delegated work units until queue and delegated in-flight work are drained. Before claiming, reconstruct Wave1 in-flight work from `operate-work-unit inspect <bundle>`, queue delegated-in-flight state, `_work_units/wave1/*` status/result/receipt surfaces, and submitted ledger rows.

Compute a bounded top-up `claim-count` from independent eligible topics, the accepted/default cap, and remaining free delegated in-flight capacity. The conservative default cap is no higher than 5 when no accepted profile/runtime cap exists. If reconstructed in-flight work already reaches cap, poll/submit/terminalize before claiming more.

```bash
First inspect the queue-front planned role and perform one bounded real `dpt-evidence-extractor` native probe. Do not claim a batch to test availability or reuse this observation for another role.

node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave1 --count <claim-count> --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> --actor-role-key dpt-evidence-extractor --actor-reason <normalized-reason> --execution-actor <delegated_subagent|phase_agent_fallback>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>
```

Sub-agent execution requirements:

- Use real search and fetch; do not treat snippets as evidence.
- Plan candidate URLs from explicit `rb_profile.yaml#/research_style_params.wave1_per_topic_ref_floor`, `topic_unique_ratio`, and the depth-review new-source floor formula plus a conservative small margin for failed fetches, duplicates, and non-countable pages. Do not use a fixed hard-coded fetch aim unless it is written as `profile/runtime floor + named margin`.
- `question-list.md` must include the four sections: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, Exploration / Exploitation Decision.
- `evidence-summary.md` or the submitted result must cover mechanism, trend/difficulty, and limitation/dispute/failure-mode dimensions.
- `result.json#/output_files[]` must declare `artifacts/wave1/{topic.slug}/evidence-summary.md` with role `evidence_summary` and `artifacts/wave1/{topic.slug}/question-list.md` with role `question_list`. Role `other` is only for extra non-blocking outputs; it does not cover either required artifact.
- `result.json` must expose `source_claims[]` directly or through a declared machine-readable output, plus `accepted_source_urls[]` when available. Each accepted claim names `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs[]`, and optional `degraded_capture_ref`.
- Receipt events must bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- Output files and cache trails must appear in the submitted result. Canonical topic reference Markdown is not required as delegated output unless a future accepted task explicitly assigns it.

Actively poll result/receipt/output/cache readiness without waiting for user continuation or task notification. Rejected submit does not finish the attempt. Repair the same claimed `work_id` when possible. For every expired or stale claimed attempt, run:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <work_id> [--result <result.json>]
```

Parse structured stdout even when timeout preflight exits non-zero. Follow all advice branches: `submit` uses formal submit; `repair` keeps the same claimed `work_id`; `wait` continues active polling; `inspect` repairs candidate/Engine authority; `block` leaves the phase undrained and surfaces the blocker; only `timeout` permits normal terminal timeout. `fail` and `abandon` remain explicit non-timeout closures. `timeout --force --reason <reason>` is exceptional and audited, never the normal drain action for progress-positive or invalid-binding attempts.

Do not run depth review, supplementary-demand convergence, Phase-owned reference materialization, or the Wave1 gate as though the attempt were drained while preflight recommends `submit`, `repair`, `wait`, `inspect`, or `block`. After accepted submit, preserve the existing depth-review and reference-materialization boundaries; when depth remains insufficient, enqueue supplementary `wave1_topic_deepening` demand instead of bypassing the work-unit path.

### 3.2.1 Topic Reference Materialization

After each successful Wave1 submit, the Phase Agent materializes `reference/{topic.slug}-<source-slug>.md` for every accepted submitted source suitable for consumer navigation, then updates `reference/_INDEX.md`.

Write each complete projection to a retained staging file, commit it with `operate-artifact-persistence.mjs persist` using compare-and-swap, consume `committed|blocked`, and update `_INDEX.md` only after commit. Persistence is durability only; submitted `source_claims[]`, `accepted_source_urls[]`, cache trails, and work-unit rows remain the authority.

Each Phase-owned reference must:

- follow `shared-reference-template.md`: metadata block, no YAML frontmatter, nine required metadata fields, five standard sections, concrete source URLs, and at least five key facts;
- use `source_url` from submitted `source_claims[]`, `accepted_source_urls[]`, verified cache trails, or explicit degraded-capture records;
- include body refs/links to submitted backing such as `artifacts/wave1/{topic}/evidence-summary.md`, `artifacts/wave1/{topic}/question-list.md`, `_cache/wave1/...`, and `_work_units/wave1/{work_id}/`;
- never introduce an accepted source URL absent from submitted backing. If a needed source is absent, enqueue supplementary `wave1_topic_deepening` instead of direct-searching or inventing a reference.

Diagnostics should be able to scan the phrase submitted source_claims[] and accepted_source_urls[] in this materialization path.

If no submitted source is materializable, record an explicit limitation or repair diagnostic in Wave1 artifacts before gate.

### 3.2.2 Depth Review

After each successful Wave1 submit, the Phase Agent writes or updates `artifacts/wave1/{topic}/depth-review.yaml`. This review is Phase-owned process evidence; it does not create delegated coverage. `reviewed_work_unit_refs[]` uses canonical `_work_units/wave1/<work_id>` refs without a trailing slash and every ref must resolve to a submitted work-unit row.

Novelty is a direct comparison: start from accepted submitted `source_claims[]`, normalize their URLs, and compare them with the Wave0 URL set recorded in `wave0_source_urls[]`. Only accepted claims absent from that Wave0 set belong in `new_source_urls[]` or count toward `new_source_floor.observed`. Every accepted claim must remain bound to submitted authority through its work-unit row plus `cache_trail_refs[]`, or an explicit `degraded_capture_ref`; prose links and the Phase-owned depth review do not create source coverage.

Minimum shape:

```yaml
version: "0.1"
topic_slug: "{topic.slug}"
reviewed_work_unit_refs:
  - "_work_units/wave1/<work_id>"
wave0_source_urls: []
source_claims:
  - url: "https://example.com/source"
    source_ref: "artifacts/wave1/{topic.slug}/evidence-summary.md"
    acceptance_status: "accepted"
    is_new_vs_wave0: true
    cache_trail_refs:
      - "_cache/wave1/primary/{topic.slug}/s01_source"
    degraded_capture_ref: null
new_source_urls:
  - "https://example.com/source"
new_source_floor:
  required: 1
  observed: 1
  source: "ceil(wave1_per_topic_ref_floor * topic_unique_ratio)"
depth_dimensions:
  mechanism: { status: "covered", refs: [] }
  trend_or_difficulty: { status: "covered", refs: [] }
  limitation_or_dispute: { status: "covered", refs: [] }
profile_checks:
  counterexample_search: { required: false, status: "not_required", refs: [] }
  cross_verification: { required: false, status: "not_required", refs: [] }
decision: "accept"
supplementary_queue_item_ids: []
```

Compute `new_source_floor.required` only from explicit profile/runtime parameters: `ceil(wave1_per_topic_ref_floor * topic_unique_ratio)`, minimum 1 when both parameters exist. If either parameter is missing, record `decision: blocked_contract` with a `missing_profile_parameter` reason and do not invent a hidden default. Decision values are closed:

- `accept`: source novelty, submitted cache mapping, depth dimensions, and profile checks are satisfied.
- `supplement_required`: output is shallow, missing new sources, missing cache mapping, missing depth dimensions, or unmet profile checks.
- `blocked_contract`: bounded supplementary attempts are exhausted, required profile/runtime parameters are missing, or deterministic coverage cannot be established.

### 3.3 Inline Backfill

After each successful submit, before claiming another work unit, update the corresponding seed topic:

1. Replace `__BACKFILL_WAVE1_MECHANISMS__` with mechanism return-map entries from the submitted `evidence-summary.md`.
2. Replace `__BACKFILL_WAVE1_TRENDS__` with trend/limitation return-map entries.
3. Replace `__BACKFILL_PENDING_QUESTIONS__` with canonical status labels only: `[开放]`, `[部分解答]`, `[涌现]`, plus return-map entries that name the question, status, evidence meaning, refs, and next hop.
4. Each Wave1 return-map entry includes `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`. Evidence-bearing entries must list concrete existing `reference/{topic.slug}-<source-slug>.md` files as primary consumer navigation; `artifacts/wave1/{topic}/evidence-summary.md`, `artifacts/wave1/{topic}/question-list.md`, submitted source claims, `accepted_source_urls[]`, `_cache/`, and `_work_units/` surfaces are secondary provenance.
5. Do not use `reference/{topic.slug}-*.md` globs or count summaries. If no consumer reference can be materialized, write an explicit limitation entry with `relationship: defers`, `status: deferred`, `refs: none`, and a `next_hop` limitation reason.

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

If the depth review records `decision: supplement_required`, enqueue a supplementary `wave1_topic_deepening` queue item with explicit `payload.topic_slug` and a queue id such as `wave1-deepen-{topic.slug}-v2` or `wave1-deepen-{topic.slug}-suppl-r1`. Topic identity comes from `payload.topic_slug`; queue id parsing is fallback only.

## 4. Expected Artifacts

- `artifacts/wave1/{topic}/evidence-summary.md`.
- `artifacts/wave1/{topic}/question-list.md`.
- `artifacts/wave1/{topic}/depth-review.yaml`.
- Phase-owned `reference/{topic}-*.md` with complete metadata, source content capture, `_INDEX.md` rows, and body refs to submitted backing.
- Submitted work-unit ledger rows covering delegated outputs and cache trails.
- Submitted structured source claims where every accepted source URL maps to a verified cache trail or explicit degraded-capture record.
- Seed-topic Wave1 backfill entries that preserve mechanism/trend/question meaning and refs to concrete existing `reference/{topic.slug}-<source-slug>.md` files as primary consumer navigation, with evidence summaries, question lists, cache leaves, and work-unit surfaces as secondary provenance.
- `rb_trace.jsonl` records the `wave1_completion` event/check surface required by the Wave1 gate definition.

## 5. Gate Command

After queue demand is drained, reconstructed delegated in-flight work is zero, and Phase-owned references/depth reviews/backfill have been materialized from submitted backing, run the Wave1 inspect before recording completion evidence or invoking the formal gate:

```bash
node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs --bundle <path>
```

This inspect is side-effect-free and non-routing. If it fails, repair the smallest named bundle-relative surface and rerun this same command; do not build a second local validator or bypass submitted authority.

Only after inspect passes, record or refresh the existing `wave1_completion` evidence through the normal phase logging path, then run the formal gate:

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

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。不得从 legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段或命令。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：当 `write_to` 是已授权的 Wave1 mutable surface 时，由 Agent 修复 exact reference/depth/artifact field/file；不得复制 ledger/cache truth制造第二 authority。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal queue/work-unit/declaration/lifecycle operation；不得要求用户运行普通命令，也不得直接编辑 status、trace、ledger、index、receipt、hash 或 provenance authority。
3. `repair_kind: user_decision`：只暴露 `missing_fact` 指出的真实语义/风险决定。Wave1 是 `stop: no`，不得由 hint 创造新 HITL、repair controller 或 lifecycle；没有 accepted decision path 时保持当前 checkpoint failed。
4. `repair_kind: external_action`：只暴露不可代理的 actor/search/fetch/permission 前置条件；满足后机械执行回到 Agent。
5. `repair_kind: missing_contract`：报告 exact unavailable capability/contract boundary，不提供手写 authority、隐式 floor 或平行成功路径。

Hint 不创造 permission、controller 或 lifecycle。完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 Wave1 checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

仅当 structured hint 的 `missing_fact` / `write_to` 明确识别 reference projection/index、`depth_review_contract`、`source_novelty_floor`、`source_claim_cache_mapping` 或缺失 submitted backing 时：

1. If submitted source backing exists and the hint authorizes the Phase-owned projection, repair the exact `reference/{topic}-*.md`, `_INDEX.md`, or non-derivable `depth-review.yaml` coordinate.
2. If submitted backing is absent and the hint names the legal supplementary path, enqueue `wave1_topic_deepening`, require genuinely new source backing, and drain through work-unit claim/submit.
3. If profile/runtime authority is missing, follow only the hint's legal owner operation or `missing_contract`; never invent a local default.
4. Materialize only from submitted backing, then run the hint's exact `rerun`.

Gate repair/refill handles remaining floor gaps. Do not treat the planning margin as pass authority, do not silently lower floors, and do not create a new numeric threshold outside the accepted profile/runtime surfaces.

## 8. Stop Behavior

Do not stop for progress, idle/no-work, or partial-completion reporting. Phase completion condition is gate pass: Wave1 structural and work-unit provenance checks must pass through the Wave1 gate CLI. After gate pass, consume `check.next` through `enter-phase` and continue to Wave2.

## 9. Anti-Cheating Rules

- 禁止把 direct Wave1 files or cache leaves counted as delegated evidence without submitted work-unit ledger rows.
- 禁止用 `operate-queue complete` 完成 delegated topic deepening.
- 禁止手写 result JSON, runtime receipts, ledger rows, or trace events to satisfy gate provenance.
- 禁止把 search snippets, titles, or summaries without fetched source content treated as evidence.
- 禁止让 duplicate source URLs satisfy per-topic reference floors.
- 禁止让 duplicate Wave0 URLs satisfy the Wave1 new-source floor.
- 禁止让 prose-only links in `evidence-summary.md` become accepted source coverage without submitted structured source claims.
- 禁止让 Phase-owned `reference/{topic}-*.md` 扩展 delegated coverage beyond submitted `source_claims[]`, `accepted_source_urls[]`, cache trails, degraded-capture records, or work-unit refs.
- 禁止让 `depth-review.yaml` create delegated coverage that is not backed by submitted work-unit rows.
- 禁止 inventing a hidden default when `wave1_per_topic_ref_floor` or `topic_unique_ratio` is missing.
- 禁止保留 `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, or `__BACKFILL_PENDING_QUESTIONS__` after submitted-output backfill.
- 禁止把 Wave1 backfill 写成裸 evidence list, unsupported prose, or count summary; include return-map fields and refs.
- 禁止把 Agent numeric claims about ref counts used as gate evidence.
- 禁止修改 `_work_units/_index.json` or queue state by hand to repair submit rejection.
- 禁止跳过 gate JSON `inspect`/`advice` when a rule fails.
- 禁止把 fixture-backed experiment behavior described as real Wave1 Agent research quality.
