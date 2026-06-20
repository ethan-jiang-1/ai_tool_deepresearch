## Context

当前 `guidelines/project-charter.md` 和 `guidelines/framework-runtime-boundary.md` 已明确分层：

- Markdown/playbook/task card 控 Agent Flow。
- JS/CLI/Engine 控 schema、receipt、trace、transition lookup、check/inspect/advice。
- Gate 不持有路由，Gate CLI 通过 `askNext()` 查询 transition table，并把 `check.next` 返回给 Markdown/Agent。
- `manifest.json` 持有 phase inventory/index 和 metadata consistency，不持有 runtime next-node authority。
- 配置不能通过环境变量传递，必须通过 CLI flag、函数参数或 runtime 属性显式传入。

WFF 相关实现已经基本遵守这个边界，但少数早期 specs 仍保留 prototype 时代的表达。这个 change 是 spec sync，不是行为扩展。

## Goals / Non-Goals

**Goals:**

- 让 `seg2node`、`dynamic-node-loading`、`gate-state-machine`、`workflow-node-contract`、`conditional-nodes`、`gate-fork-router`、`fork-repair-converge`、`repair-loop` 与当前 guidance 和 framework 边界一致。
- 消除环境变量配置、JS router 加载 workflow node、manifest navigation authority、Step 执行 Agent-facing node、runtime registry 返回 Step instance、shared repair node、terminal escalation step 等误导性 spec 表述。
- 保留早期 capability 的稳定 requirement ID，只修正其当前语义描述。

**Non-Goals:**

- 不重写 WFF phase/gate/runtime 行为。
- 不新增 capability、CLI flag、schema 字段或 npm dependency。
- 不删除 legacy experiment playbooks；如有文字误导，只标清 legacy/prototype 或 checkpoint 语义。
- 不改变 `manifest.json` 的 wire shape；只修正 accepted spec 中 manifest 的 authority 表述。
- 不把当前 `ForkStep` / `sharedRepairStep` 实现重构成 injection-point 机制；如需让 MD/Agent 注入 repair/branch action 策略，应另开 change。

## Decisions

### D1: 用 RENAMED + MODIFIED delta 修正旧 requirement，不新增替代 capability

这些问题是现有 capability 的语义漂移，不是新能力。旧 requirement 标题本身包含 registry、Step、router、repair node 等误导词，因此先用 `RENAMED Requirements` 把标题迁移为当前边界语义，再用 `MODIFIED Requirements` 替换正文。Requirement ID 保持不变，以维持 traceability，避免把历史残留伪装成新系统面。

Alternative considered: 新建 `wff-boundary-sync` capability。拒绝，因为会让旧 main specs 继续保留误导性要求。

### D2: `NODES_DIR` 只保留为普通变量名，不作为环境变量 contract

`seg2node` 的目标是 segment -> node 术语迁移，不应继续规定环境变量。新语义要求 node directory 通过显式参数、runtime 属性或 CLI 参数传入。

Alternative considered: 在 spec 中保留 `NODES_DIR` 但解释为变量名。拒绝，因为标题“环境变量使用 NODES_DIR”已经和硬性 guideline 冲突。

### D3: Dynamic node loading 以 fileRef + nodesDir + Markdown closure 为模型

当前 `workflow-chain.mjs` 的 Source of Record 是：caller 显式传入 node fileRef 和 runtime.nodesDir，Engine 解析 dependency closure 并返回 MD/frontmatter 给 Agent。它不是 registry -> Step instance，也不执行 MD body。

Alternative considered: 保留 registry 作为 future abstraction。拒绝，因为当前没有 accepted runtime registry surface，保留会继续诱导 JS controller 化。

### D4: Gate state machine 只返回 checkpoint/transition feedback

Gate 检查状态并返回 pass/fail/check/inspect/advice；transition table 回答 next_node。加载下一 node、修复策略、阻塞处理由 Markdown/Agent 在读取反馈后执行。

