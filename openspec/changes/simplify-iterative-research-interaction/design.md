## Context

当前 lifecycle 已经有正确的结构骨架：`phase-hitl1.md` 和 `phase-hitl2.md` 是仅有的两个 in-run `stop: yes` 决定点，其他非终端 phase 为 `stop: no`，Final 是 `stop: no` + `gate: null` 的 terminal delivery exception。HITL durable decision 已由 `rb_profile.yaml` 和对应 Gate 持有，HITL2 `proceed_to_readiness` / `rerun` 已有 deterministic `check.next` 路径。

问题主要在 Agent-facing projection，而不在 lifecycle machinery：

- `hitl-ux` 和 shared UX 强制字母菜单、英文内部分类与统一二次确认，使 Agent 不能把已清楚的自然语言决定直接映射到现有 contract。
- `silent-wave-execution`、`shared-silent-execution.md` 和 Engine 注入 header 把“不主动打扰”表达成“不允许任何回应”，并明确要求忽略用户主动消息。
- 无状态 continuation projection 的 `interaction: prohibited` 在 Gate、`enter-phase`、`advance-status` 和 work-unit claim 边界重复这个过度语义。
- `phase-rerun.md`、shared silent prose、requirement registry 和 rerun-ready integration tests 仍保留旧 `<3` 常量，而 active Gate definition 的 `less_than: 11` 才是当前 executable Source of Record。

本 design paired-read `guidelines/evolution-simple-reliable-control.md` 和 `guidelines/evolution-helper-oriented-agent.md`。它不增加 interaction controller，而是删除重复控制，并把 Agent/user/Engine 责任放回现有 owner。

## Goals / Non-Goals

**Goals:**

- 固定一个默认协作节奏：HITL1 对齐研究 -> Agent 静默自主研究 -> HITL2 审阅/决定 -> Final 终端交付或现有 rerun path。
- 让 HITL1/HITL2 以 Agent 对当前 direct facts 的一个推荐为起点，支持自然语言接受/修正，但不替用户发明新研究语义。
- 只在实质歧义、新风险/成本/权限或不可逆边界请求最小确认；清楚决定后所有合法机械执行立即回到 Agent。
- 保留 `stop:no` 禁止 unsolicited surfacing 和自主 repair/continue 的约束，同时允许对用户主动发来的当前 conversation turn 做正常回应。
- 使 accepted spec、shared Markdown、Engine header 和 continuation cue 对同一行为使用同一含义。
- 只清理 rerun-limit drift，不改变当前 limit 或 guard。

**Non-Goals:**

- 不新增第三个 HITL、第三种 `stop`、lifecycle node、transition outcome、Gate、CLI、profile field 或 schema version。
- 不新增 mid-run message queue、pause/resume state、interrupt transport、scope-mutation controller、watcher、planner、memory 或 retry/recovery tree。
- 不承诺用户中途消息会持久化、更改当前 run 或立即获得 mutation/reentry path。
- 不改变 HITL enum、profile schema、Gate rule set、transition table、receipt、trace authority 或 Final terminal semantics。
- 不在此 change 系统解决 `request_view_revision`、`repair`、`stop_blocked` 三个 context-dependent branch 的全部可达性；强 end-to-end route 承诺仍仅针对 `proceed_to_readiness` 和 `rerun`。
- 不新增 evolution guideline，不用 guidance prose 代替 accepted behavior。
- 不改变 active rerun limit，不删除 loop protection。

## Decisions

### 1. 一个 change 交付一个完整的纵向体验

这个 change 同时修改 HITL1、silent middle 和 HITL2，因为用户可感知的原子结果是：

```text
HITL1 recommendation + user intent
  -> existing profile/topic owners
  -> silent autonomous execution
  -> HITL2 review + one recommendation + user intent
  -> existing decision/Gate/route
```

把它拆成“只改 prompt”、“只改 silent”和“只改 rerun UX”会留下互相矛盾的中间体验。但这个 change 不吸收 durable mid-run intervention、rerun product policy 或 context-dependent branch redesign；它们没有同一个 direct owner。

替代方案：拆成三个 change。不采用，因为任意一步单独 archive 都会让 accepted surfaces 在一段时间内对“什么时候回应/等待用户”给出不同答案。

### 2. 不创建新 capability，局部修改现有 Source of Record

`iterative research interaction` 是一个产品主题，不是独立行为 owner。HITL 对话仍属于 `hitl-ux`，phase 责任仍属于 pre-research/content-delivery specs，静默自律仍属于 `silent-wave-execution`，cue 仍属于现有 phase-transition/work-unit projection contract。

所有 delta 复用现有 requirement ID，不新分配 ID。`project-charter.md` 只增加一段稳定姿态，具体行为以本 change 归档后的 accepted specs 和 executable contracts 为准。

替代方案：新增 `iterative-research-interaction` capability 和 guideline。不采用，因为它会复制九个现有 owner 的行为，创造第二套 Source of Record。

### 3. HITL 以 Agent 的一个推荐开始，内部 enum 只是出口 contract

