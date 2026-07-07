# Research Wave Experiments

> req: RWE-001, RWE-002, RWE-003, RWE-004, RWE-005, RWE-006, RWE-007, RWE-008, RWE-009, RWE-010

## Purpose

定义 workflow-foundation research wave experiments 的 runner-facing acceptance surface。实验必须展示 wave0/1/2 的完整闭环、全链路串联、Wave1 boundary enforcement、repair loop、fault tolerance 和 cross-topic synthesis 的可审查性，同时保持 deterministic verdict 只来自真实 trace JSONL。

**Requirement 与 playbook 映射**：RWE-001~007 各对应一个 playbook 文件（7 个 wave playbook）。RWE-008 和 RWE-009 是横切约束（不产生独立 playbook）：RWE-008 要求所有 Wave1 相关 playbook 在 body 中显式说明 foundation placeholder boundary；RWE-009 要求 wave2 synthesis playbook 的 thin driver 独立验证 cross-artifact reference。seed-topics boundary playbook（test-simple-seed-topics-boundary.md）在 seed-topic-materialization capability 中定义，不属于 RWE capability。
## Requirements
### Requirement: Wave0 happy-path + fail playbook

Wave0 playbooks SHALL verify work-unit source intake happy path and failure cases: missing ledger, missing receipt, invalid result, orphan output, non-work-unit delegated artifact, timeout retry, and gate-failure refill.

#### Scenario: Wave0 happy path drains multiple work units

- **WHEN** Wave0 has three source-intake queue items
- **THEN** the playbook SHALL claim and submit multiple work units before gate pass

### Requirement: Wave1 happy-path + boundary enforcement playbook

Wave1 playbooks SHALL verify topic deepening through work units and SHALL reject placeholder or non-work-unit delegated artifacts as pass evidence.

#### Scenario: Wave1 boundary rejects non-work-unit artifact

- **WHEN** a Wave1 delegated artifact exists without work-unit ledger coverage
- **THEN** the playbook gate SHALL fail

### Requirement: Wave2 happy-path + artifact reference verification playbook

Wave2 playbooks SHALL verify pure synthesis artifact references separately from optional delegated targeted evidence work-unit coverage.

#### Scenario: Wave2 delegated evidence is submitted

- **WHEN** Wave2 targeted evidence search is used
- **THEN** the playbook SHALL submit the delegated result by `work_id`

### Requirement: Full-chain waves sequential playbook

The full-chain playbook SHALL prove work-unit handoff across Wave0, Wave1, and Wave2 where delegated work is used, and SHALL run gates only after phase queue drain.

#### Scenario: full chain gates after drain

- **WHEN** a wave still has in-flight work units
- **THEN** the playbook SHALL not run the wave gate as a pass attempt

### Requirement: Wave repair-loop playbook

The repair-loop playbook SHALL prove gate failure creates repair/refill queue demand and new work-unit attempts with explicit batch reason.

#### Scenario: gate failure opens repair batch

- **WHEN** the gate fails for missing delegated coverage
- **THEN** the repair run SHALL open `b001+` with a repair/refill reason

### Requirement: Wave fault-tolerance playbook

The fault-tolerance playbook SHALL include invalid submit, terminal fail, timeout, abandon, duplicate submit, stale manifest/index mismatch, and late submit rejection.

#### Scenario: late submit after timeout fails

- **WHEN** a timed-out work unit submits after a retry has been claimed
- **THEN** the playbook SHALL verify late submit rejection

### Requirement: Wave review-surface playbook

`experiments_playbook/exp_workflow-foundation/test-complex-wave-review-surface.md` SHALL 提供 light playbook，将 Wave2 synthesis 内容、引用链和 review checklist 暴露为 Markdown 审阅面，供人类判断 synthesis 质量和引用准确度。

该 playbook SHALL：
- Pre-seed 完整的 Wave0 + Wave1 artifacts
- 写入一份 fixed synthesis（内容固定，不依赖 live AI generation）
- 运行 `wave2-complete` gate → pass
- 在 Markdown body 中显式展示 Wave0 reference metadata（url/title/retrieved_date/topic_tag 摊开成表）、synthesis 全文、引用链表格、review checklist
- Human review checklist 至少包含：
  - Wave0 reference 的 url/title 是否真实？
  - synthesis 是否从 Wave0/Wave1 artifacts 中派生？
  - 引用链中的每个 reference 是否准确？
  - placeholder marker 是否清楚区分了 foundation 和 future capability？
- 不要求 live AI generation，保持 light 和 repeatable
- 最终 verdict 只从 trace 来

#### Scenario: Human can review synthesis quality from playbook body

