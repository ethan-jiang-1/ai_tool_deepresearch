# TODO: prototype-extract

> 状态: 待设计 | 优先级: 高 | 创建: 2026-06-16

## Why

`prototype-subagent` 验证了 subagent 分派和结果收集——每个 subagent 生产 `result.md`。但 `result.md` 的内容从哪来？

真实 deep research 中，Agent 搜索 → 获取网页 → 提取硬数据 → 写进 reference。当前 prototype 跳过了一步：**从原始来源到结构化证据的转换**。

没有这一步，subagent 产出的 `result.md` 就是"Agent 自己觉得有道理"的总结——无法审计、无法计数、无法做质量评估。

**prototype-extract 验证"怎么拿"**：URL → 缓存 → 提取 → 结构化 reference。

## 核心挑战：提取不是 Agent 自由发挥

V12 的核心教训：**summary-only reference 不算证据**。

一个有效的 reference 必须包含"可计数硬内容"（numbers, dates, methods, mechanisms, constraints），而非 Agent 的概括。当前所有 prototype 的 `evidenceCount` 只是一个数字——没人检查这个数字背后是硬数据还是 Agent 幻觉。

```
原始来源（URL/网页）
     │
     ▼
_cache/（暂存，不算证据）
     │
     ▼
Reference（结构化提取物，含 Core Content Capture）
     │
     ▼
result.md（subagent 基于 reference 的发现）
```

## 从 V12 借鉴的核心模式

V12 的 reference 生命周期有 3 阶段：

### Stage 1: Source Intake → `_cache/`

- search/fetch 结果写 `_cache/intake/<batch>/candidate-cards.md`
- Candidate Card 是归一化的 triage 格式
- `_cache/` 是 staging，不算证据，不通过 Gate

### Stage 2: Triage + Promotion → `REFERENCE_DIR/`

- Main Agent 审查 candidate cards
- 决策：promote / exclude / needs_full_read
- Promote = 创建 `REFERENCE_DIR/<provenance>-<slug>.md`
- 填写 25 字段元数据 + Core Content Capture

### Stage 3: Reference Counting → Gate Audit

- 只有 `acceptance_status=accepted` 的 reference 才会计入 `ref_count`
- `web_substance=thin/none` 不能计数
- `content_retention_decision=prune_partial` 必须注明剪了什么

## 实验范围

**Goals:**
- 定义候选来源的 triage 格式（CandidateCard schema）
- 实现 cache → reference 的 promote 流程
- 定义 Reference 文件格式（精简版，~8 字段 + Core Content Capture section）
- 实现 `isCountable(reference)`：判断一个 reference 是否满足最低计数条件
- `ref_count` 不再直接由 subagent 的 `evidenceCount` 决定——由 Engine 通过 `countReferences()` 从 reference 文件计算

**Non-Goals:**
- 不实现真实搜索和网页抓取（mock 数据）
- 不实现 25 字段完整参考格式（精简到 ~8 字段）
- 不实现 cache 清理策略（prototype 级别）
- 不实现 exa_search 等复杂 source intake profile

## 关键设计问题

### 1. Reference 文件格式

```markdown
# <title>

- source_url: <url>
- cache_path: _cache/captures/<slug>.md
- provenance: 00-shared | <topic-id>
- acceptance_status: accepted | reviewed_uncounted | excluded
- source_tier: tier_1 | tier_2 | tier_3 | tier_4
- trust_level: official | academic | practitioner | community
- web_substance: substantive | thin | none
- commercial_intent: none | mild | strong
- content_retention: retain | prune_partial | exclude_source
- evidence_role: foundation | must_answer | mechanism | limitation

## Core Content Capture
<!-- 硬数据：numbers, dates, methods, mechanisms, constraints, limitations -->
<!-- 不保留：SEO filler, promotional claims, vague adjectives, unsupported outcomes -->

## Why Accepted (or Why Excluded)
```