HITL1 入口先展示 Agent 对初始问题的理解和一个推荐设置：研究目标、must-answer、topic preview、建议的深度/广度及影响。HITL2 入口先展示当前可靠结论、限制/争议、最有边际价值的一个下一步及理由。

用户可直接说“按这个开始”、“按这个出报告”或自然语言修正。Agent 在 HITL1/HITL2 accepted boundary 内负责将语义映射到现有 enum/fields，内部 canonical 名不作为用户必须学习的主界面。字母快捷选项可作辅助 affordance，但不得替代推荐与自然语言。

替代方案：删除 enum 或新增一个 natural-language schema field。不采用，因为现有 enum 是有效的 machine contract，新字段只会复制决定真相。

### 4. 删除 blanket confirmation，保留最小风险边界

用户已经清楚说“按这个开始”或“继续补资本约束”时，Agent 直接映射、记录并执行，不再问一次无信息增益的“确定吗”。若表达存在实质歧义，或会扩大真实成本/权限、触发不可逆风险，Agent 仅问那个最小边界。

这不是“所有选择都不确认”的新 blanket rule。HITL1/HITL2 的责任是得到清楚的研究语义，而不是满足一个固定轮数。

### 5. Silent 只禁止 framework-initiated surfacing

非终端 `stop:no` 的稳定不变式是：没有用户主动输入时，Agent 不发进度、idle、partial delivery、普通错误求助或继续确认；它应修复、换策略、消费合法 handoff 或 silent hold。

若用户在正常 conversation/message boundary 主动发来消息，Agent 可以回应该回合。回应不将当前 node 转为 `stop:yes`，不创建 HITL loop、permission、state transition、mutation/reentry authority 或持久 intent。用户没有另行改变任务时，原 run 继续保持静默自主。若用户要求的动作没有现有 accepted path，Agent 说明最小边界，不伪造执行。

`surfacing_intent` 仅用于 Agent 自己准备发起 prohibited progress/question/partial-delivery 时；不应对“回应一条用户主动消息”记录 would-have-surfaced 违规。Harness/task notification 仍不等于用户在 conversation 中的主动消息，不得触发 status reply。

替代方案：新增 pause/interruption state 或 message queue。不采用，因为“可以回答用户”不需要新 runtime truth。

### 6. Continuation projection 保留，`prohibited` 改为 `do_not_initiate`

无状态 continuation cue 仍然有价值：它在 Gate、phase entry/status sync 和 work-unit claim 的立即决策点提供一个 `next_action`，抑制 Agent 因上下文疲劳而主动浮出。但 `interaction: prohibited` 同时声称“任何 interaction 都禁止”，与新不变式冲突。

因此 stop:no 投影统一为：

```json
{
  "interaction": "do_not_initiate",
  "next_action": "execute_loaded_node|consume_check_next|repair_and_rerun_gate|inspect_and_poll_claimed_work"
}
```

`do_not_initiate` 是 Agent-facing enum projection，只说“不要主动联系用户”。`required` 继续表示已加载 HITL node 的最近动作是等待用户，`terminal_delivery` 继续表示 Final 交付；全部 `next_action`、locator、Gate/status/work-unit authority 不变。

这是 breaking output-token migration，但不是状态/schema migration。仓库内没有生产 machine consumer 依赖 `interaction` 分支；现有 consumers 是 Agent-facing docs、tests 和 experiment assertions，将在同一 apply 中原子更新。

替代方案 A：保留 `prohibited` 并加一段解释。不采用，因为 token 本身仍持续制造歧义。替代方案 B：删除 `interaction` 字段。不采用，因为它会删除已通过真实 Agent 问题引入的决策点防疲劳提醒，而精确 rename 已能解决问题。

### 7. Engine 不获得新的 interaction 判断职责

Engine 仍只从已拥有的 node frontmatter 和 command outcome 投影 cue。它不读 conversation、不判断一条消息是否来自用户、不拦截 chat、不暂停执行，也不保存 interaction state。

`AUTONOMOUS_MODE_HEADER` 与 `shared-silent-execution.md` 作为 Agent-facing guidance 同步更新：禁止 Agent 主动发起询问/进度/确认，但明确对用户主动回合的正常回应不在此禁令中。不增加新 header、shared node 或 checker。

### 8. Rerun limit 只保留一个数值真相

`gate-rerun-ready.definition.json` 的 active `rerun_count_valid` rule 是当前 limit 唯一 Source of Record。Phase/shared Markdown 不再写具体 `<3` 或 `>=3`，只引用 active max-rerun rule/CLI feedback。Requirement registry 中 REI-003/REI-005 的描述改为不硬编码数值的 stable semantics。

Rerun-ready integration test 在运行时读 active definition，提取 `less_than` 边界，并验证 `limit - 1` 通过、`limit` 和 `limit + n` 失败。不新建 max-rerun helper 或第二个 config field。

替代方案：在文档/测试 helper 中各保留一个常量。不采用，因为这正是本次 drift 的原因。

### 9. 验证分为确定性 contract 与真实 Agent 观察

