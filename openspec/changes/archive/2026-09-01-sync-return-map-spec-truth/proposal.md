# Proposal: 2026-09-01-sync-return-map-spec-truth

## Why

六路 spec↔code 漂移审计（来源：`_backlog/plans/spec-drift-audit-remediation-and-requirement-slimming.md` §1.2，C1 范围）确认 `research/research-return-map` 主 spec 存在 4 处与代码现状脱节的文本：RRM-003 仍把已指针化的 `shared-return-map-authoring.md` 描述为 canonical owner；RRM-006 使用全库不存在的伪函数名 `the retired per-wave backfill token check (realized by current return-map entry points)()`；RRM-007 以现在时 SHALL 描述 5 个代码中已不存在的退役 token 规则 ID；`engine/helpers/return-map.mjs:1` 导航注释仍列出已被 eef44d0c1 de-export 的 `inspectSeedTopicReturnMaps`。main spec 是 behavior authority，这些失真会直接误导后续 coding agent。本 change 是 `2026-08-31-repair-residual-spec-drift` 之后残留项的清零。

## What Changes

- **RRM-003 requirement 块改写为现状**：Seed Topic 卡片与 entry 呈现的 canonical owner 是 `workflows/nodes/templates/seed-topic-template.md` 与 `command_playbook/operate-topic-state.md`；`workflows/nodes/shared/shared-return-map-authoring.md` 是 compatibility pointer（其自身 frontmatter 已声明 "defines no second entry grammar, slot ownership, token lifecycle, or writer path"）。要求文本对齐现状，不改变任何行为。
- **RRM-006 requirement 块去除伪函数名**：以 wave-token 归属与 skip 语义的干净语义散文重写（遵守本仓库 "spec prose 不点名实现 .mjs" 既定规则，不恢复符号名）；token→wave 归属表与场景判定语义逐字保持。
- **RRM-007 requirement 块内退役散文清理**：L414–418 以现在时 SHALL 列出的 5 个已退役 token 规则 ID（`no_stale_*_token`、`backfill_*_token_absent`）改写为 `@deprecated` 场景标注（沿用 canonical-topic-state 既有惯例），或直接删除该 retired 清单；块内其余 581 行逐字保持。
- **`engine/helpers/return-map.mjs:1` 导航注释修正**：删除已 de-export 的 `inspectSeedTopicReturnMaps` 符号名。一行注释，零行为。
- **不产出**：无行为语义变更、无新 capability、无 CLI/schema/engine 逻辑变更、无 header req ID 增删。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/research-return-map` | 主 spec 全文（962 行）+ `engine/helpers/return-map.mjs` 导出与 `WAVE_TOKEN_MAP`/`projectionSlotsForWave` 语义 + `workflows/nodes/shared/shared-return-map-authoring.md`（29 行 Compatibility Pointer）+ `workflows/nodes/templates/seed-topic-template.md` 存在性 + `command_playbook/operate-topic-state.md` | Modify | RRM-003/006/007 三个 requirement 块的描述文本同步到既有代码行为；normative 语义不变，属 requirement 文本修正（整块替换）。无 New capability：被修改的描述均有已检查 contract 拥有。 |
| `research/seed-topic-materialization` | catalog 行 + 主 spec 目录检索（无 retired token 规则文本） | Excluded | retired token 的检查语义由 RRM-006/007 承载；materialization spec 无失真文本。 |
| `workflow/shared-node-content` | catalog 行 + `shared-return-map-authoring.md` 现状 | Excluded | 指针化是既定 accepted 现状，本 change 只让 RRM-003 的描述与之一致，不改 shared node 契约。 |
| `engine/check-inspect-feedback` | catalog 行 | Excluded | 反馈面词汇无涉；本 change 不触碰 gate/inspect 语义。 |

## Impact

- `openspec/specs/research/research-return-map/spec.md`：RRM-003（L76–153）、RRM-006（L264–291）、RRM-007（L292–878）三个 requirement 块整块替换（delta verbatim 同步）。
- `DEEP_RESEARCH_HARNESS/engine/helpers/return-map.mjs`：仅 L1 导航注释删一个符号名（apply 阶段执行；框架生命周期只读在 apply 解除后触碰）。
- 文本锁面：`tests/engine/residual-spec-drift-text-locks.test.mjs`（delta 整块 verbatim 同步断言）+ `node scripts/list-doc-locks.mjs openspec/specs/research/research-return-map/spec.md` 在 apply 前复核；锁定测试同 change 更新。
- 零影响面：CLI、schema、gate 定义、trace 事件、其他 main specs。

## Source of Record 与责任边界

- Direct Source of Record：代码现状（`return-map.mjs` 实际导出与 token-wave 过滤实现、`shared-return-map-authoring.md` frontmatter 自我声明）。本 change 让 spec 描述向 Source of Record 对齐，不引入新权威。
- 最短合法闭环：主 spec 文本 = 代码现状的忠实描述；无需新增检查、状态或恢复面。Net simplification：删除 3 处失真描述源，减少后续 agent 的误读面；无新增 control complexity。
- Semantic-precision reflection：RRM-003 的 "shared guidance" 概念收窄为 pointer 语义后，读者拿到的有界问题不变（"return-map 的 entry 形状在哪里定义、由谁教"），正常推理停止点变为 template + playbook 两个 owner 坐标；不新增概念或状态。
- 责任边界：纯文档/注释对齐，无 user decision、无 permission 变化；Engine verdict 面零触碰。
