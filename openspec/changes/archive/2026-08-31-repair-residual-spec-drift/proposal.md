# Proposal: repair-residual-spec-drift

来源：`_backlog/plans/drift-resync-locks-hygiene-and-work-unit-deepening.md`（C1，§2.1 A1–A14 + §2.3 C1）。本计划由两轮 Coding-Agent 视角评审 + 八份并行只读深挖建立，全部发现带 spec/code 双侧 file:line 证据，且在 propose 期（2026-08-31）逐行复核。

## Why

三轮只读漂移审计（封闭枚举双向、DEW 行为抽审、queue/gate 面抽审）证实：全仓约 50 个机器可查点中约 46 个精确匹配，系统性漂移未发生，但存在 14 处 spec 侧"迭代残渣"——同 spec 双代真相、跨词汇表污染、陈旧规范性清单与 Purpose 计数。其中 A1/A2/A4/A5 四处为 MEDIUM：旧恢复词汇清单会错杀 engine 合法发射，`semantic_boundary` 被误列为 gate-hint kind，DEW-012 两条宽容条款会引导 Agent 走注定失败的修复循环。先做本 change（doc-only）消除 Agent 误导，并为 C2 的词汇锁与治理 checker 铺路。

## What Changes

- `engine/check-inspect-feedback`：恢复词汇规范清单改为指向 `WORK_UNIT_RECOVERY_ACTIONS` 导出 + `RUN.md` 决策表（删除过时 5 值枚举与全域下划线拼写禁令）；gate-hint kinds 示例中 `semantic_boundary` 更正为 `missing_contract`；disposition 封闭集在 requirement 内列举（为 C2 的 zod 锁与 checker 提供被守护句）。
- `agent/delegated-work-units`：DEW-012 重写为与 strict-attempt-binding（DEW-004）单代一致——保留 schema-version 填补；receipt binding-identity 自动填补与 nonce 规范化两条宽容条款改为严格拒绝口径。
- `agent/agentic-queue`：AGQ-027 drained 结论措辞对齐代码现状（`drained: true` 与 `passed: false` 并存、exit 非零）；AGQ-007 改为以实际判别键 `kind: 'wave0_source_intake'` 表述、`source_intake_fan_in` 标注为历史命名。
- `research/content-delivery-phase-content`：Final 的 `final_delivery` trace-event 否定式措辞归一（避免与保留的 `StopAuthorizationState` 值同名相撞）。
- 直接 main-spec/guidance 编辑（无 requirement 变化，无 delta）：`engine/gate-skeleton` Purpose 9→10、`research/canonical-topic-state` Purpose 补 `schema` 操作、`research/research-wave-gate-implementation` Purpose 补 setup-ready、`openspec/guidance/models/invariants-brief.md` 恢复词汇 5→10 指针化、`openspec/specs/README.md` research-return-map catalog 行。
- **不产出**：任何 engine/CLI/测试行为变化；DEW-012 死代码删除与 `preflight_candidate_projection` 实现归 C2；A7（recover-declaration `write_to` 文案）的代码半归 C2；registry 账本手术归 C3。

## Capabilities

### New Capabilities

（无——纯既有 capability 的 spec 文本重同步，无新 observable behavior。）

### Modified Capabilities

- `engine/check-inspect-feedback`：CHI-004 requirement 内恢复词汇枚举方式、disposition 封闭集列举、gate-hint 示例更正（可观察行为集合不变）。
- `agent/delegated-work-units`：DEW-012 两条宽容条款改为严格拒绝口径（对齐代码现状与 DEW-004）。
- `agent/agentic-queue`：AGQ-027 drained 判据措辞、AGQ-007 判别键表述（行为不变）。
- `research/content-delivery-phase-content`：Final trace-event 否定式措辞归一（行为不变）。

### Excluded（apply 期直接编辑、无 delta）

- `engine/gate-skeleton`、`research/canonical-topic-state`、`research/research-wave-gate-implementation`：仅 Purpose 头部 prose（非 requirement），先例为 CLS-079 C1 的头部修正。
- `openspec/guidance/models/invariants-brief.md`、`openspec/specs/README.md`：非 authority 的 guidance/catalog 面。

## Capability Discovery

Evidence read：`openspec/specs/README.md` catalog + 四个目标 main spec 全文（requirement 边界经 grep 核对）+ `openspec/governance/req-registry.yaml`（CHI-004/DEW-012/AGQ-007/AGQ-027/CDP-005..008 归属确认，无 New capability 故无 prefix/reservation 冲突检查需求）。

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/check-inspect-feedback` | main spec :162-299（CHI-004 块）+ `repair-vocabulary.mjs` + `gate-definition.mjs` | Modify | 恢复词汇枚举方式与 gate-hint 示例属 requirement 正文，须走 delta |
| `agent/delegated-work-units` | main spec DEW-012 块 :1069-1193 + `work-unit-validation.mjs` + DEW-004 :293-298 | Modify | DEW-012 双代真相条款在 requirement 正文 |
| `agent/agentic-queue` | main spec :253-267（AGQ-007）+ :1051-1077（AGQ-027）+ `queue-manager-lifecycle.mjs:525-535` | Modify | 两处 requirement 正文措辞对齐代码 |
| `research/content-delivery-phase-content` | main spec "Phase Final body completeness" 块（CDP-005..008 合并 heading，:432/`:384` 涉改行） | Modify | `final_delivery` 字面量在 requirement 正文内 |
| `engine/gate-skeleton` | Purpose :7（"9 个"）vs `schema/gate_definitions/`、`cli/gates/` 实数 10 | Excluded | 仅 Purpose 头部 prose，无 requirement 变化，不产生 delta；apply 期直接编辑 main spec（CLS-079 C1 先例） |
| `research/canonical-topic-state` | Purpose :9 vs `cli/operate-topic-state.mjs:71`（4th `schema` op） | Excluded | 同上：仅 Purpose 头部 prose，不产生 delta，apply 期直接编辑 |
| `research/research-wave-gate-implementation` | Purpose :5-7 vs 同 spec :550-576（RWG-014 setup-ready） | Excluded | 同上：仅 Purpose 头部 prose，不产生 delta，apply 期直接编辑 |

## Impact

- 仅 4 个 main spec 的 requirement 块重写 + 3 处 Purpose + 2 处 guidance/catalog；零代码、零 CLI、零 schema 变化。
- 新增一个 unit 文本锁测试（`tests/engine/`），锚定本次修正的关鍵句子防止回退。
- `npm test` 基线（~2882 pass）必须保持全绿；governance:check 全绿。
