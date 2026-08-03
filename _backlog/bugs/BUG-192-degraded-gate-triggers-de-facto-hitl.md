---
bug_id: BUG-192
title: "Degraded gate handoff after fatigue triggers de-facto HITL — agent presents false A/B choice instead of silent chain progression"
severity: P2
discovered: 2026-08-03
bundle: dpt_rb_agentic-rd-org-delivery-systems-2026
phase: wave0→wave1
node: phases/phase-wave1.md
related: BUG-099 (wave0 halt), BUG-188 (static wait), BUG-189 (degraded shared_ref_count_floor)
---

# BUG-192: Degraded gate → false choice → de-facto HITL

## 现象

Wave0 gate 在第 4 次 attempt 后以 **degraded pass** 通过（`shared_ref_count_floor`
未达标但疲劳阈值到达，`fatigue_warning: true`）。`enter-phase` 正确加载了
phase-wave1.md，Agent 进入 wave1 后正常输出了 Wave0 成果摘要——然后**停了下来**：

> "要继续推进 Wave1（每个 topic 的深度证据提取、机制分析、交叉验证）吗？这需要再启动
> 5 个 dpt-evidence-extractor 子代理。或者现在的 Wave0 证据基础已经可以直接跳到
> Wave2 综合？"

Agent 向用户呈现了 **两个选项**：
- A：继续推进 Wave1（正确路径）
- B：跳过 Wave1 直接到 Wave2（**不存在的路径**）

选项 B 完全是 Agent 自己编造的——transition chain 是 `wave0 → wave1 → wave2`，
不存在"跳过 wave1"的法律路径。Agent 在 `stop: no` 的 wave1 phase 里发起了
A/B choice 提问，创建了一个框架合约之外的 de-facto HITL。

## 根因：degraded pass + fatigue 是关键触发因子

Gate diagnostic (`2026-08-03T11-57-21.894Z-wave0-complete.json`)：
- `check.passed: true, check.degraded: true`
- `attempt_count: 4, fatigue_warning: true`
- `degraded_reason: fatigue_threshold_reached_with_only_degradation_eligible_quality_rules`
- `degraded_rules: ["shared_ref_count_floor"]`
- Gate advice: `"[degraded] Consume check.next through enter-phase..."`

Agent 的行为链路：
1. 4 次 gate repair 循环 → 疲劳
2. Gate 输出 `degraded: true` → Agent 理解"存在问题，但允许继续"
3. Agent 自愿输出一份 Wave0 成果摘要（**非阶段要求**，自己额外做的）
4. 摘要输出完，LLM 的自然倾向是问"what next?"
5. 结合"degraded pass = 不完美"的心理状态，Agent 编造了"跳过 wave1"的选项，
   作为"帮用户节省时间"的伪 shortcut

**核心矛盾**：
- `shared-silent-execution.md` 明确禁止：`"They SHALL NOT initiate ... A/B choice,
  confirmation, continuation request"`
- `phase-wave1.md` frontmatter：`stop: no`
- **但这些是纯文本约定**——Agent 在 fatigue + degraded 的联合压力下直接无视了

## 为什么"跳过 wave1"是编造的

Transition chain（`DPT_FRAMEWORK/workflows/nodes/.chain.json`）：
```
wave0 → wave1 (only)
wave1 → wave2 (only)
wave2 → hitl2 (only)
```

没有 `wave0 → wave2`、`wave0 → hitl2`、没有 "degraded skip" 路径。
Gate 的 `check.next: phases/phase-wave1.md` 唯一合法。

## 影响

- **P2**（中等）：gate 已 pass、chain 已推进、Agent 在正确节点站稳了——**技术上没有
  阻塞**。但用户被卡在一个不该出现的对话上，破坏"静默自主长程执行"的核心承诺。
- 如果用户当时不在屏幕前（框架明确说了"可以关闭终端"），bundle 就停在这道 pseudo
  HITL 上，后续 wave1/wave2/final 全部卡住。
- 和 BUG-099 属于同一家族：`stop: no` 在 fatigue 边界被 Agent 主动打破。

## 与 BUG-099、BUG-188 的比较

| Bug | Phase | 触发点 | 违反行为 |
|-----|-------|--------|----------|
| BUG-099 | wave0 | 50+ tool calls, context exhaustion | 主动停下问"要继续 spawn sub-agent 吗" |
| BUG-188 | wave0 | sub-agent block wait | 静态屏幕无反馈（被动，非 Agent 行为） |
| BUG-192 | wave0→wave1 | degraded gate + fatigue + 4 attempts | Agent 主动输出摘要后提 A/B choice，编造 skip path |

BUG-192 的新模式是：**degraded gate pass + fatigue 组合触发 Agent"道歉+问路"行为**。
Gate 的 `degraded: true` 虽然明确写着"consume check.next through enter-phase"，
但 Agent 在看到 broken rule 的名字（`shared_ref_count_floor`）和 fatigue warning 后，
自行推断"这个结果不够好，我应该确认一下用户是不是想继续"。

## 建议修复方向

1. **Gate CLI 层**（最直接）：当 `degraded: true` 时，在 advice 里加一句明确指令：

   > "Degraded pass is a legal handoff. Do NOT ask the user whether to proceed.
   > Do NOT invent skip paths. The only legal next phase is <check.next>."

   这样 Agent 在退化通过时看到的不只是"pass but degraded"，而是"pass, proceed,
   do NOT stop"。

2. **Phase Agent guidance**（`shared-silent-execution.md`）：在禁止列表里显式加上
   `"skip wave", "phase bypass suggestion", "false shortcut proposal"`，
   明确列出 degraded pass 不是暂停的理由。

3. **Hard enforcement**（长期）：在 Engine 层面，当 `stop: no` 的 phase 被加载后，
   如果 Agent 发出 tool call 数量 < 2 就产生了 user-facing 输出（提问式消息），
   记录 `silent_contract_violation` 并强制继续执行。但这是大改动，需要评估成本。

## 本次 trace 证据

- `rb_trace.jsonl` 记录 gate passed at `2026-08-03T11:57:21.894Z`
- Gate diagnostic: `fatigue_warning: true, degraded: true, attempt_count: 4`
- `enter-phase` loaded phase-wave1 correctly
- Agent halted with A/B choice after voluntary summary output
