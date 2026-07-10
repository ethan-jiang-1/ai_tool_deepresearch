# Research Wave Experiments

> req: RWE-001, RWE-002, RWE-003, RWE-004, RWE-005, RWE-006, RWE-007, RWE-008, RWE-009, RWE-010, RWE-011, RWE-012

> delta-synced: add-audited-late-accept-for-timed-out-work-units (RWE-012)

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

Wave1 playbooks SHALL verify topic deepening through work units and SHALL reject placeholder, shallow, cache-thin, or non-work-unit delegated artifacts as pass evidence.

Wave1 controlled E2E SHALL include a negative case where structurally present `evidence-summary.md` and `question-list.md` are insufficient because they reuse Wave0 URLs, omit required depth dimensions, or declare structured accepted source claims without matching submitted cache trails. The repair path SHALL be supplementary `wave1_topic_deepening` work-unit demand, not force-advance.

#### Scenario: Wave1 boundary rejects non-work-unit artifact

- **WHEN** a Wave1 delegated artifact exists without work-unit ledger coverage
- **THEN** the playbook gate SHALL fail

#### Scenario: Wave1 playbook rejects shallow topic deepening

- **WHEN** a Wave1 fixture-backed topic output mostly summarizes Wave0 and lacks enough new source URLs
- **THEN** the playbook SHALL observe a failed depth-review or gate verdict
- **AND** the playbook SHALL show supplementary work-unit refill as the repair path

#### Scenario: Wave1 playbook rejects cache-thin source claims

- **WHEN** Wave1 submitted `source_claims[]` / `accepted_source_urls[]` declare multiple accepted source URLs
- **AND** submitted cache trails cover only a subset of those URLs
- **THEN** the playbook SHALL observe cache/source mapping failure before Wave1 pass

### Requirement: Wave2 happy-path + artifact reference verification playbook

Wave2 playbooks SHALL verify pure synthesis artifact references separately from optional delegated targeted evidence work-unit coverage.

Wave2 controlled E2E SHALL include negative coverage for skipped synthesis work: `synthesis.md` exists, but scan matrix, confidence triage, gap analysis, or pure-synthesis eligibility is missing. It SHALL also include targeted evidence coverage where uncertain findings create `wave2_targeted_evidence` demand and pass only after submitted work-unit coverage.

#### Scenario: Wave2 delegated evidence is submitted

- **WHEN** Wave2 targeted evidence search is used
- **THEN** the playbook SHALL submit the delegated result by `work_id`

#### Scenario: Wave2 synthesis without scan matrix fails

- **WHEN** a Wave2 playbook writes synthesis prose without scan matrix and finding-index triage coverage
- **THEN** the playbook SHALL observe a failed Wave2 gate or preflight verdict
- **AND** the diagnostic SHALL direct the Agent to complete scan/triage/gap analysis

#### Scenario: Wave2 uncertain finding triggers targeted work unit

- **WHEN** the finding index marks a finding with `priority: p0` or `priority: p1` as search-required
- **THEN** the playbook SHALL enqueue and submit `wave2_targeted_evidence`
- **AND** Wave2 SHALL pass only after the finding is resolved through submitted evidence or explicitly routed to deferral/internal-data/record-only handling

### Requirement: Full-chain waves sequential playbook

The full-chain playbook SHALL prove work-unit handoff across Wave0, Wave1, and Wave2 where delegated work is used, and SHALL run gates only after phase queue drain.

For report-quality readiness, the full-chain happy path SHALL reach HITL2 with non-shallow Wave1/Wave2 artifacts: Wave1 topics have accepted depth reviews and cache-backed new source claims; Wave2 has scan matrix, confidence triage, gap analysis, and legal pure-synthesis or submitted targeted-search coverage.

#### Scenario: full chain gates after drain

- **WHEN** a wave still has in-flight work units
- **THEN** the playbook SHALL not run the wave gate as a pass attempt

#### Scenario: full chain reaches HITL2 with non-shallow depth artifacts

- **WHEN** the full-chain playbook runs a report-quality happy path
- **THEN** it SHALL reach HITL2 only after Wave1 depth reviews pass and Wave2 scan/triage/gap-analysis coverage is present
- **AND** the verdict SHALL come from real trace/gate outputs, not console summaries or fixture claims alone

### Requirement: Wave repair-loop playbook

The repair-loop playbook SHALL prove gate failure creates repair/refill queue demand and new work-unit attempts with explicit batch reason.

#### Scenario: gate failure opens repair batch

- **WHEN** the gate fails for missing delegated coverage
- **THEN** the repair run SHALL open `b001+` with a repair/refill reason

### Requirement: Wave fault-tolerance playbook SHALL cover work-unit timeout and submit boundaries

The controlled wave fault-tolerance coverage SHALL distinguish normal submit from explicit audited late-submit:

- normal submit after timeout still rejects;
- explicit late-submit may accept an eligible targeted timed-out work unit;
- submitted replacement blocks late-submit;
- queued or claimed retry state can be cleaned up by accepted late-submit;
- failed and abandoned attempts still reject late-submit.

The playbook MAY use fixture-backed result, receipt, output, or cache surfaces to exercise Engine-layer behavior, but verdicts SHALL come from CLI JSON, bundle authority files, gate output, and trace/check entries.

#### Scenario: explicit late-submit is covered

