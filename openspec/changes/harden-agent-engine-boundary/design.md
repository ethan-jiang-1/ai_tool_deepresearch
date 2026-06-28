## Context

当前 Agent↔Engine 边界依赖隐式约定。Engine 通过 `glob/readdir` 扫描文件系统发现 Agent 产出，gate 缺少跨文件内容去重检查，`claim()` 不校验 actor identity，trace 散落在 4 份文件中。两个 P0 bug（#001 虚假 reference 批量绕过 gate，#002 Phase Agent 跳过 Sub-agent 导致 _cache/ 全空）暴露了边界的系统性脆弱——上次修复（ce6be275）全部是软约束（文本指令+单域名检查+Agent 自查），被轻松绕过。

三个 Plan（`_backlog/plan/`）从不同维度诊断了同一问题并给出了互补方案：
- `experiment-production-convergence.md`：Engine 应该消费结构化声明而非扫描文件系统
- `ref-integrity-experiment-family.md`：需要实现缺失的 Engine 检查 + 建实验家族验证边界
- `trace-unification-assessment.md`：4 份 trace 文件应统一为 1 份

本 change 将三个 Plan 合并实施——从合同（声明）、执法（Engine 检查）、可观测性（统一 trace）三个维度硬化边界。

## Goals / Non-Goals

**Goals:**
- 建立 Agent 产出声明的结构化合同（`output_files[]` + `cache_trails[]`），Engine 消费声明不做目录扫描
- 实现 content_dedup gate 规则（Jaccard 相似度、URL 去重、首页检测、自指语言检测）
- 实现 `complete()` 对 delegated task 的 `_cache/` trail 强制检查
- 实现 `claim()` 的 `--actor` 与 `targets.controller` 匹配校验
- 统一 trace 文件：消灭 `_logs/` 下 3 份 trace，只保留 `rb_trace.jsonl`
- 建 6 个实验（case-12 到 case-17）验证边界在各种压力下能扛住
- 修复 task card 模板中搜索类 task 的 `controller: "main-agent"` → `"sub-agent"`（Bug #002 根因）

**Non-Goals:**
- 不改变 Queue x Relay 集成架构（该集成未实现，实验用手动桥接）
- 不新增 npm 依赖
- 不测试 wave2（当前范围：wave0 + wave1 的 source intake + deepening）
- 不为 _cache/ 内容做语义质量判断（Engine 只检查文件存在，不检查内容真伪）
- 不实现 `run_end` trace marker（Phase 2 范围）

## 核心架构原则：Agent 产出声明

本次 change 最根本的架构决策来自 `experiment-production-convergence.md` Plan：

> Engine 代码不得通过扫描目录来发现 Agent 的产出。Agent 的文件产出（文件路径、cache 目录、source 元信息）必须以结构化、schema-validated 的声明形式记录。Engine 消费声明做检查，不消费文件系统形状。
>
> 生产和实验在这个声明处汇聚：生产由 Sub-agent 产出声明（经 `commitSlotResult()` schema 验证），实验由 playbook 提供同样 schema 的 fixture 声明。声明之后的下游管道（`complete()` receipt 检查、gate `content_dedup`、trace verdict）走完全相同的代码路径。

### 汇聚图

```
生产                                实验
────                                ────
Sub-agent 产出文件 + 声明           Playbook 产出文件 + 声明（同样 schema）
        │                                    │
        └────────────┬─────────────────────┘
                     │
                     ▼    ← 从此处完全相同的代码路径
            commitSlotResult() schema 验证
            complete() 逐项 receipt 检查
            gate content_dedup（不扫描目录）
            trace verdict
```

### 当前问题

- Engine 靠 `fs.readdir` / glob 扫描目录发现文件（gate `content_dedup` 扫描 `reference/*.md`）
- `complete()` 只检查单个 `completion_receipt`，不知道 Sub-agent 写了哪些其他文件
- Sub-agent 的文件命名决策（`source-slug`）没有被记录，Engine 无法验证命名一致性
- 实验手写 fixture 时路径确定，生产时路径由 Agent 非确定决定——两者验证的不是同一件事

## Decisions

### D1: Agent 产出声明是 result.json 的扩展，不是新文件

**选择**：在 Sub-agent 返回的 result JSON 中加入 `output_files[]` + `cache_trails[]`，与现有 `SlotResult` schema 共存。`commitSlotResult()` 在写入 result.json 前验证声明 schema。

**备选**：创建独立的 `declaration.json` 文件。→ 拒绝——增加一个文件，增大 Agent 遗漏声明的风险。result.json 是 Agent 的"完成信号"，产出声明天然应该与之绑定。

