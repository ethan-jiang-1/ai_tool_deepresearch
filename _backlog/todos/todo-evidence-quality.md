# TODO: evidence-quality（证据质量评估）

> 状态: 待设计 | 优先级: 高 | 创建: 2026-06-16 | 更新: 2026-06-25
>
> 曾用名: `todo-prototype-eval.md` → `todo-prototype-evidence-quality.md`（太模糊 + 含过时的 "prototype" 前缀。更名为 evidence-quality。）
>
> 直接依赖: `prototype-subagent` ✅ DONE | `prototype-gate-fork` ✅ DONE
> 上游依赖: `todo-evidence-extraction`（extraction 产出 countable reference，quality 评估每条 reference——不够格就放弃）

## Why

`prototype-gate-loop/fork/subagent` 验证了控制流（路由、修复、fan-out）。但它们判断 Gate pass/fail 的标准只有一个：`ref_count >= ref_floor`。

真实 deep research 的 Gate 审计远不止数数。一个 ref_count 达标的 state 可能质量很糟：
- 10 条参考全是 Tier 4 营销文章
- P0 声明只有单来源支撑
- 从未做反例搜索
- 商业意图强烈的网页没做交叉验证

**evidence-quality 验证"材料好不好"**：不只是数 ref_count，而是判断每条 reference 的证据质量。**不好的就放弃（discard），不修——低质量材料无法通过 repair 变好。**

### 用户反馈（2026-06-25）

> "材料质量不行的就放弃，但原来没有感觉是有'放弃'这个动作。尤其低质量内容。"

原始设计只有 `pass` / `fail_c`（质量不足→质量修复）。但一条 Tier 4 营销文章不可能"修复"成高质量证据。正确的动作是：
- **discard**（放弃）：排除这条 reference，不计入 ref_count
- **repair**：ref_count 不够→补搜更好的来源（搜索修复，不是质量修复）

## 现有基础设施（2026-06-25 更新）

| 基础设施 | 位置 | 如何用 |
|---------|------|--------|
| `dpt-source-diagnostic` role agent | `subagent-relay.mjs` dispatch map (line 273-278) | **已注册、已可 dispatch**。role 定义在 `roles.md` 明确说 "Assess source quality, materiality, trust tier, and cross-verification needs"。但它目前输出泛型 `SlotResult` schema——没有结构化 diagnostic 字段。这是第一个要修的。 |
| `classifyBranch()` | `subagent-relay.mjs:225` | 当前 4 分支（pass/fail_a/fail_b/blocked），优先级 blocked > fail_b > fail_a > pass。需要加 fail_c（质量不足→放弃）。 |
| `Branch` Zod enum | `subagent-relay.mjs:101` | 4 值 enum，加 fail_c 需改这里 + forkMap + forkRouter + 所有 switch 分支。 |
| `forkMap` | `subagent-relay.mjs:238` | 每个 branch 映射到一个 ForkStep transform。加 fail_c 需要新 entry。 |
| `mergeResults()` | `subagent-relay.mjs:877` | 当前简单累加 evidenceCount → ref_count。如果加了 quality 过滤，被 discard 的 reference 不能计入。 |
| `resultJsonSchemaForSlot()` | `subagent-relay.mjs:351` | 所有 slot 用同一个泛型 `SlotResult` schema。`dpt-source-diagnostic` 需要**差异化 schema**（含 diagnostic 字段）。 |
| `convergeRepair()` | `subagent-relay.mjs:929` | 现有 repair loop（maxIterations=3, stall detection by state hash）。质量触发的 discard 不是 repair——走不同路径。 |
| `phase-wave1.md` Future Expansion Track 6 | line 269 | 明确写了 "quality gates — 留给后续" |

### 关键架构张力：质量评估放 Engine 还是 Phase Agent？

当前全部 phase MD 和 spec 的一致立场：**质量判断属于 Phase Agent（LLM），不属于 Gate/Engine（deterministic check）。**

| 文件 | 原文 |
|------|------|
| `phase-readiness.md` | phases/phase-readiness.md | **MUST NOT 做 content quality 或 writing quality 判断** |
| `subagent-dpt-topic-scout.md` | phases/subagent-dpt-topic-scout.md | Sub-agent 不跑 gate。**Result quality 由 Phase Agent 在 ingestion 时判断** |
| `shared-anti-cheating-rules.md:34` | shared/ | 禁止在 pre-research 阶段声称 evidence coverage 或 synthesis quality |

