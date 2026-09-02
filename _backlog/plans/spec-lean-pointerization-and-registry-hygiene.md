# Plan: spec-lean-pointerization-and-registry-hygiene

> 创建: 2026-09-01 | 状态: **活跃（仅事实与思路，执行待用户指令）**
> 来源: 用户指示"再打扫一遍：spec 是否啰嗦、是否与代码/Prompt 对齐、registry `[DEPRECATED]` 能清多少清多少"。
> 承接: CLS-084（`spec-drift-audit-remediation-and-requirement-slimming`，2026-09-01 关闭——修好了 requirement 粒度，本轮做**减量、堵盲区、清账本**）。
> 复核说明: 本文件自包含。§1 每条事实附【复现】命令；§3 每批附判定规则与边界；§8 是给复核 Agent 的 REVIEW 指南。

---

## 0. 给复核 Agent 的 REVIEW 指南

1. §1 每条事实都有【复现】——在仓库根逐条运行，数字应一致（行数可能 ±2，因为后续批次的空行规整；趋势与量级必须一致）。
2. 本轮核心手法是指针化（pointerization）。**复核重点**是 §2.1 的判定规则：它是否会误伤 normative SHALL？边界是否清晰？如果复核者认为某条规则会把真规范误判为复述，请在 §3 对应批次批注否决。
3. 红线（§2.3）是硬约束：任何批次不得违反；违反即该批 delta 无效。
4. 批次排序理由在 §3 开头，依据是 CLS-084 复盘（`_backlog/_scratch/retro-slimming-plan-pacing-and-tooling.md`）：上轮"先易后难"导致雨点小，本轮按价值×不可替代性降序。

---

## 1. 事实基线（2026-09-01 实测，每条带复现）

### F1. Registry 账本规模

- 注册 ID 总数 **681**，`[DEPRECATED]` **61 条**，0 orphan。政策为"只增不删、废弃追加 `[DEPRECATED]`、ID 永不复用"。
- 【复现】`grep -cE '^[A-Z]{3}-[0-9]{3}:' openspec/governance/req-registry.yaml` 与 `grep -cE '\[DEPRECATED\]' openspec/governance/req-registry.yaml`；orphan 由 `node openspec/governance/check-project-reqs.mjs` 报告。

### F2. prefixes 映射含 15 个死前缀

`BUS/FOR/GAC/LFW/RPG/SEG/SRD/SUC/SUR/SUS/WDM/WMD/WFS/WLO/WML` 指向的 capability 目录均已不存在（pre-ADR-0005 时代遗留家族：bundle-start-from-here、fork-repair-converge、gate-content-dedup、lifecycle-walker、relay-provenance-gate、seg2node、subagent-relay-driver、subagent-collect、subagent-repair、subagent-slots、workflow-dynamic-md-load、workflow-md-dependencies、workflow-fsm-definition、workflow-chain-observability、workflow-manifest-loading）。
- 【复现】用 §1.1 末尾的内联 node 脚本（existsSync 检查 `openspec/specs/<capability>`），或 `grep -E '  [A-Z]{3}: ' openspec/governance/req-registry.yaml` 后对每条 `openspec/specs/<path>` 做 existsSync。
- 备注: 对应的 DEPRECATED ID 主要集中在 relay-provenance-gate ×13、gate-content-dedup ×9、subagent-relay-driver ×4、lifecycle-walker ×3、bundle-start-from-here ×3。

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

### F5. 整 spec 体量：DWU 是第二名 1.7 倍，且含复述段

- `agent/delegated-work-units/spec.md` **2360 行**（第二名 research-wave-gate-implementation 1380）。粒度已修（37 块、最大 ~160），但含"generated task / task.md / spawn / Generated guidance / Generated actor guidance / Generated work-unit task"类**复述 prompt 职责的散文**——【复现】`grep -c 'generated task\|task\.md\|spawn\|Generated guidance\|Generated actor\|Generated work-unit task' openspec/specs/agent/delegated-work-units/spec.md` ≈ 30 行命中（指针化候选锚点）。
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

**分层：只做 requirement 级分割，不做 capability 级拆分。** capability 身份（`domain/capability` 两段路径，ADR 0005）零变化——不建新目录、不加 prefixes、不改 Capability Catalog。依据：巨无霸体量来自单条 requirement 吸积而非能力边界错误；capability 级复议标准（CLS-084 plan §5）均未触发。

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

- 不删任何注册 ID；不改"只增不删"政策；不改已归档 change 的历史文本。
- 每批 REMOVED/ADDED 内容多重集合全等（结构类）；指针化批以"normative 语义等价 + 复述段删除"为准，逐段在 tasks 留 diff 证据。
- 每批全量 `npm test` + `governance:check` 绿才算完成；文本锁失配同 change 更新并注明（CLS-084 先例：AGQ 28→30、DEW 29→37 计数锁、residual DEW pair 退休）。

---

## 3. 批次设计（R 系列；排序 = 价值×不可替代性降序，依据 §0.4 复盘）

### R0（工具先行，无行为面）

