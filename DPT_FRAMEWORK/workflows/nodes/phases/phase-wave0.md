---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: work_unit_required
  delegated_role_keys:
    - dpt-source-intake
requires:
  - shared/shared-profile
  - shared/shared-schemas
  - shared/shared-silent-execution
  - shared/shared-subagent-protocol
  - shared/shared-anti-cheating-rules
suggested_context:
  - phases/subagent-dpt-source-intake
---

# Phase: Wave0 — Foundation Shared Reference

## 0. Execution Brief

- **Objective**: collect foundation source metadata and shared reference evidence for every topic.
- **Start here**: load `rb_queue.json`, `rb_plan.md` topic registry, seed topic files, profile thresholds, and `dpt-source-intake` role guidance.
- **Delegated path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit submit` -> submitted ledger row -> gate.
- **Completion check**: `check-gate-wave0-complete.mjs` passes for `phases/phase-wave0.md`.
- **Failure posture**: do not direct-search from the Phase Agent as a substitute for delegated evidence. Use submit rejection, terminal attempt closure, refill, and gate feedback.

## 1. Stage Goal

Create `artifacts/wave0/{topic}/source.yaml` for each topic and shared foundation references under `reference/00-shared-*.md`.

Wave0 is foundation evidence collection, not comprehensive research. Exact floors come from `rb_profile.yaml#/research_style_params`, especially `wave0_per_topic_source_floor` and `wave0_shared_ref_total`.

## 2. Required Inputs

- Active bundle that passed `seed-topics-ready`.
- `rb_plan.md` frontmatter `topic_registry`.
- `rb_profile.yaml` research style params and `search_preference`.
- `shared-reference-template.md` through shared schema/context.
- `DPT_FRAMEWORK/cli/operate-queue.mjs` for enqueue/check/non-delegated maintenance.
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs` for delegated claim/submit/fail/timeout/abandon/inspect.
- `shared-subagent-protocol.md` for work-unit envelope and Sub-agent rules.

## 3. Allowed Actions

### 3.1 Fill Queue

If `operate-queue check <bundle>` reports an empty or thin queue, enqueue one delegated queue item per topic.

Task card template:

```json
{
  "queue_item_id": "wave0-source-{topic.slug}",
  "title": "Source intake: {topic.title}",
  "targets": {
    "controller": "main-agent",
    "delegates": {
      "to": "sub-agent",
      "role_key": "dpt-source-intake",
      "timeout_ms": 600000
    }
  },
  "kind": "wave0_source_intake",
  "producer_rule": "source_intake_fan_in",
  "priority_class": "P5_new_reference_intake",
  "action": "Search foundation references for {topic.title}; fetch page content; write artifacts/wave0/{topic.slug}/source.yaml; optionally write reference/00-shared-<slug>.md; write leaf cache trails under _cache/wave0/primary/{topic.slug}/; return output_files[] and cache_trails[] for work-unit submit.",
  "writes_to": [
    "artifacts/wave0/{topic.slug}/source.yaml",
    "reference/00-shared-<slug>.md"
  ],
  "required_receipts": [
    "file:artifacts/wave0/{topic.slug}/source.yaml"
  ],
  "done_condition": "source.yaml exists, validates as ReferenceMetadata, and contains at least one real source",
  "verification": {
    "engine": ["work_unit_submit"],
    "agent": ["url_accessible", "title_matches_page", "cache_trails_complete"]
  },
  "status_sync": ["wave0_source_intake_submitted"],
  "completion_receipt": "work_unit:submitted-ledger",
  "failure_route": "work_unit_repair",
  "payload": {
    "topic_slug": "{topic.slug}",
    "topic_title": "{topic.title}",
    "wave": 0
  },
  "lineage": {
    "topic_slug": "{topic.slug}",
    "phase": "wave0"
  }
}
```

Enqueue:

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wave0-source-{topic.slug}.json
node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
```

### 3.2 Delegated Drain Loop

Repeat the shared batch-poll-submit loop until the queue and delegated in-flight work are drained. Before claiming, reconstruct in-flight Wave0 work from `operate-work-unit inspect <bundle>`, queue delegated-in-flight state, and `_work_units/wave0/*` status/result/receipt surfaces.

Compute a bounded top-up `claim-count` from:

- independent eligible Wave0 source-intake demand;
- the accepted/default cap for the run, conservatively no higher than 5 when no accepted profile/runtime cap exists;
- remaining free delegated in-flight capacity after reconstructed in-flight work is counted.