### 2. 什么叫 "可计数"（Countable）

```javascript
function isCountable(ref) {
  // 必要条件：
  if (ref.acceptance_status !== 'accepted') return false;
  if (ref.web_substance === 'thin' || ref.web_substance === 'none') return false;
  if (ref.content_retention === 'exclude_source') return false;
  if (!ref.coreContentCapture || ref.coreContentCapture.length < 100) return false;
  return true;
}
```

**关键洞察：`ref_count` 变成派生值**。不再由 Agent 声明 `evidenceCount: 3`，而是 Engine 数 reference 目录里有多少个 `isCountable(ref)`。

### 3. Candidate Card → Reference 的 promote 流程

```javascript
const CandidateCard = z.object({
  source_url: z.string(),
  cache_path: z.string().optional(),
  proposed_path: z.string(),      // e.g., '00-shared-fda-guideline'
  trust_level: z.enum(['official','academic','practitioner','community']),
  tier_guess: z.enum(['tier_1','tier_2','tier_3','tier_4']),
  topic_alignment: z.string(),
  noise_risk: z.enum(['low','medium','high']),
  decision: z.enum(['promote','exclude','needs_full_read']),
  why: z.string(),
});

function promoteToReference(candidate, baseDir) {
  if (candidate.decision !== 'promote') return null;
  
  const ref = {
    ...candidate,
    acceptance_status: 'accepted',
    source_tier: candidate.tier_guess,
    web_substance: 'substantive',  // 实际由 Agent 判断
    commercial_intent: 'none',      // 实际由 Agent 判断
    content_retention: 'retain',
    coreContentCapture: readFileSync(candidate.cache_path, 'utf-8'),
  };
  
  writeFileSync(`${baseDir}/REFERENCE_DIR/${candidate.proposed_path}.md`, formatRefMD(ref));
  return ref;
}
```

### 4. extract 与 eval 的关系

extract 产出 reference，eval 评估 reference 质量：

```
Agent 搜索/fetch → _cache/ (extract 管)
  → promote → REFERENCE_DIR/ (extract 管)
    → countReferences → ref_count (extract 管，Engine 算)
      → evalSlot → quality report (eval 管)
        → evalGate → pass/fail_c (eval 管)
```

两者是**流水线上下游**：extract 管"拿到结构化证据"，eval 管"证据够不够格"。

## 实现思路

```javascript
// Extended SubagentWorkflowState
const ExtractionWorkflowState = SubagentWorkflowState.extend({
  candidate_cards: z.array(CandidateCard).default([]),
  reference_inventory: z.array(z.string()).default([]),  // reference file paths
});

// 替代 subagent 的 evidenceCount 机制：
// 不再信任 Agent 的 evidenceCount，而是 countReferences()
function countReferences(baseDir) {
  const refDir = `${baseDir}/REFERENCE_DIR`;
  const files = readdirSync(refDir).filter(f => f.endsWith('.md'));
  return files
    .map(f => parseReference(readFileSync(`${refDir}/${f}`, 'utf-8')))
    .filter(isCountable)
    .length;
}

// 主循环
function runExtractionWave(state, baseDir) {
  // ... fork → pass → dispatch candidates（代替 dispatch subagents）
  const candidates = collectCandidates(baseDir);
  const refs = candidates
    .map(c => promoteToReference(c, baseDir))
    .filter(Boolean);
  
  const actualRefCount = countReferences(baseDir);
  return {
    ...state,
    ref_count: actualRefCount,  // Engine 算的不变量，Agent 不能改
    reference_inventory: refs.map(r => r.proposed_path),
  };
}
```

## 下一步

1. OpenSpec explore: 细化 Reference schema、CandidateCard format、promote 流程、countReferences 规则
2. `/opsx:propose prototype-extract` — 出 proposal + design + specs + tasks
3. 实现 `experiments/prototype-extract/`
4. 与 eval prototype 的可组合性验证
