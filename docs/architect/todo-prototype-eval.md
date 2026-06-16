# TODO: prototype-eval

> 状态: 待设计 | 优先级: 高 | 创建: 2026-06-16

## Why

`prototype-gate-loop/fork/subagent` 验证了控制流（路由、修复、fan-out）。但它们判断 Gate pass/fail 的标准只有一个：`ref_count >= ref_floor`。

真实 deep research 的 Gate 审计远不止数数。一个 ref_count 达标的 state 可能质量很糟：
- 10 条参考全是 Tier 4 营销文章
- P0 声明只有单来源支撑
- 从未做反例搜索
- 商业意图强烈的网页没做交叉验证

**prototype-eval 验证"内容好不好"**：不只是数 ref_count，而是判断证据质量。

## 核心挑战：把 V12 的诊断门缩到 prototype 级别

V12 的评估体系太大了（5 gate × 26 字段 × 4 层审计）。prototype 要回答一个简单问题：

**给定一个 WorkflowState（含 subagent_results），能判断每个 subagent 产出的证据质量吗？**

```
forkRouter(state) → pass → dispatch subagents → collect results
                                                      │
                                                      ▼
                                              evalResults(results)
                                                    │
                                          ┌─────────┼─────────┐
                                          ▼         ▼         ▼
                                       pass      fail     blocked
                                     (质量够)  (需修复)  (需人工)
```

## 从 V12 借鉴的核心模式

V12 的 Webpage Material Diagnostic Gate 是最小可验证单元（6 字段 + 3 条计数规则）：

```
web_substance: substantive | thin | none | not_webpage
commercial_intent: none | mild | strong | unknown
marketing_risk: low | medium | high
cross_verification_required: yes | no
cross_verification_status: verified | pending | unavailable | not_required
content_retention_decision: retain | prune_partial | exclude_source
```

硬性规则：
- `web_substance=thin/none` → 不能计数
- `commercial_intent=strong` → 不能支撑 P0/P1 声明（除非已验证）
- `content_retention_decision=exclude_source` → 整体排除

## 实验范围

**Goals:**
- 定义 `EvidenceQuality` schema（精简版 diagnostic fields，4-5 字段）
- 实现 `evalSlot(slotResult) → QualityReport`：对单个 subagent 产出做质量评估
- 实现 `evalGate(state, results) → EvalBranch`：综合所有 quality report 做 Gate 决策
- 质量条件影响 fork 路由：eval fail → `fail_c`（新分支，质量问题，不同于 ref_count 不够的 fail_a）
- EvalGate 与现有 forkRouter 可组合

**Non-Goals:**
- 不实现 26 字段完整参考审计（V12 规模太大）
- 不做真实网页抓取和诊断（mock 数据）
- 不做跨 topic contradiction detection（那是 explore-exploit 的事）
- 不做置信度三维评分（后续迭代）

## 关键设计问题

### 1. Quality Gate 是独立 Gate 还是现有 Gate 的扩展？

倾向：**扩展现有 evaluateBranch**，增加 quality 维度（新增 branch `fail_c`：质量不足）。

```
evaluateBranch 优先级:
  blocked > fail_b (topic) > fail_c (quality) > fail_a (reference) > pass
```

`fail_c` 走质量修复路径（重新搜索更好的来源、交叉验证），不同于 fail_a 的 ref 补充。

### 2. Quality schema 有多少字段？

倾向：**5 字段**（从 V12 的 6 字段中裁剪）：

```javascript
const EvidenceQuality = z.object({
  substance: z.enum(['substantive', 'thin', 'none']),  // 是否有硬数据
  sourceTier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']),
  commercialIntent: z.enum(['none', 'mild', 'strong']),
  independentBacking: z.number().int().min(0).default(0),  // 独立验证来源数
  retentionDecision: z.enum(['retain', 'prune', 'exclude']),
});
```

去掉 `marketing_risk`（与 commercialIntent 冗余）、`cross_verification_status`（用 independentBacking 替代）。

### 3. Eval Gate 的判定规则

```javascript
function evaluateQuality(state, qualityReports) {
  const excluded = qualityReports.filter(r => r.retentionDecision === 'exclude');
  const thin = qualityReports.filter(r => r.substance === 'thin');
  const lowTier = qualityReports.filter(r => r.sourceTier === 'tier_4');
  const unverified = qualityReports.filter(r =>
    r.commercialIntent === 'strong' && r.independentBacking === 0);

  if (excluded.length > 0) return 'fail_c';  // 有被整体排除的证据
  if (thin.length >= 2) return 'fail_c';      // 多条 thin 证据
  if (lowTier.length > state.ref_count * 0.5) return 'fail_c';  // >50% 低层
  if (unverified.length > 0) return 'fail_c';  // 强商业意图未验证
  return 'pass';
}
```

## 实现思路

```javascript
// SlotResult 扩展 quality 字段
const EvalSlotResult = SlotResult.extend({
  quality: EvidenceQuality.optional(),
});

// evalSlot: 对单个 slot 产出做质量评估
function evalSlot(slotResult) {
  // 解析 result.md 中的 quality 信息
  // （prototype 阶段用 mock，真实场景 Agent 填 quality 字段）
  const quality = EvidenceQuality.parse(slotResult._quality);
  return { ...slotResult, quality };
}

// evalGate: 综合所有 slot quality → branch decision
function evalGate(state, results) {
  const reports = results.map(evalSlot);
  const qualityBranch = evaluateQuality(state, reports);
  return { branch: qualityBranch, reports };
}

// 新的 forkMap 条目
['fail_c', new Step('quality_repair', (s) => {
  return { ...s, qualityRepairAttempted: true };
})]
```

## 与 gate-fork/subagent 的关系

```
evaluateBranch(state)
       │
       ├── pass ──→ subagentDispatch → collectResults
       │                                      │
       │                              evalGate(results)
       │                                 │
       │                    ┌────────────┼────────────┐
       │                    ▼            ▼            ▼
       │                  pass        fail_c      blocked
       │                (继续)     (质量修复)    (人工)
       │
       ├── fail_a ──→ convergeRepair（参考数量）
       ├── fail_b ──→ convergeRepair（话题结构）
       └── blocked ─→ HITL
```

eval 是 subagent 产出的**下游**：subagent 产出 result.md → Engine parse → evalSlot 评质量 → evalGate 判 pass/fail_c。

## 下一步

1. OpenSpec explore: 细化 EvidenceQuality schema、evalGate 判定规则、fail_c 修复路径
2. `/opsx:propose prototype-eval` — 出 proposal + design + specs + tasks
3. 实现 `experiments/prototype-eval/`
4. 与 subagent prototype 的可组合性验证
