## Why

Rerun 增量 topic（HITL2 用户选 rerun 后新增 topic）gate 全部通过但产出是壳——reference 文件为 frontmatter 格式或 homepage URL 模板、wave2 synthesis 为追加式 delta 章节而非完整重合成、旧 topic 的 wave1 artifacts 从未因新 topic 更新。现象见 `_backlog/bugs/BUG-007-rerun-incremental-topic.md`，可在 bundle `dpt_rb_china-japan-relations-since-april-2026` 中复现。

根因是三个独立但协同触发的链断裂：(A) sub-agent reference 格式链断裂——`phase-wave1-subagent.md` 对 reference 格式沉默 + sub-agent bounded context 排除 `shared-reference-template.md` + `result.schema.json` 不约束磁盘格式；(B) wave2 rerun 缺 `action: add` 分支——wave0/wave1 有显式区分，wave2 只有 delta/append；(C) gate 质量规则缺失——`content_dedup` 只读 declaration ledger，不扫 filesystem，无 article URL 检查，无 Key Facts 实质性检查。

这三个断裂在 rerun 增量 topic 场景下同时触发：sub-agent 产出错误格式 → Phase Agent 手工补壳满足 count_floor → 壳文件不进 ledger → content_dedup 空转通过 → gate 全绿，但语义集成未发生。

## What Changes

- **Sub-agent reference 文件格式统一**：`phase-wave1-subagent.md` 增加 reference 文件格式规范，消除 sub-agent 因收不到格式模板而默认使用 YAML frontmatter 的路径。格式规范与 `shared-reference-template.md`（metadata block + 5 个 `##` section）对齐
- **Wave2 rerun 增加 `action: add` 场景**：`phase-wave2.md` Rerun-Aware Behavior 节增加场景表（与 wave0/wave1 对齐），`action: add` 时全量重合成而非 delta/append
- **Gate wave1-complete 增加内容质量规则**：新增 `source_url_article_level` 规则（拒绝 homepage URL）、`key_facts_min_lines` 规则（要求 `## Key Facts` 至少 5 行实质性内容）、`ledger_coverage` 规则（交叉校验 filesystem 与 declaration ledger）
- **`content_dedup` 增加独立 filesystem scan**：当 ledger 中 reference entry 为空时，回退扫描 `reference/` 目录，而非空转通过

## Capabilities

### New Capabilities

- `rerun-topic-integration`: Rerun 增量 topic 的语义集成保证——确保新增 topic 的 reference 文件符合规范格式、wave2 cross-topic 合成完整覆盖新 topic、gate 能检测内容质量逃逸

### Modified Capabilities

- `research-wave-phase-content`: Wave2 phase node 的 Rerun-Aware Behavior 节增加 `action: add` 场景（全量重合成），与 wave0/wave1 已有的 `action: add` 语义对齐
- `gate-content-dedup`: Gate wave1-complete 的 content_dedup 规则增加 filesystem fallback scan；新增 `source_url_article_level`、`key_facts_min_lines`、`ledger_coverage` 三条内容质量规则
- `reference-flat-format`: Reference 文件格式规范的范围从 wave0 `source.yaml` 扩展到 wave1 `reference/*.md` 的磁盘格式；phase-wave1-subagent 角色定义中增加 reference 文件格式规范

## Impact

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1-subagent.md` — 新增 reference 文件格式规范段
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` — Rerun-Aware Behavior 节增加场景表
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json` — 新增 3 条 content-quality 规则
- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — content_dedup 增加 filesystem fallback + article URL 检测逻辑
