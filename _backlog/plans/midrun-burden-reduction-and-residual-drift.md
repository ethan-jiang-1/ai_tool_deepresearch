---
title: Mid-Run Burden Reduction + Residual Drift (Round 2)
status: active
created: 2026-08-16
changes:
  - repair-residual-recovery-spelling-drift
  - reduce-mid-run-context-burden
  - dedup-phase-closure-loading (deferred)
---

# Mid-Run Burden Reduction + Residual Drift (Round 2)

## 背景

第一轮(`guidance-drift-cleanup-machine-guards`,CLS-064/065/066 已归档)治好了
"含糊轴":入口单一源、停止状态真相、恢复面决策表、AGENTS≡CLAUDE 守卫、
不变量简报全部落地。2026-08-16 复查确认**零回退**(见 §1.3)。本 plan 是第二轮,
治两件事:①残留的同类漂移(两处拼写 + 测试盲区 + 三个小尾巴);
②**负担轴**——中段运行阅读税(340 处否定规则、约 1.1 万行/轮的 phase 闭包),
这是第一轮有意 defer 的部分。目标:用**最少 2 个 OpenSpec change** 收口。

## §1 诊断 — 残留漂移(2026-08-16 全仓复查)

### 1.1 真残留(修复目标)

| # | 位置 | 问题 | 修法 |
|---|---|---|---|
| R1 | `DEEP_RESEARCH_HARNESS/COMMANDS.md:134` | `repair_kind: recover_transaction`(下划线)vs 引擎发射 `'recover-transaction'`(连字符,`work-unit-transaction.mjs:270,277,689,744`)。按文档比对永远匹配不上 | 连字符化 |
| R2 | `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md:141` | 同上 | 连字符化 |
| R3 | `tests/engine/work-unit-recovery-decision-table.test.mjs:60-74` | 只扫 4 个引擎文件 + RUN.md,对 R1/R2 盲区 | 扫描面扩到 `COMMANDS.md`、`shared-subagent-protocol.md`、`cli/README.md`、`command_playbook/provenance-forensics-guide.md`、`workflows/nodes/phases/phase-wave{0,1,2}.md` |
| R4 | `DEEP_RESEARCH_HARNESS/RUN.md:16` | "pre-pipeline routing exception" 无指针(定义在 `openspec/specs/agent/agent-command-surface/spec.md:208`) | 加指针 |
| R5 | `CONTEXT.md:79`、`openspec/README.md:49-52` | "非权威…then stop" 无具体下一跳 | 补具体路径/命令 |
| R6 | `COMMANDS.md:138`、`shared-subagent-protocol.md:~149` 的 no-edit 列表 | 裸 `_status.json` 有歧义(work-unit 级 `_work_units/waveN/<work_id>/_status.json` vs bundle `rb_status.json`) | 写全名 |

### 1.2 已验证不是漂移(全仓 token 级扫描)

- round-1 修复全部仍在:RUN.md 决策表、supersede 顶层字段、blocked 投影排除、
  CONTEXT 术语行、入口指针化(8 个 surface 全是指针)、skill 路径、typo——零回退。
- 其他 `repair_kind:` 值、gate 名 vs status 值(连字符/下划线两套编码各有其位)、
  CLI 动词、trace event 名、数字断言(4 值枚举、6 ledger sections 等)全部与代码一致。
- 无真实死路径(skill/playbook 里的 miss 全是 run-bundle 运行时文件)。

### 1.3 负担轴(第一轮未动,本轮的真正目标)

- phase 节点体量:wave0 349 / wave1 421 / wave2 369 行;否定规则 **456 行关键字 /
  ~448 sites**(340 是句级去重后的口径)。
- **机制事实(重要,修正初版假设)**:默认 `enter-phase` **不自动注入** shared 文件
  (`workflow-chain.mjs:377-420` 只解 `requires` 闭包;`--full` 才附全文,
  `cli/enter-phase.mjs:199-207`;canonical flow 从不传 `--full`)。"重复税"=
  **手动读税 + 引擎注入头**(AUTONOMOUS_MODE_HEADER 每 stop:no 节点 ~15 行 × 8
  ≈ 120 行/轮,`workflow-chain.mjs:77-92,552-566`)。若 agent 按指引读全
  requires 文件,一轮 shared 载荷 ≈ **5,548 行**(去重后重复部分 ≈ 4,011)。
- 参照:全 gate 规则目录见 [`machine-checks-catalog.md`](machine-checks-catalog.md);
  负担逐条分类与 C4 选项表见 [`midrun-reading-burden-audit.md`](midrun-reading-burden-audit.md)
  (2026-08-16 审计,5,431 行 nodes 全读;权威仍是 gate definition JSON)。