Alternative considered: 让 Gate router 直接加载 node。拒绝，因为违反 WFF 当前边界。

### D4a: Manifest 是 phase inventory/index，不是 next-node authority

`manifest.json` 当前 shape 保留 `phases[]` 和 `shared[]`，用于 Agent-readable lifecycle inventory、metadata consistency、skeleton completeness 和 shared node discovery。它不含 `next`，也不应通过数组相邻关系承担 runtime next-node transition。Gate CLI 输出的 `check.next` 来自 transition table / `askNext()`，Markdown/Agent 读取该反馈后再加载返回的 node reference。

Alternative considered: 把 `phases[]` 数组顺序继续描述为 navigation authority。拒绝，因为这会和 `transition-table`、`gate-skeleton`、`gate-state-machine` 的 accepted Source of Record 冲突，并重新诱导 Coding Agent 把 workflow 写成 JS/manifest-driven controller。

### D5: Conditional branch Step 语义收窄为 deterministic transform/checkpoint

`subagent-relay.mjs` 内部仍有 `ForkStep`，但它应被表述为 deterministic branch transform / repair checkpoint，不是 Agent-facing workflow node execution。Spec 应避免“每个 branch node 执行不同逻辑”这种会把流程主权交给 JS 的措辞。

Alternative considered: 立即重构源码删除 `ForkStep`。拒绝，因为本 change 是 spec sync；代码改名可作为实现任务中的可选清理，但不改变行为。

### D6: 纳入 fork-router / repair-converge / repair-loop 的相邻旧措辞

`gate-fork-router`、`fork-repair-converge` 和 `repair-loop` 仍使用 `Map<Branch, Step>`、workflow node、shared repair node、repair node、terminal escalation step 等早期词。它们与 COS/GAS/DYS 同属同一边界问题：如果不一起同步，Agent 仍可能从 accepted specs 读出 JS-owned workflow routing 或 node-owned repair。`fork-repair-converge` 的三条 requirement 一起 rename/modify，以保持归档后阅读顺序仍是 convergence -> re-evaluation -> loop guard；`repair-loop` 作为 REL-001 的旧 gate-loop capability 同步为 repair checkpoint loopback + explicit deterministic termination outcome。

Alternative considered: 把这些相邻 capability 留作 follow-up。拒绝，因为本 change 的目标是同步 WFF 边界规格面；保留相邻旧词会让 main specs 自相矛盾。

### D7: 当前 hardcoded transform 是现状，不是未来策略注入完成态

`guidelines/command-experiments.md` 的方向是：Engine 拥有 deterministic loop，MD/Agent 供应智能策略，未来机制应通过 function parameter / factory argument 等 injection point 提供 repair / dispatch / branch action。当前 `subagent-relay.mjs` 仍 hardcode `ForkStep` 和 `sharedRepairStep`，因此本 change 只把它们描述为当前 accepted deterministic checkpoint behavior，不声称已经完成策略注入。

Alternative considered: 在本 change 中要求 `convergeRepair(state, { repairStep })` 一类 API 重构。拒绝，因为这会改变 runtime behavior，超出 spec sync 目标。

## Risks / Trade-offs

- [Risk] 旧 experiment 文案仍使用 prototype/Step 术语，后续 Agent 可能误读。
  - Mitigation: 实现时 targeted scan 这些术语，必要时只改注释/文案，不改实验逻辑。
- [Risk] 修改 main specs 后 registry 描述仍旧。
  - Mitigation: 同步 `req-registry.yaml` 中 SEG/DYS/GAS/WNC/COS/GAF/FOR/REL 的一句话描述。
- [Risk] 清理 wording 时过度承诺“Engine never hardcodes repair strategy”。
  - Mitigation: Spec 明确当前 hardcoded transform 是 accepted deterministic checkpoint 现状；未来 injection point 另开 change。
- [Risk] 过度清理导致旧 regression tests 被迫重写。
  - Mitigation: 只改规范和误导性文案；若测试名仍覆盖旧 prototype 行为但不违反边界，可保留。
