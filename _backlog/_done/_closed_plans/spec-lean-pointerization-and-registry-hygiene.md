# Plan: spec-lean-pointerization-and-registry-hygiene

> 创建: 2026-09-01 | 状态: **已关闭（CLS-086，2026-09-04：C1–C5 全落地，四个 change 归档，finalizer 均 19/19）**
> 状态同步: 2026-09-03——主线批次 R0–R5 均未启动；期间仓库完成 BUG-248..253 修复与 CLS-085 回归套件提速（每批全量 npm test 成本下降）。两处顺路变化：15 死前缀注记已存在（R3 第一项过时，见 §3）；§-guard 基线在本 plan 定稿前已落地（4a18e9fdf），R4 仅剩扩展项。事实基线数字更新见 §1 各同步注。**2026-09-03 REVIEW 完成**（四份 plan 复核通过，3 处数字修正，判定书 `_backlog/_scratch/handoff-spec-lean-plan-review-verdict.md`）；§8 已重构为 change 视角 tracking（少量 change、统一管线）。
> 来源: 用户指示"再打扫一遍：spec 是否啰嗦、是否与代码/Prompt 对齐、registry `[DEPRECATED]` 能清多少清多少"。
> 承接: CLS-084（`spec-drift-audit-remediation-and-requirement-slimming`，2026-09-01 关闭——修好了 requirement 粒度，本轮做**减量、堵盲区、清账本**）。
> 复核说明: 本文件自包含。§1 每条事实附【复现】命令；§3 每批附判定规则与边界；§2.0/§2.3 为分割触点与红线；§8 为主线进度 checkitems。

---

## 0. 给复核 Agent 的 REVIEW 指南

1. §1 每条事实都有【复现】——在仓库根逐条运行，数字应一致（行数可能 ±2，因为后续批次的空行规整；趋势与量级必须一致）。
2. 本轮核心手法是指针化（pointerization）。**复核重点**是 §2.1 的判定规则：它是否会误伤 normative SHALL？边界是否清晰？如果复核者认为某条规则会把真规范误判为复述，请在 §3 对应批次批注否决。
3. 红线（§2.3）是硬约束：任何批次不得违反；违反即该批 delta 无效。
4. 批次排序理由在 §3 开头，依据是 CLS-084 复盘（`_backlog/_scratch/retro-slimming-plan-pacing-and-tooling.md`）：上轮"先易后难"导致雨点小，本轮按价值×不可替代性降序。

---

## 1. 事实基线（2026-09-01 实测，每条带复现）

### F1. Registry 账本规模

- 注册 ID 总数 **681**（2026-09-03 实测 **694**——BUG-248..253 各 change 追加），`[DEPRECATED]` **61 条**（09-03 复测未变），0 orphan。政策为"只增不删、废弃追加 `[DEPRECATED]`、ID 永不复用"。
- 【复现】`grep -cE '^[A-Z]{3}-[0-9]{3}:' openspec/governance/req-registry.yaml` 与 `grep -cE '\[DEPRECATED\]' openspec/governance/req-registry.yaml`；orphan 由 `node openspec/governance/check-project-reqs.mjs` 报告。

### F2. prefixes 映射含 15 个死前缀

`BUS/FOR/GAC/LFW/RPG/SEG/SRD/SUC/SUR/SUS/WDM/WMD/WFS/WLO/WML` 指向的 capability 目录均已不存在（pre-ADR-0005 时代遗留家族：bundle-start-from-here、fork-repair-converge、gate-content-dedup、lifecycle-walker、relay-provenance-gate、seg2node、subagent-relay-driver、subagent-collect、subagent-repair、subagent-slots、workflow-dynamic-md-load、workflow-md-dependencies、workflow-fsm-definition、workflow-chain-observability、workflow-manifest-loading）。
- 【复现】用 §1.1 末尾的内联 node 脚本（existsSync 检查 `openspec/specs/<capability>`），或 `grep -E '  [A-Z]{3}: ' openspec/governance/req-registry.yaml` 后对每条 `openspec/specs/<path>` 做 existsSync。
- 备注: 对应的 DEPRECATED ID 主要集中在 relay-provenance-gate ×13、gate-content-dedup ×9、subagent-relay-driver ×4、lifecycle-walker ×3、bundle-start-from-here ×3。
- **同步注（2026-09-03）**：15 个死前缀现已**全部**带行内注记 `# all entries deprecated; no spec directory`（部分另带 replacement 指针，如 SRD → FRE/DEW），且在 plan 定稿 commit 时即已存在——R3 第一项的目标形态已达成（见 §3 R3 更新），仅剩注记事实准确性核对。

### F3. 退役家族在活表面的"回声"极小

