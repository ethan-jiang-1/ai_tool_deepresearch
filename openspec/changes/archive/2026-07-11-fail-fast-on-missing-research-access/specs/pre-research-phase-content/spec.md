> req: PRP-002, PRP-005

## MODIFIED Requirements

### Requirement: Phase HITL1 body completeness and stop semantics

`phase-hitl1.md` SHALL contain the complete 9-section body, retain `stop: yes`, and declare `execution_contract.search_policy: capability_probe_only`.

Section 内容要求：
- **Stage Goal**: 收集用户对 pre-research 的明确输入，确认当前 Agent research access，并写入 `rb_profile.yaml`
- **Required Inputs**: 已实例化 bundle、`shared-profile.md`
- **Allowed Actions**:
  - 读取用户原始 research question / brief
  - 判断用户输入详细程度：一句话还是详细 brief？
  - **一句话场景 → topic rewrite**：Agent 将模糊输入展开为 structured original topic（背景、范围、关键维度、已知前提、不确定项），写入 `rb_plan.md` 正文
  - 从 original topic 推导初始 seed topics → 写入 `rb_plan.md` frontmatter 的 `topic_registry`
  - 将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户审查
  - 向用户展示结构化 HITL1 问题面
  - 基于用户回答选择 `research_profile` enum
  - 写入 `root_must_answer_set`
  - 写入 `human_decision_checkpoints.hitl1.status`
  - 写入 `human_decision_checkpoints.hitl1.recorded_at`
  - 运行 `apply-research-style.mjs`
  - 使用当前 Agent 的实际 search surface 执行至多一次 neutral capability-only search，并对第一个 usable HTTP(S) result 使用实际 fetch surface 执行至多一次 fetch
  - 将直接 observation 写入 `rb_profile.yaml#/research_access`
- **Expected Artifacts**: `rb_profile.yaml` 中用户选择、style params 与 research-access observation 已写入
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`；若 access 不可用，保留用户 choices，修复/切换环境后重跑同一 probe 和同一 gate
- **Stop Behavior**: `stop: yes`，Agent MUST 等待用户输入；access unavailable 时仍停留 HITL1
- **Anti-Cheating Rules**: 禁止把回答留在 chat memory；禁止伪造用户答案；禁止跳过 HITL1；禁止用 mock/fixed URL 声称 available；禁止把 probe 当 research evidence

Probe SHALL be bounded to at most one search invocation and at most one fetch invocation. It SHALL answer only whether the first usable HTTP(S) result from a neutral capability-only search can be fetched as page content. Search unavailable/failed/blocked/no usable result, or a missing fetch surface before fetch invocation, SHALL record `unavailable` with `fetch_outcome: not_attempted`; an attempted fetch that is blocked or fails SHALL record the corresponding non-success outcome; only real fetched page content SHALL permit `available`.

Probe URL/content SHALL NOT be cited, cached as research evidence, declared in output ledgers, written to work-unit outputs, or counted toward any wave gate. HITL1 SHALL NOT create offline research artifacts, evidence-free report skeletons, fake probe receipts, automatic retry trees, or a new interactive checkpoint.

HITL1 body SHALL show the question dimensions but MUST write to the current accepted profile surface rather than a parallel status tree.

#### Scenario: HITL1 records available access after one real probe

- **WHEN** the actual Agent search returns a real HTTP(S) URL and the actual fetch surface retrieves page content
- **THEN** the Phase Agent SHALL record `research_access.status: available` with the direct available-branch fields
- **AND** it SHALL run the existing HITL1 gate
- **AND** the probe output SHALL NOT become research evidence

#### Scenario: HITL1 exposes unavailable access before silent execution

- **WHEN** search/fetch tools are absent, search returns no usable result, or fetch is blocked/failed
- **THEN** the Phase Agent SHALL record `research_access.status: unavailable` with direct failure fields
- **AND** it SHALL tell the user that evidence-backed waves cannot start in the current environment
- **AND** it SHALL preserve recorded user choices and remain in HITL1 rather than entering Setup/Wave0
- **AND** recovery SHALL rerun the same bounded probe and gate without an automatic retry tree

#### Scenario: HITL1 writes to bundle not status tree

- **WHEN** HITL1 records user input and capability observation
- **THEN** it SHALL write them to `rb_profile.yaml`
- **AND** it SHALL NOT create `rb_status.json#/phases/hitl1/*` or another research-access status tree

### Requirement: HITL1 body exposes a concrete payload checklist

`phase-hitl1.md` SHALL expose the minimum write contract as a visible checklist for the human and Agent.

The checklist SHALL include:

- `research_profile`
- `root_must_answer_set`
- `research_style_params`
- `research_access.status`
- available path: `research_access.probed_at`, `research_access.result_url`, `research_access.fetch_outcome: success`
- unavailable path: `research_access.probed_at`, non-success `research_access.fetch_outcome`, `research_access.reason`
- `human_decision_checkpoints.hitl1.status`
- `human_decision_checkpoints.hitl1.recorded_at`

Optional `research_access.search_surface` and `research_access.fetch_surface` labels MAY appear in the checklist but SHALL NOT be presented as gate-required facts. The checklist is an alignment/review surface, not a separate schema authority.

#### Scenario: Human can audit capability readiness

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see both the normal HITL1 payload and exact available/unavailable observation fields
- **AND** review SHALL not require reconstructing the probe contract from scattered prose
