## Why

`DPT_FRAMEWORK/engine/queue-manager.mjs` 现为 **1053 行**，是当前 framework engine 中仅剩的超千行生产 `.mjs` 文件。上一提交 `f71d0d6a` 更新的 `split-subagent-relay` change 已把同类问题定型为“零行为变化 + canonical barrel + 扁平子模块”的清理模式；本 change 沿用该模式拆分 Queue Manager，降低后续 AGQ/AGO/CRC 相关修改的认知负担。

原始需求来源：用户在 2026-07-04 要求研究“还有另外一个上了 1000 行的 MJS”并 propose 一个 OpenSpec change 将其劈开。仓库行数扫描排除 `_original_*` 历史归档后，生产框架候选为 `DPT_FRAMEWORK/engine/queue-manager.mjs`。

## What Changes

- 将 `queue-manager.mjs` 拆为 **5 个扁平子模块**，保留 `queue-manager.mjs` 作为 barrel re-export：
  - `queue-manager-core.mjs`：trace/logger、常量、schema、通用 queue helpers
  - `queue-manager-window.mjs`：active window、pool sorting、promote/refill/preempt mechanics
  - `queue-manager-ledger.mjs`：delegated completion provenance、output declaration ledger、cache trail validation
  - `queue-manager-lifecycle.mjs`：create/load/save/enqueue/claim/complete/fail/inspect/pendingCount/makeItem
  - `queue-manager-render.mjs`：Markdown projection rendering
- 将对应 regression monolith `tests/engine/queue-manager.test.mjs` 拆为主题化测试文件，并提取 shared fixture helper；测试继续只 import `DPT_FRAMEWORK/engine/queue-manager.mjs` barrel。
- 保持 canonical import 路径 `DPT_FRAMEWORK/engine/queue-manager.mjs` 不变；外部消费者仍从 barrel import。
- 保持 public export 名称、函数签名、Zod schema 语义、trace/log event、queue file shape、ledger file shape、projection path 不变。
- 不修改 Queue active-window 状态机语义、receipt 规则、delegated relay provenance 规则、workflow MD 或 experiment playbook 行为。
- 不修改 workflow phase MD、command playbook、experiment playbook 内容；但 apply 验收必须把这些 MD 的 queue CLI / inline engine 使用纳入影响面扫描与回归。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `framework-engine`：新增 Queue Manager internal module layout、companion regression test layout、barrel import contract（已登记 `FRE-005`；`FRE-004` 已由 active change `split-subagent-relay` 使用）。

## Impact

| 层级 | 改 import？ | 说明 |
|------|------------|------|
| Production JS engine | **否** | `validate-bundle.mjs`、engine helpers、Relay comments/handshake 继续通过 public contracts |
| Production CLI | **否** | `operate-queue.mjs` 继续 import `queue-manager.mjs` |
| Regression tests | **是，测试文件布局变** | `tests/engine/queue-manager.test.mjs` 拆为多个 `queue-manager-*.test.mjs`，覆盖不减少 |
| Integration tests | **否** | `tests/integration/cli/operate-queue*.test.mjs`、`validate-bundle.test.mjs`、reentry/inspect/instantiate tests 作为验收 |
| Workflow / shared MD | **否** | `phase-seed-topics.md`、`phase-wave*.md`、subagent handoff MD 仍走 `operate-queue.mjs` |
| Experiment playbooks | **否** | 直接 import barrel 的 `exp_agentic-queue` / `exp_system-logging`，以及通过 CLI 的 wave/engine-boundary/evidence playbooks 都要纳入 smoke 验收 |
| Guidance / accepted specs | **否** | 仅描述 canonical `queue-manager.mjs`，不要求同步改文案 |

**Version bump**：不需要。本 change 仅调整内部文件布局，不改变 runtime 行为或 public API。
