## Why

`_backlog/plans/evidence-production-and-phase-projection-boundaries.md` 的 BUG-125 暴露了同一 queue demand 在不同时间点被不同规则判定的问题：enqueue 只作局部卡片检查，claim 才以 canonical Topic registry 和 assignment-contract resolver 作完整预检。因此一张卡可能先进入队列、通过健康投影，之后在 active window 前端失败并阻塞执行。既有 `repair --remove-stale` 也不能终止这种未 claim 的遗留卡。

## What Changes

- 抽出一个 side-effect-free 的 `admitQueueDemand` evaluator，使用已登记的 work-unit kind contract、当前 `rb_plan.md#/topic_registry` 与 queue card 的闭合输入，给出 demand 是否可被 claim 的同一确定性答案及直接失败根因。
- enqueue、queue health/check、以及 delegated work-unit claim 都调用该 evaluator；claim 仍在 mutation 前重新计算，绝不信任先前 enqueue verdict。所有已支持 kind 都必须覆盖，不能只对 `wave1_topic_deepening` 生效。
- 扩展既有 `operate-queue repair --remove-stale`：同一 evaluator 拒绝的 `active_window`/`refill_pool` 未 claim demand 可由此现有 operation 终止；`delegated_in_flight` 仍必须先走既有 work-unit terminal handling，不能被 repair 静默移除。
- 保留现有 queue schema、work-unit allocation、terminal history、actor-preflight 和 claim transaction；不新增 queue state、CLI family、terminal operation、广义 queue-drop permission、持久化 admission verdict、自动重试或用户 checkpoint。
- 这是向后兼容的 framework behavior change；apply 时版本提升至 `v0.51`，同步根 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 的 banner/release metadata。

语义层反思：`admitQueueDemand` 不是新的 queue status 或 projection，而是让 queue owner、claim owner 与 repair operator 精确回答一个有界问题：在当前 canonical contracts 下，这张尚未 claim 的 demand 能否合法进入或留在可 claim 集合。它保留 card-schema validity、canonical Topic/finding binding、kind/assignment-contract validity，以及 unclaimed demand 与 already-claimed attempt 的区别；返回一个直接 admissible/rejected verdict或明确的 missing/invalid fact，调用方无需重建 claim internals。运行时 queue 仍是 demand 位置的 Source of Record，`rb_plan.md` 和 assignment-contract registry 才是 admission truth。

最短合法闭环是 Agent 提交 card -> Engine admission -> enqueue，或 Engine 在 claim 时重算 admission -> allocate；遗留卡则 `repair --remove-stale` -> 仅移除未 claim rejected demand -> rerun queue check/claim。这样合并 enqueue 的 Wave1-only helper、claim 内部独有的 preflight entry 和 repair 的过期判断，避免三个漂移的 validator/恢复路径；没有第二 health authority 或 stored verdict。Agent 执行既有 enqueue/repair/claim 命令，Engine 给出 verdict 并执行已授权 mutation，用户只决定新的语义或权限边界，不能以 human-directed 方式越过 admission。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `queue-input-validation`: enqueue、queue health 和 `repair --remove-stale` 以同一 canonical admission verdict 判断未 claim queue demand，并维持 in-flight 的既有 terminal boundary。
- `delegated-work-units`: claim 在 work-id allocation 与任何 queue/index/envelope mutation 前复用共享 admission evaluator，对完整计划 batch 保持全有或全无。

## Impact

- 主要实现面：`DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs`、queue admission helper/contract seam、`DPT_FRAMEWORK/cli/operate-queue.mjs` 及其现有 queue health/repair paths。
- 测试面：focused evaluator unit tests，以及 enqueue/claim/repair CLI integration tests，覆盖 canonical drift、all-kind coverage、legacy unclaimable card repair、in-flight fail-closed 和 batch no-mutation；不新增 deterministic E2E 或长时间 Agent-flow 自动化。
- OpenSpec：修改既有 `QIV-001`、`QIV-004`、`DEW-003` 与 `DEW-004`；运行 verification routing、requirement governance、focused tests 与 strict spec validation。
- 不新增依赖；实现继续使用 Node.js、现有 `yaml`/`zod` 与 repo-root `tests/` 下的 `node:test`。
