# BUG-072 — Agent 在 gate pass 后浮出水面，违反 `stop: no` 契约

| 属性 | 值 |
|------|-----|
| ID | BUG-072 |
| 发现日期 | 2026-07-10 |
| 严重级别 | **P1** |
| 当前状态 | **活跃** |
| 来源 | `dpt_rb_aiewf-2026-community-pulse` 正式 run（exploratory_map，5 topics） |
| 关联 | [[BUG-069]] 根因 meta-bug — 共享"静默自主执行不可达"主题，但 failure mode 不同：非契约漂移，而是 Agent 行为违规 |

---

## 1. 症状

```
Phase: wave0 → gate pass (degraded, attempt 3) → check.next = phase-wave1
→ enter-phase + advance-status 正确执行
→ Agent 停下来，向用户呈现 Wave0 发现摘要，询问"要继续完整 Wave1+Wave2 pipeline，还是现在进入 HITL2？"
```

**`phase-wave0.md` §8 明确写 `stop: no`。** Gate 已 pass、`check.next` 已返回、`enter-phase` 已完成。没有 gate fail、没有 `stop: yes`、没有 `blocked_contract`、没有 HITL checkpoint。Agent 没有任何框架层面的理由停下来。

## 2. Agent 自己的决策追溯

Agent 在输出中给出了停下来的理由：

> "对话已达极限长度。Wave0 产出已经极其丰富（75 sources，5 topics 全覆盖，已识别核心叙事、关键辩论、情绪分布）。我建议直接进入 HITL2 呈现现有发现。"

决策链：
1. **上下文窗口压力** — 对话已极长，Agent 评估"已达极限"
2. **产出质量判断** — Agent 自行判定 Wave0 产出"极其丰富"，足以回答 must-answer
3. **跳过框架阶段** — Agent 提议跳过 Wave1（topic deepening）和 Wave2（cross-topic synthesis），直接跳到 HITL2
4. **将决策权交还用户** — 违反了 `stop: no` 的核心前提：这些阶段不需要、也不应该询问用户

## 3. 为什么这是 bug

### 3a. `stop: no` 是框架的基础契约

`RUN.md` §2 明确：
> Interactive in-run checkpoints 只有 hitl1 和 hitl2。Final 是 terminal non-interactive delivery。其余 phase 均 stop: no，Agent 自行推进。

每个 phase node 的 frontmatter 中 `stop: "no"` 是 Engine 可读的字段。这不是建议——它是 execution contract。

### 3b. 框架已经提供了上下文压力的应对机制

- Bundle 持久化（`rb_status.json`, `rb_trace.jsonl`, `BUNDLE_MAP.md`）允许跨 session 恢复
- Gate fatigue 机制允许 degraded pass（本次 wave0 就在 attempt 3 以 degraded 通过）
- `silent_degradation` 日志允许记录非理想状态而不浮出水面
- Queue/work-unit 状态全部持久化在 bundle 中

**Agent 应该在上下文压力下利用这些机制（写状态、让 session 结束、下次从 bundle 恢复），而不是把决策负担转移给用户。**

### 3c. 这不是契约漂移问题

与 BUG-069 的 FP1-FP6 不同——那些是 phase MD / emitted schema / validator 之间的字段不一致。这次的问题是纯行为层面的：**所有契约 surface 都正确、自洽，Agent 读懂了它们，但仍然选择违反。**

| 维度 | BUG-069 (FP1-FP6) | BUG-072 |
|------|-------------------|---------|
| 失败点 | gate fail — schema/contract mismatch | gate 已 pass — Agent 行为违规 |
| 根因 | 四 surface 漂移，Agent 被迫读源码 | Agent 因上下文压力自行决定浮出水面 |
| 修复方式 | 对齐 emitted schema + validator + phase MD | ？ |

## 4. 根因分析

### 直接原因

Agent 的上下文窗口管理策略与框架的自主执行契约冲突。当 Agent 感知到"对话太长"时，它优先选择了"向用户汇报进展并请求指示"而非"静默继续或静默终止 session"。

### 深层原因

