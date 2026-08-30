# Spec 语义漂移修复（spec-semantic-drift-remediation）

> 状态: active（C1、C2 均已归档 2026-08-30，finalizer 各 18/18 checks；C3 ready to propose）
> 创建: 2026-08-30 | 来源: 项目可读性深挖会话（3 个并行只读考古 + captain 交叉抽查，全部指控经行号级验证）
> 定位: `_backlog` 上游分析与决策记录，不是运行时真相；落地一律走 OpenSpec change 生命周期。

## 1. 问题陈述

本仓库的治理机器（`governance:check`、doc-lock 测试、finalizer）锁的是**结构完整性**
（requirement ID、指针目标、路径引用、spec 格式），**锁不住语义一致性**（词表口径、
判据措辞、规则归属面）。2026-08-30 深挖证实：语义漂移集中出现在最厚的两篇 spec
（DEW 2431 行 / AGQ 1065 行）与最长的链路（post-final 四表面）。当前均为"结构合法
但语义有裂缝"状态，是复杂度利息开始超过本金的信号。

已排除的疑点（不需要行动）：`WNC-010` 是活跃 requirement ID 非遗留残迹；指针悬空
由 `check-content-drift` / `check-guidance-pointer-targets` 机器防护且当前全绿。

## 2. 已证实发现（全部有行号证据，经 captain 抽查复核）

| # | 级别 | 发现 | 证据坐标 |
|---|------|------|----------|
| A1 | 机械 | DEW 头部 req 索引列 26 个 ID、正文 29 个 requirement；AGQ 头列 27、正文 28。按 ID 定位必然错位 | `openspec/specs/agent/delegated-work-units/spec.md:3`（头 26）、正文 `### Requirement:` 计 29；`openspec/specs/agent/agentic-queue/spec.md:3`（头 27）/ 正文 28 |
| A2 | 契约裂缝 | post-final spec 规定"运行时契约失败 SHALL exit 1，exit 2 仅限 invocation/envelope"，CLI catch-all 把一切未捕获异常打成 exit 2 `operation_failed` | spec L201-204 vs `DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs:53-60` |
| A3 | 双口径 | AGQ drain 判据用 "`deadline_at` has passed"；DEW 已将 `deadline_at` 降级为 "initial lease hint"，真实资格走 `lease_anchor_at + idle_timeout_ms`。**（2026-08-30 propose 期修正：这是误判——engine 的 drain 过滤就读 `deadline_at`（`queue-manager-lifecycle.mjs:524`），AGQ 与代码一致；两判据是不同机制共用字段名，非冲突。修复改为分工 scope note）** | `agentic-queue/spec.md` L727-734 vs `delegated-work-units/spec.md` L1411 段 + `queue-manager-lifecycle.mjs:524` |
| A4 | 冗余 | DEW L817/L859 两个 scenario 近乎逐字重复；多处保留"行为已反转"的历史 scenario 名（按标题检索得到旧语义，如 L259/439/757 的 v1/v2 rejected 系列） | DEW spec 行号 |
| B1 | 孤本规则 | post-final 链四表面（spec / playbook / phase / CLI）语义一致但深度悬殊，≥5 处规则只活在一个表面：dig-list intake 与 `check-reentry --at` 双语义只在 playbook、约 57 行 digest/basis 规则只在 spec | `command_playbook/post-final-recovery.md` §1.5、L116；`post-final-recovery/spec.md` L115-171 |
| B2 | 双真相源 | supersession（DEW L2229 / AGQ L953）、late-submit 队列后置条件（DEW L626-734 / AGQ L168/191）、claim 批量原子性（DEW L107 / AGQ L591）两篇成段重复表述，当前一致但均为未来漂移点。**（2026-08-30 propose 期修正：三对经逐字核实大半不成立——supersession 字段映射只在 AGQ（DEW 对 `supersession_of_work_id` 零命中），late-submit/claim 是各自陈述己方文件不变式的交叉断言；真实重复只有 DEW-009 内 scenario 对（归 A4）。B2 文本手术全部剔除）** | 两 spec 行号 |
| B3 | 人肉同步面 | 改一条 gate 规则 3-4 处、加新 gate 6 处；疲劳降级阈值 `3` 与 node 列表硬编码在多个 `check-gate-*.mjs` wrapper 复制（如 wave1 wrapper L127），无静态校验 | `cli/gates/check-gate-wave1-complete.mjs:127` |
| B4 | 字面-行为相悖 | spec 禁止 `reference/*{topic}*.md` 作第二成功谓词，definition JSON 仍用它做 target（L55/76/83/91/98），真实修正藏在 evaluator 前缀嗅探（`wave-contract-evaluators.mjs:555` `startsWith('reference/')`）；evaluator 另有 by-ID 特判（L624 `shared_ref_count_floor`）而 spec L309-312 禁止 by-ID 分派 | spec L60-65、L309-312 vs definition/evaluator 行号 |