- `unit`：continuation pure projection 覆盖 `do_not_initiate|required|terminal_delivery`、原 `next_action` 不变和未知 frontmatter fail-closed。
- `integration`：真实 Gate/`enter-phase`/`advance-status`/claim stdout 与 Markdown/header/HITL docs 同步；rerun boundary test 从 active definition 读取边界。
- `deterministic_e2e`：不选择。本 change 不改变 transition 或多 phase deterministic state chain，现有 rerun chain 已有验证；重复一条 JS-led chain 不能证明自然语言 Agent 行为。
- `agent_flow_e2e`：使用真实 coding Agent 和 disposable bundle 观察 HITL1 自然语言接受 -> Agent 持久化/Gate/continue，以及 HITL2 自然语言 rerun -> Agent 持久化/Gate/handoff。另一个受控 conversation turn 只裁决“没有新 HITL/state/permission”和对当前 direct facts 的回应，不声称存在 async interrupt transport。

Deterministic assertions 只能证明 prompt/cue/owner 可达，不能声称真实 Agent 一定不主动浮出。Agent behavior verdict 必须来自真实 transcript + bundle/trace、Gate output 等 direct evidence，不用 mock 或手写结果。

### 10. Apply target manifest

Apply 开始时用一份受任务追踪的 target manifest 核对控制面，但不新建 runtime manifest。目标形状为：

| Control surface | Add | Remove / narrow | Unchanged authority |
|---|---|---|---|
| HITL prompts/phase guidance | Agent one-recommendation + natural-language mapping | enum-first UI and blanket confirmation | profile fields, Gate, enum set |
| Silent shared/header guidance | explicit user-initiated-turn exception | absolute no-reply / user-unavailable wording | stop:no autonomy, repair/continue/hold |
| Continuation projection | `do_not_initiate` token | `prohibited` token | stateless helper, `next_action`, locators |
| Iterative positioning | short Charter/RUN/README posture | one-shot or enum-console framing | guidance/spec authority order |
| Rerun limit references | active-definition lookup/reference | duplicated numeric constants | active Gate rule and loop protection |

Apply 中一旦需要新建 state、CLI、Gate、transition、message transport 或持久 intent，说明已超出本 design，必须停止并回到 Explore/Proposal，不得在实现中顺手增长。

## Risks / Trade-offs

- [Risk] `do_not_initiate` 仍可能被误读为“不要互动” -> accepted spec、shared header 和 cue docs 同时给出单一定义：只禁止 framework-initiated surfacing；focused tests 禁止旧 absolute wording。
- [Risk] 用户主动消息被误当成 mid-run mutation permission -> spec 明确回应不改变 run，任何后续动作必须通过现有 accepted owner/path；没有 path 时报告边界。
- [Risk] 去掉统一二次确认导致 Agent 过度猜测 -> 只在语义清楚时直接记录；实质歧义或新风险/成本/权限仍必须问最小确认。
- [Risk] HITL 推荐被误当成 Agent 代替用户决定 -> recommendation 仅是 conversation projection，用户接受/修正后才进入 durable owner。
- [Risk] cue token 变更破坏仓库内 assertion -> 在同一 apply 中原子更新 helper、specs、docs、tests 和 controlled playbook；version bump 到 v0.32。
- [Risk] 验证为了模拟“随时插话”而建 async harness -> agent_flow case 只使用正常 conversation turn 边界，明确不证明中断传输、暂停或持久化。
- [Trade-off] context-dependent HITL2 branch 仍可能存在可达性缺口 -> 保留诚实边界，不用一个 generic controller 在本 change 中掩盖它们。
- [Trade-off] 用户中途提供的新语义可能不会立即进入当前 run -> 本 change 优先修正交谈体验，而不在没有真实需求证据前建设 durable interrupt subsystem。

## Migration Plan

1. 在 apply 开始前运行 verification routing plan check，并用 target manifest 复核没有新 runtime control surface。
2. 先更新 accepted-owner 对应的 Markdown/Agent Flow 和 focused tests：HITL UX、HITL1/HITL2 phase/brief、silent shared/header。
3. 在一个原子实现步骤中将 continuation helper 的 stop:no token 改为 `do_not_initiate`，并同步所有 Gate/entry/status/claim tests 和 Agent-facing consumers。
4. 清理 rerun-limit 副本，使 boundary test 读 active definition；运行 focused regression 证明 active limit 本身未改变。
5. 更新 Charter/RUN/README/COMMANDS 等高频表面、`CHANGELOG.md` 和 v0.32 banner。
6. 执行 focused unit/integration 与真实 agent-flow playbooks，再运行 verification assets check、OpenSpec/governance 检查。

回滚时可原子恢复 cue token 与对应 docs/tests；本 change 无 bundle state 或 schema migration，不需要转换已有 runtime bundle。但若 rollback 恢复 `prohibited`，必须同时恢复对应 accepted semantics，不得留下 token 与 prose 含义冲突。

## Open Questions

无。首个 change 的边界已固定：只有 HITL1/HITL2 是框架主动等待用户决定的位置；silent middle 不主动打扰；用户主动回合可以回应但不创建 lifecycle/authority；Final 仅交付。
