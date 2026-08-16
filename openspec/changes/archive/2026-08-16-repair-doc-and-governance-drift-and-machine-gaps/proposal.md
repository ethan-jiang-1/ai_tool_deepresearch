# Proposal: repair-doc-and-governance-drift-and-machine-gaps

## Why

2026-08-16 的 coding-agent 视角全仓库体检（来源：`_backlog/plans/coding-agent-friendliness-review-remediation.md`，本 change 承接其 F-01、F-02、F-04~F-08、F-12~F-19）发现文档/治理面存在两类缺陷：(a) 文档与文档、文档与 spec、文档与代码之间的残余漂移，执行 Agent 会在这些点上拿错信息或多猜一步（如 `workflows/README.md` 声称 chain 只编码 `passed` 而 `transitions.chain.json` 实际编码了 `rerun`；`engine/transition-table` spec 的 state 枚举清单过期）；(b) 治理的"机器骨架"存在未闭合的缝——描述归档硬门的 RET-006 清单（5 项）与真实 finalizer（16 步）脱节、guidance 散文中的 requirement ID 无人校验、没有聚合的健康检查入口、"非权威" model 文档里夹带规范性 MUST。本 change 只修文档措辞、spec 指针与治理检查脚本，**不改变任何 Engine/CLI/gate/runtime 行为**（F-13/F-14/F-18/F-19 新增的检查器全部只读）。

## What Changes

- `DEEP_RESEARCH_HARNESS/workflows/README.md`：删除「Chain 只编码 `passed` 分支…不编码进 chain」的过期句，改为「Chain 编码 `passed` 与已声明的 `rerun` 分支；未编码分支归 Agent decision authority」；`engine/transition-table` spec 的 state 枚举清单同步为当前现实（`passed`、`rerun`；`failed` 当前无编码）。（F-01）
- `DEEP_RESEARCH_HARNESS/RUN.md`：work-unit 决策表注解「CLI-verb spelling」改为准确措辞（closed enum，部分值即 CLI 动词拼写，映射以 `REPAIR_KIND_CLI_VERB` 与决策表为准）；§2 结尾 existing-candidate 指针补「preflight 失败 ≠ 无 explicit candidate，禁 fallback 到 RUN.md」消歧句，与 harness 行为文件一致。（F-02/F-04）
- `DEEP_RESEARCH_HARNESS/README.md`：入口选择指针节补同一消歧句。（F-04）
- retire 孤儿 playbook `DEEP_RESEARCH_HARNESS/command_playbook/plan-hostfile-sections.md`（全仓库无指针指向；renderer 指引已由 `cli/plan-hostfile-sections.mjs` 的 COMMANDS/phase 文档覆盖）。（F-05）
- `DEEP_RESEARCH_HARNESS/command_playbook/persist-artifact.md`：`persist-final-report` 的 `(--expect-absent | --expect-sha256 <digest>)` 记法改为两个完整可复制形态（照 generic `persist` 写法）。（F-06）
- `DEEP_RESEARCH_HARNESS/COMMANDS.md`：`operate-work-unit.mjs` verb 清单补已实现的 `timeout-preflight`；`DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs` 头注释删除「terminal commands are added in later apply sections」过期句。（F-07）
- 根 `README.md`：补一句全局语言约定声明（精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文，同一控制面内不混用；新写推理用中文，已有英文面逐步归一）；`DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md:69` 句末中文句并入该文档主语言。（F-08）
- `openspec/specs/governance/requirement-traceability/spec.md`：RET-006「Check script compliance as hard gate」的手抄 5 项清单改为指向 finalizer `CheckSchema`（唯一真相源）的指针，不再重抄；修复 :77-93 被插入块拦腰切断的句子；ADDED：聚合健康检查入口（`check-all.mjs`，只读聚合全部 `check-*.mjs`）、catalog 声明「当前 accepted vs 历史归档」、main spec 必须有一级标题（并入 `check-project-specs.mjs`）、guidance/operations/models 散文中的 requirement ID 纳入 registry 校验扫描、root 硬规则三面一致性覆盖（GCO-008 覆盖扩展）。（F-12~F-14、F-16~F-19）
- `openspec/specs/governance/guidance-constitution/spec.md`：ADDED 一条 requirement——model 文档 SHALL NOT 出现规范性 MUST/MUST-NOT 表述；术语纪律 SHALL 用描述性措辞并显式声明「效力以 accepted spec 为准」；配 drift 测试锁定。（F-15）
- `openspec/guidance/models/` 五个 model 文档（`agentic-execution-model.md`、`agentic-queue-mechanism.md`、`agentic-subagent-mechanism.md`、`agentic-workflow-mechanism.md`、`framework-runtime-boundary.md`）中的规范性 MUST/MUST-NOT 表述（含「## 8. MUST / MUST NOT」节与内联 MUST 句）改写为描述性术语纪律措辞并带效力声明，与新 requirement 对齐。（F-15）
- `openspec/specs/README.md`：头部补「本 catalog 即当前 accepted capabilities；历史/废弃 capability 在 `openspec/changes/archive/` 与 `req-registry.yaml` 的 `[DEPRECATED]` 组」一句。（F-17）
- `openspec/specs/bundle/run-entry/spec.md` 与 `openspec/specs/governance/version-management/spec.md`：补一级标题（纯结构卫生，无 requirement 语义变化）。（F-16）
- 新增/扩展 drift 测试锁定上述每处修复（见 tasks）；`check-all.mjs` 挂 `package.json` script。

