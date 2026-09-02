# Plan: spec-drift-audit-remediation-and-requirement-slimming

> 创建: 2026-09-01 | 状态: **已完成关闭（CLS-084）**——8 个 OpenSpec change 全部归档（finalizer 均 19/19，全量 npm test 2967/2967 0 fail）
> 来源: 六路 spec↔code 漂移审计（针对六个最大 spec，逐 requirement 对照 engine/cli/schema/workflows/tests 验证），用户确认推动落地。
> 性质: 全部为 doc/governance 面修复 + spec 结构瘦身；**不含行为语义变更**。唯一的 engine 触点是一行级注释修正（随 C1 change 走 apply）。

---

## 1. 审计结论（证据基线）

### 1.1 六路审计计分板

| Spec | 行数 | header/body req | 结论 | 确认漂移 |
|---|---|---|---|---|
| `research/research-return-map` | 962 | 8/8 | **有真噪声（4 项，已亲核）** | 见 §1.2 |
| `research/research-wave-phase-content` | 1163 | 21/22 | **坐标腐坏（4 项，2 HIGH 已亲核）** | 见 §1.3 |
| `research/canonical-topic-state` | 958 | 12/12 | 干净（20+ MATCH，0 remnant） | 2 mild（`migrate_legacy` 未进显式拒绝名单；CTS-010/011/012 缺 `@impl`） |
| `agent/agentic-queue` | 1071 | 28/28 | 干净（20 MATCH，0/0） | 无 |
| `research/research-wave-gate-implementation` | 1424 | 21/24 | 干净（~130 MATCH，0 remnant） | 1 mild（`reference/*{topic}*.md` glob：spec 称"非第二成功谓词"，definition JSON 仍声明为 `count_floor` target；代码行为正确，声明层措辞互斥） |
| `agent/delegated-work-units` | 2487 | 29/29 | 干净（23+ MATCH，0 remnant） | 1 LOW（`journal_disposition` 六值实为两 schema 之并集被写成单枚举，见 §1.5） |

**审计完成 6/6。总体结论：用户假设"大 spec 大概率有漂移"大部分不成立**——6 份中仅 2 份有真噪声（return-map、phase-content），且都是"语义/结构移走、文字留原地"类；4 份大 spec 与代码高度对齐。系统性病灶是 §1.4 的巨型 requirement 吸积与退役标注惯例不齐。

关键背景：`tests/engine/residual-spec-drift-text-locks.test.mjs` 是 `2026-08-31-repair-residual-spec-drift` 的文本锁。本 plan 处理的是**该轮修复之后仍然残留**的部分。

### 1.2 return-map 已确认噪声（C1 范围）

| # | 位置 | 问题 | 修复方向 |
|---|---|---|---|
| R1 | `shared-return-map-authoring.md`（29 行 Compatibility Pointer）vs RRM-003 | spec 仍称该文件 SHALL 拥有 canonical entry example / slot ownership / token lifecycle；实际文件已指针化并自我声明"defines no second entry grammar" | RRM-003 重写为现状：template + playbook 是 owner，shared 文件是 compatibility pointer |
| R2 | spec L266–289 | `the retired per-wave backfill token check (realized by current return-map entry points)()` 伪函数名（全库无此符号）。成因：上一 plan "spec prose 不点名实现 .mjs" 规则被执行成了怪异短语 | 改写为干净语义散文（wave-token 过滤语义：哪个 token 属哪个 wave、skip 语义），**不恢复符号名** |
| R3 | `engine/helpers/return-map.mjs:1` 导航注释 | 仍列 `inspectSeedTopicReturnMaps`，该符号已被 W6 de-export（eef44d0c1），无定义无导出 | 注释删该符号（engine 一行注释，随 change apply） |
| R4 | RRM-007 L414–418 | 5 个已退役 token 规则 ID（`no_stale_*_token` 等）以现在时 SHALL 描述，代码零匹配 | 删除或改为 `@deprecated` 场景标注（仓库既有惯例，return-map 是唯一没用它的） |

### 1.3 research-wave-phase-content 坐标腐坏（C2 范围）

