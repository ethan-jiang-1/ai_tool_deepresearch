# Capability Split: agent/delegated-work-units（一变四）

> 日期: 2026-09-01 | 状态: **设计定稿，执行待用户指令（R1a 起）**
> 隶属: 活跃 plan `spec-lean-pointerization-and-registry-hygiene` 的 R1 批次（本文件为该批的自包含设计，复核与执行以本文件为准）。
> 性质声明: **首例 capability 级拆分**——全库治理史上无先例（CLS-083 的 extract 是 engine 模块级）。每个 checker/finalizer 反应按首跑对待。
> 用户决策记录: 2026-09-01 用户拍板"一定要按 capability 拆"（推翻 CLS-084 的"requirement 级即可"判断）；2026-09-01 追问副作用与消解（本文 §4）。

---

## 1. 事实基线（为什么拆、拆的是什么）

| 事实 | 数值/内容 | 复现 |
|---|---|---|
| 体量 | spec 2360 行，全库第一（第二名 1380 的 1.7 倍）；37 个 requirement 块 | `wc -l` + 逐块 awk |
| 注册 ID | DEW-001..029（header 全列，内联 `> req:` 行 1:1 惯例有测试锁） | `grep -c '^> req: DEW-' spec.md` |
| 主题聚类（C3e 后） | 15 个主题组天然聚成 4 个任务问题（见 §2） | 见分组表 |
| 引用网 | 外部引用 **53 处**：catalog 约 10 行、RUN.md 委派表 2 行、3 个其他 spec、governance 1 处、tests 5 处、engine/schema `@impl` 文件 5+ | `grep -rn 'delegated-work-units' …`（排除自身与 archive） |
| catalog 声明 Purpose | "Production delegated work path, work identity, lease, submit transaction, and provenance"——广度是声明过的；本拆分 = 正式修订该声明 | `openspec/specs/README.md` DWU 行 |
| engine 模块缝 | work-unit-envelope/-index/-constants/-current-profile/-role-guidance ‖ -submit*/-validation/-submitted-ledger ‖ dry-submit/-timeout-preflight/-candidate-projection ‖ -lifecycle/-supersession/-submit-late-retry/-submit-declaration-recovery/-transaction* | `ls DEEP_RESEARCH_HARNESS/engine/` |

拆分判据（ADR 0005 + catalog Purpose 语义）：37 块聚成 **4 个互不重叠的任务问题**，且与 engine 模块缝一一对应——这是能力边界修订，不是文本搬家。

---

## 2. 拆分设计：一变四

| | capability 路径 | 任务问题 | 承载 requirement（C3e 主题组） | engine 模块缝 |
|---|---|---|---|---|
| **母体（瘦身）** | `agent/delegated-work-units` | 派发的 work unit 如何被**标识、绑定与 briefing** | 身份格式/kind registry/actor policy、envelope 与 claim profile（1a/1b）、tasks 绝对路径与 beacon（3a/3b）、queue-loop playbook、小件 | work-unit-envelope / -index / -constants / -current-profile / -role-guidance |
| **新 1** | `agent/work-unit-submission` | 完成如何被**权威记录** | submit 唯一完成权威（2a/2b）、canonicalization（4a/4b）、durable postconditions、hashes fail-closed、gates coverage 只读 ledger | work-unit-submit* / -validation / -submitted-ledger |
| **新 2** | `agent/work-unit-preflight` | 提交前如何**无副作用预测** | dry-submit 预检（5a/5b）、timeout-preflight（6a）、candidate projection | dry-submit 逻辑 / work-unit-timeout-preflight / -candidate-projection |
| **新 3** | `agent/work-unit-correction` | 失败与漂移如何被**纠正** | 终态转换 fail-closed、forced timeout 终态化（6b）、replace、late-submit、supersession、recover-declaration/transaction | work-unit-lifecycle / -supersession / -submit-late-retry / -submit-declaration-recovery / -transaction* |

规模预期：母体 ~13 块 / submission ~10 块 / preflight ~6 块 / correction ~8 块（精确计数是 R1a 首个交付物，本表为 C3e 主题组推算）。

---

## 3. 身份迁移机制（ADR 0005 identity migration）

| 机制 | 安排 |
|---|---|
| **requirement ID** | 迁移的 requirement **换发新 ID**：新前缀 WSU（submission）/ WUP（preflight）/ WUC（correction）+ 序号，经 change 的 `requirement-reservation.yaml` 申请，apply 时 reserved→live 同步进 req-registry。旧 DEW 编号行在 registry 标 `[DEPRECATED]` + 后继指针（"migrated to WSU-00X …"），永不复用。母体保留块沿用原 DEW ID（header 中未迁移的 DEW ID 保留）。 |
| **内联 `> req:` 行** | 新 spec 每条 requirement 一条内联新 ID 行（延续 DWU 的 1:1 惯例，测试锁随迁重写：inline 计数按各新家实数）。母体的内联行只留保留块。 |
| **engine `@impl` 标签** | 同 change 逐条换新 ID（旧 ID 仍注册 → `check-code-impl-ids` 不断）；engine 模块文件**零移动**（ADR 0005：taxonomy 是发现结构非目录层级）。 |
| **registry prefixes** | 新增 3 行（WSU/WUP/WUC → 各自 capability path）；DEW 行保留指向瘦身后的母体（不删）。 |
| **catalog** | 3 行新增（Purpose/Keywords/Boundaries）+ DWU 行 Purpose 改写为 assignment & briefing + 四能力 Related entries 互相交叉链接 + 既有引用 DWU 的邻居行（约 10 行 Boundaries/Related）逐条重织。 |
| **RUN.md 等入口文档** | 委派表中的 spec 路径引用按新家改写（R1b 清单内）。 |
| **原子性** | 上述全部在同一 change 落地——禁止"母体已瘦身但新 capability 未存在"的半迁移态（红线）。 |

