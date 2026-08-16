# Design: repair-residual-recovery-spelling-drift

## Context

See proposal.md — Why. 现状要点:

- 引擎发射值(`work-unit-transaction.mjs:270,277,689,744`)为 `'recover-transaction'`(连字符),
  CHI-004 spec 已锁"引擎发射 `repair_kind` 必须 CLI-verb 拼写 + RUN.md 决策表"。
- 但文档 prose 有两处下划线漂移(`COMMANDS.md:134`、`shared-subagent-protocol.md:141`
  `repair_kind: recover_transaction`),现有决策表回归
  (`tests/engine/work-unit-recovery-decision-table.test.mjs`)只扫 4 个引擎文件 + RUN.md,
  对这两处完全盲区。
- R4/R5/R6 为纯措辞/指针校准,无引擎行为变化。

## Goals / Non-Goals

**Goals:**

- 文档面 recovery `repair_kind` 拼写与引擎发射值完全一致,并被确定性回归锁死。
- R4/R5/R6 的指针、下一跳、全名坐标落地,消除人工复查需求。
- 零 Engine 行为变化;CHI-004 的既有锁(引擎发射 + RUN.md 决策表)保持不动。

**Non-Goals:**

- 不做任何 markdown 瘦身/去重(那是 C2 的范围,wave §9 / §7 前导段一律不碰)。
- 不新增 engine check、不新增 gate rule、不改 loader/注入/恢复语义。
- 不重写 wave phase 内容,phase-wave{0,1,2}.md 只作为**扫描面**出现,不编辑
  (除非扫描命中意外内容,apply 时按证据处理并写回计划)。

## Decisions

### D1: 扫描面扩展采用"文件清单 + 双拼写断言"而非全仓 glob

- **选择**:在现有 `work-unit-recovery-decision-table.test.mjs` 的
  "engine repair_kind values use CLI-verb spelling" 测试中,把 `sources` 数组从
  4 个引擎文件扩展为:4 个引擎文件 + `COMMANDS.md` + `shared-subagent-protocol.md` +
  `cli/README.md` + `command_playbook/provenance-forensics-guide.md` +
  `workflows/nodes/phases/phase-wave{0,1,2}.md`(共 10 个文件)。
- **理由**:计划 §1.1 R3 明确列出这 5 个文档面;显式清单比 glob 更可审计,
  且避免把 run-bundle 运行时文件或无关目录卷进扫描。
- **备选**:全仓 `**/*.md` glob。拒绝:会扫到 `_backlog/`、`.exp-bundles/`、
  run-bundle 等非框架面,产生误报,且与计划"DRH 文档面"的边界不符。
- **断言形式**:沿用现有 `assert.doesNotMatch(joined, /['"`]recover_transaction['"`]/)`
  模式——只匹配**带引号的**下划线拼写(文档里 `repair_kind: recover_transaction` 的
  值必然被反引号包裹),避免把 "recover_transaction 这个旧拼写" 这类解释性提及也算作漂移。
  若 apply 时发现某文件需解释性提及旧拼写,以显式排除或改写措辞处理,并写回计划。

### D2: 修复先行、扫描后验,验证"修复前两处 / 修复后零处"

- apply 顺序:先改 R1/R2 两处 prose,再扩展测试扫描面。
- 验证:测试扩展后,先证明对**修复后**树零命中;再临时把一处改回下划线证明测试确实
  能命中(红绿对照),最后恢复。计划要求"新扫描命中'修复前两处、修复后零处'"——
  用 git stash / 临时编辑做红绿对照,不把红态留在工作树。

### D3: R4/R5/R6 采用最小措辞编辑

- R4:`RUN.md:16` 的 "pre-pipeline routing exception" 后补指针
  `(定义见 openspec/specs/agent/agent-command-surface/spec.md「Entry docs distinguish trigger
  from command execution」段的 pre-pipeline routing exception 条款)`,不重写句子。
- R5:`CONTEXT.md` Working Boundary 的 "then stop" 补下一跳(指向
  `openspec/README.md` 的 control map 与 `openspec/guidance/models/` 路由);
  `openspec/README.md:49-52` 的 "leave this map and use the approved OpenSpec lifecycle"
  补具体命令(`/opsx:propose` 等生命周期命令,以该文件既有措辞风格为准)。
- R6:`COMMANDS.md:138` 与 `shared-subagent-protocol.md` no-edit 列表的裸
  `_status.json` → `_work_units/<wave>/<work_id>/_status.json`(work-unit 级),并在
  同列表内保留 `rb_status.json`(bundle 级)以区分两级。
- 所有编辑保持现有中英混排风格,不做格式重构。

## Risks / Trade-offs

- [扫描面漏掉未来新增文档] → 测试只锁显式清单;计划 C2 的 consistency-validator
  扩展("phase §9 在 shared 进 requires 时必须缺席或为指针")是另一道防线,不属于本 change。
- [文档里出现对旧拼写的解释性提及,被扫描误报] → 断言只匹配带引号的拼写值;
  若仍误报,apply 时以显式改写处理并写回计划 §1.1。
- [R5 措辞改动触发 context-routing 回归] → R5 只补"具体下一跳",不改变
  Charter-then-context 顺序、不移动任何 block;apply 后跑
  `tests/integration/md/agent-context-routing-contract.test.mjs` 验证。
- [R4 指针改动触发 run-entry 回归] → 只加指针不加新指令;apply 后跑
  `tests/integration/md/dpt-research-entry-routing-contract.test.mjs` 验证。

## Migration Plan

- 单 change 内完成,无部署/回滚需求;回滚 = revert 本 change 的 commit。
- apply 顺序:R1/R2 → R4/R5/R6 → R3 测试扩展 → 红绿对照 → 全量相关测试子集。

## Open Questions

无。计划 §1.1 已把 R1–R6 的目标坐标与修法定死;若 apply 时证据与当前树不符,
按计划 §执行上下文第 5 条以当前树为准并写回本计划文件。
