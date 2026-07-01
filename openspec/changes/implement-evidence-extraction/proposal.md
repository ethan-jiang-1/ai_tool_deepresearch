## Why

当前 evidence extraction 有两个断裂点，在真实 bundle `dpt_rb_china-japan-relations-since-april-2026`（6 topics，经过 2 轮 rerun）上暴露得很清楚：

**断裂点 1：`_cache/` 是 guidance-only 约定，Agent 不遵守时 Engine 不知情。**

`shared-subagent-protocol.md` 和 spec `cache-raw-web-content`（CRC-001..004）定义了四级 cache 目录结构（`_cache/{wave}/{batch}/{scope}/sNN_slug/`，含 `websearch.json`/`page.md`/`meta.json`）。但这套约定权威级别是 `guidance-only`——Engine 从不验证 cache 是否存在、内容是否完整。结果：

| Topic | wave0 cache | wave1 cache | 状态 |
|-------|------------|------------|------|
| 01-04（首次运行） | 24-30 dirs | 5-12 dirs | 正常 |
| 05（rerun #1 add→supplement） | 6 dirs | 4 dirs | 稀疏（~1/3 密度） |
| **06（rerun #2 add）** | **0** | **0** | **完全缺失** |

同时 `rb_output_declarations.jsonl` 的 53 条 declaration 中，`cache_trails` 字段**全为空数组**。Schema 有这个字段（`OutputDeclarationLedgerRecord.cache_trails: z.array(z.string())`），但没有任何代码路径填充它——Agent 不写，Engine 也不验证。

**断裂点 2：`ref_count` 由 Agent 声明，Engine 不独立计算。**

Gate 的 `count_floor` 规则用 filesystem glob 数所有 reference 文件（包括 0-byte shell），fork router 的 `mergeResults()` 用 Agent 声明的 `evidenceCount`。两者计算方式不同、结果不一致——Gate 可能通过（glob 数够了），但 fork router 用另一个数字做 branch decision。

**这两个断裂点合在一起构成一条完整的信任链断裂：**

```
cache 不可审计
  → 无法 trace reference 回原始 websearch/page/meta
    → isCountable(ref) 和 countReferences(baseDir) 缺地基
      → ref_count 永远不可信（Agent 可以报任何数字）
```

**为什么现在做：**

1. BUG-007 修复（`harden-rerun-topic-integration`）提供了关键基础设施：file-observability 可独立于 ledger 扫描文件系统，checkpoint/reentry 可检测 phase 间状态漂移，`creation_reason` 在 ledger 中记录了产出上下文
2. CRC-001..004 已定义了 cache 结构标准——只是缺少 Engine 强制执行层
3. `OutputDeclarationLedgerRecord.cache_trails` 字段已存在——只是从未被填充
4. 上游标准已就位：`wave1-sufficiency-gates` ✅ DONE——`quality_min_tier`/`quality_min_substance` 等阈值已在 4 套 style JSON 中定义，extraction 产出的 reference 质量可以对照这些标准评估

**在 5 阶段 evidence pipeline 中的位置：**

```
✅ wave1-sufficiency-gates（标准层：多高算够）
    ↓
⚡ evidence-extraction ← 本 change（per-source：拿干货 + Engine 计数 + cache 审计）
    ↓
📋 evidence-quality（per-source：评——不够格就放弃）
    ↓
📋 explore-exploit（wave 级：收敛还是换向）
    ↓
📋 final-output-eval（run 级：交付还是自动 rerun）
```

这是 `_backlog/todo-evidence-extraction.md`（状态：部分完成，优先级：高）的下一阶段。该 TODO 已有部分落地（CCC section + `_cache/` 约定 + reference 格式链硬化），但剩余 6 项中本 change 解决最关键的 3 项：`isCountable`/`countReferences`/cache trail 审计。CandidateCard、promote 流程、`web_substance`/`commercial_intent` 等质量字段留给后续 `evidence-quality` change。

## What Changes

