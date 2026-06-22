> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007

## Purpose

定义 wave0、wave1、wave2 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，严格贴合当前 accepted CLI / schema / bundle contract。Wave0 产出 foundation shared reference；Wave1 标记 placeholder capability boundary；Wave2 从 verified artifacts 派生 cross-topic synthesis。

## ADDED Requirements

### Requirement: Wave0 phase body completeness

`phase-wave0.md` SHALL 包含完整的 9-section body，引导 Agent 产出 foundation shared reference evidence。

Section 内容要求：
- **Stage Goal**: 搜集少量真实 shared reference，创建结构化 metadata 并更新 index/status/trace。单个 topic 内至少达到 foundation floor 的 reference 数量
- **Required Inputs**: 已通过 `setup-ready` gate 的 active bundle、`shared-profile.md`、`shared-schemas.md`、`rb_plan.md` 中的 `topic_registry`
- **Allowed Actions**:
  - 读取 `rb_plan.md` 中的 topic registry，确定 reference 覆盖方向
  - 搜索/阅读真实来源，为每个 topic 搜集至少 foundation floor 数量的 reference
  - 为每条 reference 写结构化 YAML metadata（`url`、`title`、`retrieved_date`、`topic_tag`），写入 `reference/<topic>/source.yaml`
  - 写入或更新 `reference/index.md`
  - 更新 `rb_status.json` 与 `rb_trace.jsonl`
  - trace 中记录 `wave0_completion` event
- **Expected Artifacts**: `reference/index.md`（非空）、`reference/<topic>/source.yaml`（每条 reference 满足 ReferenceMetadata schema，数量 ≥ 1 per topic）、trace 中有 `wave0_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补充缺失的 reference、修复 schema violation 或补写 trace 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止使用 fake URL 或伪造 source metadata；禁止声称 evidence coverage 或 research depth completeness；禁止跳过实际搜索直接编造 reference

#### Scenario: Agent executes wave0 phase

- **WHEN** Agent 加载 `phase-wave0.md`
- **THEN** body SHALL 引导 Agent 为 topic registry 中的每个 topic 搜集至少 foundation floor 数量的真实 reference
- **AND** body SHALL NOT 指示 Agent 做 synthesis 或 claim verification

### Requirement: Wave1 phase body completeness with subagent boundary

`phase-wave1.md` SHALL 包含完整的 9-section body，并在 body 中明确区分 Current Phase Actions 与 Future Expansion Guidance。

Section 内容要求：
- **Stage Goal**: 为 topic registry 中的每个 topic 写入 topic-scoped skeleton artifact，明确标记 foundation placeholder capability boundary
- **Required Inputs**: Wave0 产出的 `reference/index.md` 和 `reference/<topic>/source.yaml`、`shared-profile.md`
- **Allowed Actions**:
  - 读取 Wave0 的 reference index 和 metadata
  - 为每个 topic 创建 topic-scoped skeleton artifact（`artifacts/wave1/<topic>/skeleton.md`）
  - 在 skeleton 中显式标注 `capability: foundation-placeholder`
  - 在 body 末尾提供 Future Expansion Guidance section（只读参考，不作为 gate pass 条件）
  - 更新 `rb_status.json` 与 `rb_trace.jsonl`
  - trace 中记录 `wave1_completion` event
- **Expected Artifacts**: `artifacts/wave1/<topic>/skeleton.md`（每个 topic 至少 1 个，标记 `capability: foundation-placeholder`）、trace 中有 `wave1_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补充缺失的 skeleton 或补加 placeholder marker 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止声称 full subagent coverage / deepening / candidate intake / fan-in review 已完成；禁止移除或弱化 placeholder marker 以通过 gate；禁止写 fake skeleton 内容冒充真实 artifact

#### Scenario: Wave1 phase stays within foundation boundary

- **WHEN** Agent 加载 `phase-wave1.md`
- **THEN** body SHALL 包含 Current Phase Actions section（描述 Agent 必须做的事）和 Future Expansion Guidance section（只读参考）
- **AND** Future Expansion Guidance SHALL NOT 成为 `wave1-complete` gate 的 pass 条件

