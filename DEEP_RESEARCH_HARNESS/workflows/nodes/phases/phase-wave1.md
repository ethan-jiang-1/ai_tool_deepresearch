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
  - shared/shared-return-map-authoring
  - shared/shared-reference-template
  - shared/shared-anti-cheating-rules
  - templates/seed-topic-template
suggested_context:
  - phases/subagent-dpt-evidence-extractor
---

# Phase: Wave1 — Topic-Specific Deepening

## 0. Execution Brief

- **Objective**: produce submitted `evidence-summary.md`, `question-list.md`, source backing, Phase-owned topic reference projections, and Phase-owned `depth-review.yaml` for every topic.
- **Start here**: load Wave0 outputs, seed topics, queue state, profile thresholds, and, when present, `rb_plan.md## Constraints > User Research Controls`, then `dpt-evidence-extractor` role guidance.
- **Entry prerequisite**: after `enter-phase` loads this node, run `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to wave0_complete` before Wave1 work or its Gate; this synchronizes the passed source gate and does not prove Wave1 completion.
- **Delegated path**: queue item -> `operate-work-unit claim` -> native Sub-agent -> `operate-work-unit submit` -> submitted ledger row -> gate.
- **Completion check**: side-effect-free `inspect-wave1-output.mjs` passes first, then `check-gate-wave1-complete.mjs` passes for `phases/phase-wave1.md`.
- **Failure posture**: do not direct-search new Wave1 evidence from the Phase Agent. Repair rejected submits, produce a visible `blocked_contract`, or refill with supplementary work units.

## 1. Stage Goal

For each topic:

- Write `artifacts/wave1/{topic}/evidence-summary.md`.
- Write `artifacts/wave1/{topic}/question-list.md`.
- Phase Agent materializes rich reference files at `reference/{topic.slug}-<source-slug>.md` after successful submit.
- Review submitted source/depth evidence into `artifacts/wave1/{topic}/depth-review.yaml`.
- Materialize each affected Seed Topic projection through the loaded packet/writer loop after submitted authority exists.

Wave1 output is real topic-specific deepening, not placeholder skeletons or a Wave0 recap. Wave0 URLs are allowed as context but never count toward the Wave1 new-source floor.

For each delegated topic-deepening task, derive the initial candidate URL/source target from explicit profile/runtime floors plus a conservative small margin. Use `wave1_per_topic_ref_floor`, `topic_unique_ratio`, and the depth-review `new_source_floor` semantics as the floor basis. The margin is only a planning buffer for inaccessible pages, duplicate URLs, Wave0 duplicates, and non-countable sources; it is not a gate threshold, profile field, quality override, or permission to lower coverage.

## 2. Required Inputs

- Current run bundle that passed `wave0-complete`.
- `rb_plan.md` topic registry.
- `rb_profile.yaml` research style params, including `wave1_per_topic_ref_floor`, `topic_unique_ratio`, `counterexample_search`, and `cross_verification`.
- Wave0 reference and seed-topic artifacts.
- `DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs`.
- `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs`.
- `shared-subagent-protocol.md` for work-unit envelope and Sub-agent rules.

When controls are present, use the original read-only `rb_plan.md## Constraints > User Research Controls` coordinate; do not replace it with a copied brief. Controls may guide sources, evidence treatment, analysis and presentation, but cannot weaken submitted-evidence, provenance, source-floor, receipt or Gate contracts. Before claim, the Phase Agent MAY append the same one-sentence beacon-rooted coordinate to an existing `task_brief`; it MUST NOT add queue/manifest/result/receipt fields or ask Engine to parse controls. Without controls, task briefs remain unchanged.

## 3. Allowed Actions

### 3.0 Classify Direct Facts

Before filling demand, classify each current canonical Topic from direct bundle authority, not from rerun history or filesystem appearance. Use the direction resolver: read `## 本轮重跑方向` section, compare `rerun_count` with current `rb_profile.yaml` value. Only `rerun_count` matching profile current value SHALL activate supplement intent:

- `matching`/`future` direction + `action: supplement` → **supplement**: normal supplementary deepening through `wave1_topic_deepening` producer path, informed by `new_search_dimensions`.
- Valid submitted Wave1 deepening, no supplement intent (or `stale`/`legacy_unbound`/`invalid` direction) → **reuse** that submitted historical deepening coverage.
- No submitted Wave1 deepening → **new**: normal deepening pipeline.

