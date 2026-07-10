## Context

Silent execution 规则已经存在于 shared Markdown 和 autonomous header，但真实 Agent 做下一步决策时，最后看到的往往是 gate JSON、phase entry 输出、status sync JSON 或 work-unit claim JSON。规则距离决策点太远时，继续扩写长文档不会提高可靠性。

本 change 只在四个现有输出边界增加一个很短的 projection：gate result、`enter-phase`、`advance-status` 和 work-unit claim。Cue 只由当前 node frontmatter、当前 command outcome 和已返回 work ids 直接推导，不成为 authority、state 或路由系统。

## Goals / Non-Goals

**Goals:**

- 在 stop:no gate pass/fail 输出末端给出唯一立即动作。
- 在 phase entry 与 status sync 后重申已加载 node 的 stop contract。
- 在 work-unit claim 后立即指向 inspect/poll claimed work。
- 保持 cue 无持久状态、无语义推理、无自动执行。

**Non-Goals:**

- 不拦截 chat，不建设 session manager、watcher、daemon 或 notification broker。
- 不新增 stop 状态机、token/context 估计或 Agent intent 推断。
- 不让 cue 选择 node、修改 routing、证明 phase completion 或替代 `check.next`。
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

### 2. Gate cue 在共享输出边界由当前 node 与 outcome 推导

Gate result 保持现有 `check`、`routing`、`inspect`、`advice`。在 emit 前读取 `check.currentNodeRef` 对应 node frontmatter：

- `stop: no` + pass + non-null `check.next` → `prohibited / consume_check_next`；
- `stop: no` + fail → `prohibited / repair_and_rerun_gate`；
- 其他 stop mode 不由这条规则猜测。

Cue 不改变 exit code、routing 或 attempt durability。frontmatter 不可读时不猜值；保留原 gate authority并返回明确 continuation diagnostic。选择共享 emit boundary 而不是逐 gate 手写，是为了所有 stop:no gate 都经过同一条短路径。

### 3. `enter-phase` 使用已经加载的 target entry frontmatter

`assessNode()` 已把 target node 的完整 frontmatter 放入 runtime content cache。`enter-phase` 在 route-bound load、`current_node` 写入和 Markdown section 组装均成功后，从该缓存项生成一个短 continuation block，并追加到 stdout 最末端。

不重新解析输出 Markdown，不从 phase 名称猜 stop，也不复制完整 autonomous contract。任何 entry/status 写入失败继续返回现有 diagnostic JSON，不能附加成功 cue。

### 4. `advance-status` 从 `rb_status.json#/current_node` 读取已加载 node

Status sync 只在 `enter-phase` 已完成后合法，因此 cue 的 target 是现有 `current_node`，而不是重新从 transition table选择 node。写 status/trace 前先读取并验证该 node frontmatter：

- non-terminal `stop: no` → execute loaded node；
- `stop: yes` → wait for user in loaded node；
- Final (`gate: null`) → terminal delivery。

如果 `current_node` 缺失、与 witnessed handoff 不一致或 frontmatter 不可读，则在 mutation 前失败；不通过 fallback 名称推断。

### 5. Work-unit claim 使用固定 post-claim cue

`operate-work-unit claim` 成功且 `claimed_count > 0` 时，在现有结果上增加 `continuation`，并绑定现成的 `claimed_work_ids`。Cue 只说立即 inspect/poll，不声称 result ready，也不新增 work-unit 字段或 lease 状态。

Claim 为空或失败时不输出成功 continuation。

### 6. 行为验证分为 deterministic output 与真实观察

Regression/integration tests 验证 cue 值、位置、失败时不误报成功，以及不改变 status/routing/work-unit authority。Controlled Agent playbook 观察真实 stop:no run 是否按 cue 继续；测试结论不得把“cue 已输出”表述成“Agent 行为已被强制保证”。

## Risks / Trade-offs

- [Risk] Cue 与原始 advice 重复或冲突 → cue 只保留一个 immediate action，原 advice 继续解释原因；测试锁定 routing 与 cue 一致。
- [Risk] 在 shared gate emit 读取 frontmatter增加失败面 → 只读取已通过 node binding 的本地 Markdown；失败时显式诊断，不猜 stop。
- [Risk] `advance-status` 的 `current_node` 旧 bundle 不完整 → fail before mutation，并要求重新消费合法 `enter-phase` handoff。
- [Trade-off] Cue 不能强制 LLM 行为 → 接受该限制，用决策点可达性和真实 controlled observation 提升可靠性，而不建设脆弱拦截系统。

## Migration Plan

1. 增加纯 continuation projection helper 和 focused unit tests。
2. 在 shared gate output、`enter-phase`、`advance-status`、work-unit claim 依次接入 cue。
3. 增加 integration tests，确认 cue 不改变原有 authority、mutation 和 exit-code contract。
4. 更新 silent/work-unit guidance 与 controlled Agent playbook。
5. 更新 CHANGELOG 和 `DPT_FRAMEWORK/RUN.md`，版本提升到 `v0.19`。

Cue 没有持久 schema migration。回滚只需移除输出 projection；现有 bundle state 不需要转换。

## Open Questions

无。后续真实 run 若仍 surfacing，应先观察具体决策点，不预先扩张为 session-level controller。