对 15 个退役家族名 + START_FROM_HERE 在 `openspec/specs`、`DEEP_RESEARCH_HARNESS`、`tests`、`docs`（排除 `changes/archive`）做 grep：gate-content-dedup / relay-provenance-gate / lifecycle-walker / seg2node / fork-repair-converge / workflow-* **零回声**；START_FROM_HERE 19 个文件提及但绝大多数是"historical debris 即使并存也无效"式**刻意否定**（如 `DEEP_RESEARCH_HARNESS/README.md` 的 non-authoritative debris 句）；subagent-relay-driver 仅 1 处，位于 `tests/integration/cli/validate-work-unit-hygiene.test.mjs`，是**负向锁**（断言退役 authority 不得回归）——应保留。
- 【复现】`for name in <家族名列表>; do grep -rl "$name" openspec/specs DEEP_RESEARCH_HARNESS tests docs; done`（排除 archive）。

### F4. 巨无霸 requirement 尚未清零（C3 只扫了六大 spec）

当前全库 requirement 块行数 Top（【复现】对每个 spec.md 运行 `awk '/^### Requirement:/{...}'` 计块长，命令见 CLS-084 plan §1.4 同款）：

| spec | 块长 | requirement 首行 |
|---|---|---|
| research/post-final-recovery | **357** | "Post-final recovery SHALL expose one direct eligibility…"（27 场景） |
| research/content-delivery-phase-content | 257 | — |
| engine/cli-phase-transition | 240 | — |
| research/research-wave-phase-content | 234 | — |
| workflow/workflow-directory-contract | 196 | — |
| research/seed-topic-materialization | 195 | — |
| agent/hitl-ux | 194 | — |
| governance/semantic-fact-closure | 192 | — |

仓库常态：中位 26 行、p90 100 行（CLS-084 实测 657 条 requirement）。

> **深挖更新（同日）**：按用户指示对 F4 逐块深挖后，≥190 行块实测为 **10 块**（原表漏计 hitl-ux 195 与 artifact-persistence-recovery 190），且各块散文/场景结构、主题分界、逐块处置（分割 ×N / 清理候选）已逐一设计完毕——完整处置表与执行约束见参照资料 [`spec-lean-f4-megablock-deepdive.md`](spec-lean-f4-megablock-deepdive.md)，并已并入 §3 R2 批次设计。
> **再修正（2026-09-03）**：全库 ≥190 行块实测为 **11 块**——初版扫描还漏计 workflow/rerun-incremental-node 191 行块（该文件 2026-08-29 后未动，属漏计非新增），分割 ×2 初稿已补入深挖 §11，R2 清单同步。

### F5. 整 spec 体量：DWU 是第二名 1.7 倍，且含复述段

- `agent/delegated-work-units/spec.md` **2448 行**（2026-09-03 实测；plan 时点 2360；第二名 research-wave-gate-implementation 现 1426）。粒度已修（39 块、最大 137），但含"generated task / task.md / spawn / Generated guidance / Generated actor guidance / Generated work-unit task"类**复述 prompt 职责的散文**——【复现】`grep -c 'generated task\|task\.md\|spawn\|Generated guidance\|Generated actor\|Generated work-unit task' openspec/specs/agent/delegated-work-units/spec.md` ≈ 30 行命中（plan 时点；2026-09-03 实测 **36**——BUG-252/253 的 DEW-030 又增 generated-task 契约散文，R1c 指针化候选随之变多）。
- 全库 main specs 总行数 30621（C3 前 30830）——C3 是重组不是减量，减量靠本轮。

### F6. 对齐现状

- 机检绿：check-spec-enum-restatements / check-spec-req-ids / check-project-reqs / check-capability-taxonomy / check-capability-discovery 全 PASS。
- 新 guard `check-spec-section-references.mjs`（CLS-084 C4 产物）：83 main specs 的 `<file>.md §X.Y` 坐标引用 0 violations。
- 引擎导航注释幽灵符号：104 个 engine .mjs 文件 0 个（C1 的单文件检查未泛化）。
- **guard 盲区**：(a) phase 节点/playbook **内部** `§X.Y` 自引用与 prompt→spec 反向引用无 checker；(b) 裸段名引用（C2 的 "Rerun-Aware Behavior" 类）无法正则化，只能人审。
- Prompt 自引用健康样本：`phase-seed-topics.md` 的 §3.3/§6/§7 目标均真实存在。

---

## 2. 思路总纲

本轮主题一句话：**上一轮修"粒度"，这一轮做"减量（指针化）+ 堵盲区（guard 扩展）+ 清账本（registry 卫生）"。**

### 2.0 分割的分层与 openspec 触点（复核重点）