无 **BREAKING** 变更。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `engine/transition-table`: 「transitions.chain.json structure」requirement 的 state 枚举值从过期清单（`passed`/`failed`）修正为当前现实（`passed`/`rerun`，`failed` 当前无编码）。（F-01）
- `governance/requirement-traceability`: RET-006 硬门清单改为 finalizer `CheckSchema` 指针；ADDED 聚合健康检查入口、catalog accepted/historical 声明、main-spec 一级标题检查、guidance 散文 requirement-ID 校验、content-drift 扫描面扩展；:77-93 断句修复。（F-12~F-14、F-16~F-19）
- `governance/guidance-constitution`: ADDED model 文档规范性语言约束。（F-15）

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/transition-table` | `openspec/specs/engine/transition-table/spec.md:20`（state 枚举「当前：`passed`、`failed`」）、`DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json`（实际 `passed`/`rerun`，无 `failed`） | Modify | spec 枚举清单与 chain 现实漂移，requirement 文本需修正 |
| `governance/requirement-traceability` | `openspec/specs/governance/requirement-traceability/spec.md:306-320`（RET-006 5 项清单）、`openspec/governance/finalize-change-archive.mjs:71-89,350-440`（CheckSchema 16 步）、`check-project-reqs.mjs:209-266`（扫描面不含 guidance）、`check-project-specs.mjs:32-35`（4 项检查无 H1） | Modify | 硬门清单、扫描面、检查项都是该 capability 的 requirement 内容 |
| `governance/guidance-constitution` | `openspec/specs/governance/guidance-constitution/spec.md:149-165`（model 定位）、`openspec/guidance/models/` 5 个文档含 MUST/MUST-NOT（`agentic-execution-model.md:208-221`、`agentic-queue-mechanism.md:258-`、`agentic-subagent-mechanism.md:190-`、`agentic-workflow-mechanism.md:114-`、`framework-runtime-boundary.md:226,248-256`） | Modify | model 文档的规范性语言无任何 requirement 约束，需 ADDED |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md:36-62`（RUE-002 carve-out）、`:67-96`（RUE-004 同步要求） | Verify-only | F-02/F-04 是文档措辞与既有 requirement 对齐；RUE-002/004 已锁语义，无 requirement 变化；F-16 仅补 H1（结构卫生，task 记录） |
| `governance/version-management` | `openspec/specs/governance/version-management/spec.md:1`（无 H1） | Verify-only | 仅补 H1，无 requirement 语义变化 |
| `research/plan-hostfile-sections` | `openspec/specs/research/plan-hostfile-sections/spec.md`（renderer CLI 契约） | Verify-only | 退休的是无引用的 playbook 文件；renderer CLI 与 spec 不动 |
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md` | Verify-only | 只改 playbook 的呈现形态（两完整命令），命令语法不变 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Verify-only | `timeout-preflight` 行为已实现且被 spec 覆盖；只补文档清单与过期注释 |
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md:101-147`（current-state inventory 职责） | Verify-only | COMMANDS.md 清单追平现实正是 CLE-004 的既有职责，无 requirement 变化 |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md` | Verify-only | COMMANDS.md 表面职责不变 |
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md` | Verify-only | 根 README 加一句语言约定声明，路由结构不变 |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` | Verify-only | playbook 内部语言归一，流程与命令不变 |
| `workflow/workflow-node-contract` | `openspec/specs/workflow/workflow-node-contract/spec.md` | Verify-only | F-01 只改 workflows/README 描述句，node 契约不变 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md:11-18` | Verify-only | 新增静态断言测试属既有 integration 类，无分类变更 |

