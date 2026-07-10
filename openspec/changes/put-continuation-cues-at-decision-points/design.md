## Context

Silent execution 规则已经存在于 shared Markdown 和 autonomous header，但真实 Agent 做下一步决策时，最后看到的往往是 gate JSON、phase entry 输出、status sync JSON 或 work-unit claim JSON。规则距离决策点太远时，继续扩写长文档不会提高可靠性。

本 change 只在四个现有输出边界增加一个很短的 projection：gate result、`enter-phase`、covered `advance-status` 和 work-unit claim。Cue 只由当前 node frontmatter、当前 command outcome、route-bound current-node/handoff fact 和已返回 work ids 直接推导，不成为 authority、state 或路由系统。

### Current baseline after v0.17/v0.18

Change1 (`v0.17`) 已经把 Wave0/Wave1/Wave2 的 formal gate 与 inspect 收敛到 shared evaluator / formal wrapper / inspect wrapper 分层，正式 gate 仍然独占 routing、degraded handoff、attempt durability 和 trace/checkpoint 副作用。Change3 不能在 cue 里重新实现 evaluator、inspect classifier、root-cause ranking 或 degraded eligibility。

Change2 (`v0.18`) 已经把“是否具备真实研究访问能力”前移到 HITL1 的 `research_access.status == available` fail-fast gate。Change3 不能把 research capability failure 变成 silent-wave continuation，也不能把 HITL1 `stop: yes` 失败伪装成 `interaction: prohibited` 的 autonomous cue。

当前 `handoff-helpers.mjs` 还保留 bootstrap compatibility：`phase-instantiation` / `phase-hitl1` / `phase-setup` 是特殊入口，covered trace-backed handoff 从 setup onward 才要求 route-bound `enter-phase` + `load_complete`。因此 `advance-status` cue 必须区分 covered handoff 和 bootstrap-compatible source sync；不能把 manifest/chain 推导出来的 next node 当作“已加载 node”。

## Goals / Non-Goals

**Goals:**

- 在 stop:no gate pass/fail 输出末端给出唯一立即动作。
- 在 `enter-phase` 成功 Markdown 末端重申已加载 node 的 stop/terminal contract。
- 在 covered `advance-status` 成功 JSON 中重申已加载 current node 的 stop/terminal contract；bootstrap compatibility 不猜 loaded node。
- 在 work-unit claim 后立即指向 inspect/poll claimed work。
- 保持 cue 无持久状态、无语义推理、无自动执行。

**Non-Goals:**

- 不拦截 chat，不建设 session manager、watcher、daemon 或 notification broker。
- 不新增 stop 状态机、token/context 估计或 Agent intent 推断。
- 不让 cue 选择 node、修改 routing、证明 phase completion、替代 `check.next`、替代 `load_complete` 或替代 `rb_status.current_node`。
- 不让 cue 读取 `failed_rule_ids` / `masked_rule_ids` 后做第二套 gate verdict 或 root-cause inference。
- 不用 JS test 声称真实 Agent 一定不会 surfacing。

## Decisions

### 1. 统一一个小型 continuation projection，不建设 controller

增加一个纯 helper，根据明确输入返回稳定对象：

```json
{
  "interaction": "prohibited|required|terminal_delivery",
  "next_action": "consume_check_next|repair_and_rerun_gate|execute_loaded_node|wait_for_user_in_loaded_node|deliver_final_artifacts|inspect_and_poll_claimed_work"
}
```

Helper 不读 conversation、不写 bundle、不循环执行。各 CLI 负责提供它已经拥有的直接事实。对象可以带当前 node、gate 或 claimed work ids 作为定位信息，但这些字段不成为 authority。

替代方案是增加持久 `continuation_state` 或统一 workflow controller；这会复制 gate/transition/queue authority并拉长链路，因此不采用。

实现上优先放在一个小 helper/module 中，并由现有输出边界调用。不要把 helper 变成 status reader、trace reader 或 workflow runner；需要 runtime fact 时由调用方传入已经验证过的事实。

### 2. Gate cue 在共享 result construction/projection 边界由 current node 与 outcome 推导

Gate result 保持现有 `check`、`routing`、`inspect`、`advice`。在 emit 前读取 `check.currentNodeRef` 对应 node frontmatter：

- `stop: no` + pass + non-null `check.next` → `prohibited / consume_check_next`；
- `stop: no` + fail → `prohibited / repair_and_rerun_gate`；
- 其他 stop mode 不由这条规则猜测，也不把 HITL1/HITL2 failure 包装成 autonomous continuation。

Cue 不改变 exit code、routing、attempt durability、checkpoint 或 diagnostic artifact。frontmatter 不可读时不猜值；保留原 gate authority 并返回明确 continuation diagnostic。选择 shared result construction/projection helper，而不是逐 gate CLI 手写，是为了所有 gate 共享同一短路径，同时不干扰 Change1 后的 formal wrapper / evaluator 分层。