**分层决策（用户 2026-09-01 拍板）：DWU 做 capability 级拆分**——requirement 级重组不改变 OpenSpec 的治理单元（发现/变更/评审都以 capability 为单位），对 2360 行的 DWU 而言只是文本重组。故 R1 改为 **capability 身份迁移**（详见 §3.5 设计）：`agent/delegated-work-units` 瘦身为 assignment & briefing 母体，新设 3 个 capability 承载 submission / preflight / correction。

触碰 `openspec/` 的完整清单（迁移批）：

| 动作 | 文件/检查 |
|---|---|
| 建 | 3 个新 capability：`openspec/specs/agent/{work-unit-submission,work-unit-preflight,work-unit-correction}/spec.md` + 各自 change delta + requirement-reservation（新前缀 WSU/WUP/WUC + 新 ID） |
| 改 | `openspec/specs/agent/delegated-work-units/spec.md`（瘦身为 assignment & briefing，迁移块整块搬出）+ engine 代码 `@impl DEW-xxx` → 新 ID + registry（迁移 DEW 行加 `[DEPRECATED]`、新 ID 注册——符合"只增不删"）+ `openspec/specs/README.md` catalog（3 新行 + DWU Purpose 改写 + Related entries 重织） |
| 过 | check-project-specs / check-project-reqs（reservation→live 转换）/ taxonomy / discovery / semantic-closure / verification-routing / finalizer 19 项 / 全量 npm test |
| 不碰 | engine 模块文件位置（ADR 0005：taxonomy 非代码目录层级）、已归档 change 历史文本、非迁移能力的 spec |

其余 spec 的 requirement 级拆分/指针化维持（capability 单一聚焦、块为吸积的场景，见 F4 深挖）。

**requirement ID 策略（迁移批专用）**：迁移 requirement 换发新 ID（旧 DEW 编号 `[DEPRECATED]` 留档，永不复用）；母体保留块沿用原 DEW ID；engine `@impl` 同 change 换新 ID（旧 ID 仍注册，`check-code-impl-ids` 不断）。

每批触碰 `openspec/` 的完整清单：

| 动作 | 文件/检查 |
|---|---|
| 改 | `openspec/specs/<domain>/<capability>/spec.md`（主 spec 整块替换，唯一行为权威） |
| 建 | `openspec/changes/<change>/` 全套：proposal（Capability Discovery 表，纯 token）+ design + tasks（双 marker、无自引用任务）+ semantic-closure.yaml + verification-plan.yaml + specs/ delta + requirement-reservation.yaml（仅选项 B 时） |
| 过 | check-project-specs（delta 头禁入主 spec）/ check-project-reqs / taxonomy / discovery / semantic-closure / verification-routing / finalizer 19 项 |
| 不碰 | specs/README.md catalog（capability 集合不变）、prefixes 映射、既有 ID |

**requirement ID 策略（决策点，待复核确认）**：

- 仓库规则：requirement 标题是稳定语义锚点（无 ID 无编号）；ID 存于 header `> req:`、内联 `> req:` 行、registry。
- **事实**：`agent/delegated-work-units` 有特有惯例——每条 requirement 恰一条内联 `> req: DEW-xxx`，且有测试锁死 1:1（`delegated-queue-spec-text-locks` inline===29）。C3e 拆分后标题 37 个、内联行仍 29 → **8 个新标题无内联 ID**，计数测试通过但 1:1 语义不变量被稀释。
- **选项 A**：header 子集语义承担（checker 全绿），新块无内联 ID。便宜；DWU 惯例被弱化。= RRM/CTS/RWG/AGQ 的既有做法（这些 spec 无内联惯例）。
- **选项 B（推荐用于 DWU）**：为拆分出的无 ID 新块注册新 ID（DEW-030+）：change 根放 `requirement-reservation.yaml` → apply 时 reserved→live 同步 req-registry（"只增不删"允许增）→ 每新块一条内联 `> req: DEW-0xx` → 恢复 1:1，更新 inline 计数锁 29→37。成本：真碰 req-registry 的 ID 区 + 一项锁更新。
- 复核问题：DWU 走 A 还是 B？（其余 spec 用 A 无争议。）

### 2.1 指针化判定规则（复核重点）

一个段落被判为"复述"并指针化，当且仅当同时满足：

1. **过程性复述**：内容是对某 owner surface（phase 节点 / playbook / template / CLI 用法）已拥有细节的**重复陈述**——判定测试："若 owner 那边改了一个步骤，本段是否必须跟着改？"是 → 复述。
2. **owner 存在且更权威**：被指向的文件存在、且是该细节的 accepted owner（ Capability Catalog 或既有 pointer 先例可证）。
3. **不损失可测试性**：被指走的段落不得是本 spec 场景（`#### Scenario:`）所依赖的唯一 normative 陈述；场景依赖的规则原文保留，仅复述性展开改指针。