- **WHEN** human runner 打开该 playbook
- **THEN** 可以直接看到 synthesis 全文、引用链、review checklist
- **AND** 不依赖阅读 inline JS 才能理解 synthesis 内容

### Requirement: Wave experiment playbook writes wave{N}_completion before gate (RWE-010, 横切约束)

Heavy wave 实验 playbook（`exp_wfn_wave0/` 下的 case-211/212、`exp_wfn_wave1/` 下的 case-221/222/223、`exp_wfn_wave2/` 下的 case-231/232/233/234，共 9 个）SHALL 在每次运行对应的 `check-gate-wave{0,1,2}-complete.mjs` 之前，通过 `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <B> --event wave{N}_completion` 把 `wave{N}_completion` 事件写入 `rb_trace.jsonl`，履行 `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave{0,1,2}.md` 文档化的 phase-agent 义务。

每个 wave-complete gate 都含 `trace_event_present`（`wave{N}_completion`）规则；不写该事件则即使 artifact 正确，gate 也卡在该规则。该事件由 phase-agent（playbook runner）写入，不由 gate 或 engine 自动产生。

对于 repair-loop / 多次 gate 的 playbook（如 case-212/222/233），`wave{N}_completion` 事件必须在首次 gate 前存在于 trace 即可（写入一次，后续 gate 复用，无需每轮重复写入）。

#### Scenario: wave playbook passes gate after writing completion event

- **WHEN** 一个 wave playbook 写好对应 wave 的合格 artifact 并在 gate 前写入 `wave{N}_completion` trace event
- **THEN** `check-gate-wave{N}-complete.mjs` 的 `trace_event_present` 规则 SHALL 通过
- **AND** 当该 wave 的其它 gate 规则也满足时，gate SHALL `passed: true`

#### Scenario: omitted completion event fails trace_event_present regardless of artifacts

- **WHEN** 一个 wave playbook 的 artifact 全部正确但未在 gate 前写入 `wave{N}_completion` trace event
- **THEN** `check-gate-wave{N}-complete.mjs` SHALL 因 `trace_event_present` 规则 FAIL
- **AND** inspect SHALL 包含 `Trace event "wave{N}_completion" not found in rb_trace.jsonl`
- **AND** 即使其它规则全过，gate 整体 SHALL `passed: false`

#### Scenario: completion event is phase-agent obligation, not gate-emitted

- **WHEN** 讨论该事件由谁写入
- **THEN** SHALL 由 phase-agent（playbook runner）通过 `log-event.mjs --event wave{N}_completion` 写入
- **AND** SHALL NOT 由 gate CLI 或 engine 自动产生（gate 只校验、不自我满足规则）

### Requirement: Wave1 placeholder not mistaken for full subagent research (RWE-008, 横切约束)

**本 requirement 是横切约束，不产生独立 playbook。** 所有 Wave1 相关 playbook 的 Markdown body SHALL 显式说明 foundation placeholder boundary，确保 human reviewer 能区分 foundation skeleton 和 future full subagent research。

#### Scenario: Reviewer can distinguish foundation from full research

- **WHEN** human runner 打开任一 Wave1 playbook
- **THEN** body SHALL 显式列出 foundation 阶段 DO 和 DON'T
- **AND** SHALL 标注 `subagent: true` 在 foundation 只是 future marker

### Requirement: Cross-artifact reference verification in wave2 synthesis (RWE-009, 横切约束)

**本 requirement 是横切约束，不产生独立 playbook。** `test-simple-wave2-synthesis.md` SHALL 展示 synthesis artifact 通过 Markdown links 引用 Wave0 和 Wave1 artifacts 的具体方式。本 requirement 约束该 playbook 的 thin driver SHALL 解析 synthesis 中的 artifact references，验证每个引用目标的存在性，并将结果写入 `_trace.jsonl` 中的 `cross_field_check` event（独立于 gate CLI 的 check）。

#### Scenario: Cross-artifact references are independently verifiable

- **WHEN** playbook driver 解析 synthesis 中的 Markdown links
- **THEN** driver SHALL 在 `_trace.jsonl` 中追加 `cross_field_check` event
- **AND** gate CLI 的 `cross_field` rule 与 driver 的 `cross_field_check` event SHALL 一致（两者都基于同一 bundle 状态）

### Requirement: Wave experiments SHALL prove work-unit-only delegated execution

Controlled wave E2E playbooks SHALL use only `operate-work-unit` for delegated work. They SHALL cover multi-work-unit phase drain, out-of-order submit, timeout retry, gate-failure refill, and no mixed provenance pass.

#### Scenario: no mixed provenance path passes

- **WHEN** a playbook creates one work-unit output and one non-work-unit delegated output
- **THEN** the gate SHALL fail for mixed provenance

