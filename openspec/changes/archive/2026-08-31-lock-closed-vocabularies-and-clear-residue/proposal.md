# Proposal: lock-closed-vocabularies-and-clear-residue

来源：`_backlog/plans/drift-resync-locks-hygiene-and-work-unit-deepening.md`（C2，§2.1 A3 代码半 + §2.2 B1–B4 + A6/A7 实现 + §3 C2 任务 3）。计划决策点 Q1–Q4 已裁定（见 plan §4），本 change 按裁定落地。

## Why

C1 已把 spec 侧重同步完成，但三类机器缺口仍在：① disposition 五值封闭集"spec 说封闭、代码无 zod 锁、spec 列举无守卫"三不管；② spec prose 复述的封闭集无治理 checker 守卫（漂移守卫缺口）；③ DEW-012 对应的不可达死代码簇与 `allowNonceNormalization` 参数穿透仍在（C1 已把 spec 改为严格口径，代码清理是行为中性收尾）；④ `preflight_candidate_projection` SHALL 字段仍未实现；⑤ `recommended_action` 字段名一拖三（claim/actor 自由文本占用封闭集字段名）。

## What Changes

- **词汇锁**：`schema/contracts/work-unit.mjs` 新增 `WORK_UNIT_ATTEMPT_DISPOSITIONS` 冻结数组 + `WorkUnitAttemptDispositionSchema`（zod）；`engine/work-unit-repair-vocabulary.mjs` re-export + key-map；`work-unit-attempt-disposition.mjs` 7 处内联字面量改常量。
- **candidate 枚举提升**：`WorkUnitCandidateProjectionSchema` 内嵌 5 值枚举提升为导出的 `WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS` 冻结数组（零行为变化）。
- **新治理 checker** `openspec/governance/check-spec-enum-restatements.mjs`：静态 import 七个代码封闭集，校验 `openspec/specs/**`+`openspec/guidance/**` 中复述句的成员资格与闭合完整性（check-all 自动发现）。
- **死代码清除**：`work-unit-validation.mjs` 删 receipt binding-identity autofill 簇与 result/receipt nonce normalize 簇；删除 `allowNonceNormalization` 参数面（submit 两处 + supersession 一处）。
- **`preflight_candidate_projection` 补齐**：`work-unit-lifecycle.mjs` `forcedTimeoutAudit` 一行补字段（数据已计算且过 schema）。
- **`actor_guidance` 改名**：`work-unit-actor.mjs` evaluateActorDecision 的自由文本字段与 `work-unit-lifecycle.mjs` 三处消费点改名，消除与两个封闭集 `recommended_action` 的字段名碰撞。
- **A7 代码半**：`work-unit-submit.mjs` recover-declaration 未提交拒绝的 `write_to` 文案补点名 submit/late-submit/new-attempt 边界（对齐 spec:532）。
- **不产出**：任何行为语义变化（死代码不可达；preflight 字段为既有 SHALL 补齐；改名面无 spec/测试引用）；不改 `work-unit-lifecycle.mjs` 主体结构；不实现 CHI-004 决策表回归（独立债务）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

（无——本 change 零 requirement 变化。C1 已把涉改行为的 spec 措辞更新为与代码一致；本 change 是代码向 spec 收敛 + 纯工具，故 `skip_specs: true`。）

## Impact

- 代码：`schema/contracts/work-unit.mjs`、`engine/work-unit-repair-vocabulary.mjs`、`engine/work-unit-attempt-disposition.mjs`、`engine/work-unit-validation.mjs`、`engine/work-unit-submit.mjs`、`engine/work-unit-supersession.mjs`、`engine/work-unit-lifecycle.mjs`、`engine/work-unit-actor.mjs`。
- 工具：新增 `openspec/governance/check-spec-enum-restatements.mjs`（check-all 自动发现，治理 16→17 项）。
- 测试：`tests/engine/` 新增/扩展（词汇锁、preflight 字段、改名回归、死代码清除断言）；既有 2889 测试必须保持全绿。

## Capability Discovery

Evidence read：四个涉改 capability 的 main spec（C1 刚同步）+ `openspec/governance/req-registry.yaml` + `semantic-fact-families.yaml`。

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/delegated-work-units` | DEW-012/DEW-014 现行文本（C1 后）+ 死代码区域 | Excluded | 代码向已接受 spec 收敛（死代码删除、preflight 字段补齐均为既有 SHALL），requirement 文本零变化 |
| `engine/check-inspect-feedback` | CHI-004 disposition 五值列举句（C1 刚写入） | Excluded | 词汇锁是实现侧为既有封闭集补 zod 锁，spec 文本零变化 |
| `agent/agentic-queue` | AGQ 现行文本 | Excluded | 本 change 不触碰 queue 行为 |
| `engine/framework-engine` | engine 目录契约面 | Excluded | 纯模块内重构，模块契约（导出面）不变 |