指针句形态沿用仓库既有先例（`workflows/nodes/shared/shared-return-map-authoring.md` 的 Compatibility Pointer、CLS-082-C3 的 RWP 指针化改写）：`Authoring/procedural details: see <owner path>（owner）`。

### 2.2 指针化边界（不指针化什么）

- `#### Scenario:` 块：永不指针化（它们是可测试契约本体）。
- 无 owner 的 normative 陈述：保留原文，登记为"缺 owner"待后续立项。
- 场景引用的关键句（doc-lock 测试锚定的句子）：保留并在同 change 更新锁。

### 2.3 红线

- 不删任何注册 ID；"只增不删"政策保持（R1 迁移 DEW 行加 `[DEPRECATED]` 留档 + 新前缀/新 ID 注册，均为追加操作）。
- 迁移块整块逐字节搬移；指针化批以"normative 语义等价 + 复述段删除"为准，逐段在 tasks 留 diff 证据。
- 身份迁移原子执行：DWU 瘦身、新 capability、registry、catalog 必须同一 change 落地，不得出现半迁移状态。
- 每批全量 `npm test` + `governance:check` 绿才算完成；文本锁失配同 change 更新并注明（CLS-084 先例：AGQ 28→30、DEW 29→37 计数锁、residual DEW pair 退休）。

---

## 3. 批次设计（R 系列；排序 = 价值×不可替代性降序，依据 §0.4 复盘）

### R0（工具先行，无行为面）

**内容**：(a) 复述候选扫描器——在目标 spec 中按 §2.1 规则 1 输出候选段落行号表（人审定稿后才成为 delta 输入，工具不自动改写）；(b) 把 CLS-084 五份装配脚本泛化为"spec + 分组 YAML → delta + 守恒校验"的通用工具。
**清理思路**：扫描器只做"候选定位"，判定权在人——这是对"误伤 normative"风险的结构性防御。
**验收**：扫描器对 DWU 的候选表与 §1.2 的 ~30 行命中锚点交叉一致；通用工具在 R1 首用即零返工。

### R1（主力）——DWU capability 身份迁移（设计已独立成文）

**完整设计见独立文件 [`spec-lean-capability-split-dwu.md`](spec-lean-capability-split-dwu.md)**（自包含：事实基线、一变四拆分设计、身份迁移机制、副作用 S1-S7 与消解、R1a/R1b/R1c 三步、验收断言、待复核决策点 4 项）。本节仅留摘要：

- **一变四**：母体 `agent/delegated-work-units` 瘦身为 assignment & briefing；新设 `agent/work-unit-submission` / `agent/work-unit-preflight` / `agent/work-unit-correction`。
- **身份迁移**：迁移 requirement 换发新 ID（WSU/WUP/WUC，reservation 申请），旧 DEW 行 `[DEPRECATED]`+后继指针；engine `@impl` 同 change 换新 ID（模块零移动）；catalog 3 新行 + DWU Purpose 改写。
- **原子性红线**：母体瘦身、3 新 spec、registry、catalog 同一 change 落地，禁止半迁移态。
- **执行序**：R1a 测绘（37 块新家判定 + 新 ID 分配表 + 53 处引用清单）→ R1b 迁移 change（原子）→ R1c 迁移后指针化。
- **首例声明**：全库无 capability 级拆分先例；proposal 须显式声明 DWU catalog Purpose 被修订（submit transaction 职责迁出）。

### R1 附：副作用清单与消解（2026-09-01 深化）

引用网实测：`delegated-work-units` 身份的外部引用 **53 处**，分布于 catalog（约 10 行 Related/Boundaries）、`RUN.md` 委派表（2 行 spec 路径）、3 个其他 spec 的 capability 引用、governance 1 处、tests 5 处、engine/schema `@impl` 文件 5+ 个。逐项副作用与消解：