### 1.4 负担审计结论(种子数据,C2 apply 的直接输入)

- 三分类结果(全 nodes,**~448 sites**):(1)机器已覆盖 **~246(55%)**——每条都
  有第一手 check 名/rule id(审计 §A.3 给了 18 个代表例,如
  `delegated_bypass_suspected`、`ledger_record_hash`、`seed_initialization_structure`、
  `depth_review_contract` 等);(2)过时/重复 **~34(8%)**(审计 §A.4 给了 11 组,
  含 wave §9 与 shared-anti-cheating 的逐条重复、8 个 phase §7 前导段重复、
  rerun §9 自重复、anti-cheating 双 `### 13` 与孤儿 §12、`manifest.shared`
  漂移——列了 gate-rules/repair-guidance 却无 phase requires);(3)纯纪律
  **~168(37%)**(交互放置契约、子代理真实性规则等,**保留语义**)。
- 推荐 **Option A:纯 markdown 去重/压缩,零引擎改动**:预计静态删 ~320-430 行
  (6-8%),每轮重复税降 ~350-550 行;`requires` 闭包、`--full`、注入头、
  见证链、`current_node` 恢复全部不动,每 phase 在 fresh context 仍独立可恢复。
- 引擎级去重(Option C once-per-run loading)会**换掉恢复语义**(fresh context
  需先跑 reload 命令)→ 列为独立 deferred,触发条件:一次真实 run 的成本观察。
- **硬约束**:`shared-silent-execution.md` 整份不可删(恢复/放置契约);
  hitl1/hitl2 的 §9 只有在先把 `shared-anti-cheating-rules.md` 加进其
  `requires` 之后才能删本地副本。

## §2 Change 拆分(2 个)

### C1 `repair-residual-recovery-spelling-drift`(小,纯校准 + 测试锁)

- R1/R2 两行 prose 连字符化;R4/R5/R6 措辞/指针修正。
- R3:决策表锁定测试的扫描面扩到全部 DRH 文档面——把"拼写漂移"这一类
  从此锁死,不再靠人工复查。
- 零 Engine 行为变化。涉及 spec 面(propose 时定):`agent/subagent-node-contract`、
  `workflow/shared-node-content`、`bundle/run-entry`、`agent/agent-context-routing`。
- 验证:integration(决策表扫描命中 R1/R2 修复前后对照)+ 现有回归。

### C2 `reduce-mid-run-context-burden`(中,本轮主要工作量;= 审计 Option A)

**纯 markdown 去重/压缩,零引擎改动、零恢复语义变化**(`requires` 闭包、
`--full`、注入头、见证链、`current_node` 恢复全部不动):

- 删除(2)类:wave0/1/2 的 §9 与 `shared-anti-cheating-rules.md` 逐条重复
  (shared 已在 requires)、8 个 phase §7 前导段 → 一行指针、rerun §9 自重复、
  anti-cheating 双 `### 13` + 孤儿 §12 结构性修复、hitl2/final 同文件与
  chain 静态数据重复、`manifest.shared` 漂移(去掉无 phase requires 的
  gate-rules/repair-guidance,或补 requires——propose 时定)。
- 删除/指针化(1)类:机器已覆盖(~246 处)的散文,删除时记录 check 名/rule id;
  优先删(2)类,再删(1)类中"理由已由检查失败信息完整表达"的条目。
- 压缩(3)类:wave §3.2 drain 段三份近同 → 一份 shared;交互放置句 → 指向
  `shared-silent-execution.md`(该文件整份不可删);子代理 MUST NOT 列表去
  解释性尾巴。**纯纪律语义一律保留**。
- 立法(防疤痕再长):phase 散文**不得重复**已被 gate/validator/test 强制的事实
  (只留指针)。delta spec:`research/research-wave-phase-content`、
  `workflow/shared-node-content`。
- 锁定:`consistency-validator` 新增检查类"phase §9 在 shared 已进 requires 时
  必须缺席或为指针";`check-content-drift.mjs` 扩展禁止句↔机器检查对照。
- 前置条件(hard):先给 hitl1/hitl2 补 `shared-anti-cheating-rules.md` 进
  `requires`,再动它们的本地 §9。
- 目标(非硬指标):静态删 ~320-430 行(6-8%),每轮重复税降 ~350-550 行;
  删除后跑全量测试 + 复测否定计数并写回 §1.3。

### C3 `dedup-phase-closure-loading`(deferred,= 审计 Option C)

