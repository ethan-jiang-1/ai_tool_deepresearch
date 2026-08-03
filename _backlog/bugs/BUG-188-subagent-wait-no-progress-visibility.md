---
bug_id: BUG-188
title: "Sub-agent wait has no progress visibility — static TUI indicator indistinguishable from agent freeze"
severity: P3
discovered: 2026-08-03
bundle: dpt_rb_agentic-rd-org-delivery-systems-2026
phase: wave0
node: phases/phase-wave0.md
related: BUG-099 (historical wave0 halt), BUG-187 (HITL1 probe opacity)
---

# BUG-188: Sub-agent wait — no progress visibility

## 现象

Wave0 phase 中，主 Agent spawn 5 个 `dpt-source-intake` sub-agent 后进入 wait
状态。TUI 显示 "✻ Waiting for 5 background agents to finish"，然后——

什么都不会再动了。没有闪烁、没有动画、没有进度更新、没有"2/5 done"计数。
用户合理怀疑主 agent 是否 freeze/死锁了。

## 实际情况（不是 freeze）

验证 `_work_units/wave0/*/runtime-receipt.jsonl` 确认 sub-agent **确实在活跃工作**：

- Topic 01: 3 批 search 完成，每批 4 条
- Topic 03: 搜索阶段完成（50 条），已进入 fetch 阶段
- Topic 05: 3 批 search 完成，每批 40 条
- 所有 5 个 work unit status 为 `claimed`（非 `done`）

主 agent 在 host 平台层面调用 `agent_wait` 阻塞等待 sub-agent completion
notification。这不是 freeze——主 agent 在等待合法的异步完成事件。

## 根因

三种力量互相作用产生的 UX 缺口：

1. **DPT 框架设计意图**：`phase-wave0.md` §3 step 7 要求 "Actively poll
   result/receipt/output/cache readiness"—主 agent 应该主动轮询
2. **Host 平台 wait 原语**：当前 LLM agent host 的 `agent_wait` 是阻塞式的——主
   agent 在 sub-agent 完成前不能执行 tool call，因此不能"active poll"
3. **静默执行约定**：框架禁止在非 HITL phase 向用户发送进度消息，导致即使有进
   度信息也不会展示

结果是：用户看着一个静态屏幕等 5-10 分钟，不知道框架在工作还是死了。

## 影响

- **P3**（非阻塞）：sub-agent 正常工作，最终会完成。gate 也会 pass。
- 但用户信心被严重破坏——历史 BUG-099 已经证明：当用户在 `stop: no` phase
  看不到进展时，倾向于手动干预，破坏框架的执行合约
- 和 BUG-187（HITL1 probe 不透明）属于同一家族：框架 plumbing 向用户暴露
  不足（进度不可见）或过多（probe 搜索暴露无关内容），两个极端

## 建议修复方向

1. **TUI 层面**（最直接）：让 wait 指示器有动画——spinner、闪烁、进度条。
   至少让用户能区分 "waiting（正确）" 和 "frozen（bug）"

2. **Agent 行为层面**：在进入阻塞式 `agent_wait` 之前，用 `operate-work-unit
   inspect` 抓一次快照并输出一段简洁的当前状态：

   > "5/5 sub-agents running. Topic 03 already fetching pages (ahead).
   > Other 4 still searching. ETA ~3-8 min."

   这违反了静默执行约定，但对于 5-10 分钟的等待来说，一次状态快照的代价
   远低于用户怀疑框架崩溃然后手动重启的代价

3. **框架层面**（更彻底）：让 Phase Agent 不用阻塞式 `agent_wait`，而是用
   `operate-work-unit inspect` 做主动轮询循环——每 30-60 秒检查一次
   `_status.json` 和 runtime-receipt，输出最小进度更新（如 "2/5 done, 3/5
   in progress"）。但这对 agent context window 有压力，需要评估成本

## 代码核查结论（2026-08-03）

