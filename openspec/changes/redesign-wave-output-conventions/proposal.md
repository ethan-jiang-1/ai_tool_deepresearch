## Why

当前 DPT framework 的 wave node 输出物约定跟实际使用需求对不齐：`reference/` 用嵌套子目录 + thin YAML 存 source，人类扫一眼看不懂有什么；`reference/00_shared/` 被 wave 2 跨 topic scout 结果污染了，层边界模糊；缺少对标 `_reference` 那种平铺、一个 source 一个 rich MD、一眼能看明白的 reference 形态。需要重新约定 wave 0/1/2 分别产出什么、落到哪、什么格式，让 `reference/` 变成真正的"人类一眼能看明白"的证据目录。

## What Changes

- **reference/ 扁平化**：从嵌套 `<topic>/source.yaml` 改为平铺的 `00-shared-*.md` / `00-cross-*.md` / `0N-*.md` rich MD 文件，一个 source 一个文件，对标 `_reference` 模板格式（metadata block + Key Facts + Core Content Capture + Relevance + Quotable Terms + Risks）
- **新增 artifacts/wave0/ 目录**：原来 `reference/<topic>/source.yaml` 的 thin YAML source 列表迁至 `artifacts/wave0/<topic>/source.yaml`，与 wave1/wave2 并列
- **Wave 2 产出不再进 reference/00_shared/**：cross-topic 合成产物（synthesis.md, cross-topic-ledger.md, finding-index.yaml）全部留在 `artifacts/wave2/`；若发现新共享 source，以 `00-cross-*.md` 追加入扁平 `reference/`
- **reference/ 新增 _INDEX.md + README.md**：`_INDEX.md` 作为机器可读的 reference inventory table，每个 wave 都更新；`README.md` 作为人类导航
- **artifacts/ 新增 README.md**：`artifacts/README.md` 作为 AI/coding agent 导航，documents wave-organized output structure（wave0/ thin YAML、wave1/ deepening、wave2/ synthesis、hitl2/ decision brief），说明为何没有 hitl1/（HITL1 产出写入 control files）
- **reference 文件命名三级前缀**：`00-shared-`（wave 0 共享基础）、`00-cross-`（wave 2 跨 topic 发现）、`0N-`（wave 1 topic 专属，编号=seed topic 序号）
- **Phase node 更新**：`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md` 的 Expected Artifacts 节对齐新约定；wave 0 范围收窄为共享基础（00-shared-*）+ thin YAML（artifacts/wave0/），wave 1 增加 topic 专属 rich MD（reference/0N-*），wave 2 移除往 reference/00_shared/ 写的指令
- **Gate 定义更新**：`gate-wave0-complete`、`gate-wave1-complete`、`gate-wave2-complete` 的 rule set 对齐新产出物位置和格式
- **Schema 更新**：`reference.mjs` 从校验 `source.yaml` 数组改为校验 `_INDEX.md` 完整性（或校验单个 rich MD 文件）；新增 reference MD 文件必填字段定义
- **inspect-bundle.mjs 更新**：required paths 新增 `artifacts/wave0/`，`reference/` 检查从"目录存在"改为"有 `_INDEX.md` + `README.md`"
- **新增 shared-reference-template.md**：shared node 描述 reference `.md` 文件的标准模板格式
- **Bundle instantiation 模板更新**：`START_FROM_HERE.md.tmpl` 反映新的 `reference/` 和 `artifacts/` 结构
- **新增 inspect-wave*-output.mjs**：三个独立 wave-specific 结构 lint CLI（`inspect-wave0-output.mjs`、`inspect-wave1-output.mjs`、`inspect-wave2-output.mjs`）——各自检查自己 wave 的产出物结构（命名、section、metadata、目录形状），输出 inspect/advice 反馈。不是 gate，Agent 在 wave 中途随时跑

## Capabilities

### New Capabilities

- `reference-flat-format`: 扁平 reference 目录约定——三级命名前缀（00-shared-/00-cross-/0N-）、rich MD 文件格式、_INDEX.md 作为 canonical inventory、README.md 作为人类导航
- `wave0-artifacts-directory`: 新增 `artifacts/wave0/` 目录用于 thin YAML source 列表，与 wave1/wave2 并列，纳入 bundle inspection 和 instantiation 模板
- `cli-inspect-output-conventions`: 三个独立 wave-specific 结构 lint CLI（inspect-wave0-output.mjs / inspect-wave1-output.mjs / inspect-wave2-output.mjs）——各自检查自己 wave 的产出物结构

### Modified Capabilities

- `research-wave-phase-content`: wave 0/1/2 阶段节点的 Expected Artifacts 节更新为新约定——wave 0 产出 00-shared-*.md + artifacts/wave0/；wave 1 增加 reference/0N-*.md；wave 2 改为 00-cross-*.md 追加
- `research-wave-gate-implementation`: gate-wave0-complete、gate-wave1-complete、gate-wave2-complete 的 rule set 更新，检查新产出物位置和格式
- `schema-core`: ReferenceMetadata 校验逻辑从 `source.yaml` 数组改为 reference `.md` 文件字段校验
- `workflow-directory-contract`: runtime bundle 标准结构新增 `artifacts/wave0/`，`reference/` 描述从嵌套改为扁平
- `bundle-start-from-here`: START_FROM_HERE.md 反映新的 reference/ 扁平结构和 artifacts/wave0/ 目录

## Impact

- **Phase nodes**: `workflows/nodes/phases/phase-wave0.md`, `phase-wave0-subagent.md`, `phase-wave1.md`, `phase-wave2.md`, `phase-wave2-subagent.md`
- **Shared nodes**: `workflows/nodes/shared/shared-schemas.md`
- **Gate definitions**: `schema/gate_definitions/gate-wave0-complete.definition.json`, `gate-wave1-complete.definition.json`, `gate-wave2-complete.definition.json`
- **Gate checkers**: `cli/gates/check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`
- **Schema contracts**: `schema/contracts/reference.mjs`
- **Bundle inspection**: `cli/inspect-bundle.mjs`
- **Bundle instantiation**: `cli/instantiate-run-bundle.mjs`
- **Templates**: `rb_templates/START_FROM_HERE.md.tmpl`
- **New files**: `workflows/nodes/shared/shared-reference-template.md`, `cli/inspect-wave0-output.mjs`, `cli/inspect-wave1-output.mjs`, `cli/inspect-wave2-output.mjs`
- **现有 bundle**: `dpt_rb_china-reaction-world-cup-2026/` 的 `reference/` 需要迁移（`source.yaml` → `artifacts/wave0/`，`00_shared/source.yaml` 拆分到 `artifacts/wave2/`）