| # | 位置 | 问题 | 修复方向 |
|---|---|---|---|
| P1 | spec L483 vs `phase-wave0.md` | "Phase-wave0 §3.3 SHALL ... update seed projection sections"；实际 §3.3=Submitted Reference Closeout，目标内容在 **§3.4** | 同步章节坐标（含 wave2 §3.2.3 复核） |
| P2 | spec L434/L492 | "Rerun-Aware Behavior section" 在全部 phase 节点中出现 0 次（内容已被吸收进 §3.0/3.1/3.3） | 按现状重写指称（不复活死段名） |
| P3 | spec L490 | "Wave1 and Wave2 SHALL **add** a §3.0"——两文件 §3.0 早已存在（wave0 也有），changelog 式主动语态 | 改为现在时行为描述 |
| P4 | spec L483-488 | wave2 `__BACKFILL_*__` 处理结构描述与实际（"documentation tokens, not Agent-edit targets"）不符 | 按实际结构对齐 |

### 1.4 结构发现：巨型 requirement 吸积（C3 范围的依据）

全库 657 条 requirement：**中位 26 行，p90=100 行，top10 = 586/384/357/302/294/277/259/257/248/240**。大 spec 的大不是均匀铺开，而是少数"巨无霸 requirement"吸积：

| Spec | 巨无霸（行数） |
|---|---|
| return-map | RRM-007 一条 **587 行**（=全 spec 61%，158 个 SHALL / 75+ 场景） |
| canonical-topic-state | L48（278）+ L326（385）两条占 69% |
| agentic-queue | `Producer rule topic_deepening`（295） |
| wave-gate-implementation | `Wave1 complete gate rule set`（218）/ `Gate CLI evaluates wave1 rules`（207）/ `Blocking judgment contracts`（303） |
| wave-phase-content | `Wave1 phase body completeness`（235）等 3 条 |
| delegated-work-units | 7 条 123–260 行（envelope/submit/dry-submit/timeout/integrity/supersession），与 engine 模块缝天然对应 |

六大 spec 全部是扁平结构（`## Purpose` + `## Requirements`，无主题分层）。

### 1.5 mild 项登记（不立项，顺手可修）

| 项 | 位置 | 内容 | 去向 |
|---|---|---|---|
| M1 | CTS `migrate_legacy` | 靠 Zod catch-all 拒绝，未进显式 unsupported 名单 | 登记 |
| M2 | CTS-010/011/012、RRM-001/002/003 | `@impl` 标注缺口（记账问题，非行为漂移） | 登记 |
| M3 | RWG L60-61 | `reference/*{topic}*.md` glob：spec 称"非第二成功谓词"vs definition JSON 仍声明为 target；代码行为正确 | 登记 |
| M4 | DWU L2059-2060 | `journal_disposition` 六值 = normal(3) ∪ suspect(6) 两 schema 并集，spec 写成单枚举 | `dwu-slim` 时顺手精确化 |
| M5 | DWU L1102 | 场景标题（历史 delta-sync 键保留）与正文现行为矛盾（binding identity 已不再 canonicalize） | `dwu-slim` 时加 retained-key 注记 |
| M6 | DWU `repair_kind: agent_action` | 存活在未枚举命名空间（`WORK_UNIT_REPAIR_KIND` 别名到 recovery action 词汇，不含此值）——设计 smell 非漂移 | 登记 |

---

## 2. 目标 / 非目标

**目标**
1. 清零 §1.2/§1.3 全部已确认漂移（C1、C2）。
2. 巨型 requirement 瘦身至仓库常态（目标：无 requirement > ~150 行；不追求把 p90 拉到 100 以下，只消灭吸积异常值）（C3）。
3. 退役内容标注惯例执行一致：凡 "retired/deprecated" 语义一律用 `@deprecated` 场景标注，禁止现在时 SHALL 描述已退役行为（随 C1–C3 各自落实；防复发 guard 见 C4）。

**非目标**
- **不做 capability-level 拆分**（不新增 `domain/capability` 目录）。深虑结论：governance 成本（ADR 0005 身份迁移：registry prefix + catalog + doc locks + discovery checks 连锁）远超当前收益；"大≠脏"已被 CTS/AGQ/RWG 三个干净样本证明，病灶在 requirement 粒度不在 capability 粒度。DWU 是否值得拆，挂起到 C3 完成后按 §5 标准复议。
- 不新增/退役 header req ID；不动任何行为语义、gate 规则、CLI 契约。
- 不处理 mild 项（`migrate_legacy`、RWG glob 措辞、`@impl` 缺口）除非顺手；登记即可。

---

## 3. 工作流（C-series，每项一个有界 OpenSpec change）