| # | 副作用 | 消解 |
|---|---|---|
| S1 | **引用网重织**：53 处引用中 `capability:agent/delegated-work-units` 形态的语义指向变模糊（指向母体还是新家？） | R1a 产出 53 处全清单、逐条定新家；R1b 全量重织；R1b 验收断言加一条：主 specs 内对旧路径的外部 capability 引用 = 0 |
| S2 | **发现粒度 trade-off**：跨生命周期问题（"work unit 如何完成"）从读 1 个 spec 变为跳 4 个 | 母体保留一段 capability map 导航（指向 3 子能力的导航指针，非行为）；catalog 的 Keywords/Boundaries 精写使每个问题映射到唯一主能力；四能力 Related entries 互相交叉链接 |
| S3 | **`@impl` 语义迁移**：一个 engine 模块可能实现分属不同新能力的 requirement（如 work-unit-lifecycle 同时涉 preflight 与 correction） | R1a 产出 `@impl` 全清单（抽样已见 schema/contracts ×3 + engine ×2+）；R1b 逐条改新 ID；`check-code-impl-ids` 全程绿（旧 ID 仍注册） |
| S4 | **doc-lock 双文件重写 + 一锁退休**：`delegated-queue-spec-text-locks` 的 timeout-note 测试按标题在 dew 文件内搜索——迁走后须改读新文件；inline/body 计数全重写；`dwu-slim-structure-locks` 的"15 标题在 MAIN"断言失效 | R1b 同 change：前者改读新家文件路径，后者文件内注释退休并指向各新家结构锁；residual DEW pair 已于 C3e 退休 ✓ |
| S5 | **registry 导航成本**：29 行 `[DEPRECATED]` + ~29 新 ID，old→new 考古需要映射 | 弃用行描述统一带后继指针（"migrated to WUP-00X (agent/work-unit-preflight)"）；R3 对账表收录全量 old→new |
| S6 | **首例操作的 checker 未知反应**：19 项 finalizer 检查可能对 DWU 有隐含假设（surface inventory / entry chain 等） | `governance:check` 在送 finalizer 前先跑（预算一轮首跑诊断）；每个反应按首跑对待，逐个定性 |
| S7 | **迁移与指针化的顺序耦合**：先迁移后指针化 = R1b 载荷大（整块搬移）但校验简单；先指针化 = 载荷小但改写落在即将搬走的文件里（白费 diff） | 维持先迁移后指针化（R1b→R1c）；搬运以脚本 + 逐字节回验兜底，R1c 在缩小的真实基线上做 |

**半迁移态禁止**已列入 §2.3 红线：DWU 瘦身、3 新 spec、registry、catalog 必须同一 change 落地。

### R2（3-4 change，可合并）——pointerization 第二波 + 长尾扫尾（设计已深挖定稿；不含 DWU——DWU 走 R1 capability 迁移）



逐块处置设计已定稿于参照资料 [`spec-lean-f4-megablock-deepdive.md`](spec-lean-f4-megablock-deepdive.md)：**10 块 → 分割为 25 个子块**（post-final-recovery ×4、content-delivery-phase-content ×3、cli-phase-transition ×3、research-wave-phase-content ×3、semantic-fact-closure ×3、workflow-directory-contract ×2、seed-topic-materialization ×2、hitl-ux ×2、runtime-reentry-debuggability ×2、artifact-persistence-recovery ×2），全部 ≤ ~170 行；含 1 处清理候选（HITL2 确认语义疑似重复，需逐字比对后定夺）与 1 处指针化候选（post-final-recovery CLI 复述段 → `command_playbook/post-final-recovery.md`）。2026-09-03 补记：另有 workflow/rerun-incremental-node 191 行块 ×2（处置初稿见深挖 §11）——合计 **11 块 → 27 子块**。
**清理思路**：同 R1；其中 phase-content 系的 owner 就是各 phase 节点（指针目标天然存在）。

### R3（1 change）——registry 卫生（用户点名项）

- 15 死前缀注记：**✅ 已达成（2026-09-03 核实；先于本 plan 定稿即存在）**——15 个前缀全部带行内注记 `# all entries deprecated; no spec directory`（部分带 replacement 指针）。剩余动作降级为：核对注记事实准确性（replacement 指针是否成立），不再需要立项级改动；check-project-reqs 现状全绿。
- **REVIEW（2026-09-03，见 `_backlog/_scratch/handoff-spec-lean-plan-review-verdict.md`）**：retired ID 行实测 **59**——`grep -c '\[DEPRECATED\]'` 的 61 含 registry 头部 L4/L18 两条注释行（check-project-reqs 报 "59 retired" 佐证）。逐条核对范围以 **59** 为准。另：15 死前缀的 replacement 指针目标（WPG/FRE/DEW/AGQ/AGO/REL/SDC/SRL）已实测全部存在于 prefixes 区，注记事实核对完成。
- 61 条 DEPRECATED 描述逐条核对：仅修正**事实性错误**（旧路径名、已更名家族的拼写），描述改为可读史实（如 "content no longer exists in any accepted surface (archaeology <date>)" 的既有风格）；不改 ID、不复活、不删行。
- 产出对账表：退役家族 × 活表面回声 = 0/刻意否定/负向锁（F3 数据入档）。

### R4（1 change）——guard 扩展（防复发闭环）

> 基线状态（2026-09-03）：`check-spec-section-references.mjs` 本体已在 plan 定稿前落地（4a18e9fdf）；以下均为纯扩展项。

