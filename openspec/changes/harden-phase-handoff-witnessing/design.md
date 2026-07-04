## Context

BUG-020 的失败点发生在 gate pass 之后：Agent 经过高摩擦 gate 修复后，运行旧式/错位的 status synchronization（报告中记录为 `advance-status --to wave1_complete`）写出看似干净的 runtime state，然后没有加载 `check.next`，直接在 chat 中交付提前 synthesis。

当前系统已经有两个相关但未闭合的机制：

- `assessNode()` 会注入 AUTONOMOUS-MODE header 并写 `load_complete`，但真实 phase handoff 路径缺少一个由 Phase Agent 主动调用的 loader checkpoint。Phase Agent 仍然通过 Markdown controller mode 驱动流程；问题不是“CLI 没有继续跑下一段 MD”，而是“MD 要求加载 `check.next` 时，没有一个确定性 loader/check 把被加载的 Markdown 返回到 Agent 上下文并写下可检查的 receipt”。
- readiness gate 已经通过 `trace_has_all_gates` 验证 prior gate pass trace。这证明 Engine 可以用 trace 做 transition integrity Check，而不等于驱动 Agent Flow。

Terminology：本 design 使用 **autonomous continuation** 指代非终端 lifecycle phase 的运行模式。它当前仍由 frontmatter `stop: no` 和注入的 AUTONOMOUS MODE header 表达；本 change 不重命名 schema 字段。这个词比裸 `stop: no` 更接近 Agent 需要执行的行为：不浮出水面、不等待用户、不自判完成，继续跑当前 Markdown controller surface，直到 gate pass 后通过 `check.next` handoff。

本 design 将 phase handoff 定义为两段式 contract：

1. Gate CLI 通过后产生 `check.next`。
2. Phase Agent 按当前 phase MD 的 handoff 要求调用 `enter-phase --node <check.next>`，让 Engine 只执行确定性 loader/check：加载该 node 的依赖闭包、把 Markdown 控制面渲染回 Agent 可读 stdout、写入 `load_complete`。

Engine 不选择 `check.next`、不驱动 Agent loop、不执行下一 phase 的 MD 指令或 phase work、不拦截 chat。Phase Agent 读取 `enter-phase` 输出后继续跑下一段 Markdown；Engine 只拒绝认证缺少 trace precondition 的 deterministic state。

## Goals / Non-Goals

**Goals:**

- 让 `check.next` 的消费产生 Engine-written witness。
- 让 `advance-status` 和后续 gate 检查能发现未见证 handoff。
- 让 AUTONOMOUS-MODE / autonomous continuation contract 真正进入 Agent 运行路径。
- 用 wiring validator 防止 shared preflight 变成未调用死代码。
- 用 pass-side fatigue / delta diagnostics 降低高摩擦后提前交付的诱因。
- 在 OpenSpec 中诚实记录 residual：同一轮 chat halt 不可被 Engine 预先拦截。

**Non-Goals:**

- 不实现 JS lifecycle walker。
- 不让 Engine 自主选择、自动加载、或执行下一 phase 的工作。
- 不拦截或阻止 chat channel 输出。
- 不把 prose-only 禁令作为核心修复。
- 不新增 npm dependency。

## Decisions

### D1: `enter-phase` 是 Agent-invoked Check，不是 walker

