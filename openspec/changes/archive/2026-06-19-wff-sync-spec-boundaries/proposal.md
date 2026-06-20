## Why

WFF 推进后，guidelines 和当前 framework 已经收敛到固定边界：Markdown 控制 Agent Flow，JS/CLI 只做 deterministic checkpoint、反馈和状态转移查询。但少数早期 main specs 还保留 prototype 时代的措辞，例如环境变量 `NODES_DIR`、Gate/Router 加载下一节点、manifest lifecycle navigation authority、Step 执行 workflow node、runtime registry 返回 Step instance、shared repair node、terminal escalation step。

这些残留会让 Coding Agent 误读系统方向，把 JS 写成传统 workflow controller。这个 change 只同步规格语义，让 main specs 反映当前代码和 guidance，不引入新的 runtime 行为。

## What Changes

- 修正 `seg2node`：保留 segment -> node 术语迁移语义，但移除“环境变量 `NODES_DIR`”作为要求，改为显式参数 / runtime 属性 / CLI 参数传递 node directory。
- 修正 `dynamic-node-loading`：把早期 registry/Step instance 模型改为当前 `workflow-chain` 模型，即 Engine 解析 fileRef、读取 Markdown closure、返回 Agent-readable MD；Engine 不执行 MD code block，也不拥有 Agent Flow。
- 修正 `gate-state-machine`：把“router loads/routes workflow node”改为 Gate 返回 check 结果，Transition table / `askNext()` 提供 next_node；Markdown/Agent 读取反馈后决定加载、修复、阻塞或继续。
- 修正 `workflow-node-contract`：把 manifest 从 runtime navigation authority 收窄为 phase inventory/index；runtime next-node lookup 由 gate CLI `check.next` 和 transition table / `askNext()` 拥有。
- 修正 `conditional-nodes`：把 Step.execute/branch node 语义收窄为 deterministic branch classification + state transform / repair checkpoint，不让 spec 暗示 JS 执行 Agent-facing workflow node。
- 修正 `gate-fork-router`：把 `Map<Branch, Step>` / workflow node 语义同步为 explicit branch map -> deterministic handler / transform record。
- 修正 `fork-repair-converge`：把 shared repair node / repair loop 语义同步为 shared deterministic repair checkpoint / transform loop；不把当前 hardcoded transform 误读为 Agent semantic repair 策略。
- 修正 `repair-loop`：把 repair node / terminal escalation step 语义同步为 repair checkpoint loopback + deterministic termination outcome。
- 更新必要的 requirement registry 描述，使 requirement ID 的稳定语义不再引用环境变量、registry Step、workflow node routing、repair node 或 JS-owned Agent Flow。
- 不修改运行时行为，除非实现阶段发现注释或测试名称会继续误导边界。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `seg2node`: SEG-001 中 node directory 配置方式从环境变量表述改为显式配置表述。
- `dynamic-node-loading`: DYS-001 从 registry/Step 模型同步为 Markdown node loading / closure parsing / Agent-readable return 模型。
- `gate-state-machine`: GAS-001 从 Gate router 加载节点同步为 Gate checkpoint + transition-table query + Markdown/Agent 后续行动模型。
- `workflow-node-contract`: WNC-001/WNC-003 从 manifest navigation authority 同步为 phase metadata + lifecycle inventory/index；next-node lookup 归属 transition table / `askNext()`。
- `conditional-nodes`: COS-001 从 branch node execution 同步为 deterministic branch decision / state transform / repair feedback 模型。
- `gate-fork-router`: GAF-001 从 `Map<Branch, Step>` workflow node resolution 同步为 branch identifier -> deterministic handler / transform record。
- `fork-repair-converge`: FOR-001 从 shared repair node / repair loop 同步为 shared deterministic repair checkpoint / deterministic loop termination。
- `repair-loop`: REL-001 从 repair node + terminal escalation 同步为 repair checkpoint loopback + explicit deterministic termination outcome。

## Impact

- 影响 OpenSpec main specs 和 requirement registry 描述。
- 可能影响少量代码注释或测试描述，使其明确 legacy/prototype 或 checkpoint 语义。
- 不新增 npm 依赖，不改变 CLI wire shape，不改变 framework runtime behavior。
- 验证以 OpenSpec governance checks、targeted text scan、相关 regression tests 为准。
