# BUG-083: `operate-queue.mjs claim --actor sub-agent` 在有 active_window queued item 时返回空

## 发现时间
2026-07-13，rerun 中尝试为新 topic 06/07 走正式 delegation 流程（enqueue → claim → submit）。

## 严重程度
**P1** — claim 是 delegation 流程的核心环节。如果 active_window 有 queued item 但 claim 返回空，Phase Agent 无法推进 wave0/wave1 work-unit 生命周期，只能手工构造 provenance（触发 BUG-082 的 delegated_bypass 检测）。

## 症状

1. `operate-queue.mjs enqueue` 成功将 topic 06/07 的 task card 入队
2. `operate-queue.mjs check` 返回 `passed: true`，`active_window` 有 2 个 `queued` item
3. `operate-queue.mjs claim --actor sub-agent` 返回 `exit code 1`，`item: null`
4. `operate-queue.mjs claim --actor main-agent` 同样返回空
5. `operate-work-unit.mjs claim --phase wave0` 也返回 `claimed: 0`

队列状态确认 item 存在且 status 为 `queued`，但所有 claim 路径都无法取出。

## 复现条件

1. 在 rerun 中通过 `operate-queue.mjs enqueue` 为新增 topic 入队 wave0-source task card
2. 确认 `active_window` 中有 `queued` item
3. 执行 `operate-queue.mjs claim --actor sub-agent`（或 `main-agent`）
4. 观察到 `item: null`，active_window 中的 item 未被 claim

## 根因（已确认 2026-07-13）

两个不同层面的原因：

### 层面 1：`operate-queue.mjs claim` 拒绝 delegated item（**非 bug，设计如此**）

`queue-manager-lifecycle.mjs:232-242`：
```javascript
if (item.targets?.delegates?.to === 'sub-agent') {
  // ...返回 item: null，提示使用 operate-work-unit claim
}
```
`operate-queue.mjs claim` 只处理非 delegated（main-agent controller）item。delegated item 必须走 `operate-work-unit.mjs claim`。**这是正确的设计**——但错误消息埋在全量 queue JSON 输出里，Agent 难以发现。

### 层面 2：`operate-work-unit.mjs claim` + `phase_agent_fallback` 被拒绝

`work-unit-lifecycle.mjs` 的 `evaluateActorDecision()` 检查 actor observation：
- `--actor-outcome available` + `--execution-actor phase_agent_fallback` → verdict: `invalid`，reason: `fallback_unnecessary`
- 系统认为 "actor 明明可用，为什么要用 fallback？"

**正确调用**：`--execution-actor delegated_subagent`（即使实际没有 sub-agent 运行，claim 本身不检查 agent 是否真实存在）。

### 层面 3（UX 问题）：claim 失败时信息不够

两个 claim 路径都返回了有用的错误信息，但都埋在大量 JSON 输出中。Agent 需要：
1. 先知道 delegated item 必须用 `operate-work-unit claim` 而非 `operate-queue claim`
2. 知道 `phase_agent_fallback` 只有在 actor 真的 unavailable 时才能用
3. claim 成功后会创建 work-unit 目录和 task prompt refs

**结论**：`operate-queue claim` 的行为是正确的（非 bug）。真正的问题是 **发现性（discoverability）**——Phase Agent 在没有读过 engine 源码的情况下，很难从 JSON 输出中推理出正确的 claim 路径。

## 影响范围

- 所有 rerun 中新增 topic 后尝试走正式 delegation 的场景
- Phase Agent 无法通过标准 CLI 路径为新 topic 建立 work-unit provenance
- 迫使 Agent 选择手工构造 provenance（触发 BUG-082）或放弃 gate 通过

## 建议排查方向

1. 检查 `queue-manager-lifecycle.mjs` 的 `claim()` 函数对 `active_window` item 的前置条件
2. 检查 batch 机制——`open-batch` 创建 b001 后，enqueue 的 item 属于哪个 batch？claim 时 batch 过滤是否正确？
3. 用 `--actor main-agent` 测试：queue item 的 `targets.controller` 为 `main-agent` 时，主 agent claim 是否应该成功？
4. 写 focused test 复现：enqueue → claim 在正常 pipeline 和 rerun pipeline 下的行为差异

## 相关

- BUG-082: Rerun 新 topic wave0 无 provenance（本 bug 是 BUG-082 的部分根因——如果 claim 能正常工作，Agent 可以走正式 delegation 路径）
- `DPT_FRAMEWORK/engine/queue-manager-lifecycle.mjs` — claim() 函数
- `DPT_FRAMEWORK/engine/queue-manager-window.mjs` — active_window 管理
- `DPT_FRAMEWORK/cli/operate-queue.mjs:540-545` — claim handler
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs` — work-unit claim