**实现**：
```js
// subagent-relay.mjs SlotResult schema 扩展
output_files: z.array(z.object({
  path: z.string(),       // bundle-relative 路径
  role: z.enum(['reference', 'evidence_summary', 'question_list', 'source_yaml', 'index', 'other']),
  source_url: z.string().optional(),  // role=reference 时必填
  source_slug: z.string().optional(),
})),
cache_trails: z.array(z.string()),  // bundle-relative 路径，如 _cache/wave0/primary/01_xinhua/s01_xinhua-box-office/
```

**下游消费：**
- `complete()`：遍历 `output_files[].path` 逐项检查文件存在；遍历 `cache_trails[]` 检查每目录 3 文件
- gate `content_dedup`：读 `output_files[]` 中 `role=reference` 的条目，按 `source_url` 去重、按 `path` 做 Jaccard 内容比较——**不再扫描 `reference/` 目录**
- experiment：写同样 schema 的 `result.json` → 后续所有 CLI/Engine 调用与生产完全一致

### D2: content_dedup 是 gate-helpers.mjs 的新 check type，不是独立模块

**选择**：5 个 dedup 函数放在 `gate-helpers.mjs` 中，作为新的 check type `content_dedup`。gate definition JSON 中声明 `{ "id": "content_dedup", "check": "content_dedup", "threshold": { "jaccard": 0.8, "url_dedup": true, "homepage_detect": true, "self_ref_detect": true } }`。

**备选**：独立 `dedup-engine.mjs` 模块。→ 拒绝——dedup 是 gate 检查的一种类型，应与 `count_floor`、`schema_valid` 平级放在 gate-helpers 中。独立模块会增加 import 链但无额外复用价值。

**5 个函数**：
1. `tokenizeForSimilarity(text)` — 中文 bigram + 英文 word tokenization，返回 token 集合
2. `jaccardSimilarity(tokensA, tokensB)` — Jaccard = |A∩B|/|A∪B|
3. `extractSection(mdContent, sectionName)` — 从 Markdown 提取指定 section（Key Facts、Core Content 等）
4. `parseReferenceMetadata(refPath)` — 从 reference/*.md 提取 frontmatter 的 source_url + body 的 Key Facts
5. `checkContentDedup(referenceDir, options)` — 主函数：收集所有 reference 文件 → URL 去重 → 首页检测 → 自指语言检测 → 两两 Jaccard 比较 → 返回 `{ passed, inspect, advice }`

### D3: complete() 的 cache trail 检查是 Queue Manager 的行为，不是 Gate 的

**选择**：`complete()` 在 promotion 前检查 `_cache/` trail。检查逻辑：对 delegated task（`targets.delegates.to === "sub-agent"`），验证每个 `cache_trails[]` 目录存在且含 3 文件（websearch.json + page.md + meta.json）。缺失 → `complete()` reject，feedback 说明缺失哪个目录/文件。

**备选**：放在 gate 中检查。→ 拒绝——`_cache/` 的权威检查时机是 `complete()` 时（Agent 声称"完成了"），gate 是事后审计。`complete()` 拒绝可以在 queue 中生成 repair item 立即修复，gate 拒绝则需要整个 phase 重跑。

**边界场景**（对应 case-16 的 4 种场景）：
| 场景 | _cache/ 状态 | complete() 行为 |
|------|-------------|----------------|
| A | 目录完全不存在 | reject: "cache trail missing: directory not found" |
| B | 目录存在但无 sNN_*/ | reject: "cache trail missing: no source subdirectories" |
| C | 有 sNN_*/ 但缺 meta.json | reject: "cache trail incomplete: missing meta.json" |
| D | 3 文件完整 | pass |

### D4: controller 校验是 claim() 的前置检查

**选择**：`claim(queue, { actor })` 在返回 task card 前校验 `--actor` 与 `targets.controller` 匹配。不匹配 → claim reject，反馈："actor mismatch: --actor {X} but controller requires {Y}"。

Task card 模板修改：所有带 `delegates.to: "sub-agent"` 的搜索类 task，`controller` 从 `"main-agent"` 改为 `"sub-agent"`。Phase Agent 只能 claim `controller: "main-agent"` 的 task（如 synthesis、seed-topic materialization、backfill）。

修改范围：
- phase-wave0.md §3.1：source_intake_fan_in 模板 controller → `"sub-agent"`
- phase-wave1.md §3.1：topic_deepening 模板 controller → `"sub-agent"`
- phase-wave0.md §3.3.1/§3.3.2 supplement 模板 controller → `"sub-agent"`
- 保留 `controller: "main-agent"` 的：seed_topic_materialize、cross_topic_synthesis、seed_topic_backfill_wave2

### D5: trace 统一是机械替换，不是架构重构