- `check-spec-section-references.mjs` 增规则：phase 节点/playbook **内部** `§X.Y` 自引用可解析（phase-seed-topics 样本健康，扩展后全库首扫定标）。
- 引擎导航注释幽灵符号检查泛化为 governance checker（当前只有 C1 的单文件测试 `rrm-spec-truth-sync-text-locks` 覆盖 return-map.mjs；104 文件全量 0 幽灵应成为机器断言）。
- 两者经 check-all 自动发现接入（无需改 check-all.mjs，`check-*.mjs` 命名即接入——CLS-084 C4 已验证）。

### R5（1 change）——housekeeping 合并批

本轮各批产生的纯文本小修 + mild 项（M1 `migrate_legacy` 显式化、M4 `journal_disposition` 并集措辞、M5 DEW L1102 场景标题注记）若前批未顺手处理，合并于此；避免"每条小修占一条管线"（上轮教训 2）。

### >800 行 spec 的 capability 拆分候选队列（逐一研究，值得者各得独立 MD）

> 范围更新（用户指示"别贪心"）：capability 拆分研究收窄至 **>1000 行**；研究已完成，三份结论合一见 [`spec-lean-capability-study-1000plus.md`](spec-lean-capability-study-1000plus.md)——**三个均不拆**（体量 = 并行实例固有广度 + 巨无霸已在 C3 清零），各自登记重开触发条件。800–1000 行组不入 capability 拆分研究。

| spec | 行数 | 状态 |
|---|---|---|
| agent/delegated-work-units | 2360 | ✅ 设计定稿 → [`spec-lean-capability-split-dwu.md`](spec-lean-capability-split-dwu.md)（R1 执行） |
| research/research-wave-gate-implementation | 1380 | ✅ 研究完成 → 不拆（同模式三实例；触发条件已登记） |
| research/research-wave-phase-content | 1165 | ✅ 研究完成 → 不拆（共同契约权威；234 行块归 R2 按 F4 深挖执行） |
| agent/agentic-queue | 1059 | ✅ 研究完成 → 不拆（一台 queue 机器的完整生命周期；触发条件已登记） |
| research/research-return-map | 989 | 不入 capability 拆分研究（≤1000；C3a 已拆巨无霸） |
| research/canonical-topic-state | 903 | 不入（C3b 已拆巨无霸） |
| engine/gate-skeleton | 899 | 不入（≤1000；最大块随 R2 长尾政策观察） |
| bundle/reference-flat-format | 853 | 不入 |
| research/content-delivery-phase-content | 843 | 不入 capability 拆分研究；其 257 行块 3-way 分割已定稿（R2 执行） |

研究产出格式同 DWU 样板：事实基线（体量/引用网/catalog 声明 Purpose/engine 模块缝）→ 拆或不拆的判定与理由 → 拆则一变 N 设计 + 迁移机制 + 副作用消解；不值得者记录理由（如"capability 单一聚焦，吸积已由 C3 处理"）。研究节奏：一个一个来，每份经用户复核后再定执行。

---

## 4. 全局验收度量（随每批提交落地 before/after）

- [ ] 全库无 requirement 块 > 160 行（含 post-final-recovery 357 与 R2 长尾全部）。**⚠️ 待拍板（2026-09-03 实测）**：全库 ≥160 行块共 **21 块**——11 块 ≥190 在 R2 清单内；160–190 区间另有 10 块不在任何批次清单（reference-flat-format 187 / agent-command-surface 187 / subagent-node-contract 182 / CPT-004 179 / RWP 177 / version-management 174 / CDP-Final 173 / change-feedback-loop 171 / HITL1 163 / wave1-intake 161）。二选一：扩 R2 长尾覆盖全量 ≥160，或本条验收口径改为 ≥190。
  > **REVIEW 建议（2026-09-03）**：验收口径改 **≥190**（R2 清单 = 验收对象，可判定）；160–190 的 10 块登记为观察名单，任一吸积破 190 即入下一轮长尾批。扩 R2 长尾会把 R2 从 3-4 change 膨胀到 ~7+，违反 CLS-084 复盘的 pacing 教训。**✅ 已拍板（2026-09-03）：采用 ≥190 + 观察名单。**
- [ ] `agent/delegated-work-units` 总行数 before/after 随 R1 提交报告（基线 2360；目标量级以 R0 扫描器实测为准）。
- [ ] registry：15 死前缀全部注记/迁出；61 条 DEPRECATED 核对对账表入档；活跃 ID 与政策零变化；`check-project-reqs` 全程绿。
- [ ] §-guard 覆盖 prompt 自引用；引擎幽灵符号泛化 checker 接入 check-all；全库首扫定标。
- [ ] 每批 `npm test` + `governance:check` 全绿；批批带 before/after 度量。