新增 CLI：

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <fileRef>
```

`--node` 必须由 Phase Agent 从 gate output 的 `check.next` 读取并传入。CLI 不查找下一 phase、不选择路由、不推进 loop、不执行 Markdown 指令、不修改 `rb_status.json`。它只：

1. 创建绑定到 `<bundle>/rb_trace.jsonl` 的 trace instance。
2. 调用 `createWorkflowRuntime('enter-phase', DPT_FRAMEWORK/workflows/nodes)`。
3. 调用 `assessNode(fileRef, createState(), runtime, trace)`。
4. 从 `runtime.contentCache` 按 `plan` 顺序渲染 loaded Markdown 到 stdout，作为 Phase Agent 下一步要读入 conversation context 的控制面。
5. 保留 `assessNode()` 已有 trace：`load_start`、`dependency_resolved`、`load_complete`。

**替代方案：** 让 gate CLI 自动加载或执行下一 node。拒绝，因为这会让 Engine 驱动 loop，破坏 Agent Flow 边界。`enter-phase` 也不是 walker；它只是 Phase Agent 按 Markdown handoff 要求调用的 loader/check。

### D2: Handoff witness 使用现有 `load_complete`

主要 witness 不是孤立的 `load_complete`，而是一对按 JSONL 顺序可验证的 trace 事实：

1. source gate 有 `gate_attempt(passed=true)`，且该 event 的 `next` 等于 target/current node fileRef。
2. target/current node 随后有 `load_complete(entry=<same fileRef>)`。

`enter-phase --node <fileRef>` SHALL validate that `<fileRef>` is the `next` from the latest passed deterministic gate attempt in trace that has a non-null `next` before emitting a successful handoff witness. It SHALL derive legal predecessor edges from `transitions.chain.json` + `manifest.json`, require that latest passed gate attempt to name the predecessor gate and predecessor `currentNodeRef`, and reject older historical `gate_attempt.next` matches. Gate preflight 和 status hardening 也 SHALL re-check the same ordered pair, rather than accepting any stale or unrelated `load_complete`.

This does not let Engine choose the route: the route remains the `check.next` already produced by the gate CLI. The Engine only verifies that the Phase Agent supplied a node that matches prior gate output and records the loader receipt.

**替代方案：** 新增 `dangling_transition` / `handoff_pending` 状态机。拒绝，因为 readiness gate 的 `trace_has_all_gates` 已提供合法 precedent；本 change 应 generalize existing trace checks，不引入平行机制。

### D3: `advance-status` 只认证 trace-backed 状态

`advance-status --to <gate_enum>` 的 `<gate_enum>` SHALL mean the just-passed source gate being synchronized into `rb_status.json`, not the next phase's gate. Example: after `wave0-complete` passes and `check.next` points to `phases/phase-wave1.md`, the status sync command is `advance-status --to wave0_complete`.

Before writing `rb_status.json`, `advance-status` MUST:

- 读取 `rb_trace.jsonl`。
- Normalize `<gate_enum>` to the source gate key and confirm that the latest passed deterministic `gate_attempt` with non-null `next` is for that source gate.
- Resolve the source gate to its source node through `manifest.json`, then resolve the target node from `transitions.chain.json[sourceNode].passed`.
- Confirm the passed gate attempt's `next` equals the resolved target node.
- For non-initial lifecycle target nodes, confirm a later `load_complete(entry=<targetNode>)` exists.
- 对缺少 source gate pass、gate `next` mismatch、或 target entry witness 的情况 fail closed，并输出 JSON error + advice，指向正确的 `enter-phase --bundle <path> --node <targetNode>` 和 source-gate `advance-status --to <source_gate_enum>` command.

成功输出保持现有 shape：

```json
{ "status": "ok", "current_gate": "<value>", "next_gate": "<value>" }
```

失败输出使用现有 error style 扩展：

```json
{ "status": "error", "reason": "<short reason>", "advice": ["<remedy>"] }
```

**替代方案：** 保持 `advance-status` 仅做 chain lookup。拒绝，因为这正是 BUG-020 中状态被过早洗白的 seam。

### D4: Gate preflight 在 content rules 前执行

新增 shared helper，例如 `checkPhaseHandoffPreflight(bundlePath, currentNodeRef)`，供 lifecycle gate CLI 调用。它验证：

- 当前 node 在 manifest lifecycle 中。
- 对非初始 lifecycle node，存在 incoming deterministic predecessor gate 的 `gate_attempt(passed=true)`，且该 event 的 `next` 等于 `currentNodeRef`。
- 当前 node 存在发生在该 predecessor pass 之后的 `load_complete(entry=currentNodeRef)` trace witness。

Preflight failure 不改变 router。Gate 正常返回 `passed:false`、exit 1，并在 `inspect` / `advice` 中说明缺失的 prior gate 或 `load_complete`。

**适用范围：** 所有有 prior lifecycle phase 的 gate。Instantiation 是入口例外，因为 bundle 尚未存在时无法提前写 run trace。若一个 node 有多个 deterministic incoming edges（例如 rerun 回到 seed-topics），helper 使用 `transitions.chain.json` 推导所有合法 predecessor，并接受最新一对合法的 `gate_attempt.next -> load_complete.entry` witness；helper 不自行选择 route。

**替代方案：** 只在 wave1/wave2 加检查。拒绝，因为会复制 BUG-020 的“某些路径未接线”问题。

### D5: Wiring validator 是必做项

新增 regression/validator，静态检查适用 gate CLI 是否调用 shared preflight helper。没有这个测试，shared helper 可能再次成为“大家以为存在但没人调用”的死代码。

**替代方案：** 只靠 code review。拒绝，因为 BUG-020 的根因之一就是 mechanical defense 未进入真实路径。

### D6: Attempt diagnostics 读取 Engine-visible evidence

GSK-006 保留 `--attempt N` 兼容，但 fatigue/delta 的 authoritative count 来自 trace/diagnostic artifacts：

- `attempt_count`: 当前 phase/gate 自最近 relevant `load_complete` 后的 gate attempt 数。
- `attempt_trend`: `first | converging | stalled | regressed`。
- `newly_passing` / `still_failing` / `regressed`: 基于 rule id 的 delta。

当高 attempt gate 最终 pass，advice 明确说明：`check.next` 指向下一 phase，最终报告在 `phase-final` 交付，高摩擦不授权提前 chat synthesis。

**替代方案：** 继续依赖 Agent-reported `--attempt`。保留为 hint，但不作为 hard diagnostic source。

### D7: Cascade mask 只做诊断，不改变 truth

Wave0 中若上游 schema/parse failure 导致下游 count/dedup 结果不可解释，下游 diagnostics 标记为 masked，避免把一个根因呈现成多个独立失败。Gate pass/fail 仍由真实 rule result 决定，不把 masked 当 pass。

**替代方案：** 直接跳过下游 checks。拒绝，因为会隐藏真实 gate condition。

### D8: Phase MD 只改 demand-side wiring

Phase §6 的核心改写：

1. 读取 gate output 的 `check.next`。
2. 调用 `enter-phase --bundle <path> --node <check.next>`，capture 其渲染出的 next node Markdown，并让 loader 写下 route-bound `load_complete`。
3. 在执行任何 next-phase work 之前，调用 `advance-status --bundle <path> --to <this phase's gate enum>` 同步刚通过的 source gate。例如 wave0 pass 后使用 `--to wave0_complete`，不是 `--to wave1_complete`。
4. 从 step 2 已经 capture 的 rendered Markdown 继续执行下一 phase。
5. 不把 `advance-status` 描述为“进入下一 phase”的动作；它只在 `enter-phase` 已经写下 target node load witness 之后同步状态。

