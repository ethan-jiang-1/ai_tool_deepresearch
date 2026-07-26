## Context

当前 queue admission 分散在三个不等价的地方。`operate-queue enqueue` 的 topic validation 与 `validateCurrentAssignmentCard()` 只覆盖部分 card；`operate-work-unit claim` 在 `work-unit-lifecycle.mjs` 内以 canonical plan 和 assignment-contract resolver 做更强的 preflight；`repair --remove-stale` 则只认 topic/finding 已消失。结果是 queue 的位置/health projection 与当前可 claim 性不是同一个问题，遗留坏卡只能阻塞而不能经现有修复路径结束。

直接事实源不变：`rb_queue.json` 记录 demand 位置，`rb_plan.md#/topic_registry` 是 Topic identity/current slug，registered kind contract 和 `resolveWorkUnitAssignmentContract()` 是 closed assignment 语义。这个 change 不改变 Agent Flow；Agent 继续用现有 enqueue、check、claim 和 repair 命令，Engine 负责纯 verdict 与已授权 mutation。

## Goals / Non-Goals

**Goals:**

- 让 enqueue、`operate-queue check`、delegated claim 和 stale repair 对同一 unclaimed card 使用一份 canonical admission evaluator。
- 让 claim 的 batch preflight 仍在任何 work-id、queue/index/envelope transaction 或 success trace 之前完成，并保持全有或全无。
- 让 rejected 但尚未 claimed 的遗留 card 经既有 `repair --remove-stale` 终止；已 claimed demand 保持既有 work-unit terminal owner。
- 用少量 focused unit/integration proofs 覆盖 evaluator parity 和 CLI mutation boundary。

**Non-Goals:**

- 不增加 queue status、stored admission verdict、CLI、terminal-history kind、drop permission、migration 或 retry controller。
- 不修改 actor observation、lease、submit、late-submit、queue schema、kind registry 或 lifecycle routing。
- 不把 queue check 变成自动 repair，也不要求真实 Agent-flow / long-running E2E 来证明纯 deterministic contract。

## Decisions

### D1: One pure admission seam with current facts

新增内部 `admitQueueDemand({ bundleDir, queueItem })`，它读取/解析当前 canonical plan，并以现有 kind-contract 和 assignment resolver 得出 `ok` 或一个稳定 reason/fact；成功时返回 claim 已需的 kind、canonical binding 和 resolved assignment contract。它不写 queue、index、envelope、trace 或 cache，也不接受 caller-authored canonical binding/contract selector。

`topicBindingForClaim()` 和 claim assignment preflight 的重复逻辑迁入此 seam。enqueue 在写 queue 前调用，`operate-queue check` 对现有 unclaimed locations 重新调用，claim 对 planned prefix 再调用，repair 对 unclaimed locations 调用。重新计算而非存储 enqueue 结果，保留 mutable plan/contract drift 可被 claim 看见。

备选方案是在 queue item 上写 admission receipt 或只扩充 enqueue validator。前者会制造第二 truth/失效协议，后者仍让 claim 与 repair 漂移；均拒绝。

### D2: Check projects, mutation owners decide

`operate-queue check` 将 admission rejection 作为 direct inspect/check root，指出 queue item 和同一 enqueue/claim/repair legal owner，但不保存 `queue_health` 或改变 queue。enqueue 遇到 rejection 以现有 structured error/exit-1 失败且不写入；claim 将 evaluator 结果包装为 claim preflight rejection，整批无 mutation；repair 仅从 `active_window`/`refill_pool` 删除 rejected unclaimed cards 并在 summary 给出 reason。

这保留了 reader 可精确回答的 bounded question，却不把 health projection 升格为新状态。备选方案是在 `syncQueueHealth()` 内持久化 admission health 或 check 时直接删卡，会产生 derived state 或隐式 terminalization，因此拒绝。

### D3: In-flight is a hard ownership boundary

repair 会对 `delegated_in_flight` 以同一 evaluator 检查，但一旦发现 rejection 仍 fail closed，并指向 work-unit terminal handling；它绝不删除/改写 in-flight binding。仅尚未 claim 的 card 可以被 `--remove-stale` 移除，且无需新 terminal operation 或 terminal history row。

这区分“没有分配尝试的 demand”与“已有 Engine-owned attempt”的责任边界。备选的 broad `queue drop` 会绕过 receipt/provenance/attempt terminal truth，故不采用。

### D4: Minimal verification routing

选择一个 `unit` test 直接覆盖 evaluator 的 kind/Topic/assignment parity 和无 side effect；选择一个 `integration` CLI test 覆盖 enqueue rejection、check diagnosis、claim batch atomicity、repair removal 与 in-flight fail-closed。`deterministic_e2e` 和 `agent_flow_e2e` 明确 `not_applicable`：没有新的 workflow chain 或 Agent judgment，且长链不能额外证明该 pure contract。

## Risks / Trade-offs

- [A helper becomes a shallow wrapper] -> 仅当它返回 claim 所需的 resolved facts，并删除 claim/enqueue/repair 的重复 validation；否则合回实际 owner。
- [Current plan parsing makes check fail broadly] -> evaluator 对每一 card 返回一个 direct root；check 报告 issue，不写 runtime state，enqueue/claim 保持 fail closed。
- [Repair removes a card that an actor already owns] -> repair 对每个 in-flight entry 先检查并 fail closed；只有 queue v2 unclaimed locations 可被过滤。
- [Tests duplicate production validation] -> unit 只测 evaluator contract；integration 一律调用 production CLI，不在 fixture 里重写 resolver 或 repair logic。

## Migration Plan

1. Apply 开始前运行 verification-plan plan validation 与现有 queue/work-unit focused baseline；记录目标 manifest 中新增的 shared evaluator，及删除的 enqueue Wave1-only helper/claim-local binding path。
2. 先添加 unit tests 与 pure evaluator，把 claim preflight 迁入后保持 no-mutation failure；随后接入 enqueue、check、repair 并添加 CLI integration tests。
3. 更新 QIV/DEW traceability comments、release metadata `v0.51` 与最小 command guidance；不迁移现有 queue bytes，legacy invalid unclaimed cards 留给显式 existing repair。
4. 运行 selected tests、routing assets validation、requirement/spec governance、strict OpenSpec validation 和 diff check；出现 regression 时回滚 helper 接入即可，因为没有新持久化 state 或 migration。

## Open Questions

无。现有 kind contracts 与 assignment resolver 是 admission source，Change 3 的 evidence ownership/projection 工作不在本 change 内。
