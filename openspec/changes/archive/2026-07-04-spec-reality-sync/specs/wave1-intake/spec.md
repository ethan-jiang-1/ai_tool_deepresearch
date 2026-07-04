# Wave1 Intake (delta)

> req: WAI-001, WAI-002

## MODIFIED Requirements

### Requirement: Wave1 phase uses queue-driven three-stage execution

The wave1 phase node (`phase-wave1.md`) SHALL use the queue-driven three-stage template: §3.1 灌料 (filling — generate one deepening task card per topic from `topic_registry`), §3.2 执行循环 (claim → `drive-relay-slot stage` → spawn → `drive-relay-slot commit` → complete → inline backfill → repeat until queue empty), §3.3 收尾与 gate (verify artifacts → run gate CLI → pass/fail).

#### Scenario: Phase node loads queue on entry

- **WHEN** Phase Agent loads `phase-wave1.md` for the first time in a run
- **THEN** Phase Agent SHALL run `operate-queue check <bundle>` to determine queue health
- **AND** if queue is empty, proceed to §3.1 灌料

#### Scenario: Phase node directs agent to follow three stages

- **WHEN** Phase Agent reads `phase-wave1.md` §3
- **THEN** §3 SHALL contain §3.1 (灌料), §3.2 (执行循环), and §3.3 (收尾与 gate) as distinct sections
- **AND** §3.2 SHALL describe relay collection via `drive-relay-slot commit`, not hand-orchestrated engine functions

### Requirement: Wave1 deepening task card targets sub-agent via targets.delegates

Each wave1 deepening task card SHALL use `targets: { controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }`. The `main-agent` and `sub-agent` strings are current schema wire values: conceptually this is Phase Agent workflow authority with delegated Sub-agent execution. The `producer_rule` SHALL be `topic_deepening`. The `action` SHALL describe: search the topic with keywords derived from `seed_topics/{slug}.md` search_guardrails and open questions, fetch at least 1 credible source, extract evidence, write paired `artifacts/wave1/{topic}/evidence-summary.md` and `artifacts/wave1/{topic}/question-list.md`, and write cache trails under `_cache/wave1/primary/{topic.slug}/sNN_{source-slug}/`. Relay slot lifecycle SHALL be driven by `drive-relay-slot stage/commit` (SNC-003 / SRD-001), not hand-spawn without staging.

#### Scenario: Task card has targets with delegates

- **WHEN** a wave1 deepening task card is created from the §3.1 template
- **THEN** `targets.controller` SHALL be `"main-agent"`
- **AND** `targets.delegates.to` SHALL be `"sub-agent"`
- **AND** `targets.delegates.role_key` SHALL be `"dpt-evidence-extractor"`
- **AND** `targets.delegates.timeout_ms` SHALL be `600000`

#### Scenario: Task card producer_rule is topic_deepening

- **WHEN** a wave1 deepening task card is enqueued
- **THEN** `producer_rule` SHALL be `"topic_deepening"`
- **AND** `priority_class` SHALL be `"P4_progressive_artifact_or_seed_backfill"`
- **AND** `required_receipts` SHALL include `"file:artifacts/wave1/{topic.slug}/evidence-summary.md"` and `"file:artifacts/wave1/{topic.slug}/question-list.md"`

### Requirement: Sub-agent executes deepening search and writes bounded output

When a wave1 deepening task is dispatched via relay, the Sub-agent SHALL receive only its slot's `task.md` and `result.schema.json`. The Sub-agent SHALL use WebSearch and WebFetch, SHALL write intermediate search/fetch products to `_cache/wave1/primary/{topic.slug}/sNN_{source-slug}/` (non-authority cache per `shared-subagent-protocol.md` §2), SHALL write authority artifacts (`artifacts/wave1/{topic}/evidence-summary.md`, `artifacts/wave1/{topic}/question-list.md`, `reference/{topic.slug}-*.md`) as instructed by the slot task, SHALL write `runtime-receipt.jsonl` to its slot directory, and SHALL return strict JSON matching `result.schema.json`.

The Sub-agent SHALL NOT be restricted to writing only within `_subagents/wave_NN/slot_MM/` — relay slot directory holds relay-managed authority files; artifact and cache writes outside the slot dir are governed by the task description and output declaration contract.

#### Scenario: Sub-agent writes cache trails and authority artifacts

- **WHEN** Sub-agent executes a wave1 deepening search via relay
- **THEN** Sub-agent SHALL write cache leaf directories under `_cache/wave1/primary/{topic.slug}/`
- **AND** Sub-agent SHALL produce paired `evidence-summary.md` and `question-list.md` (directly or via Phase Agent post-collect write)
- **AND** Sub-agent SHALL write `runtime-receipt.jsonl` with `agent_runtime_started` + `agent_result_ready` events
- **AND** the Phase Agent's context SHALL NOT contain the Sub-agent's raw search trail

#### Scenario: Phase Agent collects via driver

- **WHEN** Sub-agent returns JSON matching `result.schema.json`
- **THEN** Phase Agent SHALL invoke `drive-relay-slot commit` before `operate-queue complete`

#### Scenario: Sub-agent produces evidence-summary.md

- **WHEN** Sub-agent completes search and extraction
- **THEN** `artifacts/wave1/{topic}/evidence-summary.md` SHALL exist
- **AND** it SHALL contain at least 1 source URL with title
- **AND** it SHALL contain key findings section
- **AND** it SHALL contain open questions section with canonical status labels: each question prefixed with exactly `[开放]`, `[部分解答]`, or `[涌现]` — arbitrary topic-descriptor labels (e.g. `[Bridge gap]`, `[Interpretability reliability]`) are NOT permitted
- **AND** each key finding SHALL use `**机制理解**:` or `**趋势观察**:` as its bold prefix

#### Scenario: Sub-agent produces question-list.md

- **WHEN** Sub-agent completes search and extraction
- **THEN** `artifacts/wave1/{topic}/question-list.md` SHALL exist alongside evidence-summary.md
- **AND** it SHALL contain four sections in order: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, Exploration/Exploitation Decision
- **AND** Topic Investigation Targets SHALL be a table with at least target_id, target_question, origin, status, backing_refs, next_action columns
- **AND** Question Reconciliation SHALL use canonical markers: `[已解决]`, `[部分进展]`, `[仍开放]`, `[需内部数据]`
- **AND** Emergent Question Protocol SHALL record results of all four checks: new_concept, contradiction, missing_information_gap, noise_pattern — each SHALL be stated as `checked; {result}; trigger_refs={path or none}` even when the result is `none`
- **AND** Exploration/Exploitation Decision SHALL record decision (single-pass mode SHALL use `continue`), trigger_refs, unresolved_questions, queue_consequence, and next_action

#### Scenario: Tool degradation chain on WebFetch failure

- **WHEN** the Sub-agent's primary page-fetching tool (e.g. WebFetch) is blocked or fails for a source URL
- **THEN** Sub-agent SHALL attempt `curl -L <url>` as first fallback
- **AND** if curl fails, SHALL attempt `node -e "fetch(...)"` as second fallback
- **AND** if node fetch fails, SHALL attempt `python3 -c "import urllib.request..."` as last resort
- **AND** if all fallbacks fail, SHALL record the failure in evidence-summary.md and proceed with remaining sources
- **AND** SHALL NOT fabricate page content from search snippets
