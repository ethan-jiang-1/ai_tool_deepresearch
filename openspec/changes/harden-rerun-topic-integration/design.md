## Context

BUG-007：Rerun 增量 topic 产出空壳，gate 全绿但语义未集成。根因是三个独立的链断裂在 rerun 场景同时触发：

```
sub-agent ──► reference/*.md          wave2 rerun ──► synthesis
    │                                        │
    │ frontmatter / 壳                       │ delta/append only
    │                                        │
    ▼                                        ▼
        gate content_dedup ←── 空转通过 ──┘
              │
              │ 只读 ledger，不扫 filesystem
```

三个修复分布在 MD prose（Agent Flow）和 JS engine（gate）两侧，均不新增依赖。

## Goals / Non-Goals

**Goals:**
- 消除 sub-agent 产出 reference 文件格式的不确定性（RTI-001）
- Wave2 rerun 新增 topic 时全量重合成（RTI-002, RWP-012）
- Gate 能检测 reference 文件的内容质量逃逸（RTI-003, GAC-006, GAC-007）
- Sub-agent 角色定义包含 reference 文件格式规范（REF-006）

**Non-Goals:**
- 不改变 wave0 或 wave1 的首次运行行为
- 不改变 `action: supplement` 的 rerun 行为（保持 delta/append）
- 不引入新的 schema contract 或 npm 依赖
- 不修改 relay slot 通信协议本身

## Decisions

### D1: Sub-agent 格式规范放在 phase-wave1-subagent.md，不放 shared-reference-template.md

**选择**：在 `phase-wave1-subagent.md` §2 Artifacts 新增 reference 格式规范段，对齐 `shared-reference-template.md` 的内容但不引用该文件。

**为什么**：Sub-agent bounded context 收不到 `shared-reference-template.md`（relay slot 仅含 `task.md` + `result.schema.json`）。Phase Agent 构造 task card 时会将格式规范内联到 `action` 文本中（`phase-wave1.md` L58 已有此行为，本 change 增强其精确性）。Sub-agent 角色定义中的格式规范确保人类维护者和 Agent 都能在此处找到格式权威定义，而非分散在多处。

**替代方案**：在 relay slot 中放入 `shared-reference-template.md` 作为第三个文件。拒绝原因——改变 relay 协议影响所有 sub-agent 类型，scope 太大。

### D2: Wave2 rerun 场景表放在 Rerun-Aware Behavior 节最前面

**选择**：在 `phase-wave2.md` Rerun-Aware Behavior 节（L351 行前）增加场景表，与 `phase-wave0.md` L252-271 和 `phase-wave1.md` L390-409 的结构对齐。当前 delta/append 文本（L353-376）下移到 `action: supplement` 场景的描述中。

**为什么**：wave0/wave1 已有此模式——先判断 `action` 类型，再分支。wave2 应遵循相同模式，而非全部 rerun 走一条路径。场景表让 Phase Agent 能明确判断"我是加 topic 还是补维度"。

### D3: Gate 质量规则作为 gate definition JSON 新 rule

**选择**：在 `gate-wave1-complete.definition.json` 中新增三条 rule entry：`source_url_article_level`（`pattern_match` 变体，检查 path depth）、`key_facts_min_lines`（`pattern_match` 变体，计数 `- ` 行）、`ledger_coverage`（新 `cross_check` 类型，比较 filesystem glob 与 ledger entry 数）。

**为什么**：gate definition JSON 是 gate 规则的唯一权威。新增规则遵循已有 pattern（`no_example_com_ref_url` 是 `pattern_match` 规则的已有实例），降低认知负担。`source_url_article_level` 的 path-depth 逻辑在 `gate-helpers.mjs` 中实现。

**替代方案**：新增独立 gate（如 `gate-wave1-content-quality`）。拒绝原因——内容质量与 wave1-complete 的结构检查应同批执行（同一 gate pass/fail），分开会增加 Phase Agent 的 gate 执行循环复杂度。

### D4: content_dedup filesystem fallback 保留在当前函数中

**选择**：在 `checkContentDedup()` 的 L695（读 ledger 后）增加条件分支：若 `referenceEntries.length === 0`，扫描 `reference/` 目录。删除 L721-723 的空转通过代码。

**为什么**：最小改动，不改变函数签名和调用方。空转通过（L721-723 `return { passed: true }`）是 BUG-007 的直接原因——移除它并替换为 fallback 扫描即可封堵。

## Risks / Trade-offs

**[Risk] filesystem fallback 可能扫描到非当前 topic 的旧 reference 文件** → Mitigation：fallback 使用与 `count_floor` 相同的 topic-glob pattern（从 gate definition JSON 的 `target` 字段读取），确保只扫描当前 topic 的文件。

**[Risk] `source_url_article_level` 的 path-depth heuristic 可能误判** → Mitigation：只拒绝 depth < 2 的 URL（homepage + 单级路径如 `/news/`）。合法 article URL（如 `/view/AEN20260113007053315`）depth ≥ 3，不会误判。edge case（如 `/articles/short` depth=2）按保守处理：放过，由 `content_dedup` Jaccard 检查兜底。

**[Risk] Delta spec 中的 MODIFIED 可能覆盖已有 requirement 的预期行为** → Mitigation：本 change 仅使用 ADDED，不使用 MODIFIED——所有新增 requirement 是增量，不影响已有 gate pass 条件。Wave2 rerun 的 `action: add` 场景是新行为，与已有 delta/append 路径共存。
