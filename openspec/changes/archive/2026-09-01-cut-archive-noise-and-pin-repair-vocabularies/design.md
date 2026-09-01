# Design: cut-archive-noise-and-pin-repair-vocabularies

## Context

三个 feedback 词汇的现状（Source of Record 均已确认）：

| 面 | 字段 | 代码闭集 | spec owner | 防腐现状 |
|---|---|---|---|---|
| Gate/phase 门禁面 | `repair_kind`（`hints[]` / finding `repair.kind`） | `schema/contracts/gate-definition.mjs` `GATE_REPAIR_KINDS` | `engine/check-inspect-feedback` | 已 pin（`check-spec-enum-restatements.mjs`） |
| Work-unit 恢复面 | `next.recovery_action` | `engine/work-unit-repair-vocabulary.mjs` `WORK_UNIT_RECOVERY_ACTIONS` | `engine/check-inspect-feedback` | 已 pin |
| File-observability 面 | `repair_directive` | **无导出**，六个字面量散在 `engine/helpers/file-observability.mjs`（L559/599/619/635/692/714） | `bundle/file-observability`（FIO-008） | 未 pin |

archive 现状：`openspec/changes/archive/` 1758 个 md；governance checkers 不扫它，但 4 个测试文件引用该路径（`validate-work-unit-hygiene`、`doc-governance-drift-locks`、`change-feedback-finalizer`、`residual-spec-drift-text-locks`），`finalize-change-archive.mjs` 写入该路径——本 change 不动路径，只加指令边界，避免触碰上述依赖。

## Goals / Non-Goals

**Goals**：agent 默认不把 archive 命中当 task context；三个 repair 词汇的翻译层三行全部机器防腐；词汇扩张有显式关卡。

**Non-Goals**：不合并/重命名三个词汇；不移动、压缩、剪枝 archive；不改 `finalize-change-archive.mjs`；不改任何 gate/CLI/work-unit runtime 行为与枚举值域。

## Decisions

**D1 archive 只做指令层，机械层显式延期。** 备选：(a) 按窗口剪枝（树内留近期、历史走 git）；(b) 压缩为 binary 使 rg 跳过。两者都要改 finalizer 语义并触碰上述 4 个测试；而指令层零代码、可逆、且与本仓库"指令发现"机制同构（`_backlog/` 同款）。先落指令层，摩擦若仍在再为机械层开独立 change。风险已诚实记录：指令不减少命中数量，只改变命中的处置。

**D2 glossary 分诊用 ADDED requirement，不改写既有 glossary 大 requirement。** 既有「Project glossary preserves canonical terminology boundaries」（ACR-001）很长；MODIFY 需全文复述、diff 噪声大。分诊是独立可测的新规范面（ACR-005），标题为稳定语义锚点。明确边界：分诊行**不复制完整值集**（避免成为 checker 校验面），只给字段名 → 语义归属 → owner/枚举源。

**D3 `FILE_REPAIR_DIRECTIVES` 单一冻结导出。** 在 `file-observability.mjs` 提取 `export const FILE_REPAIR_DIRECTIVES = Object.freeze([...six values...])`（数组为唯一值 owner），六个发射点改引用导出（纯等价重构，行为零变化）；如需拼写便利，只允许从该数组派生只读 lookup（如 `Object.fromEntries(...)`），不得出现第二份字面量清单——与 FIO-008 修改文本的 "no second spelling, alias, or parallel literal set" 对齐。`check-spec-enum-restatements.mjs` 按既有模式注册 `{ id: 'FILE_REPAIR_DIRECTIVES', values, pins: ['materialize_canonical_surface', 'current_entry_contract'] }`（pins 选发射面两端各一值，防集合整体丢失）。`tests/governance/spec-enum-restatements-checker.test.mjs` L15 的 `SETS.length` 断言 8→9 同 change 更新。备选：只加测试断言不加导出——拒绝，因为那会允许第二个字面量集合存在，与 FIO-008 修改后的"single export"矛盾。