## 5. 风险

| 风险 | 缓解 |
|---|---|
| 指针化误伤 normative SHALL | §2.1 三条件判定 + R0 只出候选人审定稿 + 场景块永不指针化 |
| 文本锁大面积红 | 每批 `list-doc-locks` 先行；计数锁/verbatim pair 失配同 change 更新并注明（CLS-084 三次先例） |
| registry 注记被 checker 误判 | 以 `check-project-reqs` 全绿为门槛择方案；不改活跃键值结构 |
| 重蹈"雨点小" | R0 先行 + R1 主力首批 + R5 合并小修 + 每批度量随提交 |
| 指针化后 doc-lock 断言失配 | 锁与文本同 change 更新（tests/README 规则）；失配即定性再动手 |

## 6. 非目标

- 不删任何注册 ID、不改"只增不删"政策（迁移 = 旧行 `[DEPRECATED]` + 新行注册，均为追加）、不改已归档 change 历史文本。
- 不做裸段名引用的正则化（自然语言对齐留人审）。
- capability 拆分**仅限 DWU 一处**（用户拍板）；其余九条 ≥190 行块维持 requirement 级处置（capability 单一聚焦、块为吸积）； capability 级复议不再扩大。
- engine 模块文件不做目录移动（taxonomy 是发现结构，不是代码目录层级——ADR 0005）。
- 本 plan 事实与思路已定稿；**执行（R0 起）待用户明确指令**。

## 7. 与历史工作的关系

- CLS-084（前一轮）：修粒度（7→15 等）、清已知漂移、建立 §-guard 基线——本轮在其上做减量与扩面。
- CLS-082 C3（RWP 指针化）：本轮指针化的方法先例。
- CLS-084 复盘（`_backlog/_scratch/retro-slimming-plan-pacing-and-tooling.md`）：本轮排序与工具化策略的直接依据。

---

## 8. 主线进度（change 视角 tracking；2026-09-03 REVIEW 后重构）

> 重构原则：少量 change（4 必做 + 1 条件）、每 change 独立命名与 checkitem、统一走 polish 管线；R0–R5 批次作为 scope 映射保留，不再单独作为跟踪单位。

**统一落地管线（每个 change 一致）**：
`/opsx:propose` → `/polish-openspec-change`（≥2 passes；`openspec validate --strict` + `git diff --check` + `governance:check` 全绿 → ready for apply）→ `/opsx:apply` → 全量 `npm test` + `governance:check` → `/opsx:archive` + `node openspec/governance/finalize-change-archive.mjs --change <name>` → git 单提交 + before/after 度量随提交。

**启动前决策门（2026-09-03）**：

| # | 决策 | 状态 |
|---|---|---|
| G1 | §4 验收口径：**160 vs 190** —— REVIEW 建议 ≥190 + 160–190 十块观察名单 | ✅ 2026-09-03 用户拍板：**≥190 + 观察名单** |
| G2 | R1c 指针化**并入 C2**（迁移任务全绿后进入尾段任务，推荐）vs 独立 change（DWU plan T3 原设计） | ✅ 2026-09-03 用户拍板：**并入 C2 尾段** |
| G3 | DWU §6 四决策点（ID 策略 / 四分法 / Purpose 措辞 / supersession 归属） | ✅ REVIEW 2026-09-03 建议全部通过（判定书 §1） |

**Change 总表（执行序 = 依赖序）**：

| change 名 | scope | 内容一句话 | 前置 |
|---|---|---|---|
| C1 `spec-lean-restatement-tooling` | R0 | 复述候选扫描器 + 通用装配工具（无 spec delta） | 无 |
| C2 `dwu-capability-identity-split` | R1 | DWU 一变四原子迁移 + 尾段指针化（G2 已拍板并入） | C1；G3 ✅ |
| C3 `megablock-requirement-split` | R2 | 11 块 → 27 子块机械拆分 + 守恒断言 | C1；G1 |
| C4 `registry-hygiene-and-guard-extensions` | R3+R4 | 59 条 DEPRECATED 核对 + old→new 对账表 + guard 两扩展 | C2（对账表含迁移映射） |
| C5 `spec-lean-housekeeping` | R5 | 小修合并（**条件性**：仅当 C1–C4 有未顺手处理的遗留才立项；否则记录"无遗留"） | C4 |

### C1 `spec-lean-restatement-tooling`（R0 工具先行；无行为面）