这保持 Markdown 控制 Agent Flow：Markdown 要求 Phase Agent 调 CLI；CLI 只做确定性 loader/check 并把下一段 Markdown 返回给 Agent。继续执行下一 phase 的主体仍是 Phase Agent 的 agentic loop，不是 CLI。

## Risks / Trade-offs

- **Risk: 同一轮 chat halt 仍可能发生。** → Mitigation: proposal/spec 明确 residual；目标是让状态不能被洗白，并在恢复/下一 Engine touch 暴露。
- **Risk: `enter-phase` 输出过大。** → Mitigation: 只输出 dependency closure plan 中的 Markdown，不输出 runtime internals；后续可加 projection，但本 change 不引入额外机制。
- **Risk: Gate preflight 误伤 HITL/rerun 路径。** → Mitigation: helper 以 manifest + transitions.chain.json 推导 incoming deterministic edges；instantiation 入口例外；HITL2 indeterminate branches 不由 preflight 自行选择目标。
- **Risk: Delta diagnostics 变成 pass/fail authority。** → Mitigation: specs 明确 diagnostic-only；gate truth 仍来自 rules。
- **Risk: Version bump 遗漏。** → Mitigation: tasks 明确更新 `CHANGELOG.md` 和 `RUN.md` 到 v0.4。

## Migration Plan

1. Propose 阶段只写 OpenSpec artifacts 和 registry。
2. Apply 阶段先实现 `enter-phase` 和 trace helpers，再接入 `advance-status` / gate preflight。
3. 更新 phase §6 和 shared silent execution 文案。
4. 补 regression tests 与 standard E2E playbook。
5. 更新 v0.4 changelog / RUN banner。

Rollback strategy：若 preflight 误伤生产 bundle，可回滚 gate preflight 调用点和 `advance-status` precondition，`enter-phase` CLI 本身是 additive，不会破坏旧 bundle 文件格式。

## Open Questions

- 无阻塞问题。Apply 阶段若发现 HITL2 rerun edge 的 predecessor 推导需要更精细，应在同一 requirement 下实现 chain-aware incoming edge 解析，而不是回退到 prose。
