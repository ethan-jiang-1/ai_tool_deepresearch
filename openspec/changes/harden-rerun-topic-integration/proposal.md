## Why

Rerun 增量 topic（HITL2 用户选 rerun 后新增 topic）gate 全部通过但产出是壳——reference 文件为 frontmatter 格式或 homepage URL 模板，wave2 synthesis 为追加式 delta 章节而非完整重合成，新增 topic 未被纳入全量 cross-topic synthesis / projection。现象见 `_backlog/bugs/BUG-007-rerun-incremental-topic.md`，可在 bundle `dpt_rb_china-japan-relations-since-april-2026` 中复现。

同一个历史 bundle 也暴露了更大的调试性缺口：长程 Agentic Workflow 虽然已经能从 HITL2/rerun 路径平滑接回，但 phase 边界缺少可重入 checkpoint manifest，`run.log` 偏薄，queue/lifecycle 可能漂移，额外文件或旧任务的来源不总是可解释。这会阻碍“从任意节点进入并复现 bug”的能力。

根因是三个独立但协同触发的链断裂：(A) sub-agent reference 格式链断裂——`phase-wave1-subagent.md` 对 reference 格式沉默 + sub-agent bounded context 排除 `shared-reference-template.md` + `result.schema.json` 不约束磁盘格式；(B) wave2 rerun 缺 `action: add` 分支——wave0/wave1 有显式区分，wave2 只有 delta/append；(C) gate 质量规则缺失——`content_dedup` 只读 declaration ledger，reference count 却来自 filesystem，导致未声明文件能帮 gate pass 但逃过 provenance/content 检查，同时缺少 article URL、Key Facts 实质性和 ledger coverage 检查。

这三个断裂在 rerun 增量 topic 场景下同时触发：sub-agent 产出错误格式 → Phase Agent 手工补壳满足 count_floor → 壳文件不进 ledger → content_dedup 对 reference declarations 空转通过 → gate 全绿，但语义集成未发生。

本 change 因此同时收紧两个面：BUG-007 的 reference/provenance/Wave2 合成问题，以及任意节点重入时所需的 runtime reentry observability。目标不是让 JS Engine 接管 Agent Flow，而是让 Engine 在 phase/gate 边界留下足够状态、文件清单和诊断，以便 Agent 之后可以从当前 bundle truth 重进，而不是从头跑。

## What Changes

- **Sub-agent reference 文件格式统一**：`phase-wave1-subagent.md` 增加 reference 文件格式规范，消除 sub-agent 因收不到格式模板而默认使用 YAML frontmatter 的路径。格式规范与 `shared-reference-template.md`（metadata block + 5 个 `##` section）对齐
- **Wave2 rerun 增加 `action: add` 场景**：`phase-wave2.md` Rerun-Aware Behavior 节增加场景表（与 wave0/wave1 对齐），`action: add` 时全量重合成而非 delta/append
- **Gate wave1-complete 增加内容质量规则**：新增 `source_url_article_level` 规则（拒绝 homepage URL）、`key_facts_min_lines` 规则（要求 `## Key Facts` 至少 5 行实质性内容）、`reference_format` 规则（metadata block + 5 sections）和 `ledger_coverage` 规则（发现 filesystem orphan reference 即 fail）
- **`content_dedup` fail closed**：继续只读取 declaration ledger 作为 provenance authority；当 ledger 存在但无 `role: reference` declaration 时不得空转通过，而是 fail 并要求通过 delegated relay/queue complete 产生声明
- **Wave2 rerun gate 可验证**：新增 topic `action: add` 时，wave2 gate 检查禁止 delta-only synthesis，并要求 scan/index 覆盖全部 topic slug
- **Runtime reentry checkpoint**：phase/gate 边界写入 `_checkpoints/<iso>-<gate>.json`，记录 status、queue summary、artifact inventory、ledger/trace/log cursors 和轻量 hash/mtime，支持之后从该节点调试重入
- **Reentry checker**：新增 Engine CLI 检查封闭 `--at <target>`（gate/checkpoint 或 phase alias）的 status、queue、artifact inventory、ledger、trace、checkpoint drift 和 unplanned file blockers，输出 normalized target 与 check/inspect/advice
- **File observability**：Engine 审计 phase-owned 目录形状和未预期文件；额外文件按稳定 finding schema/classification 输出；额外文件可以被 Agent 解释并进入 trace/log，但解释不等于 gate authority
- **Logging density and diagnostics**：失败 gate 的完整 inspect/advice 写入带 schema_version 的诊断 artifact；长程 phase、queue、receipt、ledger、file diagnostic 产生稳定 kind 的 run.log/trace 痕迹

## Capabilities

### New Capabilities

- `runtime-reentry-debuggability`: 任意节点重入调试保证——phase/gate 边界写 checkpoint manifest，reentry checker 验证 bundle 是否能从目标节点恢复
- `file-observability`: 文件系统可解释性保证——允许 Agentic Workflow 产生新文件，但未预期文件必须被发现、解释或标记为 non-authoritative

### Modified Capabilities

- `rerun-topic-integration`: Rerun 增量 topic 的语义集成保证——确保新增 topic 的 reference 文件符合规范格式、wave2 cross-topic 合成完整覆盖新 topic、gate 能检测内容质量逃逸，并要求 rerun 产生的文件可追溯
- `research-wave-phase-content`: Wave2 phase node 的 Rerun-Aware Behavior 节增加 `action: add` 场景（全量重合成），与 wave0/wave1 已有的 `action: add` 语义对齐；wave2-complete gate 增加 rerun add coverage 规则（禁止 delta-only synthesis，要求 scan/index 覆盖全 topic slug）
- `gate-content-dedup`: Gate wave1-complete 保持 ledger authority；新增 fail-closed、article-level URL、Key Facts min-lines、reference format、ledger coverage / orphan detection 规则
- `reference-flat-format`: Reference 文件格式规范的范围从 wave0 `source.yaml` 扩展到 wave1 `reference/*.md` 的磁盘格式；phase-wave1-subagent 角色定义中增加 reference 文件格式规范
- `logging-conventions`: 扩大长程 Agentic Workflow 的必要日志密度，保留诊断日志非 verdict authority 的边界
- `agent-output-declaration`: ledger record 必须包含 `creation_reason` 解释 accepted output 的来源，并与 reentry/file observability 审计配合

## Impact

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1-subagent.md` — 新增 reference 文件格式规范段
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` — Rerun-Aware Behavior 节增加场景表
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json` — 新增 content-quality / provenance coverage 规则
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json` — 新增 rerun `action:add` full-synthesis coverage 规则
- `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — content_dedup fail-closed + article URL 检测逻辑 + shared reference helpers
- `DPT_FRAMEWORK/engine/helpers/file-observability.mjs` — 目录形状、unplanned file、checkpoint manifest、reentry check helpers
- `DPT_FRAMEWORK/cli/check-reentry.mjs` — Agent-facing reentry checker CLI
- `DPT_FRAMEWORK/cli/log-event.mjs` — structured diagnostic / file explanation event support
