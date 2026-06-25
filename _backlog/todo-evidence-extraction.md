# TODO: evidence-extraction（证据提取——把"干货"从来源抽到 reference）

> 状态: 待设计 | 优先级: 高 | 创建: 2026-06-16 | 更新: 2026-06-25
>
> 曾用名: `todo-prototype-extract.md`（太模糊——不知道到底在 extract 什么。更名为 evidence-extraction，明确是提取证据内容/干货。）
>
> 直接依赖: `prototype-subagent` ✅ DONE | `prototype-gate-fork` ✅ DONE
> 上游 of: `todo-evidence-quality`（extraction 产出 reference，quality 评估每条 reference——不够格就放弃）

## Why（更新于 2026-06-25）

### 基础提取已存在——但"干货"不够

wave0 和 wave1 现在**已经**做 source intake 和 evidence extraction：

- **wave0**: `dpt-source-intake` subagent 做真实 WebSearch + WebFetch，产出 `reference/{topic}/source.yaml`
- **wave1**: `dpt-evidence-extractor` subagent 做 deepening，产出 NL 摘要文件（`evidence-summary.md` + `question-list.md`）。注意：wave1 的产出是自然语言叙事（"机制理解"/"趋势观察"），不是结构化的 evidence particle——这与本 TODO 要做的**结构化证据捕获**是不同的东西。

问题不在"有没有提取"，在于**提取了什么**。

当前 `source.yaml` 的格式是 `ReferenceMetadataSchema`（`DPT_FRAMEWORK/schema/contracts/reference.mjs`），只有 5 个字段：

```javascript
url, title, retrieved_date, topic_tag, notes
```

**没有硬数据捕获。** URL、标题、日期、标签、备注——这些都是元数据。没有一个字段保存从网页里提取出来的实质内容（数字、日期、方法、机制、约束）。`notes` 是自由文本，没有结构，不可审计。

**但注意**：Gate 系统已有独立的 YAML entry 计数（`gate-wave0-complete.definition.json` 的 `count_floor` rule 直接读 `source.yaml` 条目数）。`ref_count` 不可信的问题**具体在 `mergeResults()` 的 fork routing 路径**——`classifyBranch()` 用的是 Agent 声明的 `evidenceCount` 累加值做分支判断，而不是 Gate 的独立计数。两者不一致：Gate 能正确计数，但 fork router 用的是 Agent 数。

### 用户反馈（2026-06-25）

> "历史上我就是觉得干货留在 reference 里面有点少" —— reference 不只是"这个网页存在"的记录，应该捕获从网页里提取出的实际证据内容。

## 核心挑战：从元数据到可计数内容

```
当前 wave0 产出:
  reference/{topic}/source.yaml     ← 只有 url, title, retrieved_date, topic_tag, notes

期望的 reference 产出:
  reference/{topic}/{slug}.md       ← 含 Core Content Capture（硬数据：数字、方法、约束）
                                    ← 含 source tier、substance 判定、acceptance 决策
```

**核心洞察：`ref_count` 应该是 Engine 计算的派生值**。不再由 Agent 声明 `evidenceCount: 3`，而是 Engine 扫描 `REFERENCE_DIR/` 目录，数有多少个 `isCountable(ref)`——conditions 满足才算数。

## 现有基础设施（可利用）