通读了 Engine 层的完整链路：`operate-work-unit.mjs`（CLI 入口）→
`work-unit-core.mjs`（barrel）→ `work-unit-inspect.mjs`（inspect）→
`work-unit-timeout-preflight.mjs`（超时预检）→ `work-unit-submit.mjs`
（dry-submit/submit）。结论如下：

### Engine 逻辑本身没有缺陷

- **`inspectWorkUnits` 是纯轮询工具**：读 index/status/beacon/manifest/ledger，
  检查 deadline 过期和身份漂移，无阻塞、无等待、无副作用。它是可重复调用的
  状态快照工具。
- **`timeout-preflight` 是 progress-aware 的**：它会读 `runtime-receipt.jsonl`
  的 receipt 事件、`rb_trace.jsonl` 的 progress 事件、result 文件和 output/cache
  的 mtime，计算 `latest_engine_observed_progress_at`。只要有近期 progress，
  就延长 idle lease 并推荐 `wait`；只有 lease 真正过期且无 progress 时才推荐
  `timeout`。我们确认了 5 个 sub-agent 的 receipt 一直在写（search_batch_done /
  fetch_batch_started），所以引擎会一直推荐 `wait`，不会误杀活跃任务。
- **dry-submit/submit 有明确的 read-repair-rerun 循环**，同一 work_id 的
  candidate 可以无限修复重试，没有"等太久就丢结果"的路径。

### 真正的问题在别处：框架要求主动轮询，但 host 的 wait 是阻塞的

`phase-wave0.md` step 7 和 `shared-subagent-protocol.md` step 8 都明确要求
Agent "Actively poll ... without waiting for user continuation or task
notification"——**框架的设计意图是主 Agent 循环调用 `operate-work-unit inspect`
来自行轮询**。但实际运行时，host 平台（Codex/Claude CLI）提供了
`agent_wait` 原语，主 Agent 用它阻塞等待 sub-agent 完成通知。这就是矛盾点：

- 框架假设的模型：Agent 自主轮询 → 每轮都能输出 "2/5 done" 之类
- 实际发生的模型：Agent 调用 `agent_wait` → TUI 显示静态 "Waiting..." →
  主 Agent 在 sub-agent 完成前不能执行任何 tool call

所以这不是"纯 TUI 动画问题"，也不是"Engine 逻辑 bug"，而是**框架的
执行模型假设与 host 平台的 wait 原语不匹配**——框架文档写的是"主动轮询"，
但代码和 host 能力让 Agent 自然倾向"阻塞等待"，而阻塞等待没有可见进度。

### 三个层面各是什么问题

| 层面 | 是什么 | 是否缺陷 |
|------|--------|----------|
| Engine 逻辑（inspect/preflight/submit） | 进度感知、可轮询、可修复 | 无缺陷 |
| 框架文档 vs host 原语 | 文档要求主动轮询，host 提供阻塞 wait | 契约不匹配（真问题） |
| TUI 渲染 | 静态 "Waiting" 无动画 | 纯交互问题（次要） |

## 与 BUG-099 的关系

BUG-099 是历史 `stop: no` halt observation——Agent 在 wave0 主动停下来问用
户。当时假设的根因是 context exhaustion。本 BUG 提供了一个补充解释：如果
Agent 在 wait 期间没有任何 user-visible progress，用户（或 Agent 自身）
的耐心耗尽也是导致"主动停下来问"的触发因素之一。

## 后续观察（2026-08-03）— 自我恢复确认

用户实测确认：主 Agent 在阻塞 wait 期间**没有死锁**——当第一个 sub-agent
完成并返回时，主 Agent 被 host 唤醒并自动继续。这与 Engine 代码分析一致：
`agent_wait` 是宿主平台的正常异步等待原语，sub-agent 完成事件会唤醒主 Agent。

所以本 bug 的严重度进一步下调为**纯 UX 可见性问题**（P3）：功能上无缺陷，
只是等待期间 TUI 没有任何进度提示，用户无法区分 "waiting（正常）" 和
"frozen（异常）"。sub-agent 一旦返回，执行自动恢复。
