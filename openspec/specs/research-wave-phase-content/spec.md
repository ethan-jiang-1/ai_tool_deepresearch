# Research Wave Phase Content

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014

## Purpose

定义 wave0、wave1、wave2 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，严格贴合当前 accepted CLI / schema / bundle contract。Wave0 产出 foundation shared reference；Wave1 标记 placeholder capability boundary；Wave2 从 verified artifacts 派生 cross-topic synthesis。
## Requirements
### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, submit results by `work_id`, and run the gate after phase drain.

#### Scenario: Wave0 source intake uses work-unit commands

- **WHEN** Wave0 source intake has delegated queue demand
- **THEN** the phase doc SHALL instruct `operate-work-unit claim` and `operate-work-unit submit`

### Requirement: Wave1 phase body completeness with subagent boundary

Wave1 phase body SHALL describe topic deepening delegated work as work-unit kind `wave1_topic_deepening`, with bounded sub-agent execution, lifecycle receipt, submit, and ledger coverage.

#### Scenario: Wave1 deepening uses work-unit kind

- **WHEN** Wave1 deepening is delegated
- **THEN** the phase doc SHALL identify `wave1_topic_deepening` work units

### Requirement: Wave2 phase body completeness

Wave2 phase body SHALL describe pure synthesis as main-agent work and targeted evidence search as optional delegated work-unit kind `wave2_targeted_evidence`.

#### Scenario: Wave2 targeted search uses work-unit loop

- **WHEN** Wave2 identifies a gap requiring delegated evidence search
- **THEN** the phase doc SHALL route that gap into queue demand and work-unit submit

### Requirement: Wave1 foundation placeholder boundary enforcement

Wave1 SHALL forbid fake completion claims while allowing topic-specific deepening only when delegated evidence-producing outputs are covered by submitted work-unit ledger rows and pass the Wave1 gate. The boundary is no longer "do not claim deepening"; it is "do not claim deepening without work-unit-backed evidence, declared references, cache trail handling, and gate pass."

#### Scenario: deepening claim requires submitted work-unit coverage

- **WHEN** a Wave1 artifact claims topic-specific deepening completed
- **AND** the corresponding evidence outputs lack submitted work-unit ledger coverage
- **THEN** `wave1-complete` SHALL fail provenance checks or emit delegated bypass diagnostics

### Requirement: Wave2 synthesis artifact references verified artifacts

`phase-wave2.md` body SHALL 指示 Phase Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 prior-wave 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/<topic>/evidence-summary.md`、`../../artifacts/wave0/<topic>/source.yaml`）。

Synthesis narrative SHALL 至少引用 1 个 wave1 `evidence-summary.md` 或 `question-list.md`，并 SHALL 引用 finding id（W2F-xxx）以保持从 narrative 到 ledger/index 的可追溯性。Synthesis MAY 同时引用 wave0 thin YAML under `artifacts/wave0/{topic}/source.yaml`，但不强制。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 指向 wave1 evidence-summary 或 question-list 时 gate 继续；0 条时 gate SHALL fail

#### Scenario: Synthesis references both wave0 and wave1 artifacts

- **WHEN** Phase Agent writes synthesis.md
- **THEN** synthesis MAY contain links to both `../../artifacts/wave0/<topic>/source.yaml` and `../wave1/<topic>/evidence-summary.md`
- **AND** at least 1 link SHALL point to a wave1 artifact

### Requirement: Anti-cheating rules in wave phase bodies

Wave phase bodies SHALL forbid claims of delegated evidence, search, or reference production unless the claimed outputs are covered by submitted work-unit ledger rows and pass the relevant gate checks. Anti-cheating examples SHALL point to work-unit submit, output declarations, cache trail validation, and gate verdicts as the corrective path.

#### Scenario: delegated evidence claim requires work-unit coverage

- **WHEN** a phase artifact claims delegated evidence production
- **AND** no submitted work-unit ledger row covers the evidence
- **THEN** the phase or gate guidance SHALL treat the claim as invalid

### Requirement: Wave2 rerun full re-synthesis on topic addition

The `phase-wave2.md` Rerun-Aware Behavior section SHALL include a scenario table distinguishing `action: add` (full re-synthesis) and `action: supplement` (delta/append).

`action: add` behavior SHALL align with wave0 (`phase-wave0.md` L266) and wave1 (`phase-wave1.md` L404) `action: add` semantics: full execution, same as first run.

When `action: add`:
- Phase Agent SHALL re-read evidence-summary.md for all topics (including the new topic)
- Phase Agent SHALL rebuild the cross-topic scan matrix covering all topic pairs
- Phase Agent SHALL generate synthesis.md, cross-topic-ledger.md, finding-index.yaml from scratch
- Old synthesis may be preserved as backup (`*.prev-rerun-N.md`) but SHALL NOT serve as baseline

When `action: supplement`, maintain current delta/append behavior (`phase-wave2.md` L351-376 existing text).

The wave2-complete gate SHALL include a rerun add coverage check: when any seed topic declares `action: add`, `synthesis.md` SHALL NOT use `## Delta Synthesis` as the main processing path, and `cross-topic-ledger.md` or `finding-index.yaml` SHALL cover all topic slugs from `rb_plan.md` topic_registry.