This classification is the same for first-run and rerun-added Topics. It creates no rerun Gate exception, mode, controller, submit path, or provenance namespace. Orphan `evidence-summary.md` or `depth-review.yaml` without submitted backing → not coverage.

### 3.1 Fill Queue

If queue is empty or thin, enqueue one delegated deepening queue item for each Topic classified as new or supplement. Do not enqueue duplicate work for a reuse-classified Topic.

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
    "topic_uid": "{topic.topic_uid}",
    "topic_slug": "{topic.slug}",
    "topic_title": "{topic.title}",
    "assignment_mode": "primary",
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
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wave1-deepen-{topic.slug}.json
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs check <bundle>
```

### 3.2 Delegated Drain Loop

Claim and submit delegated work units until queue and delegated in-flight work are drained. Before claiming, reconstruct Wave1 in-flight work from `operate-work-unit inspect <bundle>`, queue delegated-in-flight state, `_work_units/wave1/*` status/result/receipt surfaces, and submitted ledger rows.

Read the `ProfileSchema`-parsed `rb_profile.yaml#/delegated_concurrency_cap` as `effective_delegated_concurrency_cap`. It is the only run-level cap input and is `12` when omitted; do not add a CLI, environment, queue, or host-capacity override.

For a normal delegated top-up, compute:

```text
claim_count = min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)
```

This is the accepted bounded top-up batch-claim posture: conceptual `--count <claim-count>` names the computed `claim_count`, bounded by independent eligible demand, the accepted/default cap (`effective_delegated_concurrency_cap` parsed from the profile), and remaining free delegated in-flight capacity (`remaining_free_capacity`).

Here `eligible_independent_demand` is the queue-front count of independent eligible Wave1 topic-deepening demand, and `remaining_free_capacity` is the effective cap minus reconstructed normal delegated in-flight work. If reconstructed normal delegated in-flight work already reaches the effective cap, poll, submit, repair, or terminalize those attempts before claiming more. Use `--count 1` only for a single remaining item, dependency-blocked front item, effective cap of 1, or a narrow repair.

This bounded prompt count is a Phase-Agent policy choice, not proof that a host started, kept live, or physically ran that number of native sub-agents concurrently. When the Engine admits `phase_agent_fallback`, claim exactly one work unit regardless of the profile cap.

```bash
First inspect the queue-front planned role and perform one bounded real `dpt-evidence-extractor` native probe. Do not claim a batch to test availability or reuse this observation for another role.

node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim <bundle> --phase wave1 --count <claim_count> --actor-outcome <available|unavailable|unknown> --actor-source <native_probe|not_observed> --actor-role-key dpt-evidence-extractor --actor-reason <normalized-reason> --execution-actor <delegated_subagent|phase_agent_fallback>
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect <bundle>
```

Sub-agent execution requirements:

- Use real search and fetch; do not treat snippets as evidence.
- Plan candidate URLs from explicit `rb_profile.yaml#/research_style_params.wave1_per_topic_ref_floor`, `topic_unique_ratio`, and the depth-review new-source floor formula plus a conservative small margin for failed fetches, duplicates, and non-countable pages. Do not use a fixed hard-coded fetch aim unless it is written as `profile/runtime floor + named margin`.
- `question-list.md` must include the four sections: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, Exploration / Exploitation Decision.
- `evidence-summary.md` or the submitted result must cover mechanism, trend/difficulty, and limitation/dispute/failure-mode dimensions.
- `result.json#/output_files[]` must declare `artifacts/wave1/{topic.slug}/evidence-summary.md` with role `evidence_summary` and `artifacts/wave1/{topic.slug}/question-list.md` with role `question_list`. Role `other` is only for extra non-blocking outputs; it does not cover either required artifact.
- `result.json` must expose `source_claims[]` directly or through a declared machine-readable output, plus `accepted_source_urls[]` when available. Each accepted claim names `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs[]`, and optional `degraded_capture_ref`.
- For normal supplementary `wave1_topic_deepening`, read `task.md#/Completion Contract -> Cache And Source Facts`. A claim may use a genuinely current path declared in this candidate `output_files[]`, or one exact listed prior submitted `evidence_summary` path for the same canonical Topic, wave, and kind. Do not redeclare or overwrite that historical evidence file merely to satisfy the supplementary candidate.
- Every new `cache_trail_refs[]` or `degraded_capture_ref` produced by the supplementary attempt must still be declared in this current `result.json#/cache_trails`; prior output eligibility does not authorize prior cache reuse or filesystem-only cache.
- Receipt events must bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- Output files and cache trails must appear in the submitted result. Canonical topic reference Markdown is not required as delegated output unless a future accepted task explicitly assigns it.

Actively poll result/receipt/output/cache readiness without waiting for user continuation or task notification. Rejected submit does not finish the attempt. Repair the same claimed `work_id` when possible. For every expired or stale claimed attempt, run:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout-preflight <bundle> --work-id <work_id> [--result <result.json>]
```

Parse structured stdout even when timeout preflight exits non-zero. Follow all advice branches: `submit` uses formal submit; `repair` keeps the same claimed `work_id`; `wait` continues active polling; `inspect` repairs candidate/Engine authority; `block` assigns the blocker to its named owner and leaves the phase undrained without initiating a user wait; only `timeout` permits normal terminal timeout. `fail` and `abandon` remain explicit non-timeout closures. `timeout --force --reason <reason>` is exceptional and audited, never the normal drain action for progress-positive or invalid-binding attempts.

Do not run depth review, supplementary-demand convergence, Phase-owned reference materialization, or the Wave1 gate as though the attempt were drained while preflight recommends `submit`, `repair`, `wait`, `inspect`, or `block`. After accepted submit, preserve the existing depth-review and reference-materialization boundaries; when depth remains insufficient, enqueue supplementary `wave1_topic_deepening` demand instead of bypassing the work-unit path.

### 3.2.1 Returned Work Decision

When a returned candidate has its result, receipt, declared outputs, and cache trails ready, run the existing dry-submit before formal submit:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs dry-submit <bundle> --work-id <work_id> --result <result.json>
```

Consume the returned Engine disposition without inventing another repair route:

- `repair_same_candidate`: repair only the authorized mechanical candidate coordinate on the same `work_id`, then rerun this dry-submit.
- `return_to_actor`: return actor-owned semantic work before `work_done`; do not make the Phase Agent fabricate it.
- `fail_and_replace`: after `work_done`, use the terminal replacement procedure in §3.2.4; do not auto-retry or reuse the failed identity.
- `inspect_contract`: keep contract-integrity or missing-contract facts at the named Engine owner, terminal, or no-path boundary.
- `submit`: run formal submit only after dry-submit predicts acceptance:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs submit <bundle> --work-id <work_id> --result <result.json>
```

For a rejected supplied observation, read `actor_observation_feedback` at the claim result: it names the planned `dpt-evidence-extractor` role, one primary conflict, the closed legal tuples, and the same claim rerun. The generated `Completion Contract` carries the same actor/candidate vocabulary and does not add a task-only actor proof or cache mapping.

At every inspect, dry-submit, timeout-preflight, formal-submit, or Gate root, preserve the emitted rerun and read the exact attempt disposition. The claimed `actor_execution` plus `work_id` and `receipt_nonce` owns candidate authorship: for `delegated_subagent`, the Phase Agent may submit the returned candidate but must not author substitute content under that binding; only `phase_agent_fallback` may author its exact fallback attempt. This is logical guidance, not physical actor authentication or host/sub-agent liveness proof.

For structured `busy`, read caller work/operation separately from holder transaction/work/queue coordinates, wait, and rerun the exact caller checkpoint. For `suspect_transaction`, run `operate-work-unit recover-transaction <bundle> --tx-id <id>` only when `repair_kind` names the exact unlocked journal; otherwise preserve `missing_contract`. Exact `recover-declaration` takes precedence over `supersede`. Run `operate-work-unit supersede <bundle> --work-id <submitted_id> --reason <audit-reason>` only when selected, then use the returned `successor_queue_item_id` and ordinary location for current role observation, normal claim/poll/submit, and the same inspect/Gate rerun. Do not reactivate the predecessor or manually edit ledger/index/status/queue/lock/journal/hash authority.

Immediately after a successful formal submit, complete this visible Phase checklist before treating the returned topic as closed:

1. Complete or repair the valid current depth review in §3.2.3 for that submitted work unit.
2. Run the current Topic's reference-convergence inspect and read its primary root.
3. When that root names materialization, consume the exact target returned by that inspect, then persist the matching projection in §3.2.2.
4. Complete the existing index/Seed sync in §3.3 from the same submitted authority, then rerun that same inspect.
5. After the full queue drain and all returned-topic checklists, run the full-drain Wave inspect in §5.

The Sub-agent does not write reference/index materialization, depth review, or seed return-map backfill. Do not hand-write result semantics, cache declarations, receipts, ledger rows, trace, or provenance to bypass an Engine disposition.

### 3.2.2 Topic Reference Materialization

After each successful Wave1 submit, the Phase Agent materializes `reference/{topic.slug}-<source-slug>.md` for every accepted submitted source suitable for consumer navigation, then updates `reference/_INDEX.md`.

**Exact inspect target (REF-011)**: `<source-slug>` is not an Agent-chosen label. When Wave1 inspect reports `materialize_projection`, it emits the exact canonical target path and submitted backing for each candidate. Consume those returned coordinates rather than deriving a filename by hand. Only that returned path can close the candidate; a plausible alternate filename remains a `misnamed_current` repair input, not a second locator.

Write each complete projection to a retained staging file, commit it with `operate-artifact-persistence.mjs persist` using compare-and-swap, consume `committed|blocked`, and update `_INDEX.md` only after commit. Persistence is durability only; submitted `source_claims[]`, `accepted_source_urls[]`, cache trails, and work-unit rows remain the authority.

Each Phase-owned reference must:

- follow the loaded `shared-reference-template`: one opening YAML-frontmatter metadata mapping, eight common metadata fields plus one resolvable topic binding, five required non-empty semantic sections, and concrete source URLs. Legacy bullet metadata is read-compatible only. Heading case, level, spacing, section order, and list presentation are tolerant;
- use `source_url` from submitted `source_claims[]`, `accepted_source_urls[]`, verified cache trails, or explicit degraded-capture records;
- include body refs/links to submitted backing such as `artifacts/wave1/{topic}/evidence-summary.md`, `artifacts/wave1/{topic}/question-list.md`, `_cache/wave1/...`, and `_work_units/wave1/{work_id}/`;
- never introduce an accepted source URL absent from submitted backing. If a needed source is absent, enqueue supplementary `wave1_topic_deepening` instead of direct-searching or inventing a reference.

Diagnostics should be able to scan the phrase submitted source_claims[] and accepted_source_urls[] in this materialization path.

If no submitted source is materializable, record an explicit limitation or repair diagnostic in Wave1 artifacts before gate.

### 3.2.3 Depth Review

After each successful Wave1 submit, the Phase Agent writes or updates `artifacts/wave1/{topic}/depth-review.yaml`. This review is Phase-owned process evidence; it does not create delegated coverage. `reviewed_work_unit_refs[]` uses canonical `_work_units/wave1/<work_id>` refs without a trailing slash and every ref must resolve to a submitted work-unit row.

Do not copy or retype submitted `source_claims[]`, `accepted_source_urls[]`, cache/degraded refs, Wave0 URL lists, or `new_source_floor` counts into the review as blocking truth. The Engine derives those deterministic facts directly from the hash-valid rows named by `reviewed_work_unit_refs[]`, the Wave0 `source.yaml` authority, and explicit profile parameters. Legacy copied fields may remain for explanation, but they cannot override the derived result or create coverage.

Novelty is therefore an Engine-owned exact comparison: accepted claim URLs from the reviewed submitted rows minus current Wave0 source URLs. Cache mapping is valid only when the same reviewed rows declare the claim and cache/degraded trail and the referenced cache leaf remains valid. Filesystem-only cache, prose links, and review-only claims do not create source coverage.

When accepted current focus context calls for additional work, derive the smallest readable set of current commitments and add the optional `focus_coverage` block to this same review. Bind it to the current canonical Topic UID and current profile rerun count. A covered commitment names one or more current reviewed submitted Wave1 work-unit refs. A limited commitment names one visible limitation and exactly one existing `external_action`, `user_decision`, or `missing_contract` boundary; omit submitted refs for that commitment. Do not infer focus from filenames, HITL rationale, prior rounds, source counts, or the profile.

After legally writing or updating a valid current `focus_coverage` block, run `node DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs --bundle <path>` before rerunning the same Wave1 inspect. This refreshes only the derived `_INDEX.md` and `reference/README.md` navigation projection from direct facts. If synchronization is blocked, rerun that same command against current bytes; do not hand-edit README, `_INDEX.md`, focus coverage, a Gate result, or a reference file to make the map appear current. This does not make focus coverage a reference-file label, evidence authority, Gate route, or new closeout transition.

For a repairable focus commitment, use only the existing `wave1_topic_deepening` queue, claim, dry-submit, submit, depth-review update, and Wave1 inspect loop. Record a limitation only after the same inspect exposes an external, user-decision, or missing-contract boundary with no authorized Wave1 repair. A valid `partial` or `blocked` declaration remains an existing Gate limitation, never a clean pass, new queue kind, direct-search path, auto-rerun, status, trace event, or direct HITL2 route.

Minimum shape:

```yaml
version: "0.1"
topic_slug: "{topic.slug}"
reviewed_work_unit_refs:
  - "_work_units/wave1/<work_id>"
depth_dimensions:
  mechanism: { status: "covered", refs: [] }
  trend_or_difficulty: { status: "covered", refs: [] }
  limitation_or_dispute: { status: "covered", refs: [] }
profile_checks:
  counterexample_search: { required: false, status: "not_required", refs: [] }
  cross_verification: { required: false, status: "not_required", refs: [] }
decision: "accept"
supplementary_queue_item_ids: []
carried_targets: []
```

Optional current focus declaration:

```yaml
focus_coverage:
  topic_uid: "{topic.topic_uid}"
  rerun_count: 0
  outcome: partial
  commitments:
    - id: "focus-1"
      statement: "Bounded current focus commitment."
      state: covered
      submitted_work_unit_refs: ["_work_units/wave1/<work_id>"]
    - id: "focus-2"
      statement: "Bounded current limitation."
      state: limited
      limitation: "Visible reason no current backing can be established."
      boundary_kind: external_action
```

`carried_targets` is the bounded semantic handoff to Wave2. It is always explicit, may be `[]`, and each selected entry is exactly `{ target_id, target_text }`. Select only material questions that remain worth carrying after the existing depth review passes; do not turn every question-list line, prose mention, or slug-looking string into a target. This declaration does not relax `decision: accept`, submitted-evidence, source-floor, cache, depth-dimension, or profile requirements.

The Engine computes `new_source_floor.required` only from explicit profile/runtime parameters: `ceil(wave1_per_topic_ref_floor * topic_unique_ratio)`, minimum 1 when both parameters exist, and computes `observed` from the reviewed rows. If either parameter is missing, record `decision: blocked_contract` with a `missing_profile_parameter` reason and do not invent a hidden default. Decision values are closed:

- `accept`: source novelty, submitted cache mapping, depth dimensions, and profile checks are satisfied.
- `supplement_required`: output is shallow, missing new sources, missing cache mapping, missing depth dimensions, or unmet profile checks.
- `blocked_contract`: bounded supplementary attempts are exhausted, required profile/runtime parameters are missing, or deterministic coverage cannot be established.

### 3.3 Seed Projection Update

After each successful submit, never edit a seed, heading, card, or token. `templates/seed-topic-template` gives the Wave1 slot/card and rendered-entry shape. For each affected current canonical topic, read the current eligible submitted Wave1 row and use the complete packet, authorization and repair protocol in `command_playbook/operate-topic-state.md` to retain one atomic `wave_projection/apply_seed_projection` packet containing all three owned slots: `wave1_mechanisms`, `wave1_trends`, and `pending_questions`. Every entry uses `<work_id>/<positive ordinal>` plus the five return-map fields. Evidence-bearing entries lead with a concrete existing `reference/{topic.slug}-<source-slug>.md`; evidence summaries, question lists, submitted source claims, `accepted_source_urls[]`, `_cache/`, and `_work_units/` are secondary provenance.

Use an identity-bound `defers` / `deferred` entry with `refs: [none]` and an explicit `next_hop` limitation when no consumer reference can be materialized. Do not use globs or count summaries. The existing writer makes the three-slot update all-or-nothing and preserves later Wave2 W2F entries; a missing writer/authority path is its direct owner boundary, never a manual backfill route.

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

After formal Wave1 submit, first complete or repair the valid current depth review, then run the same Wave1 reference-convergence inspect. When it names submitted backing materialization, use every returned `write_to` canonical target and its listed `source_url`, `work_ids`, `work_unit_refs`, `source_refs`, and `cache_trail_refs` as the only candidate coordinates; persist the matching projection through the existing path, then run `node DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs --bundle <path>`, refresh affected Seed Topic references through the existing packet writer, and rerun that same inspect. Do not raw-edit a seed or `_INDEX.md`, choose a legacy filename, or direct-search to repair a projection. A separately returned legacy/index/ledger/queue/receipt/provenance/format hint remains its own root; do not suppress it, hand-edit its authority, or treat materialization as its repair. If and only if convergence reports a true floor deficit after materialization and index sync, enqueue the existing supplementary `wave1_topic_deepening` card with a fresh globally unused `queue_item_id`, explicit canonical `payload.topic_uid` / `payload.topic_slug`, `payload.assignment_mode: supplementary`, `payload.reference_floor_deficit` equal to the returned positive deficit, and `required_receipts: []`; reuse a named live supplementary demand rather than duplicate it. A primary card uses `payload.assignment_mode: primary` plus the exact evidence-summary.md/question-list.md file receipt pair. Assignment intent is never inferred from an ID suffix, prose, `writes_to`, or receipt emptiness.

The supplementary item follows the same claim/task/dry-submit/formal-submit loop. Use only exact prior paths listed in the claimed task's `Completion Contract -> Cache And Source Facts`; if none is listed, produce a genuinely current assigned output rather than guessing from a filename. Repair `/source_claims/<index>/source_ref` on the same candidate when dry-submit rejects lineage, and never copy an old evidence file into `output_files[]` or overwrite it solely to make validation pass.

For an expired or stale claimed attempt, `timeout-preflight` returns one closed `recommended_action` plus `recommendation_basis`. Read its `candidate`, `progress`, `lease`, or `integrity` direct facts before choosing the existing submit, same-candidate repair, polling, inspection, owner, or timeout path; the basis is explanatory only and never changes candidate validity, lease, or terminal authority.

For a mode-absent unclaimed Wave1 card, run `operate-queue.mjs repair <bundle> --queue-item-id <id> --set-assignment-mode <primary|supplementary>`; do not infer its mode.

### 3.2.4 Terminal Replacement

After `work_done`, a semantic `fail_and_replace` first uses `operate-work-unit fail <bundle> --work-id <work_id> --reason semantic_contract:<primary_root_code>`, then invokes:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs replace <bundle> --work-id <terminal_work_id>
```

Read the replacement JSON rather than rebuilding a task card. For a newly created or queued successor, perform the exact-role native probe and the ordinary `claim` for the returned wave. For an already in-flight idempotent successor, reconstruct and actively poll its disclosed existing `work_id`; do not claim a second attempt. Do not alter the parent terminal status, weaken primary into supplementary, auto-retry, inspect `_work_units` to discover a successor, or enqueue an allegedly equivalent card.

## 4. Expected Artifacts

- `artifacts/wave1/{topic}/evidence-summary.md`.
- `artifacts/wave1/{topic}/question-list.md`.
- `artifacts/wave1/{topic}/depth-review.yaml`.
- Phase-owned `reference/{topic}-*.md` with complete metadata, source content capture, `_INDEX.md` rows, and body refs to submitted backing.
- Submitted work-unit ledger rows covering delegated outputs and cache trails.
- Submitted structured source claims where every accepted source URL maps to a verified cache trail or explicit degraded-capture record.
- Seed-topic Wave1 backfill entries that preserve mechanism/trend/question meaning and refs to concrete existing `reference/{topic.slug}-<source-slug>.md` files as primary consumer navigation, with evidence summaries, question lists, cache leaves, and work-unit surfaces as secondary provenance.
- `rb_trace.jsonl` records the `wave1_completion` event/check surface required by the Wave1 gate definition.
- A passing routed Wave1 Gate records the Engine-normalized carried-target receipt; Agents never hand-edit this receipt or trace event.

## 5. Gate Command

After `rb_queue.json#/active_window`, `#/refill_pool`, and `#/delegated_in_flight` are all empty and Phase-owned references/depth reviews plus Wave1 projection packets have been materialized from submitted backing, run the Wave1 inspect before recording completion evidence or invoking the formal gate. Do not infer away future-looking residual demand. If `phase_queue_drained` fails, the Agent follows its returned queue/work-unit owner and reruns this same checkpoint; a refill-only `missing_contract` does not authorize queue hand edits.

```bash
node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle <path>
```

This inspect is side-effect-free and non-routing. If it fails, repair the smallest named bundle-relative surface and rerun this same command; do not build a second local validator or bypass submitted authority.

Only after inspect passes, record or refresh the existing `wave1_completion` evidence through the normal phase logging path, then run the formal gate:

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md
```

## 6. On Gate Pass

Read the gate CLI JSON output and confirm `check.passed === true`. Read `check.degraded` first: when it is `true`, retain the declared `check.degraded_rules` as carried quality debt rather than treating this as a clean quality pass. Then consume the existing `check.next` before synchronizing the just-passed source gate:

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to wave1_complete
```

Continue from the Markdown rendered by `enter-phase`. `advance-status` only records that Wave1 passed; it is not the next-phase loader.

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。不得从 legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段或命令。`repair_kind` 只分配责任，当前 loaded node 的 `stop` 才决定 interaction placement；本 phase 为 `stop: no`，任何分类都不得主动发起提问、状态/进度、approval、acknowledgement 或等待。用户主动的 current turn 可从 direct facts 得到直接回答，但回答不创建 checkpoint、state、permission、route、mutation 或 reentry authority。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：当 `write_to` 是已授权的 Wave1 mutable surface 时，由 Agent 修复 exact reference/depth/artifact field/file；不得复制 ledger/cache truth制造第二 authority。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal queue/work-unit/declaration/lifecycle operation；不得要求用户运行普通命令，也不得直接编辑 status、trace、ledger、index、receipt、hash 或 provenance authority。
3. `repair_kind: user_decision`：识别 `missing_fact` 指出的真实语义/风险决定。Wave1 是 `stop: no`，不得由 hint 创造新 HITL、repair controller 或 lifecycle；没有 accepted decision path 时保持当前 checkpoint failed。
4. `repair_kind: external_action`：识别不可代理的 actor/search/fetch/permission 前置条件；不主动请求 acknowledgement，满足后机械执行回到 Agent。
5. `repair_kind: missing_contract`：保留 exact unavailable capability/contract boundary，不提供手写 authority、用户等待、隐式 floor 或平行成功路径。

Hint 不创造 permission、controller 或 lifecycle。完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 Wave1 checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。

仅当 structured hint 的 `missing_fact` / `write_to` 明确识别 reference projection/index、`depth_review_contract`、`source_novelty_floor`、`source_claim_cache_mapping` 或缺失 submitted backing 时：

1. If submitted source backing exists and the hint authorizes the Phase-owned projection, repair the exact `reference/{topic}-*.md`, `_INDEX.md`, or non-derivable `depth-review.yaml` coordinate.
2. If submitted backing is absent and the hint names the legal supplementary path, enqueue `wave1_topic_deepening`, require genuinely new source backing, and drain through work-unit claim/submit.
3. If profile/runtime authority is missing, follow only the hint's legal owner operation or `missing_contract`; never invent a local default.
4. Materialize only from submitted backing, then run the hint's exact `rerun`.

Every newly materialized Wave1 reference writes only the submitted current
Topic's exact `related_topic_uid`. It does not select `related_topic`, even
when a historical reference still uses that reader-compatible field.

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
- 禁止以 token replacement、raw Markdown patch、heading/path/line number 或手改 seed 完成 Wave1 projection。
- 禁止把 Wave1 projection 写成裸 evidence list、unsupported prose、count summary 或 generic `Wave1 submitted`; retain its atomic identity-bound packet.
- 禁止把 Agent numeric claims about ref counts used as gate evidence.
- 禁止修改 `_work_units/_index.json` or queue state by hand to repair submit rejection.
- 禁止跳过 gate JSON `inspect`/`advice` when a rule fails.
- 禁止把 fixture-backed experiment behavior described as real Wave1 Agent research quality.