If reconstructed in-flight work already reaches the accepted/default cap, poll, submit, repair, or terminalize those attempts before claiming more. Use `--count 1` only for a single remaining item, dependency-blocked front item, accepted cap of 1, or a narrow repair.

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave0 --count <claim-count>
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle>
```

For each claimed work unit:

1. Read `prompt_refs[].task_ref`, `beacon_ref`, and `result_schema_ref`.
2. Spawn the Sub-agent with the generated prompt.
3. Require real WebSearch plus page fetch. If the preferred fetch tool is unavailable, use the fetch chain in the work-unit task. Do not use search snippets as evidence.
4. Ensure the Sub-agent writes declared output files and leaf cache trails.
5. Ensure `runtime-receipt.jsonl` events carry `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
6. Actively poll result/receipt/output/cache readiness without waiting for user continuation or task notification.
7. Submit ready attempts:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>
```

If submit rejects, repair the same claimed attempt when possible. If the attempt cannot continue, close it explicitly before claiming replacement work:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs fail <bundle> --work-id <work_id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout <bundle> --work-id <work_id> --reason "<reason>"
node DPT_FRAMEWORK/cli/operate-work-unit.mjs abandon <bundle> --work-id <work_id> --reason "<reason>"
```

Do not use queue completion commands for delegated success.

### 3.3 Immediate Seed Backfill

After each successful submit, before claiming the next item:

1. Open `seed_topics/{topic.slug}.md`.
2. Locate `__BACKFILL_WAVE0_EVIDENCE__`.
3. Replace the token line with concise return-map entries, not only URLs or prose. Each important source/reference entry includes `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`.
4. For evidence-bearing entries, make `refs` point first to concrete existing `reference/00-shared-*.md` files. Add `artifacts/wave0/{topic}/source.yaml`, `_cache/`, and `_work_units/` refs only as secondary provenance.
5. Explain what the source says, which must-answer or initial hypothesis it supports/refutes/opens/defers, and where to read submitted source/reference/cache/work-unit evidence.
6. Do not leave the token in place.

## 4. Expected Artifacts

- `artifacts/wave0/{topic}/source.yaml` for every topic.
- `reference/00-shared-*.md` when shared foundation references exist.
- `reference/_INDEX.md` summarizing available references.
- Submitted work-unit rows in `rb_output_declarations.jsonl` covering delegated outputs and cache trails.
- Seed-topic Wave0 backfill entries with return-map fields and concrete existing `reference/00-shared-*.md` refs as primary consumer navigation; `source.yaml`, `_cache/`, and `_work_units/` refs may appear only as secondary provenance.
- `rb_trace.jsonl` records the `wave0_completion` event/check surface required by the Wave0 gate definition.

## 5. Gate Command

Run the Wave0 gate only after queue demand is drained and reconstructed delegated in-flight work is zero. Then read the JSON output before deciding the next action:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
```

## 6. On Gate Pass

Read the gate CLI JSON output and confirm `check.passed === true`. Then consume `check.next` before synchronizing the just-passed source gate:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave0_complete
```

Continue from the Markdown rendered by `enter-phase`. `advance-status` only records that Wave0 passed; it is not the next-phase loader.

## 7. On Gate Fail

If gate fails because `per_topic_count_floor` or `shared_ref_count_floor` is below profile threshold:

1. Read gate `inspect` and identify the exact topic/shared gap.
2. Enqueue supplementary delegated queue items with `kind: "wave0_source_intake"` and `priority_class: "P1_state_or_gate_repair"`.
3. Drain through the same work-unit claim/submit path.
4. Rerun the gate.

Supplementary tasks must append or add real sources only. They must not overwrite existing `source.yaml`, create placeholder URLs, or fabricate `reference/00-shared-*.md`.

## 8. Stop Behavior

Do not stop for progress, idle/no-work, or partial-completion reporting. Phase completion condition is gate pass: structural and work-unit provenance checks must pass through the Wave0 gate CLI. After gate pass, consume `check.next` through `enter-phase` and continue to Wave1.

## 9. Anti-Cheating Rules

- 禁止把 direct filesystem artifacts 当作 delegated evidence；delegated Wave0 outputs require submitted work-unit ledger rows.
- 禁止用 `operate-queue complete` 完成 delegated source intake.
- 禁止手写 `rb_output_declarations.jsonl` rows, work-unit result files, receipts, or trace events.
- 禁止把 search snippets 当作 fetched source evidence.
- 禁止 claim 后跳过 Sub-agent task instructions and submit a fabricated result.
- 禁止保留 `__BACKFILL_WAVE0_EVIDENCE__` after successful submit-backed backfill.
- 禁止把 Wave0 backfill 写成 naked URL/evidence list or unsupported prose; include return-map fields and refs.
- 禁止让 orphan `reference/00-shared-*.md` satisfy gate coverage.
- 禁止修改 `_work_units/_index.json` to repair submit or inspect failures.
- 禁止把 gate console confidence当作 verdict；read gate JSON and trace/check artifacts.
- 禁止在 repeated failure 后静默推进；use gate `inspect`/`advice`, terminal attempt commands, or refill.
