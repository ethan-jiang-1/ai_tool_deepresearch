## Why

来源：`_backlog/bugs/BUG-072-agent-surfaces-after-gate-pass-violates-stop-no-contract.md`、`BUG-074-agent-surfaces-after-wave0-gate-pass-stop-no-anatomy.md`。现有 `shared-silent-execution`、autonomous header、`surfacing_intent` 和 active-poll 指令已经存在，但真实 Agent 仍会在 gate pass/fail/stall 或 work-unit spawn 后浮出；继续扩写长文档无法解决“规则离实际决策点太远”的问题。

这个 change 只把一个极短、由当前 checkpoint 直接推导的 continuation cue 放到 Agent 正要决定下一步的输出末端，不建设聊天拦截器或新的 stop 状态机。

## What Changes

- Gate check output 在 stop:no pass/fail 时返回直接 interaction/next-action cue：禁止 user-facing pause，并分别指向 consume-next 或 repair-and-rerun。
- Phase entry/status synchronization output 重申当前已加载 target node 的 `stop` contract 与立即下一动作，避免 status JSON 成为无语义的最后上下文。
- Work-unit claim 输出增加静态 continuation cue：立即 inspect/poll claimed work units，不等待用户或 task notification。
- Cue 只读取 node frontmatter、current command outcome 和直接 runtime fact；不写新持久状态，不推断 token/context/Agent intent。
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

- 预计影响 shared gate result builder、phase entry/status CLI、work-unit claim CLI 输出、silent guidance 与相关 integration tests。
- Gate、transition、queue、work-unit authority 不变；cue 是 Agent-facing feedback，不是新的路由或完成证明。
- JS tests 只能证明 cue 可达与取值正确；真实 Agent 是否仍浮出必须通过 controlled/real run 观察，不能用模拟行为 overclaim。