| Wave | 内容 | change 主体 | 依赖 |
|---|---|---|---|
| **C1** | return-map 真相同步：R1–R4 + spec 内 retired 散文全部 `@deprecated` 化 | `research/research-return-map` delta spec + 一行 engine 注释 | 无 |
| **C2** | phase-content 坐标重同步：P1–P4 | `research/research-wave-phase-content` delta spec | 无 |
| **C3** | requirement 瘦身，按 spec 分批：`rrm-slim` → `cts-slim` → `rwg-slim` → `agq-slim` → `dwu-slim`（顺手处理 M4/M5） | 各 spec 的 delta spec；**只做 spec 内 `### Requirement` 拆分，主题分群，不改语义** | C1（RRM 先同步再拆，避免白拆） |
| **C4**（可选） | 防复发 guard：spec 引用的 § 坐标/段名必须存在于 owner Markdown 的 checker（P1/P2 正是此类缺陷）；retired-散语强制 `@deprecated` 标注的 checker | `openspec/governance/` + `tests/governance/` | C1/C2 提供样本 |
| **C4b**（挂起） | DWU capability 拆分复议 | — | C3 全部完成后按 §5 复核 |

每个 change 走完整 `/opsx:propose → apply → archive`；C1 的 engine 注释修正只在 apply 阶段执行。

### C3 拆分纪律（防止瘦身变成新漂移）

1. **语义逐字保持**：拆分是"一个 requirement → N 个 requirement"，规则文本不改写；场景归属重新分组。
2. 先跑 `node scripts/list-doc-locks.mjs <spec>` 取锁定测试清单；`residual-spec-drift-text-locks.test.mjs` 的 verbatim delta-sync 断言同 change 内同步。
3. 遵守 "spec prose 不点名实现 .mjs" 规则（上一 plan 确立）——重写处用语义散文。
4. header `> req:` 不扩容：拆分产生的新 body requirement 不注册新 ID（checker 明文允许 body > header）；原 header ID 映射到拆分后最承载的那条。
5. 每批前后跑 `npm run governance:check` + 全量 `npm test`。

---

## 4. 验收标准

- [ ] §1.2 / §1.3 逐项清零，`grep` 复核无残留（伪函数名、死段名、旧 § 坐标、现在时 retired 散文）。
- [ ] 全库无 requirement > ~150 行（现状 top10 全部 ≥240；目标把异常值拉平，p90 允许缓慢下移）。
- [ ] 六大 spec 全部有主题分层（`##` 级分群或等价导航），不再是 29 条平铺。
- [ ] `npm test` 全量 0 fail（尤其 `residual-spec-drift-text-locks` 与各 doc-lock）；`governance:check` 全绿。
- [ ] C4（若做）：新 checker 接入 finalizer 序列。

## 5. DWU capability 拆分复议标准（挂起，不排期）

仅当同时满足： (a) C3 后 DWU 仍有 ≥3 个互不重叠的任务问题域；(b) 各域有稳定独立 owner 面（engine 模块缝已存在：envelope / submit-transaction / recovery / supersession）；(c) catalog 的 Boundaries 列显示邻居能力已接管了外围（subagent-dispatch、provenance-gate、agent-output-declaration 均在）。满足则按 ADR 0005 身份迁移清单立独立 change；不满足则 C3 瘦身即终点。

## 6. 风险

| 风险 | 缓解 |
|---|---|
| 文本锁大面积红 | 每批先 `list-doc-locks`；锁与文本同 change 更新（tests/README 既有规则） |
| 拆分时语义漂移 | 纪律 §3-C3.1：逐字搬运 + 场景重分组；评审对照原子 requirement |
| `@deprecated` 标注被 checker 当活行为 | 沿用 CTS 既有格式（它已被 checker 接受） |
| C3 批次过多疲劳 | 批间独立可停；每批一个 change，完成即归档 |

## 7. 审计证据

- 六路审计为逐 requirement 对照验证（subagent 并行 + 关键断言人工复核）；本 plan §1.2/§1.3 的每条都在本轮对话中经 `grep`/`sed` 亲核。
- 干净样本的反向价值：CTS/AGQ/RWG 共 ~180 条 MATCH 证明"大 spec ≠ 脏"，瘦身的理由是**审阅成本**而非失真。
- DWU 审计已完成（干净，1 LOW + M4/M5 登记），`dwu-slim` 批次确认排入 C3；其 7 条 123–260 行巨无霸与 engine 模块缝（envelope/submit/recovery/supersession）天然对应，是拆分阻力最小的一批。

---

## 8. Progressive 执行清单（OpenSpec change 落地，每 change 一路到底）