- [x] 1.1 复述候选扫描器：按 §2.1 规则 1 输出候选段落行号表（只出候选、人审定稿，不自动改写）✅ 2026-09-04 落地（`openspec/governance/scan-restatement-candidates.mjs` + 共享解析器 `spec-unit-parse.mjs`）
- [x] 1.2 通用装配工具：spec + 分组 YAML → delta + 内容守恒校验（深挖执行注记 2 的多重集合守恒内置）✅ 2026-09-04 落地（`openspec/governance/assemble-spec-delta.mjs`，三重断言：declared==actual / 覆盖完备 / 多重集合守恒）
- [x] 1.3 验收：DWU 候选表与 §1.5 生成类散文锚点（36 命中）交叉一致（实测 13/13 散文域命中全覆盖 + 23 处场景命中按 §2.2 刻意排除，见 calibration-dwu.md）；工具已随 change `2026-09-04-spec-lean-restatement-tooling` 归档（finalizer 19/19）

### C2 `dwu-capability-identity-split`（R1 主力；设计 = `spec-lean-capability-split-dwu.md`）

- [x] 2.1 R1a 测绘（propose 阶段交付：39 块新家判定/ + WSU/WUP/WUC ID 分配表 + 引用清单 + `@impl` 清单 + doc-lock 清单；DEW-030 归属按 REVIEW 证据定案）
- [x] 2.2 R1b 原子迁移（3 新 capability spec + 母体瘦身 + registry `[DEPRECATED]`/新 ID + catalog 3 新行与 Purpose 改写 + `@impl`/doc-lock 对齐；禁止半迁移态）
- [x] 2.3 R1c 迁移后指针化（G2 已拍板并入：迁移任务全绿后进入）—— 审毕零转换，见 calibration-r1c.md
- [x] 2.4 before/after 度量随提交（基线 2448 → 母体 963 + 三新家 8+6+9 块；change 2026-09-04-dwu-capability-identity-split 归档，finalizer 19/19）

### C3 `megablock-requirement-split`（R2；设计 = `spec-lean-f4-megablock-deepdive.md` 处置表）

- [x] 3.1 post-final-recovery 357 块 ×6(×4 因 J3 粒度超限扩拆)
- [x] 3.2 content-delivery-phase-content 257 块 ×3(含场景-only lead)
- [x] 3.3 cli-phase-transition 239 块 ×3
- [x] 3.4 research-wave-phase-content 234 块 ×3 + 复述甄别零指针化(记录)
- [x] 3.5 semantic-fact-closure 192 块 ×3
- [x] 3.6 workflow-directory-contract 196 块 ×2
- [x] 3.7 seed-topic-materialization 195 块 ×2
- [x] 3.8 runtime-reentry-debuggability 191 块 ×2
- [x] 3.9 artifact-persistence-recovery 189 块 ×2
- [x] 3.10 rerun-incremental-node 190 块 ×2(K1/K2 冻结分组活体验证)（深挖 §11 REVIEW 通过；K1/K2 标题措辞带出跨块依赖）
- [x] 3.11 验收:全库无块 >190(megablock-split.test.mjs 断言)（G1 已拍板）：**全库无块 >190**（R2 清单即验收对象）+ 160–190 十块观察名单登记于 §4
- [ ] 备选：若单 change 评审过载，按域拆 2（research 系 / 其余）——默认单 change

### C4 `registry-hygiene-and-guard-extensions`（R3+R4 合并；均无行为面）

- [x] 4.1 76 条 retired 行(live 前缀)描述核对——2026-09-04 预研定案 0 事实性错误需修(15 死前缀注记/替换指针已核)
- [x] 4.2 old→new 对账表入档(ledger-accounting.md,含 C2 迁移映射 + 15 死前缀回声)
- [x] 4.3 `check-spec-section-references.mjs` 扩展:workflows 树内裸 §X.Y 自引用 + 跨文件 .md §X.Y 解析(首扫修复 phase-hitl2 一处悬空引用,0 violations)
- [x] 4.4 引擎导航注释幽灵符号 checker(`check-engine-nav-symbols.mjs`)泛化:19 导航注释 0 幽灵(清理 8 文件过时注释),接入 check-all

### C5 `spec-lean-housekeeping`（R5；条件性）

- [x] 5.1 盘点定案:无遗留——M1 `migrate_legacy` 已在 canonical-topic-state L118 显式化;M4 `journal_disposition` 现为 WUC-003 闭集枚举;M5 锚点随母体瘦身消失（M1 `migrate_legacy` 显式化 / M4 `journal_disposition` 并集措辞 / M5 DEW 场景标题注记——L1102 锚已漂移按内容重定位）；有遗留 → 立项合并批；无遗留 → 记录关闭

- [x] **完成定义**:C1–C4 全勾 + C5 无遗留 → 四步移档关闭本 plan(2026-09-04)：C1–C4 全勾 + C5 定案 → §4 全局验收逐项核对 → 按 `_backlog/plans/README.md` 四步移档关闭本 plan。