**`stop: no` 契约没有技术性强制。** 它是一个写在 Markdown 里的行为规则，完全依赖 Agent 的自律。以下情况 Agent 都可能违反它：
- 上下文窗口压力（本次）
- Token budget 压力
- Agent 对"产出已足够好"的自行判断
- Agent 对"用户可能想知道进展"的善意推测
- 任何其他 Agent 认为"合理的"表面理由

### 与 BUG-069 的关系

BUG-069 的核心症状是"每个 gate 失败都是一个停下来搞清楚状况的介入点"。BUG-072 是其镜像：**gate 成功了，但 Agent 在 gate 成功之后自己制造了一个介入点。** 两者都导致"静默自主执行不可达"，但来自相反方向——BUG-069 是被动受阻（契约矛盾），BUG-072 是主动放弃（行为违规）。

## 5. 复现条件

1. 长时间 run（多个 phase，大量 sub-agent spawn）
2. 上下文窗口接近饱和
3. 某个 phase 的 gate 通过（特别是 degraded pass）
4. Agent 自行判断"产出已足够"

预期：Agent 有一定概率在 gate pass 后浮出水面，向用户提议跳过剩余 phase 或提前进入 HITL。

## 6. 可能的修复方向

### 方向 A: Phase MD 中强化 `stop: no` 的不可协商性

在每个 `stop: no` phase 的 §8 增加显式条款：
> 上下文窗口压力、token budget 压力、对产出质量的自行判断——均不构成浮出水面的理由。若无法继续，写 bundle state 后静默终止 session；下次 session 从 rb_status.json 恢复。

### 方向 B: 在 `shared-silent-execution` 中增加上下文压力应对协议

定义明确的"静默终止"路径：
1. 写 `silent_degradation` 事件（`gap_impact: session_terminated`）
2. 确保 `rb_status.json` current_node 和 current_gate 正确
3. 不向用户发送任何消息
4. 让 session 自然结束

### 方向 C: Engine 层 enforce `stop: no`

在 gate pass 后的 transition 中，Engine 可以检查是否有 HITL 介入。但这很困难——Engine 无法阻止 Agent 在 chat 中输出文本。

### 方向 D: 接受并文档化

承认 `stop: no` 是一个"尽力而为"的契约，在一定上下文压力下 Agent 可能会浮出水面。在 RUN.md 中记录这种降级行为，让用户有预期。

## 7. 当前判定

**P1**。理由：
- 直接导致一次正式 run 在 Wave0→Wave1 过渡处卡住，用户必须手动介入
- BUG-069 已修了契约层面的问题，但**行为层面的违规是新的、未设防的 failure mode**
- 与 BUG-069 共享同一个终极后果：用户得到的研究深度低于框架设计目标（少了两层 deepening + synthesis）

---

## 现场证据

### rb_status.json（Agent 停止时的状态）
```json
{
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete",
  "current_node": "phases/phase-wave1.md"
}
```
— `enter-phase` 已正确执行，phase-wave1 已加载

### Gate 结果
```
wave0-complete: passed (degraded, attempt 3)
check.next: phases/phase-wave1.md
degraded_reason: fatigue_threshold_reached_with_only_degradation_eligible_quality_rules
```
— Gate 给了明确的 `check.next`，无 `stop: yes`，无 `blocked_contract`

### Agent 输出（违规文本）
> "对话已达极限长度。Wave0 产出已经极其丰富...我建议直接进入 HITL2 呈现现有发现。是否同意跳过 Wave1/Wave2..."

### 5 个 topic 的 Wave0 产出
| Topic | Sources | Status |
|-------|---------|--------|
| 01_technical-trends | 18 | source.yaml valid, 10+ entries |
| 02_community-sentiment | 13 | source.yaml valid, 10+ entries |
| 03_side-events | 17 | source.yaml valid, 10+ entries |
| 04_key-voices | 12 | source.yaml valid, 10+ entries |
| 05_post-fair-ripples | 14 | source.yaml valid, 10+ entries |
| **Total** | **75** | All 5 topics above count floor |

---

## 9. 第二实例：wave1 gate stall 后再次浮出水面（同日同 run）

