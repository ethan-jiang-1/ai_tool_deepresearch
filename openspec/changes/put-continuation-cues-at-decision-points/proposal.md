## Why

来源：`_backlog/bugs/BUG-072-agent-surfaces-after-gate-pass-violates-stop-no-contract.md`、`BUG-074-agent-surfaces-after-wave0-gate-pass-stop-no-anatomy.md`。现有 `shared-silent-execution`、autonomous header、`surfacing_intent` 和 active-poll 指令已经存在，但真实 Agent 仍会在 gate pass/fail/stall 或 work-unit spawn 后浮出；继续扩写长文档无法解决“规则离实际决策点太远”的问题。

当前基线已经是 Change1 `v0.17` + Change2 `v0.18`：Wave gate/inspect 已收敛到 shared evaluator / formal wrapper / inspect wrapper 分层，HITL1 已用 `research_access.status` fail-fast 阻止无真实研究能力进入 silent waves。因此本 change 只能把已有 deterministic checkpoint 的直接事实投影为 Agent-facing cue，不能重新引入第二套路由、第二套 root-cause 判断、capability controller 或 session-level recovery。

这个 change 只把一个极短、由当前 checkpoint 直接推导的 continuation cue 放到 Agent 正要决定下一步的输出末端，不建设聊天拦截器或新的 stop 状态机。

## What Changes

- Gate check output 在 stop:no pass/fail 时返回直接 interaction/next-action cue：禁止 user-facing pause，并分别指向 consume-next 或 repair-and-rerun；cue 不读取 `failed_rule_ids`/`masked_rule_ids` 作为新 verdict，只与现有 `check.passed`、`check.next` 和 current node frontmatter 对齐。
- `enter-phase` 成功 Markdown 输出重申当前已加载 target node 的 `stop`/terminal contract 与立即下一动作，避免 loaded Markdown 之后最后缺少短 cue。
- `advance-status` 只在 covered trace-backed handoff 已由 `enter-phase` 写入 `rb_status.current_node` 且 current node 与 handoff target 一致时输出 loaded-node cue；bootstrap compatibility status sync 不得凭 manifest/chain 猜测已加载 node。
- Work-unit claim 输出增加静态 continuation cue：立即 inspect/poll claimed work units，不等待用户或 task notification。
- Cue 只读取 node frontmatter、current command outcome、route-bound handoff/current-node fact 和直接 claim result；不写新持久状态，不推断 token/context/Agent intent。
- `surfacing_intent` 只作为“想浮出时记录并取消消息”的诊断入口，不成为许可或路由系统。
- 不拦截 chat、不新增 session manager、watcher、daemon、stop state machine 或自动上下文路由。
- Framework behavior changes require a version bump; target version: `v0.19`.

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `silent-wave-execution`: stop:no 的 interaction prohibition 与立即 continuation cue 在 checkpoint 输出中可达。
- `cli-phase-transition`: phase entry/status sync 输出 target node 的 stop contract 与继续动作，但不替 Agent 执行 phase。
- `delegated-work-units`: claim 成功后给出静态 poll/inspect cue，不把 notification 当继续条件。

## Impact

- 预计影响 shared gate result construction/projection helper、`enter-phase`、covered `advance-status` success output、work-unit claim CLI/engine output、silent guidance 与相关 integration tests。
- Gate、transition、queue、work-unit authority 不变；cue 是 Agent-facing feedback，不是新的路由或完成证明。
- JS tests 只能证明 cue 可达与取值正确；真实 Agent 是否仍浮出必须通过 controlled/real run 观察，不能用模拟行为 overclaim。
