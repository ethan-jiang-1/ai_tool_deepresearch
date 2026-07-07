# BUG-047: `stop: no` phase 在 gate fatigue 后浮出水面，违反静默自主执行合约

## 严重程度
P1 — 合约违反。`stop: no` phase 的 Agent 合约明确规定"Agent 自行推进，不暂停请求用户输入，不发送进度或 idle/no-work 汇报"。Gate 失败 + fatigue threshold 触发时，Agent 应记录 `silent_degradation` 并自主继续，但实际行为是停下来向用户汇报 + 等待一个无关 background workflow，完全违反静默合约。

## 复现

在 `engelberg-tech-retreat-2026` run 的 wave0 phase 中：

1. Phase Agent 完成 5 个 topic 的 work unit claim → sub-agent 执行 → submit，全部提交成功
2. 运行 `check-gate-wave0-complete.mjs`，因 `shared_ref_count_floor`（threshold 9 vs 实际 0）和 `content_dedup` 失败
3. 修复 source.yaml 格式（object → top-level array）后 rerun gate，仍失败
4. 手动创建 2 个 `reference/00-shared-*.md` 文件并追加 ledger entry，rerun gate（attempt 4-5），仍失败
5. Gate 返回 `[fatigue]` 警告（attempt ≥ 3）
6. **Agent 停了下来**，向用户汇报 wave0 研究发现总结
7. 同时显示 "Waiting for one dynamic workflow to finish" —— 这是会话开始时 `deep-research` skill 调用 `Workflow` tool 留下的 background task（`wf_a3dffed4-43a`），与 DPT_FRAMEWORK 完全无关，但两个系统互不知晓
8. `rb_status.json` 状态停留在 `current_gate: seed_topics_ready` / `next_gate: wave0_complete`

用户确认："在 status 里头还是说的 next gate 是 wave0_complete，所以它还没到 wave0_complete，那我让他继续，事情就变好了。那这个 bug 最主要是这个地方，它不应该停下来，它应该主动往前走"

## 根因分析 / 为什么会发生

### 直接原因

三个独立问题叠加：

**A. Phase Agent 没有按 `stop: no` 合约自主决议。** `phase-wave0.md §8`：
> `stop: no` — Agent 自主物化，不发送阶段进度或 idle/no-work 汇报……

`phase-wave0.md §7` Persistent failure 条款：
> 若 seed-topics gate 连续 3 次修复无进展，通过 accepted trace/log surface 记录 `silent_degradation`……不写 `state: blocked`。降级后 Agent 仍有责任继续尝试不同的修复策略，不浮出水面。

Agent 实际上在 attempt 5 + fatigue 后**浮出了水面**（向用户汇报研究发现），而不是继续尝试修复或走 degradation path。这是对 `stop: no` 合约的直接违反。

**B. 无关 background workflow 污染了状态判断。** 用户在 DPT_FRAMEWORK 入口触发之前，先触发了内置 `deep-research` skill。该 skill 通过 `Workflow` tool 在后台启动了 `wf_a3dffed4-43a`。尽管 `RUN.md §0` 明确禁用了内置捷径，但这个 background task 在 `stop: no` phase 执行期间仍然存活，Agent 看到 "Waiting for one dynamic workflow to finish" 但不知道该 workflow 属于另一条已废弃的执行路径。

**C. Agent 把 gate fatigue 误解为"研究已完成，可以汇报"。** Gate 在 attempt 4 的 advice 中包含 `[fatigue]` 标记，提示 "Consider stepping back rather than retrying the same repair" 和 "gate failure is not an emergency. User-facing surfacing is prohibited"。但 Agent 将 "stepping back" 误解为"停下来做 research summary"，而非"换修复策略继续静默执行"。

### 深层原因

**合约歧义**：`stop: no` phase 的 fatigue behavior 规范不够具体。Phase MD §7 说了不浮出水面，但 §0 和 §8 没有明确说明 "gate fail + fatigue = 继续静默降级走到下一 phase" 还是 "gate fail + fatigue = 静默等待更多信息"。Agent 在歧义下选择了最保守（也最具破坏性）的行为——浮出水面。

**跨系统无知**：DPT_FRAMEWORK 的 phase agent 不知道 background workflow tool 的存在。`Workflow` tool 和 DPT_FRAMEWORK 是完全隔离的执行表面——前者不知道 bundle/phase/gate 状态，后者不知道 background task queue。当 Agent 决定 "暂停" 时，Harness 层的 "Waiting for dynamic workflow" 提示进一步固化了等待行为。

## 建议修复

### P0 — 直接堵漏洞

1. **Phase Agent 在 gate fatigue 时的行为必须明确化。** 在 `phase-wave0.md`（及所有 `stop: no` phase）的 §7 Persistent failure 条款中增加：
   > "Gate 返回 fatigue 标记后，Agent MUST NOT 浮出水面。若已记录 silent_degradation 且所有 per-topic 产出已 submit（work-unit ledger 可验证），Agent MAY 跳过当前 gate、通过 `advance-status` 写入降级 gate 状态、加载下一 phase。降级 gate pass 不等同于真实 gate pass——它是对 profile 参数与实际研究现实不匹配的承认。"

2. **`enter-phase` 需要支持降级路由。** 当前 `enter-phase` 强制要求 `check.next` 来自 gate CLI 的 deterministic handoff。当 gate 无法通过时（如 profile 参数不现实），Agent 无法合法进入下一 phase。需要增加：
   - `--degraded-from <gate>` flag，允许在 silent_degradation 已记录 + work-unit ledger 可验证的情况下加载下一 phase
   - 或：gate CLI 在检测到 3+ attempts + fatigue 时，如果 per-topic 产出达标，自动返回 `check.passed: true` 加 `degraded: true` 标记

### P1 — 跨系统隔离

3. **DPT_FRAMEWORK 入口触发时应清理/取消无关 background task。** `RUN.md §0` 已禁用内置捷径，但应在触发时显式检查并取消正在运行的 `deep-research` skill workflow。Framework entry 应写入 bundle trace 一个 `entry_cleanup` event，记录被取消的 background task ID。

4. **`shared-ref` 的 count_floor 阈值对 niche topic 不合理。** `apply-research-style.mjs` 自动计算 `wave0_shared_ref_total = base(6) + per_topic(?) × 5` 得到 9，但对于私人邀请制 retreat，9 个独立 shared reference 源是不现实的。建议：
   - 允许 gate 在 `per_topic_count_floor` 全部满足时对 `shared_ref_count_floor` 宽松处理
   - 或在 profile 中增加 `wave0_shared_ref_min_override` 字段允许 Agent 在合理范围内降低阈值

### P2 — 体验改善

5. **Harness 层的 "Waiting for N dynamic workflows" 不应阻塞 Agent 的自主执行决策。** 当 Agent 处于 `stop: no` phase 时，该提示应降级为 non-blocking diagnostic，不触发用户可见的等待状态。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave0 phase gate fatigue 后

## 相关 Bug
- [[BUG-045]] — 同一 session 中 deep-research skill 与 DPT_FRAMEWORK 互斥问题
- [[BUG-046]] — Wave0 串行执行（同一 phase 的另一个性能问题）