**本 TODO 需要明确立场**：evidence quality 评估到底跑在 Engine（deterministic 规则：substance=thin → discard）还是 Phase Agent（LLM 判断质量）？

建议：**分层**。Engine 做可规则化的最低条件检查（substance=thin/none → 不可计数；content_retention=exclude → 整体排除），Phase Agent 做需要语义判断的评估（"这段论述有没有硬数据支撑"）。`dpt-source-diagnostic` subagent 作为 LLM 做判断，但输出**结构化 diagnostic 字段**（不是自由文本），Engine 根据字段做 deterministic discard。

## 核心挑战：质量不够 = 放弃，不是修复

```
subagent results → collectResults
                        │
                        ▼
                 evalSlotResults(results)
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
           pass      discard   blocked
         (质量够)   (放弃这条)  (需人工看)
              │         │         │
              ▼         ▼         ▼
         保留，计入   从 ref_count   escalate
         ref_count   中排除       to HITL
```

**discard ≠ repair**：
- repair（fail_a / fail_b）：ref_count 不够、topic 结构有问题 → **补搜、重做** → 回 gate
- discard（fail_c）：这条 reference 本身质量不行 → **排除，不计入 ref_count** → ref_count 可能因此降低 → 触发 fail_a（数量不够）→ 补搜**更好的**来源

### 现有 `classifyBranch()` 的扩展

当前（`subagent-relay.mjs:225`——注意：实际代码用 `!== 'ready'` 而非 `=== 'not_ready'`，对当前 enum 行为等价）：

```javascript
export function classifyBranch(state) {
  const s = SubagentWorkflowState.parse(state);
  if (s.topicReadiness === 'blocked') return 'blocked';
  if (s.topicReadiness !== 'ready') return 'fail_b';    // 实际代码
  if (s.ref_count < s.ref_floor) return 'fail_a';
  return 'pass';
}
```

扩展后（加入 quality discard）：

```javascript
function classifyBranch(state, qualityReports) {
  if (state.topicReadiness === 'blocked') return 'blocked';
  if (state.topicReadiness === 'not_ready') return 'fail_b';

  // 新增：质量检查（在 ref_count 之前——质量不过关的 reference 先排除）
  const discarded = qualityReports?.filter(r => r.retentionDecision === 'exclude');
  if (discarded.length > 0) return 'fail_c';  // 有需要放弃的材料

  // 在排除了 discarded 之后，重新计算有效 ref_count
  const effectiveRefCount = qualityReports
    ?.filter(r => r.retentionDecision !== 'exclude')
    .length ?? state.ref_count;
  if (effectiveRefCount < state.ref_floor) return 'fail_a';

  return 'pass';
}
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
- `content_retention_decision=exclude_source` → 整体排除（**这就是"放弃"动作**）

## 实验范围

**Goals:**
- 定义 `EvidenceQuality` schema（精简版 diagnostic fields，4-5 字段）
- 给 `dpt-source-diagnostic` subagent 差异化 `result.schema.json`（含 diagnostic 字段，不再是泛型 SlotResult）
- 实现 `evalSlotResults(results) → QualityReport[]`：对 subagent 产出做质量评估
- quality 结果影响 `classifyBranch`：discard → 触发 fail_c，有效 ref_count 重新计算
- **discard 路径**：fail_c → 排除低质量 reference → ref_count 降低 → 若不达标 → fail_a → 补搜更好的来源（不是修复烂材料）

**Non-Goals:**
- 不实现 26 字段完整参考审计（V12 规模太大）
- 不做跨 topic contradiction detection（那是 explore-exploit 的事）
- 不做置信度三维评分（后续迭代）

## 关键设计问题

### 1. Quality schema 有多少字段？

倾向：**5 字段**（从 V12 的 6 字段中裁剪）：

```javascript
const EvidenceQuality = z.object({
  substance: z.enum(['substantive', 'thin', 'none']),  // 是否有硬数据
  sourceTier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']),
  commercialIntent: z.enum(['none', 'mild', 'strong']),
  independentBacking: z.number().int().min(0).default(0),  // 独立验证来源数
  retentionDecision: z.enum(['retain', 'prune', 'exclude']),  // ← "放弃"动作
});
```

去掉 `marketing_risk`（与 commercialIntent 冗余）、`cross_verification_status`（用 independentBacking 替代）。

### 2. Discard 的判定规则

```javascript
function evaluateQuality(state, qualityReports) {
  const excluded = qualityReports.filter(r => r.retentionDecision === 'exclude');
  const thin = qualityReports.filter(r => r.substance === 'thin');
  const lowTier = qualityReports.filter(r => r.sourceTier === 'tier_4');
  const unverified = qualityReports.filter(r =>
    r.commercialIntent === 'strong' && r.independentBacking === 0);

  if (excluded.length > 0) return 'fail_c';  // 有被整体排除的证据——放弃
  if (thin.length >= 2) return 'fail_c';      // 多条 thin 证据——放弃（不能修）
  if (lowTier.length > state.ref_count * 0.5) return 'fail_c';  // >50% 低层
  if (unverified.length > 0) return 'fail_c';  // 强商业意图未验证
  return 'pass';
}
```

### 3. fail_c 走什么路径？Discard ≠ Repair

```
fail_c → discardPath:
  1. 标记低质量 reference 为 excluded
  2. 重新计算有效 ref_count（排除 excluded）
  3. 如果有效 ref_count < ref_floor → 转 fail_a（补搜，但搜更好的来源）
  4. 如果有效 ref_count 仍达标 → pass（虽然丢了几个，总数还够）