**内容**：(a) 复述候选扫描器——在目标 spec 中按 §2.1 规则 1 输出候选段落行号表（人审定稿后才成为 delta 输入，工具不自动改写）；(b) 把 CLS-084 五份装配脚本泛化为"spec + 分组 YAML → delta + 守恒校验"的通用工具。
**清理思路**：扫描器只做"候选定位"，判定权在人——这是对"误伤 normative"风险的结构性防御。
**验收**：扫描器对 DWU 的候选表与 §1.2 的 ~30 行命中锚点交叉一致；通用工具在 R1 首用即零返工。

### R1（主力，2 change）——pointerization 第一波

- `agent/delegated-work-units`（2360 行）：复述段指针化（锚点 = F5 的 ~30 行命中），重点块：generated task/guidance 家族段落。
- `research/post-final-recovery`：357 行块拆分（27 场景，按 inspect/apply/recover/lineage 散文缝，同 C3 系方法）+ 指针化。
**清理思路**：复述的生成 guidance 细节 → 指向 `workflows/nodes/templates/*` 与 `command_playbook/*`（owner 已存在且被 doc-lock 锁定）；Engine 侧 normative（transaction/receipt/ledger 规则）保留原文。
**边界**：`delegated-queue-spec-text-locks` 的 DEW body 计数断言（37）会变——同 change 更新并注明（CLS-084 AGQ 先例）。

### R2（3-4 change，可合并）——pointerization 第二波 + 长尾扫尾（设计已深挖定稿）

逐块处置设计已定稿于参照资料 [`spec-lean-f4-megablock-deepdive.md`](spec-lean-f4-megablock-deepdive.md)：**10 块 → 分割为 25 个子块**（post-final-recovery ×4、content-delivery-phase-content ×3、cli-phase-transition ×3、research-wave-phase-content ×3、semantic-fact-closure ×3、workflow-directory-contract ×2、seed-topic-materialization ×2、hitl-ux ×2、runtime-reentry-debuggability ×2、artifact-persistence-recovery ×2），全部 ≤ ~170 行；含 1 处清理候选（HITL2 确认语义疑似重复，需逐字比对后定夺）与 1 处指针化候选（post-final-recovery CLI 复述段 → `command_playbook/post-final-recovery.md`）。
**清理思路**：同 R1；其中 phase-content 系的 owner 就是各 phase 节点（指针目标天然存在）。

### R3（1 change）——registry 卫生（用户点名项）

- 15 死前缀：**不删映射键**（check-project-reqs 解析与 ID 历史可追溯性优先），改为键值行内追加历史注记（如 `BUS: bundle-start-from-here  # historical, capability dir retired pre-ADR-0005`），或迁入文件内"Historical prefixes"注释分节——以 check-project-reqs 全绿为门槛择一。
- 61 条 DEPRECATED 描述逐条核对：仅修正**事实性错误**（旧路径名、已更名家族的拼写），描述改为可读史实（如 "content no longer exists in any accepted surface (archaeology <date>)" 的既有风格）；不改 ID、不复活、不删行。
- 产出对账表：退役家族 × 活表面回声 = 0/刻意否定/负向锁（F3 数据入档）。

### R4（1 change）——guard 扩展（防复发闭环）

- `check-spec-section-references.mjs` 增规则：phase 节点/playbook **内部** `§X.Y` 自引用可解析（phase-seed-topics 样本健康，扩展后全库首扫定标）。
- 引擎导航注释幽灵符号检查泛化为 governance checker（当前只有 C1 的单文件测试 `rrm-spec-truth-sync-text-locks` 覆盖 return-map.mjs；104 文件全量 0 幽灵应成为机器断言）。
- 两者经 check-all 自动发现接入（无需改 check-all.mjs，`check-*.mjs` 命名即接入——CLS-084 C4 已验证）。

### R5（1 change）——housekeeping 合并批

本轮各批产生的纯文本小修 + mild 项（M1 `migrate_legacy` 显式化、M4 `journal_disposition` 并集措辞、M5 DEW L1102 场景标题注记）若前批未顺手处理，合并于此；避免"每条小修占一条管线"（上轮教训 2）。

---

## 4. 全局验收度量（随每批提交落地 before/after）

- [ ] 全库无 requirement 块 > 160 行（含 post-final-recovery 357 与 R2 长尾全部）。
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

- 不删任何注册 ID、不改"只增不删"政策、不改已归档 change 历史文本。
- 不做裸段名引用的正则化（自然语言对齐留人审）。
- 不重开 CLS-084 已关闭议题（capability 级拆分维持挂起，复议标准见其 §5）。
- 本 plan 仅事实与思路；**执行（含第一批 propose）待用户明确指令**。

## 7. 与历史工作的关系

- CLS-084（前一轮）：修粒度（7→15 等）、清已知漂移、建立 §-guard 基线——本轮在其上做减量与扩面。
- CLS-082 C3（RWP 指针化）：本轮指针化的方法先例。
- CLS-084 复盘（`_backlog/_scratch/retro-slimming-plan-pacing-and-tooling.md`）：本轮排序与工具化策略的直接依据。
