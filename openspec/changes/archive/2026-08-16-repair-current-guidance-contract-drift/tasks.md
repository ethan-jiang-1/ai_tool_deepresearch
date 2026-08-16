# Tasks: repair-current-guidance-contract-drift

## 1. Planning 收尾(apply 前;目标文件保持不动)

- [x] 1.1 创建 `verification-plan.yaml`:四类 test class 声明(`unit` 选不选按实际、`integration` 必选——AGENTS≡CLAUDE 守卫、skill 路径存在性、exit-code 对齐回归、既有 md/ 回归;`deterministic_e2e`/`agent_flow_e2e` 声明为 not selected 并写明理由);每条 claim 带 statement/test_class/asset/execution_profile/verdict_authority(ACS-003 / ACR-004 / CLE-004)
- [x] 1.2 创建 `semantic-closure.yaml`:`status: affected`;`catalog_additions` 声明 `cli.exit-code-convention`(bounded_question:validate-workflow-package 及各框架 CLI 在 pass/fail/invocation-error 下分别退出什么码,按 CLE 约定);affected 记录该 family 的 fact/authority/established_by/consumers/overlap/verification(clean 语义:本 change 只改 validate-workflow-package 的 invocation-error 行为,其余事实不变);运行 `node openspec/governance/check-semantic-closure.mjs --change repair-current-guidance-contract-drift --mode plan` 必须 PASS
- [x] 1.3 运行 polish-openspec-change 至少两轮:Pass 1 整体一致性 + 至少一轮 risk-led(候选:RRD-008 场景锚点保留、指针化后各 surface 信息充分性、exit-2 对既有调用方的兼容、不变量简报条目逐条可验证性),直到最后一轮无改动且 `openspec validate --strict` + `git diff --check` 通过;发现的产品/范围决策升级用户,不自行猜
- [x] 1.4 三原则 design review 复核:design.md 的语义边界 / direct Source of Record / 最短合法闭环 / net simplification / user-Agent-Engine 责任边界记录与 delta 一致;不一致即修正 design.md
- [x] 1.5 `openspec-feedback:plan-review` 在首个 target edit 前完成 plan review:通读 proposal、7 个 delta specs、design、tasks、verification-plan、semantic-closure,做整体一致性复核(polish Pass 1)与 risk-led 复核(Pass 2/3:harness 对字节差异、dpt/continue-run-bundle 回归短语约束、exit-2 兼容、不变量简报逐条可验证性);核对 semantic-closure 的 fact/resolver/established_by/consumers/overlap 角色(本记录无 #fragment,全部 bare coordinate;consumers 仅含 exit-code 回归这一 verdict consumer);每个 finding 已转普通任务并关闭。Done:plan-mode 四项治理检查绿 + 无未决 finding(@impl ACR-002/004, ACS-003, CLE-003/004, GCO-001, RRD-008, RUE-006, WNC-001)

## 2. 文档与指引校准(apply)

- [x] 2.1 停止授权真相校准(B1):`DEEP_RESEARCH_HARNESS/README.md:138` 与 `openspec/guidance/models/agentic-queue-mechanism.md` 7.2 改为:唯一真相 = `engine/queue-manager-core.mjs:57` 枚举(4 值);`empty_queue_after_refill` / `unauthorized_continue_required` 是 `syncQueueHealth` 实际写入的两个值;`final_delivery` / `decision_blocker` 是保留值、当前无代码写入;agentic-queue spec 保持沉默不改
- [x] 2.2 submit 措辞校准(M1):`RUN.md:32` 改为"正常 submit 只接受 claimed attempts;同 hash 重复 submit 是幂等成功;仅不同内容重复才拒绝"(依据 `delegated-work-units/spec.md:545`)
- [x] 2.3 typo 与只读双规则(B3/B5):根 `AGENTS.md:58` / `CLAUDE.md:58` 的 `tests/engine/, tests/engine/` typo 修复;根行为文件(生命周期 scope)与 harness README(运行时 scope)的"只读"表述各自提及另一层 scope;harness 对同步注统一为相同措辞(现两文件第 33 行互换工具名导致字节不同,须统一后 ACR-002 字节级守卫才绿)
- [x] 2.4 skill 死路径修复(H4):`.agents/skills/source-command-opsx-apply/SKILL.md:15` 与 `source-command-opsx-archive/SKILL.md:16` 的 `guidelines/change-feedback-loop.md` → `openspec/operations/change-feedback-loop.md`;两套 skill(`openspec-*` vs `source-command-opsx-*`)写明分工指向(不合并)
- [x] 2.5 CONTEXT.md 术语补全(H6/ACR-001):补 `hints[]`、`repair_kind`(phase §7 主反馈面)、三坐标模型(`repo_command_root` / `framework_root` / `current_run_bundle_root`);"Gate" 一行指向 `framework-runtime-boundary.md` 的五面表
- [x] 2.6 入口选择单一源化(RUE-006/ACS-005):`command_playbook/continue-run-bundle.md` 顶部新增 "Entry Selection (canonical)" 小节,完整陈述 verified-pair 分支与 no-candidate `RUN.md` 分支;8 个 surface(根 AGENTS/CLAUDE、harness AGENTS/CLAUDE、README、RUN、COMMANDS、start-research)的完整规则重述替换为统一模板指针句(playbook 名 + `unsupported_current_entry_contract` 边界词);消除英/中措辞漂移
- [x] 2.7 Final 措辞校准(B4):`command_playbook/start-research.md:75` 的 "deliver-first interactive" 对齐 RUE-004/ACS-001 正典:"terminal lifecycle delivery,deliver-first,接受 presentation feedback,不是第三个 checkpoint";`RUN.md:30` 已一致则不动
- [x] 2.8 reentry 文档校准(§13):RA-M4 —— `persist-final-report` 补进 `COMMANDS.md` 命令索引与 `command_playbook/persist-artifact.md`(该命令已实现于 `operate-artifact-persistence.mjs:29,121-131`,ARP spec 已要求);RA-L1 —— `COMMANDS.md:50` 等命令串补全 `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs` 可执行前缀;RA-L5 不改(刻意状态)
- [x] 2.9 不变量简报(GCO-001):新建 `openspec/guidance/models/invariants-brief.md`,采用证据 §12 候选清单(约 15 条),每条 = 一行事实 + 单一真相源坐标;逐条对照当前树复核,与树不符的以树为准并回写证据文件对应行;文件头声明非权威、不授权;根 `AGENTS.md` 与 `CLAUDE.md`(守卫要求两份一致)首屏加同一行引用(before `## Before Anything Else`)

## 3. 代码与测试(apply)

- [x] 3.1 exit-2 实现(RA-L6/CLE-003):`DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs` 增加 invocation/configuration error 检测(必需参数缺失、目标目录/文件不可读、未知 flag),错误 → stderr 诊断 + `process.exit(2)`;pass → 0;consistency issues → 1 保持;`COMMANDS.md` 的 "Known doc/code drift" 条目移除并改为已对齐说明
- [x] 3.2 ACS-003 回归扩展(RA-M4/RA-L1):`tests/engine/command-contract-docs.test.mjs` 增加断言——`persist-final-report` 出现在 `COMMANDS.md` 命令索引且带完整 `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs` 前缀;prose/playbook 中出现的可执行命令串带完整前缀(紧凑操作表豁免,因其行内给出 cli 坐标)
- [x] 3.3 AGENTS≡CLAUDE 守卫测试(ACR-002/ACR-004):`tests/integration/md/` 新增两个 integration 测试(根对一条、harness 对一条):读两文件、strip 前 3 行(工具标题行 + 空行)、字节级 `assert.equal`;失败消息指明配对文件与首个差异
- [x] 3.4 skill 路径存在性测试(ACR-004):`tests/integration/md/` 新增 integration 测试:扫描 `.agents/skills/**/SKILL.md` 与 `.claude/skills/**/SKILL.md`,提取 `guidelines/` 前缀引用与 `openspec/…` 相对引用,断言目标文件存在;死路径即失败并指名
- [x] 3.5 CLE-004 回归扩展:`tests/integration/cli/exit-code-convention.test.mjs` 增加 validate-workflow-package 代表性断言(缺参 → 2;正常包 → 0;issue → 1)与文档不再列为 drift 的断言
- [x] 3.6 spec 同步:7 个 delta(`bundle/run-entry` RUE-006、`agent/agent-command-surface` ACS-003、`agent/agent-context-routing` ACR-001/002/004、`governance/guidance-constitution` GCO-001、`workflow/workflow-node-contract` WNC-001、`engine/runtime-reentry-debuggability` RRD-008、`engine/cli-exit-code-conventions` CLE-003/004)合并进 `openspec/specs/` 对应 main spec,保留全部场景锚点(含 @deprecated 锚);无新增 requirement ID,registry 无需登记

## 4. 验证与收尾

- [x] 4.1 `npm test` 相关子集绿:`tests/integration/md/`(守卫 + skill 路径 + 既有回归)+ `tests/integration/cli/exit-code-convention` + reentry 相关子集
- [x] 4.2 全量治理检查绿:`node openspec/governance/check-project-reqs.mjs --mode plan`、`check-project-specs.mjs`、`check-verification-routing.mjs --change repair-current-guidance-contract-drift --mode plan`、`check-semantic-closure.mjs --change repair-current-guidance-contract-drift --mode plan`(exit-2 首个 target edit 前须先把 `cli.exit-code-convention` 写入 global catalog)
- [x] 4.3 收尾检查 1:`node openspec/governance/check-project-reqs.mjs --mode archive --change repair-current-guidance-contract-drift` 必须 PASS(0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired)
- [x] 4.4 收尾检查 2:`node openspec/governance/check-project-specs.mjs` 必须 PASS(0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader)
- [x] 4.5 archive:`node openspec/governance/finalize-change-archive.mjs --change repair-current-guidance-contract-drift` 成功;`_backlog/plans/guidance-drift-cleanup-machine-guards.md` 勾选 C1 全部检查项并登记 CLS 编号
- [x] 4.6 `openspec-feedback:closeout-review` 归档前完成 closeout review:建立 change-scoped 边界(git status 全部属于本 change 或已独立提交);复核实际 diff(文档校准 12 文件 + 代码 1 文件 + 测试 5 文件 + spec 同步 7 文件);semantic-closure 对实际变更面复核——resolver `validate-workflow-package.mjs` 的 exit-2 已实现并被 exit-code 回归断言,established_by/consumers/overlap 与实际面一致;选定验证证据:md 340/340、engine command-contract 16/16、exit-code 32/32、static-regression、reentry/persistence CLI 子集全绿;delta/main 同步对比完成(7 文件 10 个 requirement)。Done:无未决 finding 且全部任务完成(@impl ACR-002/004, ACS-003, CLE-003/004, GCO-001, RRD-008, RUE-006, WNC-001)