**选择**：
1. `queue-manager.mjs`：`QUEUE.TRACE` 常量从 `'_logs/_trace_agq_cli.jsonl'` 改为 `'rb_trace.jsonl'`
2. `subagent-relay.mjs`：`ensureTrace()` 路径从 `_logs/_trace_subagent.jsonl` 改为 `rb_trace.jsonl`
3. `wff-playbook-utils.mjs`：`recordCheck()`/`verdict()` 默认 trace 路径从 `_logs/_trace.jsonl` 改为 `rb_trace.jsonl`
4. ~30 个实验 playbook：`$B/_logs/_trace.jsonl` → `$B/rb_trace.jsonl`（机械替换）
5. `inspect-bundle.mjs --timeline`：从读 4 个 sink 简化为读 2 个（`rb_trace.jsonl` + `run.log`）

**核心洞察**：各模块对 `rb_trace.jsonl` 的写入方式不同——`traceInit` 只在 bundle 创建时调一次（清空+写 `run_start`），queue-manager/subagent-relay 的 `ensureTrace` 是 lazy init（只追加不清理）。合并后追加模式互不干扰。`TraceEntrySchema` 已是 passthrough（`z.object({ts, event}).passthrough()`），不需要改。

### D6: 实验分两层——Engine 层确定性验证 + Agent 层全链路验证

**选择**：
- **Engine 层**（2 个 light 实验，无需 Agent）：case-16（complete cache rejection，4 种边界）+ case-17（gate content_dedup，5 种造假模式）。全部 fixture + CLI 调用，确定性可重复。
- **Agent 层**（4 个 heavy/standard 实验，真实 Sub-agent + WebSearch）：case-12（wave0 real agent intake）、case-13（wave0 count floor refill）、case-14（wave1 real agent deepening）、case-15（wave0→wave1 pipeline）。验证完整链路。

两个 Engine 层实验替代 case-11 的 A/B/C/D 场景（但边界更完整）。case-11 保留为快速 smoke test。

实施顺序：Phase 1（实现代码）→ Phase 2（长期防御）→ Phase 3（Engine 层实验）→ Phase 4（Agent 层实验）。

### D7: 长期防御——规则 ID 快照

**选择**（从 `ref-integrity-experiment-family.md` §12 的选项 C）：
- `validate-bundle.mjs` 加 required gate rule ID 检查：gate definition 必须包含的关键规则 ID（如 `wave0-complete` 必须有 `content_dedup`）
- 新建 `validate-phase-templates.mjs`：解析 phase-wave0/1/2.md 的 §3.1 task card 模板 JSON code block，验证关键字段（`targets.controller`、`targets.delegates.to`）不被意外改动

## Risks / Trade-offs

- **[R1] content_dedup Jaccard 阈值 0.8 对中文可能不精确** → 用中文 bigram tokenization（而非单字），case-17 会暴露误报/漏报。阈值可在 gate definition JSON 中调整，不需要改代码。
- **[R2] Agent 可能不写 output_files 声明** → Engine 层 `complete()` 检查 `cache_trails[]` 时发现声明缺失 → reject。Phase Agent prompt 中加入"必须写 output_files 声明"指令。但声明缺失的检测依赖 Agent 写了 result JSON ——如果 Agent 连 result JSON 都不写，`complete()` 无法被调用（没有 result）。
- **[R3] task card controller 改为 "sub-agent" 后，Phase Agent 无法自己做搜索** → 这是预期行为。如果 Phase Agent 需要自己做搜索（如 debug），应使用不带 `delegates.to` 的 task card。这是正确的关注点分离。
- **[R4] ~30 个 playbook 的 trace 路径替换是机械操作但工作量大** → 用 grep + sed 批量替换，然后逐个验证 playbook 的 frontmatter 和 trace 引用一致。
- **[R5] 实验 case-12~15 依赖真实 WebSearch + WebFetch** → 网络不可用或 Sub-agent 超时会导致实验失败，但不是机制问题。每个实验有独立 disposable bundle，失败不影响其他实验。

## Open Questions

1. **content_dedup 的 Jaccard 阈值 0.8 是否需要按 language 调整？** — 中英文混合文件需要分别处理还是统一？当前设计用中文 bigram + 英文 word 混合 tokenization，阈值统一 0.8。case-17 会验证实际效果。
2. **`meta.json` 的 11 字段是否需要 schema 校验？** — `complete()` 当前只检查文件存在，不校验 schema。如果需要校验，应该用现有的 ReferenceMetadata 相关 schema 还是定义新的 CacheMeta schema？
3. **case-13 count floor refill 的触发方式？** — 手动设 floor=2（`_backlog/plan/ref-integrity-experiment-family.md` 建议），还是用 `operate-queue fail` 触发自动生成 repair item？前者更可控，后者更接近生产。
4. **`validate-phase-templates.mjs` 的 Markdown 解析策略？** — 解析 JSON code block 需要可靠的正则/解析器。phase doc 的 §3.1 中 task card 模板在 code block 内，是否需要特定 marker（如 `<!-- task-card-template -->`）标注？