历史对照（避免重复劳动）：

- 词表消歧已做过一轮（`2026-08-30-disambiguate-feedback-repair-surfaces`，commit `f089a16dc`），
  但 DEW 内 `repair_kind: agent_action/engine_operation`（gate 面枚举值）出现在 work-unit
  语境仍足以让精读者混淆——本计划不重复该 change 的范围，仅在 A 类修复时顺带在用点
  标注词表归属。
- Wave1 question-list 已迁移 typed descriptor（RWG-005，commit `987c8b341`）；B4 的
  reference-target 规则尚未迁移，属同一模式的存量尾巴。
- gate 审计姿态已由 GSK-011 决策：**派生证据 + 运行时 fail-closed，不建永久 per-rule
  静态目录**（曾被视为 contradictory expectation 而删除）。C3 必须在该姿态内工作。

## 3. 落地策略：3 个有界 OpenSpec change（最少合理数）

不合并为 mega-change：三组触碰的 capability 集、验证面、semantic-closure 记录互不相同，
合并会产生 sprawl diff 且违背仓库 bounded-change 文化（对照 CLS-066/067 先例：3 个小
change 优于 1 个大的）。也不进一步拆分：C1 内各项同文件同验证面，拆分只增加生命周期
开销。

### C1 `repair-delegated-queue-spec-drift`（doc-only，先做）

> **2026-08-30 propose 已完成**：`openspec/changes/2026-08-30-repair-delegated-queue-spec-drift/`（proposal / 两篇 delta / design / tasks / semantic-closure / verification-plan 全套，`openspec validate --strict` 绿；已 apply + 归档：finalizer 18/18 checks、npm test 2866/2866，commit 7f5c164d2。apply 期两项修订记入该 change 的 tasks/design：AGQ 取消内联行（多 ID 合并 heading 非 1:1）、术语锁改为 post-archive retention 语义；并发现 list-doc-locks 对动态构造路径的盲点。）范围相对本计划修正为 **A1 + A3（分工注记）+ A4（保留标题的合并声明）**，B2 剔除（见上表修正）。新机制发现：OpenSpec MODIFIED delta 为整块替换语义，requirement 存活时 scenario 标题不可删——C2/C3 若需删 scenario 必须沿用 house 保留标题模式。

- **范围**: A1 + A3 + A4 + B2，全部落在 `agent/delegated-work-units` 与 `agent/agentic-queue`
  两篇 main spec，零代码改动。
- **任务要点**:
  1. 修正两篇头部 `> req:` 索引计数；为每个 `### Requirement` 增加内联 `> req: DEW-xxx`
     行；与 `openspec/governance/req-registry.yaml` 同步（Apply 期才动 live registry）。
  2. AGQ drain 判据措辞统一到 DEW 的 effective-idle-lease 口径（explore 期先核对
     `engine/queue-manager-*.mjs` 实际实现以确认 DEW 措辞是行为真相）。
  3. 删除 DEW L817/L859 重复 scenario；为"行为已反转"的历史 scenario 标题加
     `@deprecated behavior` 风格锚点注记（沿用 post-final spec 的既有先例）。
  4. B2 三处双真相源收敛为"一处 owner + 一处指针"：方向建议 work-unit 生命周期措辞
     归 DEW、AGQ 保留 queue 侧后果并以指针引用（explore 期定稿）。