**D4 复用优先关卡放在 `governance/requirement-traceability`（RET-012）。** 备选：`engine/check-inspect-feedback`（拒绝：该 spec 拥有既有词汇语义，不是 change 治理规则的家）。RET 已拥有 discovery discipline（registry、catalog、ID 检查），"新增词汇先证明既有面装不下 + 三件套同 change 交付"是其自然延伸。

**D5 新 requirement ID。** ACR-005、ACR-006、RET-012（现最大 ACR-004 / RET-011）；apply 时同步 main spec `> req:` 头与 `req-registry.yaml`，以 `check-project-reqs.mjs --mode plan` 通过为准。无 New capability，无新 prefix，无需 reservation 文件。

## Semantic-Precision / Control / Responsibility 反思

- **Semantic precision**：读者 = 面对含混 `repair*` 字段或搜索命中的 coding agent。有界问题："这个字段属于哪个面 / 这条命中算不算 task context"。必须保留的区别：三个面按字段名区分；archive vs 当前行为。正常推理停止点：按字段名归类 → 打开对应 owner 枚举；不引入新概念（分诊是既有词汇的呈现层，不是新状态）。
- **Simple reliable control**：净效果 = 删减阅读复杂度（archive 边界、字段名直达 owner），新增的仅一处检查（checker 注册）防既有翻译层漂移；不新增 state、fallback、retry、recovery 形状。
- **Helper-oriented**：Engine 拥有闭集导出与 checker verdict；Agent 拥有读取时的字段名归类；无 user decision 面，不创造 permission。

## Risks / Trade-offs

- [doc-lock 触碰] `CONTEXT.md` 被 `tests/integration/md/repair-directive-lock.test.mjs`（FIO-008/F-03/F-23，断言三行 repair 词汇行与 gate Rosetta 行逐值存在）及 `change-feedback-finalizer`/`change-feedback-loop-archive` exact 引用；根 `AGENTS.md`/`README.md` 实查无内容级 doc lock（`list-doc-locks` 命中为工具自测样例与 `DEEP_RESEARCH_HARNESS/README.md` 子串误报）→ apply 前跑 `node scripts/list-doc-locks.mjs` 逐文件盘点，同一 change 更新锁；本 change 只在 CONTEXT.md **新增**分诊头行，不动被锁三行与 Rosetta 行。
- [checker 注册的连带断言] `tests/governance/spec-enum-restatements-checker.test.mjs` L15 `assert.equal(SETS.length, 8)` → 注册后必须改 9（已入任务 1.2）。
- [checker 误报面已实证排除] 扫描面仅 `openspec/specs` + `openspec/guidance`；六值中仅 `current_entry_contract` 出现在其他 spec 文件，且全部是 `unsupported_current_entry_contract` 形态——memberRegex 的 `(?<![A-Za-z0-9_-])` lookbehind 使其不匹配；全库无六值与其它集合 token 的同句混排 → 注册后既有句子零新增 finding（FIO-008 原句 dominant=新集、无 closure cue）。
- [既有跨面重映射，超范围] `cli/check-reentry.mjs` L626 `repair_kind: root.repair_directive` 把 file-observability 指令值重映射进 blocker `detail.repair_kind` 字段——属当前接受行为（`repair-directive-lock.test.mjs` 只锁 consumer 读取 `root.repair_directive`）；本 change 不改 CLI 输出，仅如实记录为"混用即 bug"原则下的既有张力，留待后续独立 change 评估。
- [FIO 字面量测试] `repair-directive-lock.test.mjs` 断言 emitter 含 `repair_directive:`、不含 `repair_kind:`、含六个裸值——提取后三项均保持为真（值仍在文件内，仅改为数组字面量+引用），无需改该测试；`validate-work-unit-hygiene.mjs` 实查无 repair 字样扫描，不受影响。
- [archive 摩擦残留] 指令层不消除命中数量 → 已在 D1 记录升级路径（机械层独立 change）。

## Migration Plan

纯文档 + 等价重构 + checker 注册，无数据迁移、无运行时状态变更。回滚 = revert 提交；无 bundle 兼容性问题。

## Open Questions

（无。checker 扫描面与 doc-lock 精确清单属于 apply 阶段的既有程序，不改变 spec 或任务分解。）