引擎级 once-per-run loading + on-demand reload(`enter-phase` 增量注入 +
`--reload`)。**换恢复语义**(fresh context 需先跑 reload),必须独立
engine-scoped change,且须先重验 `shared-silent-execution.md:96` 与
`handoff-helpers.mjs:142-202` 的 load-bearing 约束。触发条件:一次真实 run
的成本观察,或用户明确要求;否则保持 deferred。

## Progress TODO

### C1 — repair-residual-recovery-spelling-drift

- [ ] propose:语义反思 + 简洁准入两问 + delta specs
- [ ] polish:/polish-openspec-change 至少两轮,直到 `ready for apply`
  (`openspec validate --strict` + `git diff --check`)
- [ ] verification-plan.yaml:四类 test class 声明(integration 为主)
- [ ] apply:R1/R2 连字符化 + R4/R5/R6 修正
- [ ] apply:R3 扫描面扩展,新扫描命中"修复前两处、修复后零处"
- [ ] npm test 相关子集绿(tests/engine/work-unit-recovery-decision-table + md 契约)
- [ ] archive:finalizer + 本 plan 登记

### C2 — reduce-mid-run-context-burden

- [ ] propose:三分类执行细则 + 目标文件面 + 立法 delta(吸收 §1.4 种子数据与
  审计 §A.3/§A.4 的逐条对照;manifest.shared 漂移的方向决定)
- [ ] polish:/polish-openspec-change 直到 `ready for apply`;polish 内闭环:
  删除门槛(每条删除附可验证的机器检查名或过时证据)、hitl1/hitl2 requires
  前置的落地顺序
- [ ] verification-plan.yaml:unit/integration 覆盖"删后规则仍被机器强制"
  (每删一条对应一个 negative 断言)+ 新增 consistency 检查类测试
- [ ] apply:先补 hitl1/hitl2 的 `shared-anti-cheating-rules.md` requires
- [ ] apply:逐条三分类 → 删(2)类 → 删/指针化(1)类 → 压缩(3)类;每删一条
  记录机器检查名;结构性缺陷(双 ### 13/孤儿 §12)修复
- [ ] apply:立法 delta 落 main spec + check-content-drift / consistency 扩展落地
- [ ] npm test 全量绿 + 复测否定规则计数/重复税并写回本文件 §1.3
- [ ] archive:finalizer + 本 plan 登记

### C3 — dedup-phase-closure-loading(deferred)

- [ ] 触发条件未满足:保持 deferred,本 plan 不主动开工(触发 = 一次真实
  run 的成本观察,或用户明确要求)

## 顺序与依赖

```text
C1(先锁拼写盲区,两行 prose,当天可完)
  → C2(Option A 纯 markdown 瘦身:C1 后的树为基线;分类种子已在 §1.4)
C3: deferred,独立触发,不阻塞本 plan 关闭
```

## 执行上下文(新 session 起手必读)

本文件是被用户**显式选中**的计划入口。接手顺序:
1. 读 `openspec/constitution/project-charter.md` + 根 `CONTEXT.md`(仓库强制预读)。
2. 读本文件全文 + 两份参照:[`machine-checks-catalog.md`](machine-checks-catalog.md)
   (C2 分类对照表)与 [`midrun-reading-burden-audit.md`](midrun-reading-burden-audit.md)
   (逐条分类与 C4 选项表)。
3. 每个 change 严格走:propose → polish(/polish-openspec-change,至少两轮,直到
   `ready for apply`)→ apply → archive;目标文件在 `/opsx:apply` 前不动。
4. Tracking:勾选上方检查项;归档后在 `_backlog/plans/README.md` 更新状态;
   全部归档后按关闭流程 `git mv` 到 `_backlog/_done/_closed_plans/`。
5. 证据与当前树不符时以当前树为准,并把差异写回本文件对应行。

## Non-Goals

- 不删任何机器检查、不弱化 fail-closed;gate definition JSON 不动(除非发现
  与 spec 冲突,单独记录)。
- 不重写 phase 节点的结构(§0-§9 骨架保留);只瘦身、不重构叙事。
- 不做 hook/CI(沿用 2026-08-16 用户拍板的既有决定)。
- C2 不碰 loader 行为、不改变 context-loss 独立恢复能力(引擎级去重归 C3
  deferred)。
- 纯纪律类规则(分类 3)保留语义,只允许压缩合并,不允许删除。
- `shared-silent-execution.md` 整份不动(恢复/放置契约,load-bearing)。

## Re-entry

通过各 change 自己的 proposal/design/tasks/verification-plan 续跑;本文件
只跟踪分组、顺序与检查项。目标文件在 `/opsx:apply` 前保持不动。