- **Cache trail 硬化为 Engine 可审计**：`complete()` 在 delegated task 完成时验证 `_cache/` 目录存在且含 3 文件（`websearch.json`/`page.md`/`meta.json`），将验证通过的路径写入 `cache_trails` 字段（保持 `z.array(z.string())` 格式不变——只存路径字符串，不改变 schema 结构）。Gate 新增 `cache_coverage` 规则：声明了 role=reference 的 declaration，其 `cache_trails` 中的每条路径在文件系统中必须存在且含 3 文件。**过渡策略**：首版 gate 对空 `cache_trails` 只 warn 不 fail（兼容现有 bundle 53 条 declaration 全空），等 prose 层更新后升为 fail。
- **Rerun action:add 的 cache 修复**：`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md` 的 Rerun-Aware Behavior 中明确要求新增 topic 必须走完整的 source intake（含 `_cache/` 写入），与首次运行一致。Phase rerun task card 模板含 cache 路径指令，`phase-rerun.md` 注明下游 phase 的 cache 要求。
- **`isCountable(ref)` 和 `countReferences(baseDir)` 实现**：新 Engine helper `ref-count.mjs`。`isCountable` 返回 `{ countable: boolean, reason?: string }`（不返回裸 boolean，以便 audit 时了解为何不可计数）。使用 4 个最小条件（全部可从现有 metadata block + section 判定，不需要新字段）：(1) `acceptance_status: accepted`、(2) `## Core Content Capture` ≥ 100 chars、(3) `source_url` 是 article-level（复用 `isHomepageUrl()`）、(4) `## Key Facts` ≥ 5 bullets（复用 `checkReferenceKeyFactsMinLines()`）。文件不可解析时返回 `{ countable: false, reason: "unparseable" }`。Engine 扫描 `reference/` 目录（排除 `_INDEX.md`/`README.md`），只数 `isCountable` 返回 `countable: true` 的。
- **`ref_count` 改为 Engine 计算**：`subagent-relay.mjs` 的 `mergeResults()` 不再累加 Agent 的 `evidenceCount`，改用 `countReferences()` 返回值。Gate 的 **glob-based** `count_floor` 规则同步切换——`shared_ref_count_floor`（wave0）和 `per_topic_ref_md_count_floor`（wave1）从 `readdirSync` + regex glob 改为调用 `countReferences()`。**YAML-array 规则不迁移**：`per_topic_count_floor`（wave0，计数 `source.yaml` 条目）保持 YAML 解析——`countReferences()` 只扫描 `reference/*.md`，不适用于 YAML 数组。

**Non-Goals（明确不做）：**
- 不实现 CandidateCard 系统或 promote 流程（cache→triage→enriched reference）
- 不添加 `web_substance`/`commercial_intent`/`content_retention` 等质量判定字段到 reference template——那是 `todo-evidence-quality` 的范畴
- 不改变 reference 文件格式——已有 9 字段 metadata block + 5 section（BUG-007 硬化后稳定）
- 不改变 wave0/wave1 的 dispatch/collect 层——cache trail 验证插入在 `complete()` 中，对 Sub-agent 透明
- Wave2 gate 的 `cache_coverage` 本 change 不覆盖——wave2 产出的是 synthesis/finding 而非 reference 文件，cache 结构不同（`_cache/wave2/{backing,depth,emergent,synthesis}/`），留待后续 change 单独设计

## Capabilities

### New Capabilities
- `evidence-extraction`: Engine 驱动的证据提取审计——`isCountable(ref)` 计数条件、`countReferences(baseDir)` Engine 计算、`cache_trails` 文件系统验证、`ref_count` 从 Agent 声明切换为 Engine 计算。前缀 `EEX`。

### Modified Capabilities
- `cache-raw-web-content`: SHALL 从 guidance-only 升级为 Engine-auditable——`complete()` 验证 cache 完整性并将验证结果写入 `cache_trails`（CRC-005），gate `cache_coverage` 规则交叉验证 declaration 的 `cache_trails` 与文件系统（CRC-006）。
- `agent-output-declaration`: `cache_trails` 字段 MUST 由 Engine 在 `complete()` 中填充（当前 53 条 declaration 全为空），MUST NOT 由 Agent 声明（AGO-006）。
- `research-wave-phase-content`: rerun-aware behavior 中 SHALL 要求 `action: add` topic 走完整 source intake——Phase Agent MUST spawn 前创建 cache 目录，Sub-agent MUST 写入 3 文件，与首次运行一致（RWP-014）。
- `rerun-topic-integration`: `action: add` 路径 MUST 包含 cache trail——rerun 新增 topic 的 reference 文件必须可追溯到原始 websearch/page/meta，`cache_coverage` gate 对 rerun 路径与首次运行一视同仁（RTI-006）。

## Impact

- **Engine**: `queue-manager.mjs` — `validateDelegatedCompletion()` 扩展 cache trail 验证（路径+bundle内+3文件）；`complete()` 填充 `cache_trails`。新 helper `ref-count.mjs` — `isCountable()`/`countReferences()`。`subagent-relay.mjs` — `mergeResults()` 改用 `countReferences()`，fork router 消费 Engine 计算值。
- **Gate**: `gate-wave0-complete.definition.json` / `gate-wave1-complete.definition.json` 新增 `cache_coverage` 规则（check type: `cache_coverage`）。CLI `check-gate-wave0-complete.mjs` / `check-gate-wave1-complete.mjs` 实现该 check。
- **Phase MD**: `phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md` Rerun-Aware Behavior 补充 cache 要求。`phase-rerun.md` 注明下游 phase 的 cache 约定。
- **File observability**: `file-observability.mjs` 扩展 cache gap 检测——对每个 reference 文件检查对应 `_cache/` trail 是否存在，缺失的报告为 `cache_gap` finding。
- **Schema**: `OutputDeclarationLedgerRecord.cache_trails` 保持 `z.array(z.string())` 格式不变——只存路径字符串。验证结果（路径存在+3文件完整）由 gate `cache_coverage` 规则在门控时动态判定，不写入 schema 字段。零 migration，不 breaking 现有 bundle。
- **Tests**: 新 `tests/engine/helpers/ref-count.test.mjs`（isCountable/countReferences）、扩展 `tests/engine/queue-manager.test.mjs`（cache trail validation）、扩展 wave0/wave1 gate 集成测试（cache_coverage）、新 playbook `experiments_playbook/exp_evidence-extraction/`。