| 基础设施 | 位置 | 如何用 |
|---------|------|--------|
| `ReferenceMetadataSchema`（5 字段） | `DPT_FRAMEWORK/schema/contracts/reference.mjs` | 扩展 or 补充为 enriched reference 格式 |
| `QueueWorkUnitSchema` | `DPT_FRAMEWORK/schema/contracts/queue.mjs` | CandidateCard 可以做成新的 `producer_rule`（如 `reference_triage`），而非独立 schema |
| `subagent-relay.mjs` 的 dispatch/collect/merge | `DPT_FRAMEWORK/engine/subagent-relay.mjs` | 完整 pipeline 可用，extract 是新增 post-collect 处理层 |
| `dpt-source-diagnostic` role agent | `subagent-relay.mjs` dispatch map | 已注册但输出用泛型 SlotResult schema——需要差异化 schema |
| `_cache/` 目录约定 | `shared-subagent-protocol.md` §2 | 文档中定义了 `_cache/waveN/slot_MM/search-results/` 等路径，但仅作为 subagent convention（`authority: guidance-only`），Engine 不创建。实际只在 subagent 执行期 transient 存在于 bundle 中。extract 需要决定是否将其升级为 Engine-enforced staging area |
| wave0 queue-driven 三阶段 | phase-wave0.md + phase-wave0-subagent.md | 当前 flow：搜索→直接写 source.yaml。extract 在此流程中增加 "triage + enrich" 步骤 |

## 从 V12 借鉴的核心模式

V12 的 reference 生命周期有 3 阶段，我们目前只实现了阶段 1（搜索→写入 source.yaml），缺阶段 2（triage + promotion）和阶段 3（reference counting by Engine）：

### Stage 1: Source Intake → `_cache/`（部分已实现）

- wave0 subagent 已做真实搜索和 fetch
- 结果直接写入 `reference/{topic}/source.yaml`，跳过了 `_cache/intake/` staging

### Stage 2: Triage + Promotion → `REFERENCE_DIR/`（**缺失**）

- 审查 candidate cards
- 决策：promote / exclude / needs_full_read
- Promote = 创建 enriched reference 文件（含 Core Content Capture）

### Stage 3: Reference Counting → Gate Audit（**缺失**）

- 只有满足最低条件的 reference 才计入 `ref_count`
- Engine 计算，不由 Agent 声明

## 实验范围

**Goals:**
- 扩展 reference 格式：增加 `## Core Content Capture` section（硬数据：数字、日期、方法、机制、约束、限制）和 quality 判定字段（substance, source_tier, commercial_intent, retention_decision）
- 定义 CandidateCard schema——可以走新的 `producer_rule`（`reference_triage`）复用 `QueueWorkUnitSchema`，也可以独立
- 实现 promote 流程：cache → triage → enriched reference 文件
- 实现 `isCountable(ref)`：判断一个 reference 是否满足最低计数条件
- 实现 `countReferences(baseDir)`：Engine 扫描 reference 目录，只数 countable 的
- `ref_count` 不再由 Agent 的 `evidenceCount` 决定——由 Engine 计算

**Non-Goals:**
- 不实现 25 字段完整 V12 参考格式（精简到 ~8 字段 + Core Content Capture）
- 不实现 cache 清理策略（prototype 级别）
- 不实现 exa_search 等复杂 source intake profile
- 不改变 wave0/wave1 的 dispatch/collect 层——extract 是 post-collect 处理，插入在 merge 和 gate check 之间
- `ExtractionWorkflowState` 扩展 `SubagentWorkflowState`——虽然涉及 engine state schema 变更，但这是**新增字段**（`candidate_cards`, `reference_inventory`），不改动 dispatch/collect/slot 管理的现有逻辑

## 关键设计问题

### 1. Reference 文件格式（基于现有 `ReferenceMetadataSchema` 扩展）

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

**与现有 `source.yaml` 的关系**：enriched reference **补充**而非**替代** `source.yaml`。`source.yaml` 保留为快速索引（metadata-only），enriched reference 文件承载内容。

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

**关键：`ref_count` 变成 Engine 派生的不变量。** Agent 不能再声明 `evidenceCount`。Engine 数 reference 目录里有多少个 `isCountable(ref)`。

### 3. Candidate Card → Reference 的 promote 流程

两种设计路径：

**路径 A：新 `producer_rule`（推荐）**——复用 `QueueWorkUnitSchema`，新增 `producer_rule: reference_triage`，triaged candidates 作为 queue task card 的 payload。与现有 queue-driven 三阶段一致。

**路径 B：独立 CandidateCard schema**——TODO 原始方案，更独立但增加并行 schema 的维护成本。