- **WHEN** a controlled case has a targeted timed-out work unit with valid targeted result surfaces
- **THEN** the playbook SHALL verify explicit `operate-work-unit late-submit` success
- **AND** SHALL verify gate coverage comes from the audited submitted ledger row

#### Scenario: replacement submitted still rejects

- **WHEN** a replacement for the same `queue_item_id` already submitted
- **THEN** explicit late-submit for the targeted work unit SHALL reject
- **AND** the playbook SHALL verify no double ledger coverage exists

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

### Requirement: Wave experiments SHALL cover timeout preflight and progress lease behavior

Controlled wave fault-tolerance or progress-lease playbook coverage SHALL prove the timeout-preflight behavior that protects delegated work units from premature wall-clock terminalization. The coverage SHALL use real disposable bundle state and production work-unit CLI/API boundaries after fixture setup. Disposable bundles SHALL be created through approved shared experiment infrastructure, then validated/inspected before mechanism execution when the playbook claims production-path evidence.

The playbook MAY use fixture-backed result, receipt, output, or cache surfaces to exercise Engine-layer timeout decisions, but such fixtures SHALL be explicitly labeled as fixture facts or Engine-layer evidence. The playbook SHALL not hand-edit submitted ledger rows, fake runtime receipts as real Sub-agent output, claim fixture-backed checks prove real search/fetch quality, or bypass `operate-work-unit` boundaries for facts that production reaches through the work-unit CLI/API.

The experiment coverage SHALL include at least these cases:

- no-progress claimed attempt whose effective idle lease has expired is timeout-eligible and can enter the existing timeout retry path;
- progress-positive claimed attempt is not timeout-eligible and default timeout refuses terminalization without creating retry demand through production work-unit CLI/API boundaries;
- candidate result that dry-submit would pass is routed to formal submit advice;
- candidate result that dry-submit rejects with repair diagnostics is routed to same-`work_id` repair advice;
- candidate result with wrong identity, terminal status, invalid binding, or ambiguous authority is routed to inspect/block rather than same-`work_id` repair;
- optional `timeout-preflight --result <candidate>` follows dry-submit candidate path semantics and external-candidate mtime non-extension;
- explicit forced timeout records force diagnostics, including structured `progress_sources[]`;
- normal submit after terminal timeout remains rejected, preserving the existing late-submit fail-closed contract until a later audited late-accept change explicitly modifies it.

Verdicts SHALL come from trace, CLI JSON output, and bundle authority files rather than console-only summaries. Critical runtime assertions SHALL be recorded as trace `check` events or equivalent accepted verdict entries so a runner can audit pass/fail from the disposable bundle. Any fixture distance SHALL be recorded in the playbook's reality-distance ledger or result interpretation. PASS cleanup and FAIL preserve-for-diagnosis behavior SHALL follow the command-experiments guideline.

#### Scenario: no-progress timeout retry remains valid

- **WHEN** a controlled wave case creates a claimed work unit with no result, no progress receipt, no output/cache progress, and an expired effective idle lease
- **THEN** timeout-preflight SHALL report timeout eligibility
- **AND** default timeout SHALL requeue retry through the existing REDO path

#### Scenario: progress-positive timeout is refused

- **WHEN** a controlled wave case creates a claimed work unit with recent Engine-observed progress
- **THEN** timeout-preflight SHALL report `timeout_eligible: false`
- **AND** default timeout through production work-unit CLI/API boundaries SHALL leave queue/index/status/ledger/retry surfaces unchanged

#### Scenario: submit-ready candidate routes to submit

- **WHEN** a controlled wave case creates a candidate result that dry-submit would accept
- **THEN** timeout-preflight SHALL recommend formal submit
- **AND** the case SHALL verify that timeout is not the recommended terminal path

#### Scenario: caller-provided candidate path follows dry-submit semantics

- **WHEN** a controlled wave case supplies `timeout-preflight --result <candidate-result>`
- **AND** the candidate path would be valid or invalid under dry-submit candidate path rules
- **THEN** timeout-preflight SHALL classify the candidate consistently with dry-submit
- **AND** the case SHALL verify the recommendation through CLI JSON and runtime assertions
- **AND** an external candidate file mtime alone SHALL NOT extend the work-unit idle lease

#### Scenario: repairable candidate routes to repair

- **WHEN** a controlled wave case creates a candidate result that dry-submit rejects with repair diagnostics
- **THEN** timeout-preflight SHALL recommend repair of the same `work_id`
- **AND** the attempt SHALL remain claimed

#### Scenario: invalid candidate authority routes to inspect or block

- **WHEN** a controlled wave case creates a candidate result with wrong `work_id`, terminal attempt status, invalid queue binding, or ambiguous authority
- **THEN** timeout-preflight SHALL recommend `inspect` or `block`
- **AND** the case SHALL verify that the candidate is not treated as same-`work_id` repair
- **AND** default timeout SHALL not terminalize the attempt

#### Scenario: forced timeout records audit evidence

- **WHEN** a controlled wave case uses `operate-work-unit timeout --force` on a progress-positive attempt
- **THEN** the resulting trace/log or equivalent diagnostic surface SHALL record forced timeout evidence, including structured `progress_sources[]`
- **AND** the playbook SHALL assert that the terminal attempt remains fail-closed and non-covering

#### Scenario: late submit remains fail closed

- **WHEN** a work unit has already been terminalized as `timed_out`
- **THEN** ordinary `operate-work-unit submit` SHALL still reject that terminal attempt
- **AND** the playbook SHALL not describe audited late accept as available in this change

