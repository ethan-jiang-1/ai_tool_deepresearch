## Why

Change 2 (`wff_contract-skeleton`) 创建了完整的 lifecycle shell，metadata 齐全但 body 最小、gate definition 和 CLI 大多仍是 placeholder。

本 change 覆盖 research 开始前的全部工作——**pre-research**（instantiation → HITL1 → setup）。wave phase 依赖 `setup-ready` gate pass 才能进入，而 gate 必须真的执行规则。

HITL1 是本 change 的核心：用户可能提供详细的 research brief，也可能只说一句话。无论哪种情况，Agent 都必须产出可靠的 **original topic**——因为下游 seed topics、wave0/1/2 分配、evidence coverage 全部依赖它。这意味着 HITL1 不仅要收集用户偏好，还要在用户输入模糊时做 **topic rewrite**（类似 RAG 中的 query rewrite），把一句话展开成结构化的 research plan outline。Gate 做 deterministic 校验，Agent 做语义展开，人做最终审查。

## What Changes

- **5 个 shared node 填充完整内容**：`shared-profile.md`、`shared-gate-rules.md`、`shared-schemas.md`、`shared-repair-guidance.md`、`shared-anti-cheating-rules.md`。所有 shared node 保持 `authority: guidance-only | generated-summary`，不成为 hidden phase 或第二套 rule source。
- **3 个 phase node 填充完整 body**：`phase-instantiation.md`、`phase-hitl1.md`、`phase-setup.md`。每个 node 都明确 goal、inputs、actions、artifacts、gate command、pass/fail behavior、stop semantics 和 anti-cheating。HITL1 新增 **topic rewrite** 步骤：Agent 将用户原始输入（尤其是一句话场景）展开为结构化的 original topic，作为 seed topics、wave 分配、evidence coverage 的基础。
- **3 个 gate definition JSON 填充完整 rule set**：`instantiation-complete`、`hitl1-recorded`、`setup-ready` 从 placeholder / partial rules 升级为当前 schema contract 上的 deterministic rules。
- **3 个 gate CLI 填充完整实现**：三个 pre-research gate CLI 都加载 definition、校验 node/gate binding、遍历 rules、输出 `check / routing / inspect / advice`。
- **明确 setup basename normalization**：production bundle 使用 `dpt_rb_<plan_basename>`；disposable experiment 使用 `dpt_disp_<plan_basename>_<hex>`，setup gate 比较归一化后的 bundle basename 与 plan/profile `plan_basename`。
- **新增 workflow-foundation pre-research experiments**：在 accepted path `experiments_playbook/exp_workflow-foundation/` 下提供 simple / medium / complex / heavy-manual playbooks，使人类能审阅 HITL 问题面、profile diff、gate feedback 和 review points，AI 能在真实 disposable bundle 上重放。
- **明确 runtime trace 与实验 verdict trace 边界**：gate CLI 输出真实 JSON result，并把 pre-research gate attempt 追加到 active bundle 的 `rb_trace.jsonl`；playbook 的薄 driver 负责调用 gate CLI、解析 result、通过 `DPT_FRAMEWORK/engine/trace.mjs` 向实验 `_trace.jsonl` 追加 `check` event，最终 verdict 只读实验 trace。

## Capabilities

### New Capabilities

- `shared-node-content`: 5 个 shared node 的 Agent-readable 内容，包括字段说明、gate 用途、schema 摘要、repair 姿势、反作弊规则。
- `pre-research-phase-content`: instantiation、HITL1、setup 三个 phase node 的完整 body。
- `pre-research-gate-implementation`: `instantiation-complete`、`hitl1-recorded`、`setup-ready` 的完整 rule set + CLI 实现。
- `pre-research-experiments`: pre-research 的人机对齐实验面，覆盖 happy path、repair loop、review surface、manual HITL review。

### Modified Capabilities

- `gate-skeleton`: GSK-004 的覆盖范围从 1 个 gate CLI 扩展到 3 个 pre-research gate CLI。

## Impact

- **Affected framework**:
  - `DPT_FRAMEWORK/workflows/nodes/shared/*.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-instantiation.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-setup.md`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-instantiation-complete.definition.json`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-hitl1-recorded.definition.json`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-setup-ready.definition.json`
  - `DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs`
  - `DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs`
  - `DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs`
- **Affected experiments**:
  - `experiments_playbook/exp_workflow-foundation/`
  - `experiments_playbook/RUN.md`
- **Affected tests**:
  - pre-research gate integration tests under `tests/integration/cli/`
- **Affected governance**:
  - `openspec/governance/req-registry.yaml`
- **No new npm dependencies**: only Node built-ins plus approved `yaml`.