## Impact

- 修改文件：`DEEP_RESEARCH_HARNESS/workflows/README.md`、`RUN.md`、`README.md`、`COMMANDS.md`、`command_playbook/persist-artifact.md`、`command_playbook/post-final-recovery.md`、`cli/operate-work-unit.mjs`（仅头注释）；退休 `command_playbook/plan-hostfile-sections.md`；根 `README.md`；`openspec/guidance/models/` 5 个 model 文档（agentic-execution-model / agentic-queue-mechanism / agentic-subagent-mechanism / agentic-workflow-mechanism / framework-runtime-boundary，仅规范性语言改写）；`openspec/specs/README.md`；main spec：`engine/transition-table`、`governance/requirement-traceability`、`governance/guidance-constitution`（delta sync）、`bundle/run-entry`、`governance/version-management`（仅 H1）。
- 新增：`openspec/governance/check-all.mjs`、`package.json` script、drift 测试若干（`tests/integration/md/`、`tests/governance/`）。
- 扩展（只读诊断面）：`check-project-reqs.mjs`（guidance 散文 ID 扫描）、`check-project-specs.mjs`（H1 检查）、`check-content-drift.mjs`（扫描面扩展）。
- 无依赖、API、CLI 行为、schema、Engine、gate 变更。

## 简化与责任边界

- **Direct Source of Record**：归档硬门以 finalizer `CheckSchema` 为唯一真相源（spec 只放指针）；chain 分支以 `transitions.chain.json` 为唯一真相源（README/spec 描述它）；CLI verb 以 `cli/operate-work-unit.mjs` 现实为唯一真相源（文档追平）；入口选择以 `continue-run-bundle.md` canonical 节为 owner。本 change 不新增第二份重述。
- **Net simplification**：删除手抄 5 项硬门清单（→指针）、删除过期枚举清单与过期注释、退休一份孤儿 playbook、删除 model 文档里的规范性 MUST 节；新增的全部是只读机器检查（H1、散文 ID、model 语言、check-all 聚合），不新增任何 runtime state/概念/权限。
- **Semantic-precision reflection**：新增的唯一具名 surface 是 `check-all.mjs`——读者是有界问题「治理健康是否全绿」的自检 Agent；必须保留的区别：聚合检查是**只读诊断**，不是归档 authority、不自动修复；正常推理停止点：输出逐项 PASS/FAIL 与聚合退出码后停止，修复动作仍由 Agent 按各 checker 的 repair 坐标执行。model 文档的语言约束读者是有界问题「这份 model 是否在走私行为规则」；区别：术语纪律（可用 MUST 表达 + 效力声明）vs 行为规则（必须迁往 accepted spec）；停止点：声明存在且 drift 测试锁定。
- **责任边界**：新增检查器均为只读、不授予任何 authority/permission；finalizer 仍是唯一归档入口；F-05 的 retire 是文档面卫生决策（renderer 指引已在 CLI/phase 文档覆盖），不改变任何用户决策点或 runtime 行为。