- **semantic-closure 预期**: `not_applicable`（不改任何 cataloged family 的 resolver /
  establishing surface / verdict consumer，理由参照
  `close-verification-landing-loop` 的写法）。
- **验证**: `node scripts/list-doc-locks.mjs` 锁定面盘点 + 对应 doc-lock 测试同 change 更新；
  `npm run governance:check`；archive 前 `npm test` 全绿（finalizer 硬前置）。
- **风险**: 低。若 explore 发现 B2 收敛 diff 过大，允许把任务 4 拆为 C1b 单独走
  （计划允许的弹性点，代价是多一个生命周期）。

### C2 `align-post-final-recovery-surfaces`（code + spec + playbook）

- **范围**: A2 + B1，收敛 post-final 链路为"spec 单一权威面 + 其余表面指针化"。
- **任务要点**:
  1. A2 裁决与修复，**推荐方向：改代码**——运行时未捕获异常收敛为 closed blocked
     verdict / exit 1（符合 spec 与 fail-closed 精神），保留 exit 2 仅给
     invocation/envelope 构造失败；同 change 更新/新增 CLI 测试锁定该边界。
     （若 explore 期 owner 判决相反——改 spec 放宽 exit 2——则须同步
     `cli-exit-code-conventions` 面的措辞，二选一，不折中。）
  2. B1 孤本规则回灌：playbook §1.5 dig-list intake、`check-reentry --at` 双语义、
     spec L115-171 digest/basis 规则统一收进 `research/post-final-recovery/spec.md`
     （或其 canonical owner 判定的相邻 capability）；`command_playbook/post-final-recovery.md`
     与 `workflows/nodes/phases/phase-final.md` 相应段落退化为指针，不再承载独有规则。
  3. `ReopenResearchPass` 命名在各表面的用法统一（注意保留 `@deprecated` 场景锚点）。
- **semantic-closure 预期**: `affected`（post-final recovery family；若触及 CLI exit-code
  family 一并声明；registry 见 `req-registry.yaml`）。
- **验证**: 现有 post-final CLI 测试 + 新增 exit-code 边界测试；doc-lock 盘点；
  `npm test` 全绿。
- **风险**: 中。playbook 指针化会触碰多个 doc-lock；孤本规则"搬家"须逐条核对代码是否
  已实现（dig-list intake 若是纯 Agent-flow 规则，spec 化时须如实标注为 agent-facing
  contract 而非 engine-enforced，不得虚构可执行性）。

> **C2 已归档（2026-08-30）**：`openspec/changes/archive/2026-08-30-align-post-final-recovery-surfaces`。范围修正：dig-list intake 经核实 spec 已有 requirement（L622-657，POF-005），非孤本；ReopenResearchPass 命名无变体——B1 实际只回灌 check-reentry 入口语义（ADDED POF-006）。A2 按"改 CLI"方向落地：运行时契约失败收敛为 blocked/exit 1（exit 2 严格保留给 invocation/envelope 构造失败）。finalizer 18/18、npm test 2868/2868。另：发现并修复两处 list-doc-locks 盲点实例（动态构造路径/跨面锁），盲点根治登记为后续工作。

### C3 `extend-derived-gate-audit-coverage`（tooling，Modify 既有 capability）

- **范围**: B3 + B4 的机器防护补强，**在 GSK-011 既定姿态内**：派生证据、不建永久
  per-rule 静态目录。
