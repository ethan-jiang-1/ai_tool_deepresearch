## Why

`harden-agent-engine-boundary` review 后暴露出一个更系统的问题：Light/Standard/Heavy playbook 已经能跑出 PASS/FAIL，但 runner 仍需要手工翻 trace、gate JSON、ledger、receipt 和 cache 才能知道“为什么失败”以及边界防护是否真的生效。这个 change 把零散的事后排查收敛成一层实验观测能力，让后续 playbook 执行天然带有结构化健康报告。

原始需求来源：用户在本轮 review 中转述另一个 Agent 跑完实验后的建议，指出 gate `inspect[]/advice[]` 被丢弃、trace 与 gate output 可能不同步、旧 trace 残留未覆盖、Heavy playbook 的 ledger/receipt/cache/content_dedup 未被系统性检查，并要求“抽象出更好的东西来一下子尽量都做对”。

## What Changes

- 新增 `experiment-observability` capability，定义实验运行后的健康报告、gate 监控包装器、诊断 trace 事件、Heavy provenance 检查和 runner 报告协议。
- 在 `experiments_env/shared/` 下规划共享观测工具，而不是把一次性脚本散落进每个 playbook：
  - `verify-bundle-health.mjs` 读取 bundle runtime state，输出稳定 JSON + 人类可读摘要。
  - `run-gate-with-monitor.mjs` 包装 gate CLI，保留原 gate exit code，保存原始 gate JSON，并提取 `inspect[]` / `advice[]` 作为诊断。
- 明确 Light/Standard/Heavy 是同一个健康检查器的 profile，而不是三套脚本；其中 `standard` 是 RUN_EXPS 当前执行层和 observability profile，不在本 change 中重新定义 accepted `agent-testing` 的历史 `weight` 合约。
- Heavy provenance 以 `rb_output_declarations.jsonl` ledger 为 authority，向外核对 runtime receipt、output files、cache trails 和 gate 消费证据；观测层不得重新运行 gate 或扫目录冒充 provenance。
- 明确健康检查和 gate 诊断不改变 playbook verdict：verdict 仍由 playbook 既有 `check` 事件和 gate outcome 裁决；观测层只补足诊断事实和 runner 报告。
- 更新 runner 协议时以仓库当前实际入口 `experiments_playbook/RUN_EXPS.md` 为 first target；若实现阶段确认需要恢复或同步 `experiments_playbook/RUN.md`，必须作为显式 runner-source cleanup 处理。RUN 文档只描述 runner 该收集的 `verdict`、`health`、`not_run_reason?`、`bundle_preserved?`，不把实现逻辑写进 Markdown。
- **不产出**：本 change 不改变生产 run bundle 的 gate 语义，不让 JS 替 Agent 做语义判断，不引入新依赖，不把实验工具导入 `DPT_FRAMEWORK/` production path。

## Capabilities

### New Capabilities

- `experiment-observability`: 实验 playbook 运行后的健康检查、gate 诊断捕获、非 verdict 诊断 trace、Heavy provenance 观测和 runner 报告协议。Requirement prefix: `EXO`。

### Modified Capabilities

- `playbook-runner`（协议覆盖）：runner report 增加 health 字段和 cleanup-preservation policy；本 change 不改变 runner 的 Agent-driven 执行模型。

## Impact

- OpenSpec governance：新增 `EXO` prefix 与 `EXO-001..006` requirement 登记。
- 实验共享基础设施：后续实现会新增 `experiments_env/shared/verify-bundle-health.mjs`、`experiments_env/shared/run-gate-with-monitor.mjs`，必要时抽出小型 schema/helper 模块。
- 实验 playbook：后续先 inventory，再代表性接入，最后按清单全量 rollout；把 gate CLI 调用改为 wrapper，把 verdict 后健康检查纳入执行协议；不改变测试意图。
- Runner 文档：后续优先更新当前实际 runner surface `experiments_playbook/RUN_EXPS.md` 的报告字段，使 runner 在 PASS/FAIL 外记录 health；`RUN.md` 是否恢复/同步由实现阶段 inventory 明确。
- 验证：新增 node:test 覆盖健康报告 schema、gate wrapper exit code/diagnostic preservation、Heavy ledger-driven checks，并继续运行 OpenSpec/governance/playbook validation。