当前代码已有 `buildGateResult()`、`writeGateAttempt()` 和 `emitGateResult()`。Apply 时应避免依赖 `emitGateResult({ bundlePath })`，因为正常 gate success/fail 多数并不传 `bundlePath`；cue 所需的 node frontmatter 应从 framework node ref (`check.currentNodeRef`) 读取，或由 gate wrapper 显式传入已读 frontmatter。

`failed_rule_ids` / `masked_rule_ids` 可以继续作为 diagnostics 输出，但 continuation cue 只看 `check.passed`、`check.next` 和 current node stop/terminal contract，不从 rule ids 派生新的 next action。

### 3. `enter-phase` 使用已经加载的 target entry frontmatter

`assessNode()` 已把 target node 的完整 frontmatter 放入 runtime content cache。`enter-phase` 在 route-bound load、`current_node` 写入和 Markdown section 组装均成功后，从该缓存项生成一个短 continuation block，并追加到 stdout 最末端。

不重新解析输出 Markdown，不从 phase 名称猜 stop，也不复制完整 autonomous contract。任何 entry/status 写入失败继续返回现有 diagnostic JSON，不能附加成功 cue。

当前 `workflow-chain.mjs` 的 `NodeFrontmatter` schema 只校验 `requires`，但 `parseFrontmatter()` 会保留额外 keys，phase frontmatter 已包含 `stop` 和 `gate`。Apply 可读取 cached `entry.frontmatter.stop/gate`；不要为了 cue 扩大 workflow loader 的 schema authority。

### 4. `advance-status` 只对 covered loaded-node status sync 输出 cue

Covered source-gate status sync 的 cue target 是现有 `rb_status.json#/current_node`，而不是重新从 transition table 选择 node。写 status/trace 前先读取并验证：

- `validateSourceGateStatusSync()` 返回 `covered: true`；
- witnessed handoff target 与 `rb_status.current_node` 完全一致；
- 该 current node frontmatter 可读；
- non-terminal `stop: no` → execute loaded node；
- `stop: yes` → wait for user in loaded node；
- Final (`gate: null`) → terminal delivery。

如果 covered handoff 的 `current_node` 缺失、与 witnessed handoff target 不一致或 frontmatter 不可读，则在 mutation 前失败；不通过 fallback 名称推断，也不把 `advance-status` 当作 entry/loader。

当 `validateSourceGateStatusSync()` 返回 `covered: false`（现有 bootstrap compatibility）时，保留当前 status sync 行为，但不能凭 manifest/chain next node 输出“execute loaded node”。只有当 `rb_status.current_node` 已经非空且等于本次 computed next node，且 frontmatter 可读时，才可输出同样的 loaded-node cue；否则输出明确 `continuation_diagnostic` 或省略 cue。这样保留旧 bundle/入口兼容，同时避免把未加载 node 伪装成已加载。

### 5. Work-unit claim 使用固定 post-claim cue

`operate-work-unit claim` 成功且 `claimed_count > 0` 时，在现有结果上增加 `continuation`，并绑定现成的 `claimed_work_ids`。Cue 只说立即 inspect/poll，不声称 result ready，也不新增 work-unit 字段或 lease 状态。

Claim 为空或失败时不输出成功 continuation。

### 6. 行为验证分为 deterministic output 与真实观察

Regression/integration tests 验证 cue 值、位置、失败时不误报成功，以及不改变 status/routing/work-unit authority。必须覆盖 covered handoff 与 bootstrap compatibility 的差异。Controlled Agent playbook 观察真实 stop:no run 是否按 cue 继续；测试结论不得把“cue 已输出”表述成“Agent 行为已被强制保证”。

## Risks / Trade-offs

- [Risk] Cue 与原始 advice 重复或冲突 → cue 只保留一个 immediate action，原 advice 继续解释原因；测试锁定 routing 与 cue 一致。
- [Risk] 在 shared gate projection 读取 frontmatter 增加失败面 → 只读取本地 framework node Markdown；失败时显式诊断，不猜 stop。
- [Risk] `advance-status` 的 `current_node` 旧 bundle 不完整 → covered handoff fail before mutation；bootstrap compatibility 保留 status sync 但不猜 loaded-node cue。
- [Risk] cue 与 Change1 的 `failed_rule_ids` / `masked_rule_ids` 被误读成新 verdict → design 和 tests 明确 cue 不读取 rule ids 做 authority 判断。
- [Trade-off] Cue 不能强制 LLM 行为 → 接受该限制，用决策点可达性和真实 controlled observation 提升可靠性，而不建设脆弱拦截系统。

## Migration Plan

1. 增加纯 continuation projection helper 和 focused unit tests。
2. 在 shared gate result construction/projection、`enter-phase`、covered `advance-status`、work-unit claim 依次接入 cue。
3. 增加 integration tests，确认 cue 不改变原有 authority、mutation 和 exit-code contract。
4. 更新 silent/work-unit guidance 与 controlled Agent playbook。
5. 更新 CHANGELOG 和 `DPT_FRAMEWORK/RUN.md`，版本提升到 `v0.19`。

Cue 没有持久 schema migration。回滚只需移除输出 projection；现有 bundle state 不需要转换。

## Open Questions

无。后续真实 run 若仍 surfacing，应先观察具体决策点，不预先扩张为 session-level controller。