For `action:add`, slug-name coverage alone SHALL NOT be sufficient when the added topic can be identified. The gate SHALL also verify that the added topic participates in cross-topic scan coverage with every pre-existing topic, either through explicit topic-pair rows in `cross-topic-ledger.md` or equivalent structured entries in `finding-index.yaml`.

#### Scenario: Wave2 rerun action:add triggers full synthesis

- **WHEN** a seed topic file contains `action: add` (new topic)
- **THEN** Phase Agent SHALL perform full re-synthesis, not append a delta section
- **AND** synthesis.md SHALL NOT contain `## Delta Synthesis (Rerun N)` header
- **AND** gate SHALL fail if scan/index coverage omits any topic slug
- **AND** gate SHALL fail if the added topic has no scan coverage with any pre-existing topic

#### Scenario: Slug-only coverage is insufficient for added topic

- **WHEN** a seed topic file contains `action: add`
- **AND** `finding-index.yaml` lists all topic slugs but no topic-pair or scan evidence involving the added topic
- **THEN** wave2 gate SHALL fail with inspect/advice requesting full cross-topic scan coverage

#### Scenario: Wave2 rerun action:supplement keeps delta mode

- **WHEN** a seed topic file contains `action: supplement`
- **THEN** Phase Agent SHALL retain existing synthesis as baseline
- **AND** new analysis SHALL be appended with `## Delta Synthesis (Rerun N)` header

### Requirement: Rerun action:add SHALL include full cache trail

`phase-wave0.md` 和 `phase-wave1.md` 的 Rerun-Aware Behavior SHALL 明确要求：当 rerun 触发 `action: add`（新增 topic）时，该 topic 的 source intake 流程 SHALL 与首次运行一致——Sub-agent MUST 写入 `_cache/` 目录（含 `websearch.json`/`page.md`/`meta.json`），Phase Agent MUST 在 spawn 前创建 cache 目录，queue task card 的 `action` 字段 MUST 包含 cache 路径指令。

Rerun 场景表的 `action: add` 行 SHALL 新增一行说明：`_cache/ 写入：与首次运行一致——每个 source 在 sNN_<slug>/ 下保存 3 文件`。

#### Scenario: Rerun adds a topic with full cache trail
- **WHEN** HITL2 rerun 触发 `action: add` 新增 topic 06
- **AND** Wave1 deepening Sub-agent 为 topic 06 搜索 3 个 source
- **THEN** `_cache/wave1/primary/06_topic-slug/` 目录 SHALL 含 3 个 source 子目录
- **AND** 每个 source 子目录 SHALL 含 `websearch.json`/`page.md`/`meta.json`

#### Scenario: Rerun action:supplement respects existing cache
- **WHEN** HITL2 rerun 触发 `action: supplement` 补充已有 topic
- **AND** 该 topic 已有 cache 目录
- **THEN** 补充的 source SHALL 追加到已有 cache 目录（不覆盖）
- **AND** 文件名 SHALL 不与已有 source 冲突（继续递增 NN）

### Requirement: Wave phases SHALL teach the work-unit drain loop

Wave0, Wave1, and Wave2 phase Markdown SHALL teach the delegated-work loop as queue demand claim, work-unit execution, submit, ledger append, and gate aggregation. Phase docs SHALL say that multiple work units may be claimed and submitted before the gate runs.

#### Scenario: phase doc explains aggregate gate

- **WHEN** a Phase Agent reads a wave phase doc
- **THEN** it SHALL see that the wave gate runs after queue demand and in-flight work units are drained

### Requirement: Gate failure SHALL refill through work units

Wave phase docs SHALL state that gate failure creates repair/refill queue demand that re-enters the same work-unit loop. Gate failure SHALL NOT introduce another delegated mechanism.

#### Scenario: gate repair returns to claim loop

- **WHEN** a wave gate reports missing delegated coverage
- **THEN** the phase instructions SHALL route repair through queue refill and new work-unit claim

### Requirement: Work-unit role guidance SHALL be Phase-Agent-loaded guidance

Role guidance SHALL be work-unit sub-agent task guidance. Active phase docs SHALL not instruct the Phase Agent to load non-work-unit role protocols as production execution protocol.

#### Scenario: role guidance uses work-unit protocol

- **WHEN** delegated task guidance is loaded
- **THEN** it SHALL describe work-unit task/result/receipt expectations

