## Why

`_backlog/plans/evidence-production-and-phase-projection-boundaries.md` 的 BUG-125 暴露了同一**delegated** queue demand 在不同时间点被不同规则判定的问题：enqueue 只作局部卡片检查，`operate-work-unit claim` 才以 canonical Topic registry 和 assignment-contract resolver 作完整预检。因此一张尚未 claim 的 delegated card 可能先进入队列、通过健康投影，之后在 active window 前端失败并阻塞执行。既有 `repair --remove-stale` 也不能移除这种遗留 demand。

## What Changes

- 抽出一个 side-effect-free 的 `admitQueueDemand` evaluator，使用已登记的 delegated work-unit kind contract、当前 `rb_plan.md#/topic_registry`/finding index 与 delegated queue card 的闭合输入，给出 demand 是否可进入 work-unit claim 的同一确定性答案及直接失败根因。
- enqueue、queue health/check、以及 delegated work-unit claim 都对尚未 claim 的 delegated demand 调用该 evaluator；claim 仍在 mutation 前重新计算，绝不信任先前 enqueue verdict。delegated card 必须显式声明三个既有 work-unit kind 之一，移除 claim 按请求 phase 默补 kind 的歧义，不能只对 `wave1_topic_deepening` 生效。non-delegated queue card 继续使用其既有 enqueue/completion contract，绝不经过 work-unit assignment resolver。
- 扩展既有 `operate-queue repair --remove-stale`：同一 evaluator 拒绝的 `active_window`/`refill_pool` 未 claim delegated demand 可由此现有 operation 移除。`delegated_in_flight` 仍由既有 work-unit terminal handling 拥有，repair 不会以 current admission 重判、静默移除或改写它。
- 保留现有 queue schema、work-unit allocation、terminal history、actor-preflight 和 claim transaction；不新增 queue state、CLI family、terminal operation、广义 queue-drop permission、持久化 admission verdict、自动重试或用户 checkpoint。
- 这是向后兼容的 framework behavior change；apply 时版本提升至 `v0.51`，同步根 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 的 banner/release metadata。

语义层反思：`admitQueueDemand` 不是新的 queue status 或 projection，而是让 queue owner、claim owner 与 repair operator 精确回答一个有界问题：在当前 canonical contracts 下，这张**尚未 claim 的 delegated** demand 能否合法进入或留在可 claim 集合。它保留 existing non-delegated card、delegated unclaimed demand 与 already-claimed attempt 的区别，以及会改变 delegated admission 的 card shape、canonical Topic/finding binding 和 kind/assignment-contract facts；返回一个 direct admissible/rejected result，调用方无需重建 claim internals。运行时 queue 仍是 demand 位置的 Source of Record，`rb_plan.md`、finding index 和 assignment-contract registry 才是 admission truth。

最短合法闭环是 Agent 提交 delegated card -> Engine admission -> enqueue，或 Engine 在 claim 时重算 admission -> allocate；遗留 delegated card 则 `repair --remove-stale` -> 仅移除未 claim rejected demand -> rerun queue check/claim。这样合并 enqueue 的 Wave1-only helper、claim 内部独有的 preflight entry 和 repair 的过期判断，避免三个漂移的 validator/恢复路径；没有第二 health authority 或 stored verdict。Agent 执行既有 enqueue/repair/claim 命令，Engine 给出 verdict 并执行已授权 mutation，用户只决定新的语义或权限边界，不能以 human-directed 方式越过 admission。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `queue-input-validation`: enqueue、queue health 和 `repair --remove-stale` 以同一 canonical admission verdict 判断未 claim delegated queue demand，并维持 non-delegated card 与 in-flight 的既有 owner boundary。
- `delegated-work-units`: claim 在 work-id allocation 与任何 queue/index/envelope mutation 前复用共享 admission evaluator，对完整计划 batch 保持全有或全无。

## Impact

- 主要实现面：`DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs`、queue admission helper/contract seam、`DPT_FRAMEWORK/cli/operate-queue.mjs` 及其现有 queue health/repair paths。
- 测试面：focused evaluator unit tests，以及 enqueue/claim/repair CLI integration tests，覆盖 canonical drift、三个 work-unit kind、legacy unclaimable delegated card repair、non-delegated preservation 和 batch no-mutation；不新增 deterministic E2E 或长时间 Agent-flow 自动化。
- OpenSpec：修改既有 `QIV-001`、`QIV-004` 与 `DEW-003`；运行 verification routing、requirement governance、focused tests 与 strict spec validation。
- 不新增依赖；实现继续使用 Node.js、现有 `yaml`/`zod` 与 repo-root `tests/` 下的 `node:test`。