```javascript
// 路径 A 示例：QueueWorkUnitSchema 的 producer_rule 扩展
const CandidateCardProducerRule = 'reference_triage';  // 新增

// promote 逻辑
function promoteToReference(candidate, baseDir) {
  if (candidate.decision !== 'promote') return null;
  
  const ref = {
    ...candidate,
    acceptance_status: 'accepted',
    source_tier: candidate.tier_guess,
    web_substance: 'substantive',  // 实际由 Agent/diagnostic 判断
    commercial_intent: 'none',      // 实际由 Agent/diagnostic 判断
    content_retention: 'retain',
    coreContentCapture: readFileSync(candidate.cache_path, 'utf-8'),
  };
  
  writeFileSync(`${baseDir}/REFERENCE_DIR/${candidate.proposed_path}.md`, formatRefMD(ref));
  return ref;
}
```

### 4. extract 与 eval 的关系（流水线）

```
Agent 搜索/fetch → _cache/ (wave0 已做)
  → triage (extract 新增) → promote → enriched reference (extract 新增)
    → countReferences → ref_count (extract 新增，Engine 算)
      → evalSlot → quality report (evidence-quality 管——下个 TODO)
        → 放弃低质量 reference (evidence-quality 管——discard，不是 repair)
```

extract 管"拿到结构化证据 + 计数"。evidence-quality 管"每条证据够不够格——不够就放弃"。

注意：还有一个更高层的 eval——**final-output eval**（全部 wave 跑完后，评估最终产物质量，决定是否自动 rerun）。这不是 evidence-quality（per-source）的范畴，目前没有独立 TODO，概念上处于 explore-exploit（wave 级收敛）和 rerun-incremental-node（rerun 怎么执行）之间。

## 实现思路

```javascript
// Extended SubagentWorkflowState（在 subagent-relay.mjs 现有基础上加字段）
const ExtractionWorkflowState = SubagentWorkflowState.extend({
  candidate_cards: z.array(CandidateCard).default([]),
  reference_inventory: z.array(z.string()).default([]),  // reference file paths
});

// Engine 计算 ref_count，替代 Agent 的 evidenceCount 累加
function countReferences(baseDir) {
  const refDir = `${baseDir}/REFERENCE_DIR`;
  const files = readdirSync(refDir).filter(f => f.endsWith('.md'));
  return files
    .map(f => parseReference(readFileSync(`${refDir}/${f}`, 'utf-8')))
    .filter(isCountable)
    .length;
}

// Post-collect 处理（插入在 mergeResults 和 forkRouter 之间）
function runExtractionPass(state, baseDir) {
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

## 与现有 wave0/wave1 flow 的集成点

```
wave0 queue-loop（现有，不改）:
  enqueue(source_intake_fan_in) → claim → subagent dispatch(WebSearch+WebFetch)
    → collect → source.yaml 写入

extract pass（新增，post-collect）:
  读 source.yaml + _cache/ → triage(CandidateCard) → promote → enriched reference
    → countReferences() → 更新 ref_count（Engine 算的）

gate-wave0-complete（现有，不改）:
  check ref_count >= ref_floor（但现在 ref_count 是 Engine 算的，可信）
```

## 下一步

1. `/opsx:explore evidence-extraction` — 定：CandidateCard 走路径 A 还是 B、enriched reference 格式的最终字段、extraction 在 wave0 pipeline 的确切插入点
2. `/opsx:propose evidence-extraction` — 出 proposal + design + specs + tasks
3. 实现：
   - 扩展 `ReferenceMetadataSchema` 或新增 enriched reference schema
   - 实现 `isCountable()` + `countReferences()` in Engine
   - 改 `mergeResults()` ——不再 Agent evidenceCount 累加，改用 `countReferences()`
   - 新增 CandidateCard triage 逻辑（走 queue producer_rule 或独立）
4. 与 evidence-quality 的可组合性验证（extract 产出 enriched references → quality 读取并评估每条 → discard 低质量 → 重算 effective ref_count）。在两个 TODO 都实现后，用共享 test fixture 做集成验证。