- **任务要点**:
  1. 扩展现有 derived gate audit（`validate-workflow-package.mjs` / `consistency-validator.mjs`
     载体）：从 evaluator 分发表**反射派生**当前已实现 check 名集合，校验每个 active
     definition 的 `rule.check` 命中分发表、gate CLI wrapper 存在且绑定一致；发现
     by-ID 特判（如 `shared_ref_count_floor`）时报告为 alignment debt 而非直接判死。
  2. 抽取疲劳降级共享配置（阈值 `3` + node 列表）为单一常量源，替换各 wrapper 硬编码；
     audit 校验 wrapper 不再私藏副本。
  3. （弹性任务，diff 有界才做，否则留批三）reference-target 规则迁移 typed descriptor
     （复用 RWG-005 的 `semantic_sections` 模式，替代 `startsWith('reference/')` 嗅探）。
- **归属**: 优先 **Modify** `research/research-wave-gate-implementation`（其 L1108-1131
  已要求 alignment 静态审计）或 `engine/gate-skeleton`；避免 New capability（省
  requirement-reservation 与新 prefix 流程）。explore 期按 `openspec/specs/README.md`
  Capability Discovery 表定稿。
- **semantic-closure 预期**: `affected`；若引入"rule.check 分发覆盖"这一新确定性事实，
  以 `catalog_additions` 声明并先入 global catalog。
- **验证**: audit 自身的 unit/integration 测试（对 fixture definition 注入未知 check 名
  须被捕获）；`npm test` 全绿。
- **风险**: 中。与 GSK-011 的张力是本 change 最大设计问题——explore 期必须先重读
  `engine/gate-skeleton/spec.md` 的 GSK-011 requirement 全文，确认派生式静态审计不
  违反其"drop permanent per-rule catalog expectation"的决策理由，再动手。

### 排序与依赖

C1 → C2 → C3 串行（一次一个 active change，与仓库惯例一致）。C2 与 C3 无相互依赖，
C1 先行的原因是零代码、最快见效、并为 C2/C3 的 propose 积累 registry/doc-lock 操作
手感。若中途需要腾出手做别的，C3 可无限期后置而不阻塞 C1/C2 的收益。

## 4. 非目标（显式排除，防止 scope creep）

- **批三结构重构全部不进本轮**：CLI wrapper 合并为单派发器、gate-loop/gate-fork 改名
  （wave gate 零引用但自称 Engine gate）、gate-helpers barrel 收敛。触发条件：C3 落地
  后仍出现真实误改事故或维护疼痛，再单独立项。
- **元层面治理**（新专有名词/enum 值的 Charter 级硬门槛、"规则考古"索引）：独立小
  change，本轮不绑定。触发条件：下一次词表消歧类 change 出现。
- 不改任何运行时行为语义（A2 若按推荐方向走，是把 CLI 异常路径收敛到 spec 已声明
  的行为，不是新行为）。

## 5. Open questions（propose 前需要 owner/用户裁决）

1. **A2 修复方向**: 改 CLI（推荐）还是改 spec？影响 C2 的 delta 写法。
2. **B2 owner 方向**: supersession/late-submit 措辞归 DEW 还是 AGQ？（建议 DEW，
   理由: work-unit 生命周期归属，AGQ 只承受 queue 后果。）
3. **C3 与 GSK-011 的相容性**: 派生式 audit 是否被接受为"非永久目录"？若否，C3 降级
   为仅做任务 2（共享配置抽取）。

## 6. 附录：本次深挖顺带发现的簿记漂移（不属本计划范围，另行处理）

- `_backlog/plans/README.md` 活跃列表登记 8 个 plan，但文件已全部位于
  `_done/_closed_plans/`（hitl1-bounded-clarification-alignment 等 8 项），且
  `_closed_plans/README.md` 亦无对应登记行——搬迁三处 README 更新全部缺失，
  活跃列表整体滞后。当前 Next available plan ID: CLS-079。
- `_backlog/README.md` "相关外部文件"表仍引用 `DPT_FRAMEWORK/engine/`、
  `DPT_FRAMEWORK/workflows/`、`guidelines/project-charter.md` 三个不存在/已迁移路径
  （CLS-049 改名后未同步）。
