# Design: repair-current-guidance-contract-drift

## Context

C1 是纯文档/指引事实校准(动机见 proposal.md — Why)。现状要点:入口选择规则在 9 个 surface 近逐字重述(H1/H5);`CONTEXT.md` 缺 `hints[]`/`repair_kind`/三坐标模型(H6);两个 opsx skill 引用死路径(H4);AGENTS/CLAUDE 两对文件目前字节一致但无守卫(B5);`COMMANDS.md:55` 记录着 validate-workflow-package 的 exit-code 漂移(RA-L6);停止授权合法值在 README/model doc 与代码枚举不一致(B1);`start-research.md:75` 的 Final 措辞与 RUE-004/ACS-001 正典漂移(B4);RA-M1/RA-M2/RA-M4/RA-L1 四处 reentry 面发现已逐一复核(证据 §13)。两个方向决定已由用户拍板:exit-code = 代码补 exit 2;RA-M2 = POF-001 为真相。

目标文件在 `/opsx:apply` 前保持不动;本 design 只描述 apply 怎么做。

## Goals / Non-Goals

**Goals:**
- 每处已核验漂移收敛到单一真相源或确定性断言,文档说真话。
- 入口选择规则单一源化到 `command_playbook/continue-run-bundle.md`。
- 两对行为文件(根、harness)除工具标题行外字节级同步,由确定性守卫测试锁定。
- 不变量简报成为 onboarding 基线,AGENTS.md 首屏引用、其余 lazy-load。
- validate-workflow-package 成为 CLE-003 的已对齐 surface(exit 2),回归锁定。

**Non-Goals:**
- 不做 C2 的反馈形状/`repair_kind`/supersede 压平(Engine 行为,后续 change)。
- 不做 C3 的内容漂移 checker 与 pre-commit hook(本 change 只种下守卫测试与 exit-code inventory 的扩展苗床)。
- 不合并两套 opsx skill(只写分工指向);不新增 lifecycle state / Gate / controller / 平行路径。
- 不新增 capability、不新增 requirement ID、不建 requirement-reservation(仓库先例:既有 capability 内一律 MODIFIED requirement)。

## Decisions

1. **入口规则单一源 = `continue-run-bundle.md`(含两条分支)。** 该 playbook 已被 ACS-005 承认是 canonical continuation surface;在顶部加 "Entry Selection (canonical)" 小节,完整陈述 verified-pair 分支与 no-candidate `RUN.md` 分支。其余 8 个 surface(根 AGENTS/CLAUDE、harness AGENTS/CLAUDE、README、RUN、COMMANDS、start-research)各保留一句指针:playbook 名 + `unsupported_current_entry_contract` 边界词 + 一句"完整规则见 playbook"。备选:新建独立 `entry-routing.md` → 拒绝:新增坐标违背"删除比增加多",且 ACS-005 已把该 playbook 定为 canonical。**指针模板短语约束(apply 必须保留,否则两个既有回归变红)**:`dpt-research-entry-routing-contract.test.mjs` 与 `continue-run-bundle-contract.test.mjs` 断言每个 surface 含 `BUNDLE_ENTRY.md`/`BUNDLE_MAP.md`/`unsupported_current_entry_contract`/`continue-run-bundle.md`/explicit(明确)/reachable(可达)/`RUN.md`/`start-research.md`/扫描(scan)/裸文件名(bare filename)等短语;canonical 小节与指针不得含 `current_node`/`check-reentry.mjs`/`phase-final`/`readiness_passed`/`operate-post-final-recovery.mjs`/`` legacy `RUN_BUNDLE.md` `` 词面(playbook 的 no-lifecycle-branching 断言)。指针句统一模板,消除英/中漂移。
2. **AGENTS≡CLAUDE 守卫 = 两个独立 integration 测试。** 根对与 harness 对各一条;实现:读两个文件,去掉前 3 行(标题行 + 空行),`assert.equal` 字节级比较;失败消息指明配对文件与首个差异偏移。放 `tests/integration/md/`。备选:扩展既有 `agent-context-routing-contract.test.mjs` → 拒绝:plan 明确"各一条",独立测试失败定位更准。harness 对已有 `canonical-harness-vocabulary-contract.test.mjs` 的词汇断言先例,但那是词汇级,不是字节级;不替代。
3. **skill 路径存在性检查 = 一个小 integration 测试。** 扫描 `.agents/skills/**/SKILL.md` 与 `.claude/skills/**/SKILL.md`,提取 `guidelines/` 前缀引用与 `openspec/…` 相对引用,断言目标文件存在;死路径(如 `guidelines/change-feedback-loop.md`)即失败。放 `tests/integration/md/`。备选:扩展 ACS-003 的静态 validator → 拒绝:该 validator 只扫 harness command surfaces,skills 不在其扫描面;独立测试职责更清。
4. **exit-2 实现方式。** `validate-workflow-package.mjs` 增加 invocation/configuration error 检测(必需参数缺失、目标目录/文件不可读、未知 flag),错误 → stderr 诊断 + `process.exit(2)`;pass → 0;consistency issues → 1(现状保留)。`COMMANDS.md` 的 exit-code 清单同步把该命令从"Known doc/code drift"改为已对齐条目。CLE-004 回归增加代表性 invocation-error 运行断言。备选:改 header 承认 0/1 → 用户已拍板补代码。
5. **不变量简报的准入与内容。** 新文件 `openspec/guidance/models/invariants-brief.md`;每条 = 一行事实 + 单一真相源坐标(spec 文件 / 代码坐标 / 测试路径);文件头声明非权威、不授权、指向式阅读。15 条候选直接采用证据 §12 清单,逐条在 apply 时对照当前树复核:与当前树不符的以树为准并回写证据文件。真话约束示例:第 7 条按 M2 现状表述——`attempt_disposition` 目前仅由 dry-submit/inspect 发出、`repair_kind` 目前为下划线拼写(C2 对齐形状后更新该条);第 4 条按 B1 现状——枚举 4 值、2 个保留值无代码写入。不把机制性事实写进 Charter(遵守 GCO-002 的 admission test)——简报是 models/ 下的 onboarding 面,不是 constitution。
6. **停止授权真相。** `README.md:138` 与 `agentic-queue-mechanism.md:234`(7.2 节)改为:唯一真相 = `queue-manager-core.mjs:57` 枚举(4 值);`empty_queue_after_refill`/`unauthorized_continue_required` 是 `syncQueueHealth` 实际写入的两个值;`final_delivery`/`decision_blocker` 是保留值,当前无代码写入。agentic-queue spec 保持沉默,不为其新增要求。
7. **RA-M2 只改 spec 文本。** 代码已跟 POF-001(`post-final-recovery.mjs:354-359` 先查 accepted C5 workspace),RRD-008 的 precedence 文本已校准为 C5 优先并指向 POF-001;apply 不触碰代码,只确认 reentry 相关测试保持绿。RA-M1 同理:spec 文本 `capability_probe_only` → `direct_retrieval_probe_only`,代码不动(`consistency-validator.mjs:324` 已是实际值)。

