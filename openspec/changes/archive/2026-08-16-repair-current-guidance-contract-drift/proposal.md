# Proposal: repair-current-guidance-contract-drift

## Why

2026-08-16 的四路深挖(证据全文 `_backlog/plans/cleanup-effect-verification.md`,Part I §5-6 + Part II §7-13)确认:spec/指引与代码的漂移(FM-1/FM-2)是"agent 老是做不对"的复发根因之一,而治理全靠 prose + 自守——内容漂移没有被任何机器检查。本 change 是计划 `guidance-drift-cleanup-machine-guards` 的 C1:把已逐条核验的文档漂移一次修掉,**让文档说真话,不加新规则**。除了用户已拍板的一个方向决定(exit-code:代码补 exit 2,见下),本 change 无 Engine 行为变化、无 schema 变化、无 run bundle 影响。

## What Changes

全部为已核验的事实校准(证据编号见括号;目标坐标以当前树为准,apply 时复核):

- **停止授权真相(B1)**:`DEEP_RESEARCH_HARNESS/README.md:138` 与 `openspec/guidance/models/agentic-queue-mechanism.md:234` 的合法值列表改为指向 `engine/queue-manager-core.mjs:57` 枚举为唯一真相,写明 `final_delivery` / `decision_blocker` 是保留值、当前无代码写入(只有 `syncQueueHealth` 写 `empty_queue_after_refill` / `unauthorized_continue_required`)。
- **submit 措辞(M1)**:`RUN.md:32` 改为:正常 `submit` 只接受 claimed attempts,同 hash 重复 submit 是幂等成功(`delegated-work-units/spec.md:545` 已如此),仅不同内容重复才拒绝。
- **exit-code 方向决定(RA-L6 / COMMANDS.md:55,用户已拍板)**:`cli/validate-workflow-package.mjs` 补 invocation-error 路径并 `process.exit(2)`,header 声明变真;从 CLE-003 的"记录在案漂移"清单移除,补回归测试锁定。这是 C1 唯一代码行为变化。
- **AGENTS≡CLAUDE 守卫(B5)**:修 `AGENTS.md:58` / `CLAUDE.md:58` 的 `tests/engine/, tests/engine/` typo(与 harness 对、B5 的"复制而非引用"一并校准);新增守卫测试——根对与 harness 对各一条,除标题行外字节级同步。
- **skill 死路径(H4)**:`.agents/skills/source-command-opsx-{apply,archive}/SKILL.md` 的 `guidelines/change-feedback-loop.md` → `openspec/operations/change-feedback-loop.md`;两套 skill(`openspec-*` vs `source-command-opsx-*`)写明分工指向;verification 含 skill 路径存在性检查。
- **CONTEXT.md 术语补全(H6)**:补 `hints[]`、`repair_kind`、三坐标模型(`repo_command_root` / `framework_root` / `current_run_bundle_root`,现只在 harness README:54-58 定义);"Gate" 一行指向 `framework-runtime-boundary.md` 的五面表。
- **入口选择规则单一源化(H1/H5)**:完整规则只留 `command_playbook/continue-run-bundle.md`,其余 6-8 个 surface(根 AGENTS/CLAUDE、harness AGENTS/CLAUDE、README、RUN、COMMANDS、start-research)改为指针,消除 README↔RUN↔COMMANDS 环形路由与英/中措辞漂移。
- **read-only 双规则(B3)**:根行为文件(生命周期 scope)与 harness README(运行时 scope)各自提及另一层,消除"同一句只读两种含义"。
- **Final 措辞(B4)**:`command_playbook/start-research.md:75` 的 "deliver-first interactive" 与 RUN.md / `phase-final.md` / RUE-004 / ACS-001 正典对齐:"deliver-first terminal refinement,不是第三个 checkpoint"。
- **reentry 面(§13)**:
  - RA-M1:`workflow/workflow-node-contract` spec 文本 `capability_probe_only` → `direct_retrieval_probe_only`(phase 与 validator 的实际值);
  - RA-M2(用户已拍板):**POF-001 为真相**;`engine/runtime-reentry-debuggability` RRD-008 的 owner precedence 改为 C5 优先并指向 POF-001;
  - RA-M4:`persist-final-report` 补进 `COMMANDS.md`(与 `command_playbook/persist-artifact.md`);
  - RA-L1:`COMMANDS.md:50` 等命令串补全 `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs` 可执行前缀;
  - RA-L5 不改(刻意状态)。