### 管线模板（每个 change 按此六步执行，缺一不可）

| 步 | 命令/动作 | 完成判据 |
|---|---|---|
| **P propose** | `/opsx:propose` 产出 change 全套 artifacts（proposal / design / specs delta / tasks / verification-plan） | change 目录完整，`openspec list` 可见 |
| **H polish** | `/polish-openspec-change` ≥2 passes（Whole-Change Coherence + Risk-Led） | `openspec validate <name> --strict` + `git diff --check` 全绿，报告 **ready for apply** |
| **A apply** | `/opsx:apply` 按 tasks.md 执行目标编辑（specs / tests / engine 一行注释仅限 C1） | tasks 全完成；apply 前如有 `openspec-feedback:*` marker 先取对应 operation guidance |
| **V verify** | 全量 `npm test` + `npm run governance:check` | 0 fail / 全绿；失败先孤立复跑定性（tests/README 规则） |
| **R archive** | `/opsx:archive` 同步 main specs，然后 `node openspec/governance/finalize-change-archive.mjs --change <name>`（唯一支持的最终归档转换） | finalizer 全绿，change 移入 archive |
| **C commit** | git 单 change 单提交 | 提交消息引用 change 名，工作树干净 |

### 执行序与 check items

**C1 `sync-return-map-spec-truth`**（R1–R4；含 `return-map.mjs:1` 幽灵注释一行修正）✅ 2026-09-01 归档（finalizer 19/19，npm test 2935/2935）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

**C2 `resync-wave-phase-content-coordinates`**（P1–P4）✅ 2026-09-01 归档（finalizer 19/19，npm test 2939/2939）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

**C3a `slim-rrm-requirements`**（依赖 C1：先同步再拆；587 行 RRM-007 等拆为常规 requirement + 主题分群）✅ 2026-09-01 归档（finalizer 19/19，全量 0 fail；1→8 拆分：13/109/87/51/87/153/50/50 行，行集守恒 100%，59 场景全保留）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

**C3b `slim-cts-requirements`**（L48/326 两条巨无霸；顺手 M1 可选）✅ 2026-09-01 归档（finalizer 19/19，npm test 2949/2949；2→7 拆分：55/100/85/70/146/49/98 行，行集守恒 100%，66 场景全保留）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

**C3c `slim-rwg-requirements`**（三条 200–300 行巨无霸；顺手 M3 措辞精确化）✅ 2026-09-01 归档（finalizer 19/19，npm test 2955/2955；3→7 拆分 + M3 glob 措辞对齐）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

**C3d `slim-agq-requirements`**（`topic_deepening` producer rule 295 行等）✅ 2026-09-01 归档（finalizer 19/19，npm test 2960/2960；1→3 拆分，行集守恒 100%，16 场景全保留）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

**C3e `slim-dwu-requirements`**（七条巨无霸按 engine 模块缝拆；顺手 M4/M5 登记）✅ 2026-09-01 归档（finalizer 19/19，npm test 2965/2965；7→15 拆分，142 场景守恒 100%，主 spec 2487→2360 行；DEW body 计数锁 29→37、residual DEW pair 退休由 dwu-slim 结构锁接管）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

**C4 `spec-section-reference-guard`**（防复发 checker）✅ 2026-09-01 归档（finalizer 19/19，npm test 2967/2967；新增 `check-spec-section-references.mjs`（§ 坐标可达性 + 退役散文禁令，check-all 自动发现），首扫清零 autorun L120 现在时退役散文（M 系登记项）
- [x] P propose　- [x] H polish　- [x] A apply　- [x] V verify　- [x] R archive　- [x] C commit

### 全局纪律（适用于每个 change）

1. 生命周期 scope：propose/polish 阶段只写 `openspec/changes/<name>/`，`DEEP_RESEARCH_HARNESS/`、`openspec/specs/`、`tests/` 只读；目标编辑只发生在 apply。
2. 每批编辑前先 `node scripts/list-doc-locks.mjs <doc>`；文本锁与被锁文本同 change 更新。
3. C3 各批遵守拆分纪律 §3-C3：语义逐字保持、header ID 不扩容、"spec prose 不点名实现 .mjs"。
4. 瘦身验收指标：无 requirement > ~150 行；六大 spec 有主题分层；`residual-spec-drift-text-locks` 与全部 doc-lock 绿。
5. 完成定义：§8 全部 ☑ → 更新本 plan 状态与 §1 计分 → 按 `_backlog/plans/README.md` 四步移档关闭。