### 症状

```
Phase: wave1 → gate fail (attempt 9, 39 rules failing, trend: stalled)
→ Agent 停下来，呈现"Gate stalled——经典的 BUG-069 墙"摘要
→ 问用户"要继续攻坚 gate 还是接受当前研究产出？"
```

**`phase-wave1.md` §8 明确写 `stop: no`，§7 规定了 gate fail 后的修复流程。** Gate fail 不是 stop 条件。

### 与第一实例对比

| 维度 | 第一实例 | 第二实例 |
|------|---------|---------|
| Gate 状态 | **pass** (degraded) | **fail** (stalled) |
| Agent 行为 | 自判"产出够了" | 自判"这是 BUG-069 墙，不合理" |
| 框架给的路径 | `check.next` 明确 | §7 repair/refill/supplement loop |
| Agent 忽略的 | `stop: no` | `stop: no` + §7 repair loop |

Agent 对 gate 要求的诊断（"需读 engine 源码才能满足 reference 格式"）可能正确——这确实是 [[BUG-069]] 的症状。但 BUG-069 的存在不授予 Agent 跳过 `stop: no` 的权限。框架提供 fatigue/degraded pass 处理此类情况；Agent 的责任是继续 repair loop 直到 gate degrade 或 pass。

### 第二实例现场

```
wave1 gate attempt 9: 39 rules failing
Structural blockers: reference_format, source_url_parseable, key_facts_min_lines, 
  ledger_coverage, reference_index_coverage, key_findings_non_empty (all 5 topics)
Agent output: "Gate stalled at attempt 5——经典的 BUG-069 墙..."

---

## 10. 第三实例：wave2 gate stall → HITL2 提前呈现（同日同 run）

### 症状

```
Phase: wave2 → gate fail (attempt 25, 55 rules failing, trend: stalled)
→ Agent 呈现 HITL2，但 gate 未 pass
→ 用户在 HITL2 选择 proceed，Agent 推进到 final
```

### 与前两实例的关键区别

前两实例是 Agent 在 gate 状态明确（pass/fail）时主动浮出水面。第三实例中 Agent 正确地推进到了 HITL2（`stop: yes`），因为 HITL2 就是下一个合法 checkpoint。但 wave2 gate 未 pass——55 个 finding-index contract 格式错误仍未修复。HITL2 作为 checkpoint 是合法的，但 gate 未 pass 意味着最终交付物的结构完整性未经验证。

### 第三实例现场

```
wave2 gate attempt 25: 55 rules failing
Core issue: finding-index.yaml contract — hitl2_handoff (boolean), appears_in_synthesis, 
  search_required, independent_backing_refs fields; cross-topic-ledger 6 sections; 
  cross refs without wave2 work-unit backing
```
```

---

## 11. 第四实例：spawn sub-agent 后空闲等待（同日同 run，rerun wave0）

### 症状
Rerun wave0: 2 sub-agents spawned → Agent 呈现状态表 → 停下来等 task notification。`phase-wave0.md` §3.2: "Actively poll...without waiting for user continuation or task notification."

### 与前例区别
前三实例是 gate 状态变化时浮出水面。第四实例是委托执行期间空闲——不是"停下来问用户"，而是"停下来等系统"。同一根因：Agent 把自主执行理解为"spawn 然后等着"，而非"spawn → poll → submit → gate → continue"的驱动循环。


---

## 12. 第五实例：rerun wave1 gate 45 attempts stall → 再次浮出水面（同日同 run）

### 症状
Rerun wave1 gate: 45 attempts, never degraded. Agent 呈现汇总表，问"要 push Wave2 还是接受当前深度？"

### 与前例累计
至此同一 run 内 5 次违反 stop: no。模式已清晰：任何 gate 状态变化（pass/fail/stall）和任何委托等待（spawn 后空闲）都触发 Agent 浮出水面。这不是偶然失误——这是 Agent 在上下文压力下系统性无法维持静默自主执行。每次停下来都"有理由"，但 stop: no 的整个设计前提就是"有理由也不能停"。

