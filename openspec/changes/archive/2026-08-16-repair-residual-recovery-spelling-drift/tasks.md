# Tasks: repair-residual-recovery-spelling-drift

## 1. R1/R2 — recovery repair_kind 连字符化 (CHI-004)

- [x] 1.1 `DEEP_RESEARCH_HARNESS/COMMANDS.md:134` 的 `repair_kind: recover_transaction` 改为 `repair_kind: recover-transaction`,与引擎 `work-unit-transaction.mjs:270,277,689,744` 发射值一致(@impl CHI-004)
- [x] 1.2 `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md:141` 的 `repair_kind: recover_transaction` 改为 `repair_kind: recover-transaction`(@impl CHI-004)
- [x] 1.3 grep 全 DRH 文档面确认无其他 `repair_kind: recover_transaction` / `repair_kind: recover_declaration` 下划线残留(引擎文件中的字符串字面量 `'recover-transaction'` 除外)
- [x] 1.4 `openspec-feedback:plan-review` 在首个 target edit 前完成 plan review:通读 proposal、delta spec、design、tasks、verification-plan、semantic-closure,做整体一致性复核(polish Pass 1)与 risk-led 复核(Pass 2/3:扫描面文件存在性与零残留、CHI-004 归属、delta/main 逐字 diff 只含预期修改、verification-plan claim 3 过度声明收窄、delta 反例拼写隐患移除、R5 当前树证据差异写回计划);核对 semantic-closure(not_applicable:纯文档校准 + 静态扫描扩展,不改任何 runtime fact family);每个 finding 已转普通任务并关闭。Done:plan-mode 四项治理检查绿 + 无未决 finding(@impl CHI-004)

## 2. R4/R5/R6 — 指针、下一跳、全名坐标

- [x] 2.1 `DEEP_RESEARCH_HARNESS/RUN.md:16` 的 "pre-pipeline routing exception" 补指针,指向 `openspec/specs/agent/agent-command-surface/spec.md` 中该 exception 的定义段落
- [x] 2.2 根 `CONTEXT.md` Working Boundary 的 "then stop" 措辞补具体下一跳:指向 `openspec/README.md` control map 与 `openspec/specs/README.md` 的具体引用(当前树已有分类下一跳,补具体路径/命令)
- [x] 2.3 `openspec/README.md:49-52` 的 "leave this map and use the approved OpenSpec lifecycle" 补具体命令(生命周期命令,如 `/opsx:propose` 等,以该文件既有措辞风格为准)
- [x] 2.4 `DEEP_RESEARCH_HARNESS/COMMANDS.md:138` no-edit 列表的裸 `_status.json` 写全名 `_work_units/waveN/<work_id>/_status.json`,并与 `rb_status.json`(bundle 级)区分
- [x] 2.5 `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md` no-edit 列表的裸 `_status.json` 同样写全名 `_work_units/waveN/<work_id>/_status.json`

## 3. R3 — 决策表扫描面扩展 (CHI-004)

- [x] 3.1 `tests/engine/work-unit-recovery-decision-table.test.mjs` 的 "engine repair_kind values use CLI-verb spelling" 测试 `sources` 数组扩展为:4 个引擎文件 + `COMMANDS.md` + `shared-subagent-protocol.md` + `cli/README.md` + `command_playbook/provenance-forensics-guide.md` + `workflows/nodes/phases/phase-wave{0,1,2}.md`;并补 `repair_kind:\s*['"\`]?<value>` 值位置断言(原 `/['"\`]<value>['"\`]/` 匹配不了 `` `repair_kind: recover_transaction` `` 短语形式)(@impl CHI-004)
- [x] 3.2 红绿对照:对修复后的树运行扩展测试 → 零命中(绿);临时把 `COMMANDS.md:134` 改回下划线 → 测试命中该文件(红,`underscore repair_kind value still present: recover_transaction`);恢复修复(红绿对照不留在工作树)
- [x] 3.3 确认扫描断言锁定 `repair_kind:` 值位置的下划线拼写值(两种模式:直接引号字面量 + `repair_kind:` 值位置),不误伤解释性提及

## 4. 验证

- [x] 4.1 `node --test tests/engine/work-unit-recovery-decision-table.test.mjs` 通过
- [x] 4.2 `node --test tests/engine/command-contract-docs.test.mjs` 通过(COMMANDS.md 编辑后)
- [x] 4.3 `node --test tests/integration/md/agent-context-routing-contract.test.mjs` 通过(CONTEXT.md / openspec/README.md 编辑后)
- [x] 4.4 `node --test tests/integration/md/dpt-research-entry-routing-contract.test.mjs` 通过(RUN.md 编辑后)
- [x] 4.5 相关 md 契约测试子集整体绿(`node --test tests/integration/md/` + `tests/engine/` 相关子集)

## 5. 收尾检查(归档前硬性 done condition)

- [x] 5.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change repair-residual-recovery-spelling-drift` 必须 PASS
- [x] 5.2 `node openspec/governance/check-project-specs.mjs` 必须 PASS(0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader)
- [x] 5.3 `openspec-feedback:closeout-review` 归档前完成 closeout review:建立 change-scoped 边界(git status 全部属于本 change:8 个目标文件 + change 目录;`_backlog/plans/...md` 为计划 §5 要求的差异写回);复核实际 diff(文档校准 6 文件 + 测试 1 文件 + spec 同步 1 文件,零引擎代码变化);semantic-closure(not_applicable)对实际变更面复核——纯文档拼写/指针/全名校准 + 静态扫描扩展,不改任何 runtime fact family,resolver/authority/verdict 均未触碰,与实际面一致;选定验证证据:决策表扩展测试红绿对照(修复前红 `underscore repair_kind value still present`、修复后绿)、md 340/340、engine 1017/1017、command-contract 19/19、context-routing + entry-routing 9/9;delta/main 同步对比完成(CHI-004 逐字一致,python diff MATCH)。Done:无未决 finding 且全部任务完成(@impl CHI-004)