- **不变量简报(计划 §12)**:新增 `openspec/guidance/models/invariants-brief.md`,约 15 条可机器验证或直接指向单一真相源的不变事实,作为新 agent onboarding 基线;AGENTS.md 首屏引用,其余 lazy-load。

## Capabilities

### New Capabilities

无。全部是既有 capability 的校准或既有能力的验证扩展。

### Modified Capabilities

- `bundle/run-entry`:MODIFY RUE-006——入口选择规则单一源化(完整规则只留在 `continue-run-bundle.md`,各 surface 指针化)。
- `agent/agent-command-surface`:MODIFY ACS-003——静态验证/回归扩展:COMMANDS.md 命令登记完整性(persist-final-report)与可复制全前缀命令串。
- `agent/agent-context-routing`:MODIFY ACR-001(术语补全);MODIFY ACR-002(行为文件对整文件字节同步,除工具标题行);MODIFY ACR-004(回归断言守卫 + skill 路径存在性)。
- `governance/guidance-constitution`:MODIFY GCO-001——onboarding 不变量简报的准入与边界(非权威、可机器验证或指向单一真相源、不授权)。按仓库先例(2026-08-11-rebuild-hitl1-research-access-envelope proposal):无 New capability 时不建 requirement-reservation,既有 capability 内一律以 MODIFIED requirement 表达,故不新增 GCO-009。
- `workflow/workflow-node-contract`:MODIFY WNC-001——HITL1 search policy 文本校准(`capability_probe_only` → `direct_retrieval_probe_only`)。
- `engine/runtime-reentry-debuggability`:MODIFY RRD-008——post-final owner precedence 对齐 POF-001(C5 优先),并对侧指向。
- `engine/cli-exit-code-conventions`:MODIFY CLE-003(validate-workflow-package 移出"记录在案漂移",成为已对齐的 selected surface);MODIFY CLE-004(回归覆盖该对齐)。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/run-entry` | RUE-006 spec 文本;9 个 surface 重述(H1);continue-run-bundle.md | Modify | RUE-006 现要求"同步"= 各处重述;改为指针式单一源 |
| `agent/agent-command-surface` | ACS-003 spec;COMMANDS.md:50/165;RA-M4/RA-L1 | Modify | 静态验证扩展命令登记完整性/前缀可复制性 |
| `agent/agent-context-routing` | ACR-001/002/004 spec;CONTEXT.md(H6);AGENTS/CLAUDE 现状(B5) | Modify | 术语补全 + 整文件同步守卫 + 回归断言 |
| `governance/guidance-constitution` | GCO-001..008 spec;计划 §12 候选清单 | Modify | 新增不变量简报的准入/边界要求(GCO-009) |
| `workflow/workflow-node-contract` | spec:13,23 vs phase-hitl1.md:9 vs consistency-validator.mjs:324,384(RA-M1) | Modify | spec 文本过时,无行为变化 |
| `engine/runtime-reentry-debuggability` | RRD-008 spec:386-396 vs POF-001 spec:68-74 vs post-final-recovery.mjs:354-359(RA-M2) | Modify | 用户已拍板 POF-001 为真相,RRD-008 对齐 |
| `engine/cli-exit-code-conventions` | CLE-003 spec;validate-workflow-package.mjs:33,36;COMMANDS.md:55(RA-L6) | Modify | 用户已拍板代码补 exit 2,selected-surface 对齐 |
| `agent/agentic-queue` | B1:spec 对停止授权沉默;queue-manager-core.mjs:57 | Excluded | spec 保持沉默;README/model doc 改为指向代码枚举为唯一真相,不需 spec 变化 |
| `research/post-final-recovery` | POF-001 spec:68-74;代码跟随 POF-001 | Excluded | 已是真相,不改 |

## Impact

- **目标文件**:`DEEP_RESEARCH_HARNESS/README.md`、`RUN.md`、`COMMANDS.md`、`command_playbook/start-research.md`、`command_playbook/continue-run-bundle.md`、根 `AGENTS.md`/`CLAUDE.md`、`DEEP_RESEARCH_HARNESS/AGENTS.md`/`CLAUDE.md`、根 `CONTEXT.md`、`.agents/skills/source-command-opsx-{apply,archive}/SKILL.md`、`openspec/guidance/models/agentic-queue-mechanism.md`、`openspec/guidance/models/framework-runtime-boundary.md`(仅指针核对)、新增 `openspec/guidance/models/invariants-brief.md`。
- **代码**:`DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs`(唯一代码变化:invocation error → exit 2)。
- **测试**:`tests/integration/md/`(AGENTS≡CLAUDE 守卫、skill 路径存在性)、`tests/integration/cli/exit-code-convention.test.mjs`(validate-workflow-package 对齐)等。
- **spec**:上述 7 个 delta(全部为既有 capability 的 MODIFIED requirement;无 New capability、无新 requirement ID、无 requirement-reservation)。
- **无影响**:无 schema/state/Gate/controller 变化;无 run bundle 兼容性影响;不触碰 C2 的反馈面与恢复投影。

## 语义反思(semantic-precision,新增 reader-facing surface)

- **不变量简报**(`openspec/guidance/models/invariants-brief.md`):
  - 读者:新 onboarding Coding Agent(以及需要快速核对"当前不变事实"的维护者)。
  - 有界问题:"当前仓库哪些不变事实可直接机器验证,或应指向哪个单一真相源?"——不是行为规范,不是 Gate,不是第二条 glossary。
  - 必须保留的区别:机器可验证事实(指向代码/spec/测试)↔ 权威 spec(行为所有权)↔ 指引(路由与边界);简报不得成为第三权威层。
  - 正常推理停止点:每条陈述要么可被确定性检查(测试/CLI 输出)验证,要么明确指向唯一 Source of Record;读到"指向"就停,不再翻 9 个 surface。
- **AGENTS≡CLAUDE 守卫测试**:读者=维护者;有界问题="两份行为文件是否漂移";停止点=除工具标题行外字节级 diff,确定性裁决。
- **入口单一源化**:读者=路由决策者;有界问题="当前请求选哪条入口";停止点=一个指针跳到 `continue-run-bundle.md` 的完整规则,不再在多处对照英/中措辞。

## 简洁准入两问(simple-reliable-control)

1. **direct Source of Record**:停止授权 → `queue-manager-core.mjs:57` 枚举;入口选择 → `continue-run-bundle.md`;post-final owner precedence → POF-001;exit-code 约定 → CLE spec + `COMMANDS.md` 清单。每处漂移都收敛到一个已存在的事实所有者,不新建真相。
2. **最短合法闭环 + net simplification**:所有修复都是"文档↔代码/spec"直接对照;删除(6-8 个 surface 的重述、两处 typo、一个死路径、一段过时 spec 文本)明显多于增加(一个简报文件 + 一个 exit-2 分支 + 守卫测试)。未新增任何 state、projection、Gate、controller 或检查层。

## 责任边界(user decision / Agent execution / Engine verdict)

- **User decision(已拍板,记录于本 proposal)**:exit-code 方向 = 代码补 exit 2(而非改 header);RA-M2 真相 spec = POF-001(而非 RRD-008)。C3 的 pre-commit hook 决定项不在本 change。
- **Agent execution**:全部文档校准、入口指针化、不变量简报起草、skill 路径修复、delta specs 与任务执行。
- **Engine verdict**:AGENTS≡CLAUDE 守卫、skill 路径存在性、exit-code 对齐回归、既有 `tests/integration/md/` 子集由确定性测试裁决。
