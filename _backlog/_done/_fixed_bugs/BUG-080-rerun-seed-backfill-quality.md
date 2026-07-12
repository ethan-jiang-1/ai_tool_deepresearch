# BUG-080: Rerun 新增 topic 的 seed file 回填质量远低于正常 pipeline topic

## 发现时间
2026-07-12，rerun round 2 执行 wave0+wave1+wave2 后审计 seed_topics/ 质量。

## 严重程度
**P1** — 回填内容质量差导致 seed file 无法作为 knowledge map 使用，影响 wave2 synthesis 质量和 final report 的证据可追溯性。

## 症状

rerun 通过 `add_topic` 新增的 topic（08–15）的 seed file 回填质量与正常 pipeline topic（如 06_allianz-project-nemo.md）存在系统级差距：

| 维度 | 正常 pipeline topic (Allianz) | Rerun add_topic (08–15) |
|------|------------------------------|--------------------------|
| **主题定位** | 叙述性段落，解释为什么选这个公司、在研究中扮演什么角色 | 模板化一句话，无研究语境 |
| **初始假设** | 具体事实（7 个 agent 名称、上线时间、80% 指标、第三方来源名称） | 通用模板 "在 2024–2026 年间有公开的 AI 落地宣称" |
| **证据锚点** | 具体来源名称 + 简要描述每个来源提供什么 | 文件名列表 + 截断的 notes 片段 |
| **回填 evidence_meaning** | 实质性段落（agent 名称、架构、量化、来源质量评估） | 一句话摘要或无内容 |
| **回填 relationship** | supports/partial/opens 精确分类 | 全部 supports |
| **回填 refs** | 具体 reference 文件路径 | 通用 glob 或 source.yaml 路径 |
| **回填 status** | supported/partial/unsupported 精确评估 | 全部 accepted |
| **回填 next_hop** | 指向下游 phase 或交叉引用 | 泛化 "wave1 deepening complete" |
| **待验证问题** | 具体开放问题 + relationship + refs + status | `__BACKFILL_PENDING_QUESTIONS__` token 未替换 |
| **趋势与难点** | 具体局限 + 证据引用 | `__BACKFILL_WAVE1_TRENDS__` token 未替换 |

## 根因分析

1. **`add_topic` 不生成 seed body**。`operate-topic-state apply add_topic` 只生成 frontmatter + 标题 + must_answer 列表 + `## 主题定位`（填 `scope_role` 字符串）——不生成完整的 §3.1 结构。

2. **seed-topics phase（rerun 路径）只验证结构不验证内容质量**。`check-gate-seed-topics-ready.mjs` 检查 slug 一致性、frontmatter 完整性、文件存在——但不检查回填区的 evidence_meaning/relationship/refs/status/next_hop 是否存在或内容是否充分。

3. **wave0/wave1 phase agent 的回填是手动操作，没有机械化的质量保证**。wave0 §3.3 要求 "Immediate Seed Backfill" 在每次 submit 后立即回填 seed，但 rerun 的批量执行跳过了单 topic 的逐次回填。wave1 §3 同样要求回填但未强制执行。

4. **Phase agent 的回填质量依赖 agent 自身判断**——正常 pipeline 中 agent 在 wave0/wave1 逐 topic 执行时会自然积累上下文并写出高质量回填。rerun 批量执行时 agent 失去逐 topic 的上下文积累，回填退化为模板化摘要。

5. **reference 物化步骤（wave0 §3）被跳过**。Phase agent 应在 work-unit submit 后从 submitted backing 物化 `reference/{topic.slug}-<source-slug>.md`，但 rerun 路径中这一步被遗漏——source 数据留在 source.yaml 中，未转化为可独立引用的 evidence card。

## 复现条件

1. 通过 `operate-topic-state apply add_topic` 新增 topic
2. 在 rerun 路径中批量执行 wave0 → wave1 → wave2（跳过逐 topic 的 seed backfill 和 reference 物化）
3. 检查 seed file 的回填区质量

## 影响范围

- 所有通过 `add_topic` 在 rerun 中新增的 topic（当前 bundle: 08–15，共 8 个）
- 下游 wave2 synthesis 缺少高质量的 evidence_meaning/relationship/refs 返回映射，只能从 source.yaml/evidence-summary.md 重建上下文
- final report 的证据可追溯性降级

## 建议修复

### 短期（手动修复，当前 bundle）

1. 从 source.yaml 和 evidence-summary.md 回读证据内容
2. 按正常 pipeline 质量标准重写 seed file 的所有回填区
3. 物化 reference 证据卡
4. 替换所有 `__BACKFILL_*__` token

### 中期（框架改进）

1. `add_topic` 应考虑生成完整的 §3.1 body scaffold（不只是 frontmatter + 标题）
2. seed-topics gate 应在 rerun 路径中检查回填区的内容充分性（至少检查 `__BACKFILL_*__` token 是否被替换）
3. wave0 reference 物化步骤应有显式的检查（inspect 或 gate rule）

### 长期（流程改进）

1. Rerun 路径的 wave0/wave1 phase agent 应强制执行逐 topic 的 seed backfill + reference 物化
2. 或者在 pipeline 中增加显式的 "backfill quality check" step

## 相关

## 关联：Reference 物化质量同样降级

Rerun 路径的 `reference/` 证据卡物化也存在系统性问题：

| 维度 | 正常 addendum 证据卡 (addendum-allianz-*.md) | Rerun 批量生成的证据卡 (08_*.md) |
|------|----------------------------------------------|----------------------------------|
| **body 内容** | 结构化段落（背景、证据要点、局限性） | 裸 notes 字符串 dump，无结构 |
| **frontmatter** | acceptance_status, source_type, tier, evidence_role, retrieved_date | 同样有，但 tier 全为 tier_2（未区分） |
| **可读性** | 可作为独立文档被人类阅读 | 需要回看 source.yaml 才能理解 |

根因：reference 物化步骤（wave0 §3）在 rerun 路径中被跳过。Phase agent 在 work-unit submit 后应逐 source 物化 `reference/{slug}-<source-slug>.md`，但批量执行时此步骤被省略。事后补救时从 source.yaml notes 字段直接 dump，未进行结构化转换。

## 相关

- BUG-078: in-framework rerun blocked by handoff ratchet
- BUG-079: out-of-gate addendum not canonicalized
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` §3.3 (Immediate Seed Backfill)
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` §3 (reference materialization)
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` §3 (backfill requirement)
- `DPT_FRAMEWORK/cli/operate-topic-state.mjs` (add_topic only generates frontmatter + minimal body)