### Requirement: Wave2 phase body completeness

`phase-wave2.md` SHALL 包含完整的 9-section body，引导 Agent 从 verified wave artifacts 派生 minimum cross-topic synthesis。

Section 内容要求：
- **Stage Goal**: 从已验证的 Wave0 reference 和 Wave1 skeleton 派生一个 cross-topic synthesis artifact
- **Required Inputs**: Wave0 `reference/index.md`、Wave1 `artifacts/wave1/<topic>/skeleton.md`、`shared-schemas.md`
- **Allowed Actions**:
  - 读取 Wave0 的 reference index 和所有 topic metadata
  - 读取 Wave1 的所有 topic skeleton
  - 派生 synthesis artifact `artifacts/wave2/synthesis.md`
  - synthesis 必须使用标准 Markdown link `[label](relative/path.md)` 格式显式引用 Wave0/Wave1 artifacts
  - 更新 `rb_status.json` 与 `rb_trace.jsonl`
  - trace 中记录 `wave2_completion` event
- **Expected Artifacts**: `artifacts/wave2/synthesis.md`（非空、含至少 1 个 Markdown link 指向 Wave0/Wave1 artifact）、trace 中有 `wave2_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补写 Markdown link 或修复引用路径后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止凭空总结（不引用任何 Wave0/Wave1 artifact）；禁止伪造引用路径；禁止声称 synthesis 是完整的 research conclusion；禁止在引用链不完整时声称 synthesis 已验证

#### Scenario: Wave2 synthesis references verified artifacts via Markdown links

- **WHEN** Agent 生成 `artifacts/wave2/synthesis.md`
- **THEN** synthesis SHALL 用 Markdown link 格式显式引用 Wave0 和 Wave1 artifacts
- **AND** body SHALL NOT 允许无 Markdown link 的 synthesis

### Requirement: Wave1 foundation placeholder boundary enforcement

`phase-wave1.md` body SHALL 显式声明 foundation 阶段的 capability boundary：

禁止声称的内容（Anti-Cheating Rules 中显式列出）：
- full subagent coverage completed
- topic-specific deepening completed
- candidate intake/backfill completed
- fan-in review completed
- native subagent fan-out/fan-in completed

`subagent: true` frontmatter SHALL 只在 node metadata 中表示 future capability direction，foundation 阶段 SHALL NOT dispatch subagent。

#### Scenario: Wave1 placeholder marker is unmissable

- **WHEN** Agent 写入 `artifacts/wave1/<topic>/skeleton.md`
- **THEN** artifact SHALL 显式包含 `capability: foundation-placeholder`
- **AND** `wave1-complete` gate SHALL 检查该 marker 存在

### Requirement: Wave1 future expansion tracks documentation

`phase-wave1.md` body 的 Future Expansion Guidance section SHALL 至少列出以下 expansion tracks：
- topic-specific deepening
- subagent dispatch
- candidate intake
- repair/backfill
- fan-in review
- topic artifact quality gates

Future expansion guidance SHALL 标注为只读参考，SHALL NOT 成为 `wave1-complete` gate pass 条件。

#### Scenario: Future expansion tracks do not gate foundation pass

- **WHEN** `check-gate-wave1-complete.mjs` 被调用
- **THEN** gate SHALL NOT 检查 future expansion guidance 的任何条件
- **AND** future tracks 的存在 SHALL NOT 影响 `passed` 判定

### Requirement: Wave2 synthesis artifact references verified artifacts

`phase-wave2.md` body SHALL 指示 Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 `wave1-complete` 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/topic-a/skeleton.md`）。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 目标存在时 gate 继续；0 条时 gate SHALL fail

### Requirement: Anti-cheating rules in wave phase bodies

每个 wave phase node body 的 Anti-Cheating Rules section SHALL 包含该 phase 特有禁令，并 reference `shared-anti-cheating-rules.md`。

#### Scenario: Each wave phase has phase-specific anti-cheating rules

- **WHEN** Agent 读取任一 wave phase 的 Anti-Cheating Rules section
- **THEN** section SHALL 至少列出 2 条 phase-specific 禁令
- **AND** 每条禁令 SHALL 指向正确替代动作