## 三原则应用记录(design review 证据)

- **语义边界**:不变量简报的读者/有界问题/停止点、守卫测试的读者/停止点、入口单一源的读者/停止点已写入 proposal 的语义反思;简报明确与 CONTEXT.md/execution-model 正典区分(不成为第三术语正典)。
- **direct Source of Record / 最短合法闭环**:每处漂移的真相源见 Decisions 1-7;全部是"文档↔真相"一步对照,无中间层。
- **net simplification**:删除 6-8 个 surface 的重述(约 15-20 行×7)、两处 typo、一个死路径引用、两段过时 spec 文本;增加一个简报文件、一个 exit-2 分支、两个守卫测试 + 一个路径检查测试。删除 > 增加。
- **helper-oriented 责任边界**:User decision = exit-code 方向、RA-M2 真相 spec(已拍板);Agent execution = 文档校准、指针化、简报起草、测试编写;Engine verdict = 守卫/路径/exit-code 回归全部是确定性测试裁决,无语义判断。

## Risks / Trade-offs

- [入口单一源后,个别 surface 信息变少,Agent 可能跳过 playbook] → 指针句含 playbook 名与 `unsupported_current_entry_contract` 边界词;既有 research-entry routing 回归测试保持绿;RUE-006 delta 的场景锁定指针式表述。
- [AGENTS≡CLAUDE 守卫让单侧编辑直接红] → 这是意图行为;失败消息指明配对文件;两对文件当前已一致,apply 后即绿。
- [exit-2 改变可观察行为,可能影响依赖 0/1 的调用方] → 仅 invocation-error 路径新增;CLE-004 回归锁定;COMMANDS.md 同步更新;该 CLI 是 validator,Agent 调用方按 CLE-001 读结构化 stdout。
- [RRD-008 文本顺序变化与既有 reentry 测试快照冲突] → 归档 semantic-closure 已确认代码跟 POF-001;apply 跑 `tests/integration/cli/` reentry 子集确认。
- [不变量简报条目越过"事实"边界写成规则] → GCO-001 delta 已定准入(可机器验证或单一真相源、不授权);apply 逐条复核,polish 已按此审过候选清单。
- [C1 与 C2 在 RUN.md 恢复段交叠] → 按计划:C1 只做最简真话校准(不引入 decision 表),C2 落地后再由同一测试文件锁定新形状。

## Migration Plan

无数据/状态迁移。apply 分提交进行:spec 校准提交 → 文档/技能校准提交 → 代码(exit-2)+ 测试提交 → 简报提交;每步独立可回滚(`git revert` 单提交)。CLE-004/ACR-004/新守卫测试在文档提交后立即跑,保持全绿。

## Open Questions

无。两个方向决定已由用户拍板;RA-M3/RA-M5/RA-L2/RA-L3/RA-L4 属 C2 范畴,不在本 change。
