## Why

生产 bundle 中，Agent 在 wave0/wave1 累计约 8 次连续 gate 失败后违反 `stop: no` 契约，向用户展示虚假 A/B 选择而不是进入 silent count-floor re-fill loop。根因不是单个 bug——是 `stop: no` 契约的**五层防御全部缺失**：无 engine 侧信号、无 fatigue 检测、silent-execution 契约未全覆盖、phase body 存在内部矛盾、无强制性上下文注入。BUG-013 暴露的是结构性脆弱：当 LLM 上下文退化、疲劳累积时，没有任何机制能将它拉回正轨。

本 change 还需要覆盖一个更隐蔽的同类失败：Agent 不直接提问，但误以为“暂时没事做”，于是向用户做阶段性进度汇报、idle 汇报或“做到这里”的中途总结。对非 HITL lifecycle node 来说，这同样违反 `stop:no`：node 的目的不是形成对话 checkpoint，而是完成本 node，通过 gate，并按 `check.next` 进入下一个 node。详见 `_backlog/bugs/BUG-013-gate-failure-fatigue-breaks-stop-contract.md`。

## What Changes

**OpenSpec execution boundary**：在本 change 的 artifacts 尚未打磨完成前，只允许修改 `openspec/changes/harden-stop-contract/`。仓库外部改动必须由 `tasks.md` 逐项驱动；任务勾选状态必须反映当前 repo truth，已实现且已验证的旧任务可以保持 complete，新增或未验证的任务必须保持 pending。

**五层防御加固 `stop: no` 契约，让 Agent 在自主执行阶段极难浮出水面：**

- **Layer 1 — 通用静默执行覆盖**：所有 manifest lifecycle `stop: no` phase nodes 的 `requires:` 加入 `shared/shared-silent-execution`，确保每个自主 phase 都加载完整的静默执行行为契约；Final 仍是 `stop: no + gate: null` 的终端交付点。Relay/sub-agent task surfaces（例如 `phase-wave2-subagent.md`）不属于 lifecycle phase coverage
- **Layer 2 — Phase body 矛盾修复**：对所有 manifest lifecycle `stop: no` phase body 做 contradiction audit，消除 "ask the user"、`state: blocked`、`escalation`、`report and stop`、阶段性进度汇报、idle 汇报等泄露路径；instantiation/setup/rerun 是已知必须修复点，wave0/wave1/wave2 旧式 persistent failure 文案也必须清理
- **Layer 3 — Silent execution 契约加固**：`shared-silent-execution.md` 新增 §0 "ABSOLUTE PROHIBITION"（Agent 读到契约后看到的第一段），新增 §5 "Fatigue Resistance"（self-check protocol、structural vs fixable failure 区分、step-back 指导）
- **Layer 4 — Engine attempt-aware 疲劳诊断**：gate CLI 接受 Agent-reported retry hint `--attempt N`，`buildGateResult()` 在 gate fail 且 Agent 显式报告的 attempt 达到阈值时注入 `fatigue_warning: true` + `step_back: true` + stop-mode-safe advice；Engine 不追踪也不验证连续失败次数
- **Layer 5 — 首行自主契约注入**：`assessNode()` 加载 manifest lifecycle `stop: no` phase 时，在 frontmatter 之后、body 之前注入契约头——普通 lifecycle `stop:no` phase 注入 AUTONOMOUS MODE；`phase: final + stop:no + gate:null` 注入 TERMINAL DELIVERY MODE，禁止中途交互但允许最终交付

**不变**：Engine 保持被动（不驱动 loop、不阻止 Agent 行为）；`stop: yes/no` 仍是唯一执行控制字段；动态加载机制不变。

## Capabilities

### New Capabilities

_无。所有变更落在现有 capability 范围内。_

### Modified Capabilities

- `workflow-node-contract`: WNC-008（assessNode 对 manifest lifecycle stop:no phase 注入自主契约头）、WNC-009（manifest lifecycle stop:no phase 的 requires 必须包含 shared-silent-execution）
- `silent-wave-execution`: SWE-002（fatigue resistance 行为指导，适用范围从 wave-only 扩展到所有 manifest lifecycle stop:no phase）
- `gate-skeleton`: GSK-006（gate CLI 接受 Agent-reported `--attempt` retry hint，buildGateResult 在 fail + hint 超阈值时返回 fatigue_warning + step_back 诊断信号）
- `pre-research-phase-content`: instantiation/setup 的 stop:no 失败处理从 ask/stop/escalation 改为静默规范化或降级
- `research-styles`: wave0/wave1/wave2 re-fill loop 的 no-progress escalation 改为 silent degradation / silent gap，仍不得伪造 gate pass
- `rerun-incremental-node`: rerun node 的 stop:no failure handling 从 terminal user-facing stop 改为静默修复/降级，耗尽 rerun_count 的硬性 gate failure 除外

## Impact

- `DPT_FRAMEWORK/engine/workflow-chain.mjs` — assessNode 契约注入逻辑
- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — parseGateCliArgs 新增 --attempt，buildGateResult 新增 attempt-aware fatigue diagnostics
- `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs` × 10 — attemptNumber 透传（各一行）
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md` — §0 + §5 加固
- 所有 manifest lifecycle `stop:no` phase nodes — requires 更新 + body 矛盾修复 + gate 命令更新；Final 使用 terminal delivery 语义
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2-subagent.md` — relay/sub-agent surface，不纳入 lifecycle stop:no coverage
- `tests/engine/workflow-chain.test.mjs` — 契约注入测试
- `tests/engine/helpers/gate-helpers.test.mjs` — 疲劳检测测试
- `openspec/governance/req-registry.yaml` — 登记或确认 WNC-008, WNC-009, SWE-002, GSK-006