---

## 4. 副作用清单与消解（S1-S7）

| # | 副作用 | 消解 |
|---|---|---|
| S1 | 引用网重织：53 处引用的语义指向变模糊（母体还是新家？） | R1a 产出 53 处全清单逐条定新家；R1b 验收断言：主 specs 内对旧 capability 路径的外部引用 = 0 |
| S2 | 发现粒度 trade-off：跨生命周期问题从读 1 个 spec 变为跳 4 个 | 母体保留 capability map 导航段（指向 3 子能力的导航指针，非行为）；catalog Keywords/Boundaries 精写使每个问题映射唯一主能力；四能力 Related entries 互相交叉链接 |
| S3 | `@impl` 语义迁移：一个模块可能实现分属不同新能力的 requirement | R1a 产出 `@impl` 全清单；R1b 逐条换新 ID；`check-code-impl-ids` 全程绿 |
| S4 | doc-lock 双文件重写 + 一锁退休：`delegated-queue-spec-text-locks`（timeout-note 测试改读新家文件；inline/body 计数重写）；`dwu-slim-structure-locks`（"15 标题在 MAIN"断言失效→退休，注释指向各新家结构锁） | R1b 同 change 更新；退休锁留后继指针 |
| S5 | registry 导航成本：29 行 `[DEPRECATED]` + 新 ID 的 old→new 考古 | 弃用行描述统一带后继指针；对账表（old→new 全量）随迁移 change 入档 |
| S6 | 首例操作的 checker 未知反应（surface inventory / entry chain 等可能对 DWU 有隐含假设） | `governance:check` 前置先跑，预算一轮首跑诊断；逐个反应按首跑定性 |
| S7 | 迁移与指针化顺序耦合 | 维持先迁移（R1b，整块逐字节）后指针化（R1c 在缩小的真实基线上做）；搬运脚本 + 逐字节回验兜底 |

---

## 5. 迁移步骤（三步，R1b 原子）

**R1a 测绘**（工具产出 + 人审定稿）：
- [ ] 37 块逐一判定新家（母体/submission/preflight/correction），产出映射表（块标题 → 新家 → 新 ID）
- [ ] 新前缀 WSU/WUP/WUC 可用性确认（req-registry prefixes 全查 + `check-project-reqs` 预检）
- [ ] 53 处引用清单逐条定新家与改写方式
- [ ] `@impl DEW-*` 清单（engine + schema）
- [ ] doc-lock 清单（`list-doc-locks` 于 DWU spec + 相关测试）

**R1b 迁移 change（原子）**：
- [ ] 3 个新 capability spec（迁移块逐字节搬入 + 新 header/新内联 ID/各自 Purpose）
- [ ] DWU 瘦身（母体保留块 + capability map 导航段 + Purpose 改写）
- [ ] registry：迁移 DEW 行 `[DEPRECATED]`+后继指针、新 ID 注册、prefixes +3 行
- [ ] catalog：3 新行 + DWU 行改写 + 邻居行重织
- [ ] engine `@impl` 逐条换新 ID
- [ ] doc-lock 更新（S4 清单）
- [ ] 全量 `npm test` + `governance:check` + finalizer 19 项

**R1c 迁移后指针化**：
- [ ] 在四个新家的真实基线上做复述段指针化（原 R1 指针化目标顺延至此）
- [ ] before/after 度量随提交（四文件行数、最大块行数）

**验收断言**：
- [ ] 主 specs 内对旧 capability 路径的外部引用 = 0
- [ ] 四个 spec 的导航注释符号全部有真实 export；`check-code-impl-ids` 绿
- [ ] 全量 npm test 0 fail；governance:check 0 FAIL；finalizer 19/19
- [ ] 迁移块逐字节守恒（搬家不改字）

---

## 6. 待复核决策点

1. **ID 策略**：本文采用"迁移换新 ID + 旧 ID 弃用留档"（选项 B）。备选：header 子集承担、新块无内联 ID（更便宜，但 1:1 惯例永久弱化）。
2. **四个能力的边界**：§2 的母体/submission/preflight/correction 四分法是否认可？候选调整：timeout 终态化归 preflight 还是 correction（本文归 correction——它是"执行"不是"预测"）。
3. **catalog Purpose 改写措辞**：DWU 新 Purpose 草案 "Production delegated-work assignment surface: work-unit identity, envelope binding, claim profile, task projection, and actor policy."
4. **supersession 块（137 行）归属**：本文归 correction（纠正语义）。若复核认为它属 submission 的"反向操作"，可调。

## 7. 与其他 >800 行 spec 的关系

>800 行候选队列（各需独立研究后决定是否值得独立 capability 拆分设计）：research-wave-gate-implementation 1380、research-wave-phase-content 1165、agentic-queue 1059、research-return-map 989、research/canonical-topic-state 903、engine/gate-skeleton 899、bundle/reference-flat-format 853、research/content-delivery-phase-content 843。逐一研究产出独立 MD（同本文件格式），值得者留、不值得者记录理由。DWU 是第一个完成的样板。