fail_a → repairPath（现有，不改）:
  1. convergeRepair()：补搜更多来源
  2. 最多 3 次
```

### 4. 如何给 `dpt-source-diagnostic` 差异化 schema

当前 `resultJsonSchemaForSlot()` 对所有 role 返回相同的 `SlotResult` schema。需要让 `dpt-source-diagnostic` 输出含 `quality: EvidenceQuality` 的结构化字段：

```javascript
// subagent-relay.mjs 的 resultJsonSchemaForSlot() 扩展
if (roleAgentKey === 'dpt-source-diagnostic') {
  return SlotResult.extend({
    quality: EvidenceQuality,  // 结构化 diagnostic 输出
  });
}
```

## 与 subagent/gate-fork 的关系

```
classifyBranch(state)
       │
       ├── pass ──→ subagentDispatch → collectResults
       │                                      │
       │                             evalSlotResults(results)  ← evidence-quality 插入点
       │                                 │
       │                    ┌────────────┼────────────┐
       │                    ▼            ▼            ▼
       │                  pass        fail_c      blocked
       │                (保留)      (放弃烂材料)   (人工)
       │                    │            │
       │                    ▼            ▼
       │              继续下一wave   discard→重算ref_count
       │                              → 若不够→fail_a→补搜
       │
       ├── fail_a ──→ convergeRepair（参考数量不够——补搜）
       ├── fail_b ──→ convergeRepair（话题结构问题——重做）
       └── blocked ─→ HITL
```

evidence-quality 是 subagent 产出的**下游**：subagent 产出 result → Engine parse → evalSlotResults 评质量 → classifyBranch 判 pass/fail_c → fail_c = 放弃 → 重算 ref_count → 若不够补搜。

## 下一步

1. `/opsx:explore evidence-quality` — 定：
   - 质量评估放 Engine（规则化最低条件）还是 Phase Agent（LLM 判断）——或分层
   - fail_c 在 `classifyBranch` 中的具体插入位置和优先级
   - `dpt-source-diagnostic` 的差异化 schema 设计
   - discard path 的完整状态转换
2. `/opsx:propose evidence-quality` — 出 proposal + design + specs + tasks
3. 实现：
   - 改 `resultJsonSchemaForSlot()` — 给 `dpt-source-diagnostic` 加 EvidenceQuality 字段
   - 改 `commitSlotResult()` — 当 schema 差异化后，slot result 的 validation path 需接受扩展 shape
   - 实现 `evalSlotResults()`
   - 扩展 `classifyBranch()` 加 fail_c——同时改 `forkRouter()`（它也调用 classifyBranch，签名变更需同步）
   - 扩展 `Branch` enum + `forkMap` + `forkRouter()`
   - 改 `mergeResults()` — 排除 excluded reference，用 `state.ref_count - discarded.length`（不是 qualityReports.length 当 proxy）重算有效 ref_count
   - 决定 `qualityReports` 存在哪——`SubagentWorkflowState` 新增字段，还是 ephemeral（只传参数不持久化）
4. 与 extract prototype 的可组合性验证——extract 产出 countable reference → quality 评估 → 放弃低质量
