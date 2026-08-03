---
bug_id: BUG-198
title: "Phase Agent performs direct WebSearch instead of delegating to sub-agent — violates work_unit_required search_policy"
severity: P2
discovered: 2026-08-03
bundle: dpt_rb_agentic-rd-org-delivery-systems-2026
phase: wave2 (post-wave1-deadlock degraded mode)
node: phases/phase-wave2.md, subagents
related: BUG-192 (degraded gate → contract violation), BUG-197 (wave1 deadlock trigger)
---

# BUG-198: Phase Agent performs direct WebSearch instead of sub-agent delegation

## 现象

Wave1 deadlock 后，Agent 以 degraded mode 推进到 Wave2 综合阶段。Agent 在
"Deepen the synthesis" 时直接执行了两次 `WebSearch`：

```
⏺ Web Search("China AI coding agent enterprise adoption regulation 2026...")
  ⎿  Interrupted · What should Claude do instead?

⏺ Web Search("AI coding productivity measurement DORA metrics 2026...")
  ⎿  Interrupted · What should Claude do instead?
```

两次都被 interrupt。用户指出：
> "你为什么这个地方还要搜索呢？即便是搜索，你也应该用 sub agent 呀"

Agent 接受反馈后改 spawn `dpt-claim-verifier` sub-agent。但此时主 Agent 已经
浪费了两个 turn 在主 session 上做 it 不该做的事，还产生了中断噪音。

## 根因

**所有 research phase 的 `execution_contract.search_policy` 都禁止 Phase Agent 直接搜索**：

| Phase | `search_policy` | 含义 |
|-------|----------------|------|
| wave0 | `work_unit_required` | 新证据必须走 work-unit sub-agent |
| wave1 | `work_unit_required` | 同上 |
| wave2 | `work_unit_required_for_new_evidence` | 新证据必须走 work-unit sub-agent |
| final | `no_search` | 完全禁止搜索 |
| hitl1 | `capability_probe_only` | 仅限能力探测（中性 query） |
| All sub-agents | `subagent_performs_search` | 搜索是 sub-agent 的专属职责 |

**Phase Agent 在任何 research phase 的合法搜索路径只有一条**：
`queue demand → claim work unit → spawn sub-agent → poll → submit`。

直接 `WebSearch` 绕过了：
1. Queue demand（没有 queue card，没有 trace）
2. Work-unit lifecycle（没有 claim/submit，没有 receipt/receipt_nonce）
3. Evidence provenance（搜索结果不进入 `_cache/` 或 `rb_output_declarations.jsonl`）
4. Gate coverage（这些搜索结果不能被任何 gate 计数或校验）

## 为什么 Agent 会这样做

推测两条叠加原因：

1. **Degraded mode 上下文丢失**：Wave1 deadlock 后，Agent 以 informal "HITL2-style
   delivery" 模式推进，没有严格遵循 `enter-phase` 加载的正确 phase node。Agent
   处于"半自主"状态，失去 `search_policy: work_unit_required_for_new_evidence`
   的约束意识。

2. **LLM 默认倾向**：在没有 active phase contract 约束时，LLM 的自然倾向是
   "需要搜索就直接搜索"——sub-agent delegation 是框架强加的 discipline，不是
   LLM 的默认行为。这和 BUG-192（degraded gate → false A/B choice）是同一模式：
   **边界/异常状态导致 Agent 回退到 LLM 默认行为，违反框架 discipline。**

## 影响

- **P2**（中等）：用户及时干预纠正了行为，没有数据丢失或证据污染。但每次
  异常状态都可能触发这个问题——大量 degraded modes 会让 Agent 反复"忘记"搜索
  必须走 sub-agent。
- 直接 WebSearch 在主 session 产生噪音（token 消耗、中断提示），用户需要
  主动制止并重新下发指令——这违背 `stop: no` 的静默执行原则。
- 如果不纠正，这些搜索结果无法计入 gate coverage，最终报告会缺溯源证据。

## 建议修复方向

1. **Shared contract 层**：在 `shared-subagent-protocol.md` 或
   `shared-silent-execution.md` 开头加一条硬规则：

   > "The Phase Agent MUST NOT perform WebSearch or WebFetch for research
   > evidence in any phase. Research search and fetch belong exclusively to
   > delegated sub-agents through the work-unit lifecycle."

   让这条指令在每次 phase 加载时都可见，降低 degraded mode 遗忘的概率。

2. **Degraded mode recovery**：当 Wave1 死锁逼 Agent 进入 degraded delivery
   时，框架应提供一个 formal "degraded-to-wave2" handoff 路径，而不是让 Agent
   自行判断"接下来干什么"。形式化的 handoff 可以 reload wave2 node 并恢复
   `search_policy` 约束。

3. **Engine detection**（长期）：当 Engine 检测到 phase agent 在
   `work_unit_required` phase 中执行了 WebSearch/WebFetch（非 capability_probe_only
   的合法 probe），记录 `unauthorized_search_attempt` diagnostic 并拒绝把结果
   计入 gate。

## 本次 trace 证据

- Wave1 deadlock → Agent announced "Moving directly to HITL2-style delivery"
- Agent 在 Wave2 上下文做了两次 direct WebSearch，均被 interrupt
- User explicitly corrected: "即便是搜索，你也应该用 sub agent 呀"
- Agent 改 spawn 2 个 `dpt-claim-verifier` sub-agent（正确路径）
