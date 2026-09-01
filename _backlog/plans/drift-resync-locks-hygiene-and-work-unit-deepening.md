# Spec-Code 漂移重同步、词汇锁与卫生序列 + Work-Unit 深水区加深（drift-resync-locks-hygiene-and-work-unit-deepening）

> 状态: **active** | 创建: 2026-08-31 | 来源: 两轮 Coding-Agent 视角评审 + 八份并行只读深挖（3 份漂移审计 + engine 切缝地图 + DEW 全量 29 条扫描 + 四决策点调查 + 形状 B 结构分析），全部发现带 file:line 双侧证据
> **追踪**: §10 — Baseline 快照已钉死（2026-08-31）；每个 change archive 后用 `_backlog/plans/drift-resync-metrics-snapshot.mjs` 复测；计划关闭时出终局 Δ 统计表并按 §10.4 裁定"显著改善"标准。
> 定位: `_backlog` 上游分析与决策记录，不是运行时真相；落地一律走 OpenSpec change 生命周期（`/opsx:propose` → `/opsx:explore` → `/opsx:apply` → `/opsx:archive`）。
> 前车之鉴: 本计划是 `spec-semantic-drift-remediation`（CLS-079，2026-08-31 关闭）的**后续残留 + 新证实**批次；其 C1/C2/C3 已归档项（req 索引、重复 scenario、drain 判据注记、post-final exit-code、rule.check 派生审计、降级配置去重）**不在本计划范围**。其两条姿态约束直接约束本计划：① GSK-011（派生证据、不建永久静态目录）；② "元层面治理（新专有名词/enum 值硬门槛）——下一次词表消歧类 change 出现时再立项"，本计划即为该次。

---

## 1. 问题陈述

两轮对话确认的三个事实：

1. **系统性漂移没有发生，迭代残渣是真实且可定位的。** 约 50 个机器可查点（封闭枚举 10 集双向、DEW 12+1 抽样、queue/gate 48 项）中约 46 个精确匹配；spec 最新章节（transaction v2、supersession、candidate projection）匹配最好。但残渣集中在旧条款：同 spec 双代真相、跨词汇表污染、承诺未兑现、陈旧规范性清单。
2. **漂移守卫有真实缺口。** 现有 governance check 锁住结构完整性（路径、ID、gate 枚举对 Harness Markdown），但 `openspec/specs/`+`guidance/` 里复述封闭集的 prose **无机器守卫**；`check-gate-chain-prose` 扫描面（HARNESS md）与本缺口不相交。
3. **engine 深水区可安全加深。** `work-unit-submit.mjs`（2447 行）与 `work-unit-transaction.mjs`（838 行）外部接口已深、依赖图无环；问题在内聚（四条流共用 snapshot 机制）与一个真实内部循环（transaction 机制↔inspect 互相调用）。崩溃注入测试不需要任何代码改动即可写。

---

## 2. 已证实发现（全部 file:line；propose/explore 期逐行复核后再动笔）

### 2.1 A 类——spec 侧漂移（修复=改 spec prose）

| # | 级别 | 发现 | 证据 |
|---|---|---|---|
| A1 | MEDIUM | `semantic_boundary`（work-unit 恢复面值）被列为 gate-hint kind，漏 `missing_contract`；同 spec :59-65 自身正确。**两份审计独立复现** | `openspec/specs/engine/check-inspect-feedback/spec.md:215` vs `gate-definition.mjs:15-21`、`repair-vocabulary.mjs:18`、`gate-skeleton/spec.md:15` |
| A2 | MEDIUM | 恢复词汇规范清单只剩旧 5 个 CLI-动词值；engine 实际发射下划线拼写 `claim_successor`/`inspect_current_lineage_leaf`；同 spec :336 与 `RUN.md:78` 已以 10 值代码导出为权威——**spec 内部自相矛盾，旧清单会错杀合法输出** | `check-inspect-feedback/spec.md:206-208, 277-278` vs `work-unit-repair-vocabulary.mjs:10-23`、`work-unit-attempt-disposition.mjs:151-155,186-189` |
| A3 | 结构 | "closed disposition vocabulary"（5 值）spec 声明封闭但不列举、代码无 zod 锁——三不管集合，现有 check 不可能发现其漂移 | `check-inspect-feedback/spec.md:200,270` vs `work-unit-attempt-disposition.mjs:45,69,76,83,96,103,110`（唯一发射点 `projectWorkUnitAttemptDisposition`） |
| A4 | MEDIUM | **DEW-012 双代真相 #1**：receipt binding-identity 自动填补承诺永不触发（`assertCompleteCurrentWorkUnitProfile` 入口硬拒 + Zod 要求四字段，双重不可达）；会引导 agent 走注定失败的修复循环 | `delegated-work-units/spec.md:1078, 1102-1109` vs `work-unit-validation.mjs:334-351`、`schema/contracts/work-unit.mjs:600-611`；测试已断言 `receipt_binding_identity_autofilled===false`（`tests/engine/work-unit-submit.test.mjs:1590-1591`） |
| A5 | MEDIUM | **DEW-012 双代真相 #2**：stale `receipt_nonce` 规范化条款与 DEW-004 现行条款（nonce 不符 SHALL reject，`spec.md:293-298`）同 spec 直接矛盾；`allowNonceNormalization` 参数穿透（submit→supersession）但永远无效 | `delegated-work-units/spec.md:1080, 1170-1177` vs `work-unit-validation.mjs:229-254, 347-371`、`work-unit-submit.mjs:1261,1702`、`work-unit-supersession.mjs:223` |
| A6 | LOW-MED | `preflight_candidate_projection`：SHALL 级字段（含 schema 校验要求）全仓零实现；数据在审计现场已存在且已过 schema（`timeoutPreflight.candidate_projection`）——差一行拷贝 | `delegated-work-units/spec.md:1457, 1589` vs `work-unit-lifecycle.mjs:1222-1232`（兄弟字段全在）、`work-unit-timeout-preflight.mjs:508-511`、`schema/contracts/work-unit.mjs:823` |
| A7 | LOW | recover-declaration 未提交拒绝的 `write_to` 未点名 submit/late-submit/new-attempt 边界（意图达标、字面未达） | `delegated-work-units/spec.md:532` vs `work-unit-submit.mjs:540` |
| A8 | LOW | AGQ-027 drained 措辞："rather than `passed: false`" 与代码刻意设计（`drained:true` **同时** `passed:false`，代码注释自证）相悖；`refill_pool` 前置条件从未被测（可达状态无行为差异，refill() 保证窗口空时池必空） | `agentic-queue/spec.md:1054-1058` vs `queue-manager-lifecycle.mjs:525-535`（注释原文 "Distinct verdict … (AGQ-027)"） |
| A9 | LOW | gate-skeleton Purpose 写 "9 个" gate definition/CLI 骨架；实际各 10（同 spec :230 已写 "all ten wrappers"；registry GSK-003 已是 10） | `gate-skeleton/spec.md:7` vs `schema/gate_definitions/`、`cli/gates/`、`req-registry.yaml:425` |
| A10 | LOW | CTS Purpose 写 "exactly `inspect\|apply\|recover`"；CLI 已有第 4 个只读 `schema` 操作（同 spec CTS-010 自己在用） | `canonical-topic-state/spec.md:9` vs `cli/operate-topic-state.mjs:71`、同 spec `:937` |
| A11 | LOW | RWG Purpose 只盘点 wave0/1/2-complete 三个 gate；正文还拥有 setup-ready gate 内容（RWG-014） | `research-wave-gate-implementation/spec.md:5-7` vs 同 spec `:550-576` |
| A12 | LOW | `source_intake_fan_in` producer_rule 字面量无任何框架代码指涉（仅测试 fixture）；实际判别键是 `kind: 'wave0_source_intake'` | `agentic-queue/spec.md:253-255` vs `helpers/queue-demand-admission.mjs:179,278,301` |
| A13 | LOW（边界） | content-delivery spec 以否定式禁止不存在的 `final_delivery` trace event；字面量与保留未写的 `StopAuthorizationState` 值同名相撞（非复述封闭集，不判违规，但值得归一措辞） | `content-delivery-phase-content/spec.md:430-433` vs `schema/enums.mjs:22`、`DEEP_RESEARCH_HARNESS/README.md:140` |
| A14 | LOW | `invariants-brief.md`（Agent 最先读的非权威简报）把 10 值恢复词汇写成 5 值 | `openspec/guidance/models/invariants-brief.md:23` vs `repair-vocabulary.mjs:10-23` |

### 2.2 B 类——死代码与未实现承诺（修复=删/补代码，行为中性或按 spec 补齐）

| # | 级别 | 发现 | 证据 |
|---|---|---|---|
| B1 | 死代码簇 | DEW-012 autofill 对应死代码：identity fill loop、receipt_nonce fill、`receipt_binding_identity_autofilled` 规范化块 | `work-unit-validation.mjs:335-346, 347-352, 372-381`（可达条件永假） |
| B2 | 死代码簇 | nonce 规范化对应用死代码：result/receipt 两条 normalize 分支 + `hasCompleteBinding`/`insideAssignedDir` 仅喂死分支的计算 + `allowNonceNormalization` 参数面；`nonce_normalized_from_record` 零测试覆盖 | `work-unit-validation.mjs:231-253, 353-370, 301` + 穿透点 `work-unit-submit.mjs:1261,1702` |
| B3 | 未实现 SHALL | `preflight_candidate_projection`（=A6 的代码侧）：一行补丁 `preflight_candidate_projection: timeoutPreflight?.candidate_projection ?? null` 进 `forcedTimeoutAudit` | `work-unit-lifecycle.mjs:1222-1232`；测试挂点 `tests/engine/work-unit-terminal.test.mjs:970-1007`、`tests/integration/cli/operate-work-unit.test.mjs:~1493` |
| B4 | 字段名三义 | `recommended_action` 一名三取值空间：①candidate 5 值（zod 锁）、②timeout 6 值（zod 锁）、③claim/actor **自由文本句子**（无 schema、无 spec、零测试断言）。裁定：**改名 `actor_guidance`**（爆炸半径 ~2 个代码文件，spec/测试/trace 消费者零引用） | `work-unit-actor.mjs:111-120`、`work-unit-lifecycle.mjs:656,676,713`；对照 `schema/contracts/work-unit.mjs:145,760` |

### 2.3 C 类——登记/目录/词汇账本（修复=registry + catalog，仅增不删）

| # | 级别 | 发现 | 证据 |
|---|---|---|---|
| C1 | LOW | catalog 行 `research-return-map`："No deterministic owner; Node does not judge" 与已被接受的 RRM-006/007 确定性巡检矛盾 | `openspec/specs/README.md:79` vs `research-return-map/spec.md:264-292` |
| C2 | MED（账本） | 两个未注册 heading：RRM 第 8 个 requirement（L879，模板所有权）无 ID；CTS L876（reference binding adapter）无 ID；RWP 头部声明 RWP-005/008 活跃但正文零锚点 | `research-return-map/spec.md:879`、`canonical-topic-state/spec.md:876`、`research-wave-phase-content/spec.md:3`；规则：deprecated ID 不得留在 header（`check-spec-req-ids.mjs:72-74`） |

### 2.4 D 类——跨 spec 复述（漂移乘数；修复=owner + 指针化）

| # | Token/规则 | Owner | 指针化候选 | 现状 |
|---|---|---|---|---|
| D1 | "exit code 不编码士气/疲劳" 规则+同名 scenario | `engine/cli-exit-code-conventions` | `gate-skeleton/spec.md:658-687` | 近逐字重复 |
| D2 | `cache_trails` Engine 填写/校验于 submit | `agent/agent-output-declaration` | `bundle/cache-raw-web-content:59-61` | **已漂移**：registry `req-registry.yaml:147` 与 AGO 正文口径不再一致 |
| D3 | HITL2 五个 `user_decision` 值 | `engine/schema-core`（Zod enum） | `content-delivery-gate-implementation:19,47`；`shared-node-content:24` 为受治理教学镜像（可保留） | 全列复述 |
| D4 | work-unit index `rerun_count` 盖章 + `--eligible-rows` | `agent/work-unit-provenance-gate`（WPG-015） | `research-wave-phase-content:1054-1058` | 近逐字 |
| D5 | ProfileSchema `rerun_count` 定义 | `engine/schema-core`（SCO-011） | `rerun-incremental-node:79,178-179` | 轻微 |
| D6 | `created_in_rerun_count` finding-index 契约 | `research/wave2-synthesis`（WTS-012） | `research-wave-phase-content:1073-1087` | 近逐字 |
| D7 | `check.failed_rule_ids`/`degraded_rules` 分区 | `engine/gate-skeleton` | `research-wave-gate-implementation:1410-1418`、`cli-inspect-output-conventions:354-364` | 分区复述 |
| D8 | finding 字段清单 `rule_id, repair_kind, missing_fact, write_to, rerun` | **双 owner 须写明**：形状=gate-skeleton、语义=check-inspect-feedback | `cli-inspect-output-conventions:27,110,213`（3 处复述） | — |
| D9 | return-map 字段表 + no-projection 处置形状 | `research/research-return-map` | `research-wave-phase-content:486-488,519` | **示例串已分叉**（"process-only output, not consumer-facing" vs "not materializable; process-only output"） |
| D10 | gate-attempt 唯一 trace writer | `engine/gate-skeleton`（GSK-005） | `research-wave-gate-implementation:1316-1320`、`pre-research-gate-implementation:314` | 部分复述 |

干净不动（免重复排查）：`unsupported_current_entry_contract` 的 8 处 per-CLI tripwire 是设计；`recovery_action` 语义单 owner；D11（CLE↔LOC-011 互镜）为回归锁定镜像。

### 2.5 形状 B 结构判定（不拆能力，改 prose/表格）

- `research/research-wave-phase-content`（22 headings/114 scen）：**一个能力，不拆**。臃肿是 re-home 债（D4/D6）。
- `research/research-wave-gate-implementation`（24/128）：内聚（3 个 gate CLI 的确定性层），F 簇跨切同一批可执行文件——**不拆**；L805 的 23 场景表格化。
- `research/research-return-map`：A 簇（authoring shape）真单一能力；B 簇（确定性巡检，L264+L292 的 62 scen）是不同层但**拆分成本 ≈6 文件 + prefix + ID churn + 11 处 `@impl` 清扫**，默认表格化 L292（59 场景），仅当巡检继续长大才立 `research/return-map-inspection`。
- `research/canonical-topic-state`：B 簇（workspace，66 scen）保留；C 簇（layout resolver L777-919）被 5+ 能力消费、CTS-005/007 带 `@impl`——拆分风险中高，**缓期**；L48 的 38 场景表格化。

### 2.6 遗产债务登记（本计划吸收或显式留置）

- **CHI-004 决策表占位符**：`tests/engine/work-unit-recovery-decision-table.test.mjs` 是 1 行 placeholder；`RUN.md:78` 与 `invariants-brief.md:24` 引用它作为锁，**锁不存在**。不并入 C2（独立 CHI-004 债务），登记为独立 pending task。
- **list-doc-locks 盲点根治**（CLS-079 closure 登记）：动态构造路径/跨面锁两处实例已暴露，根治另立项。
- **reference-target descriptor 迁移**（CLS-079 批三暂缓项）：保持暂缓。
- **观察项（不立项）**：CLI exit-code 三态无代码锁（文档约定+已验证一致；新 CLI 静默违规风险由 spec 自身 :110, :127-128 的"记录漂移"条款兜底）。

---

## 3. 落地策略：4 个有界 OpenSpec change（串行，一次一个 active change）

不合并为 mega-change（三组触碰的 capability 集、验证面互不相同；对照 CLS-066/067/079 先例）。C1→C2→C3→C4 顺序的理由：C1 零代码最快消除 agent 误导；C2 装好锁后 C3 的大扫除才安全；C4 与前三者零依赖（纯内部搬动、外部接口不变），可置后也可在 C2 后插队。

### C1 `repair-residual-spec-drift`（doc-only，先做）

范围：A1–A14 全部 + DEW-012 两条 stale 条款重写（A4/A5 的 spec 半）+ A3 的 spec 侧列举 + C1（catalog 行）。

任务要点：
1. A1：`check-inspect-feedback/spec.md:215` 改回 `GATE_REPAIR_KINDS` 五值（`semantic_boundary` 移出，`missing_contract` 回位）。
2. A2：`:206-208`/`:277-278` 旧 5 值规范清单改为指向 `WORK_UNIT_RECOVERY_ACTIONS` 导出 + `RUN.md` 决策表（沿用 :336 的 pointer 模式），删除"SHALL NOT emit underscore-spelled"与真实发射矛盾的拼写规则；`:277-278` 同步。
3. A3（spec 半）：`:200`/`:270` 把封闭集列举出来（`unsupported_current_contract|not_submitted|historical|unresolved|current` + owner 指针 `WorkUnitAttemptDispositionSchema` + 锁测试指针）——这同时把 A3 变成 C2 checker 可守护的句子。
4. A4/A5（spec 半）：DEW-012 重写为两代一致——保留 schema-version 填补（活的）、binding-identity 与 nonce 改为严格拒绝口径（对齐 DEW-004 :293-298 与 `work-unit.submission.v1` 现实）；场景 `1102-1109`、`1170-1177` 同步。**注意 house 规则**：requirement 存活时 scenario 标题不可删（MODIFIED delta 整块替换语义），沿用保留标题模式。
5. A6：不在此改（代码侧在 C2）。
6. A7：修 `work-unit-submit.mjs:540` 的 `write_to` 文案或 spec :532 措辞（二选一，explore 期定稿；倾向改代码文案——doc-only change 例外放 C2）。
7. A8：AGQ-027 措辞改为与代码一致（`drained:true` 与 `passed:false` 并存的 distinct verdict；前置条件按代码现状写，`refill()` 已保证窗口空时池必空）。
8. A9/A10/A11：三个 Purpose prose 修正（9→10、`schema` 操作入列、setup-ready 入列）。
9. A12：`source_intake_fan_in` 注明历史别名/指向实际判别键 `kind: 'wave0_source_intake'`（或删字面量，explore 期定稿）。
10. A13：`content-delivery-phase-content:430-433` 归一措辞，避免与保留枚举值同名相撞。
11. A14：`invariants-brief.md:23` 恢复词汇 5→10。
12. C1（catalog 行）：`openspec/specs/README.md:79` research-return-map 所有权列改为承认 RRM-006/007 确定性巡检。

semantic-closure 预期：`not_applicable` 或 `affected`（按触碰 family 定，propose 期判）。验证：`npm run governance:check` + 全量 `npm test`；A1/A2/A14 修复后 C2 的校准行应转绿。

### C2 `lock-closed-vocabularies-and-clear-residue`（小代码 + 工具）

范围：A3 代码半 + B1–B4 + Q4 checker + A6 实现 + A7（如按改代码文案走）。

任务要点（顺序即依赖）：
1. **candidate-projection 枚举提升**：`schema/contracts/work-unit.mjs:145` 的 5 值枚举嵌在 superRefine 对象内取不出 `.options`——提升 `export const WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS = Object.freeze([...])` 并喂给 `z.enum(...)`（gate-definition 模式，零行为变化）。
2. **disposition 五值锁**（Q2 精确补丁）：`schema/contracts/work-unit.mjs` 新增 `WORK_UNIT_ATTEMPT_DISPOSITIONS` 冻结数组 + `WorkUnitAttemptDispositionSchema = z.enum(...)`；`work-unit-repair-vocabulary.mjs` re-export + 人体工学 key-map；`work-unit-attempt-disposition.mjs` 7 处内联字面量改常量（:45,69,76,83,96,103,110）；`tests/engine/work-unit-repair-vocabulary.test.mjs` 新增镜像块（长度 5、精确排序集、拼写 regex、zod round-trip、源码扫描零裸字面量）+ `work-unit-attempt-disposition.test.mjs` 补 not_submitted/unsupported 两例集合断言。
3. **新 checker `check-spec-enum-restatements.mjs`**（Q4 设计全文照抄）：静态 import 七集（recovery/gate×2/timeout/StopAuthState/phase-audit/两个新导出）+ fail-closed derive + 反引号 token + 单集 ≥2 成员 + 主导集归属 + 邻接闭合提示（"closed vocabulary / one of the closed / CLI-verb spelling"）+ 无 hedge 才触发完整性规则；扫描 `openspec/specs/**/*.md` + `openspec/guidance/**/*.md`（~90 文件）。**GSK-011 对齐论证**：静态 import 是"派生证据"的最纯形态——checker 不持有任何值清单（无第二副本即无漂移），fixture pin **只做子集断言（1–2 成员/集）**以检出导入/regex 腐烂而不构成第二目录；它对 prose 从不"推断契约事实"，只把 prose 复述 token 与代码集比对、以代码集为唯一裁决方——这不是 gate-skeleton/spec.md:32 禁止的 prose-regex。降级路径（某模块长出 import 副作用时按 GSK-011 源反射先例做 fail-closed regex 抽取 `export const NAME = Object.freeze([...])` 块）写入头注释。**校准验收**：实现时先对当前树跑一遍——三条已知漂移行（`check-inspect-feedback:215`、`:206-208`、`invariants-brief:23`）必须 FAIL、全仓零误报（gate-skeleton:15/125/130/134 全列等值、wave1-intake:176 窄域、DEW:1238/:1439 正确全复述均须 pass）；C1 合入后三条转绿。guard rails：注释钉住"被 import 模块必须保持 definition-only"不变量；降级路径（某模块长出 import 副作用时改 fail-closed regex 抽取）写入头注释。check-all 自动发现，无注册编辑。
4. **死代码清除**（B1/B2）：删 `work-unit-validation.mjs` autofill 簇（:335-346, 347-352, 372-381）与 nonce normalize 簇（:231-253, 353-370）及 `allowNonceNormalization` 参数面（submit:1261,1702 → supersession:223）；保留 strict throw 与 `receipt_schema_defaulted`。测试基线：`submit.test:1590-1591` 保持绿。
5. **`preflight_candidate_projection` 实现**（B3/A6 代码半）：一行进 `forcedTimeoutAudit`（lifecycle.mjs:1222-1232）；`work-unit-terminal.test.mjs:970-1007` 扩 null 例 + 违规候选例（断言 deep-equality 与 `work_unit_forced_timeout` trace 行携带）；integration mirror 一处。
6. **`recommended_action`→`actor_guidance` 改名**（B4）：`work-unit-actor.mjs`（8 处 key）+ `work-unit-lifecycle.mjs`（:656,676,713）；新增一条回归断言（no-claim 结果带非空 `actor_guidance` 且无顶层 `recommended_action` key）。
7. （可选加固）`PHASE_STATUS_AUDIT_OUTCOMES` 从 engine helper 迁到 schema/contracts（现为裸数组无 zod）。

### C3 `hygiene-pointer-rewrite-and-tableization`（doc 为主 + 账本手术）

范围：D 类指针化 + 表格化 + C2（registry 账本）。

任务要点：
1. H1：`research-wave-phase-content:1054-1058, 1073-1087` 两处近逐字复述改指针（WPG-015 / WTS-012；保留"phase 文档 SHALL 教学"义务）。
2. H3：`gate-skeleton:658-687` 删除重复的士气编码规则与同名 scenario；保留 gate 专属 0/1/2 映射，引用 `cli-exit-code-conventions`。
3. H4：`research-wave-phase-content:486-488,519` return-map 字段/处置形状复述改 RRM-003/RRM-007 指针（同时消除 D9 示例串分叉）。
4. H5：`cli-inspect-output-conventions:27,110,213` 三处字段清单收敛为共享 finding 投影（gate-skeleton）+ CHI-005 语义引用；保留 IOC 自身 exit-code 语义。**注意 D8 双 owner 须在 change 内写明**：形状归 gate-skeleton、`repair_kind` 语义归 check-inspect-feedback。
5. H2（若 C1 未顺带处理 D2/D3/D5/D6/D7/D10 的其余复述面，逐对定稿 owner+指针方向；建议 owner：D2→agent-output-declaration、D3→schema-core、D5→schema-core、D6→wave2-synthesis、D7→gate-skeleton、D10→gate-skeleton）。
6. **场景墙表格化改判缓期（2026-08-31 执行期裁定）**：control-surface 清理的先例是*散文墙*表格化，scenario 块没有既定表格化先例——scenario 标题是 delta-sync key 与校验面，合并 59/38/23 个场景需要逐例语义裁决，自主执行风险恰是本计划反对的漂移源。登记为独立 pending task（触发：专门的 explore change 逐墙设计）；本 change 指标 ④（场景墙 ≤9）如未达在终局统计如实注明 residual。
7. 账本手术（C2）：RRM L879 注册 RRM-008（或 re-home 至 seed-topic-materialization，explore 期定稿）；CTS L876 注册 CTS-012（或并入 CTS-007）；RWP-005/008 头部 ID 处置（恢复正文锚点或移出 header + registry `[DEPRECATED]`——两者取一，不折中）；req-registry 仅增纪律 + D2 的 registry 行（:147）与 AGO 正文口径对齐。
8. **spec prose 中的实现文件引用清扫（2026-08-31 用户评审新增）**：spec 行为 requirement 不得把实现 `.mjs` 文件当所有权证据（代码↔spec 关联由 `@impl` 注释与 req-registry 在另一方向承担）；例外=导出面/CLI 本身是 requirement 主题的 house 模式（如 CHI-004 的 export-lock requirement）。现状全仓 284 处 `.mjs` 引用/55 文件，逐处分类（subject-of-requirement 保留 / 所有权证据改契约 token 或导出名）。Done condition：分类表 + 违例清零，C2 checker 可选加守卫。
9. （弹性，diff 有界才做）吸收 CLS-079 遗留：list-doc-locks 盲点根治、reference-target descriptor 迁移。

### C4 `deepen-work-unit-submit-seams`（engine 内部搬动，外部接口零变化）

范围：T1–T6（carving 报告为准；`work-unit-lifecycle.mjs` 本轮明确不碰）。

任务要点：
1. **T1 不变量测试先行（零生产改动）**：新建 `tests/engine/work-unit-submit-invariants.test.mjs` 实现 S1–S12（子进程 kill -9 崩溃注入、5 个 late-submit 命名边界逐点故障、chmod 击穿恢复、幂等重放、busy 争用、trace↔ledger↔journal 哈希绑定 S11、拒绝路径不触 authority S12）。全部注入点已存在（`transactionHooks.afterMutation` / `afterCommittedBeforeRelease` / `afterMutationBoundary`×5 / `afterQueueSave` / chmod / 子进程），不需要改生产代码。验收：12 场景对未改 engine 全绿、3×重复稳定。
2. **T2 提取 `work-unit-submit-snapshot.mjs`（~300 行）**：Module A 14 函数 + **4 个共享 durable-state 查询必须同迁**（`readQueueSideEffectFree`/`submittedReplacementConflicts`/`targetLedgerRows`/`buildLedgerRow`——这是 submit 内唯一真循环风险的解法，迁后 snapshot 为无环基层）。move-only diff（`buildLedgerRow` 与 postcondition verifier 是哈希/状态契约）；不 经 work-unit-core 再导出（不放宽导出）。回归网：submit.test 1363-1460、transaction.test 845-1099、e2e attempt-recovery、S1-S12。
3. **T3 提取 `work-unit-submit-late-retry.mjs`（~610 行）**：Module B；`work-unit-core` barrel 改从新模块导入（**不得**由 submit re-export——会造 submit↔late 循环）。回归网：submit.test 2561-2995、transaction.test 945-1042、S2/S3/S7/S10/S11。
4. **T4 提取 `work-unit-submit-declaration-recovery.mjs`（~470 行）**：Module C；barrel + `work-unit-supersession.mjs:44` 更新。**承重墙警告**：`readOriginalSubmitEvidence`（submit:547-598）直接解析 v2 journal + 按 tx_id/result_hash/ledger_record_hash join trace 事件——trace payload（late:1995-2030、submit:2370-2414）逐字节保留，S11 钉死。回归网：submit.test 868 + 2911-2995、e2e 1106-1210、S8/S11。
5. **T5 拆 `work-unit-transaction.mjs` 三层（838→180+250+410）**：primitives（路径/哈希/before-image/未声明变异 diff）→ projection（inspect/orphan/wrapper ordering）→ 主文件保留原名（withWorkUnitTransaction + recover + compat re-exports 使 `work-unit-index`/`work-unit-core`/timeout-preflight 导入面不变）。真实内部循环（机制↔inspect 互调）由分层消除。顺带：`sha256Bytes` 合并入 `work-unit-utils.sha256`；`transactionRoot` 与 `work-unit-index.transactionDir` 统一（注意 path.resolve 语义差）。回归网：transaction.test 全量（1099 行）、S1/S2/S5/S8/S9/S10。
6. **T6（可选）**：提取 `work-unit-submit-plan.mjs`（~455 行：validateSubmitPlan→repairTargetForReason + collectDrySubmitPlan/drySubmitWorkUnit），submit 残体 ≤~550 行 facade。深度一步（validateSubmitPlan 与 prepareCurrentDeclarationRecovery 共享"validate current attempt owners"管线）**须单独批准或带书面备注缓期**——recovery 的零规范化严格性是行为敏感面（tangle 3），守 S11 + recovery 全套才可动。

验收（每步）：公开导出面 grep 不变；既有测试全绿；diff 显示纯搬动；`npm test` 全量 0 fail。

---

## 4. 已裁定决策点（propose 期不再重复讨论，除非 owner 推翻）

| 决策点 | 裁定 | 依据 |
|---|---|---|
| `preflight_candidate_projection` | **IMPLEMENT**（一行 + 三处测试断言） | 数据已在审计现场计算且过 schema；零新增计算、零新增 throw 面；AMEND-SPEC 白白丢一个免费诊断 |
| disposition 锁形态 | schema-owned 冻结数组 + zod enum + re-export + 常量替换 + 双测试文件 | 唯一发射点单 choke point（`projectWorkUnitAttemptDisposition`）；镜像 repair-vocabulary 实测模式 |
| `recommended_action` 三义 | **改名 `actor_guidance`**（选项 A） | 自由文本域无 schema/无 spec/零断言；折叠成新封闭集=词表增殖（选项 B 高半径）；写入 spec=锁死不稳定英文句（选项 C 最差） |
| 治理 checker 导入策略 | **静态 import** + definition-only 不变量注释 + fail-closed + 降级路径备案 | 五模块实测无副作用加载；check-all 每_checker 独立进程隔离；regex 抽取无法防"导出变了 regex 没跟" |
| AGQ-027 | 改 spec 措辞（非改代码） | 代码注释自证 distinct-verdict 设计意图；可达状态无行为差异 |
| **spec prose 不得点名实现 .mjs**（用户评审裁定，2026-08-31） | 契约 token/导出名可以，实现文件路径不行；例外=导出面本身是 requirement 主题 | upstream spec 不得知道 downstream 实现在哪个文件；C1 已回改 AGQ-007/CIF/CDP 三处 |
| CHI-004 决策表测试 | **不并入本计划任何 change**，登记独立 pending task | 独立债务，避免 C2 sprawl |

## 5. 非目标（显式排除）

- 不改任何运行时行为语义。四个代码动作全部行为中性或按既有 spec 补齐：死代码删除（不可达分支）、`preflight_candidate_projection` 补齐（spec 既有 SHALL）、`actor_guidance` 改名（无 spec/测试引用）、枚举提升（纯重排）。
- 不拆能力（H8 `return-map-inspection`、H9 topic-layout-resolver 缓期；触发条件：巡检/解析面继续长大）。RWG 不拆（adapter 簇跨切同一批 CLI）。
- 不做批三结构重构（CLI wrapper 合并、gate-loop/gate-fork 改名、gate-helpers barrel 收敛）——继承 CLS-079 排除项。
- `work-unit-lifecycle.mjs`（1279 行）本轮不进 C4。
- 不动 `StopAuthorizationState` 的 code-only 沉默纪律、不动 `unsupported_current_entry_contract` 的 per-CLI tripwire 设计。
- 元层面治理（Charter 级新词表硬门槛）：CLS-079 触发条件命中，但**作为 open question 登记不默认进 C1**——是否本轮吸收由 propose 期与用户裁决。

## 6. 完成标准（每个 change 的 archive 硬前置）

1. `npm run governance:check` 全绿（C2 后为 20 项，含新 checker）。
2. 全量 `npm test` 0 fail（当前基线 ~2882；C2 后 +disposition 测试 +checker 自测 +S1-S12 +改名/补齐回归）。
3. finalizer 全绿 + governed archive（`node openspec/governance/finalize-change-archive.mjs --change <name>` 为唯一收口）。
4. 校准闭环：C2 checker 上线时三条已知漂移行 FAIL→C1 合入后全树 0 FAIL 0 误报。
5. C4 后：`work-unit-submit.mjs` ≤~1030 行（T6 后 ≤~550）、`work-unit-transaction.mjs` ≤~410 行；全仓 grep 公开导入面不变；S1-S12 持续绿。

## 7. Open questions（propose 期裁决）

1. A7 方向：改 `work-unit-submit.mjs:540` 文案（建议）还是改 spec :532 措辞——影响 C1/C2 边界。
2. A12 `source_intake_fan_in`：删字面量还是注历史别名。
3. RRM-008/CTS-012：注册新 ID 还是 re-home（RRM L879 → seed-topic-materialization；CTS L876 → 并入 CTS-007）。
4. RWP-005/008：恢复锚点还是 `[DEPRECATED]`。
5. 元层面治理是否本轮吸收（见 §5）。

## 8. 附录：证据来源（八份只读深挖，全部 file:line 双侧标注）

1. 封闭枚举双向审计（10 集合 + reason_code 反查零死 token；C3/C10 判 CODE-ONLY-OK）
2. delegated-work-units 行为抽审（12+1 声明，10 符合；双代真相 ×2 + 未实现字段 ×1）
3. queue/gate 面审计（Q1-Q24/G1-G24，45/48 MATCH；AGQ-027、gate-skeleton Purpose、source_intake_fan_in、final_delivery 边界项）
4. engine 切缝地图（54 定义逐一归缝；submit 四缝 + transaction 三层无环切法 + 12 个 S 场景 + T1-T6 顺序）
5. DEW 全量 29 条扫描（5 发现；26/29 完全符合；死代码簇行号精确）
6. 决策点 Q1-Q4（IMPLEMENT 裁定、五值锁精确补丁、改名爆炸半径表、checker 实测定标）
7. 形状 B 结构分析（4 spec 聚类图 + D1-D11 复述表 + S1-S8 陈旧 prose 核验 + H1-H11 卫生任务清单 + 拆分成本机制：≈6 文件+prefix+ID churn+@impl 清扫 vs prose 修复 ≈1 文件）
8. 前车之鉴研读（`_done/_closed_plans/spec-semantic-drift-remediation.md`：GSK-011 姿态、元治理触发器、批三排除项、遗留登记）

---

## 9. 执行协议（每个 change 的推进节奏，硬性）

对 C1–C4 中**任何一个** change，一律走完整节奏、中途不停顿等确认：

1. `/opsx:propose` 立项（spec delta + design + tasks + verification plan）。§7 的 open questions **必须在本步/explore 期解决**——这是唯一的合法停靠点，进 apply 前不允许遗留未决决策。
2. **propose 之后立即跟上 `/polish-openspec-change`**，按其循环打磨（≥2 passes：全变更一致性 + 风险主导复核），所有 readiness 由证据挣得而非口头声称；期间同批修掉所有机器可解缺陷，未决的产品决策回抛用户。
3. 达到 **`ready for apply`**（`openspec validate --strict` 绿、`git diff --check` 干净、applyRequires 全齐、最后一轮 polish 零新发现）后，**不停下**——直接继续 `/opsx:apply` 按 tasks 执行、`/opsx:archive` 走 governed 收口（`finalize-change-archive.mjs` 为唯一归档转场），一杆到底。
4. 该 change archive 后立即跑 `_backlog/plans/drift-resync-metrics-snapshot.mjs` 追加快照（Post-Cn），再进入下一个 change 的 propose。
5. 例外（合法停下点）：① §7 open questions 需要用户裁决；② apply 期出现 spec 未预见的语义冲突（回 explore，不允许 chat-only 规则）；③ 验证失败且根因在 change 之外（外部 blocker，如实报告）。

---

## 10. 追踪与快照（Tracking）

**目的**：回答"change 堆来堆去，spec 是越来越复杂，还是真的在改善"。所有指标机器口径、可重复测量；每个 change archive 后测一次，计划关闭时出终局 Δ 统计表。

### 10.1 测量方法

- 工具：`_backlog/plans/drift-resync-metrics-snapshot.mjs`（纯 Node 内置、只读、无依赖、非 authority 面；随 plan 存放）。
- 运行：`node _backlog/plans/drift-resync-metrics-snapshot.mjs`，输出粘贴为本节新快照（标题注明日期与触发点：`Baseline` / `Post-C1` / `Post-C2` / `Post-C3` / `Post-C4` / `Final`）。
- 判读规则：① 同一脚本同一口径，行数波动 ±1% 以内视为持平；② **质量指标优先于体积指标**——行数不降不一定是坏消息（重写/对齐常常等长），漂移台账、词汇锁广度、死代码、场景墙才是"复杂度利息"的直接度量；③ 任何探针从 PRESENT/OPEN 翻转必须能在对应 change 的 archive diff 里指认。

### 10.2 Baseline 快照（2026-08-31，计划启动时）

#### 度量快照（机器口径，重复运行可比）

| # | 指标 | 值 |
|---|---|---|
| 1 | spec 文件数 | 83 |
| 2 | spec 总行数 | 30958 |
| 3 | requirement 总数 | 654 |
| 4 | scenario 总数 | 2881 |
| 5 | guidance md 文件数 | 7 |
| 6 | Top-10 最重 spec 合计行数 | 11433 |
| 7 | 单 requirement ≥20 场景的"场景墙"数 | 12（合计 339 场景） |
| 8 | engine .mjs 文件数 / 总行数 | 87 / 35683 |
| 9 | work-unit-* 模块数 | 22 |
| 10 | 最大 engine 文件行数 | engine/work-unit-submit.mjs = 2448 |
| 11 | schema z.enum 数 / 冻结数组数（词汇锁广度） | 59 / 57 |
| 12 | governance check 数 | 16 |
| 13 | tests/**/*.test.mjs 文件数 / test() 调用数 | 301 / 123 |

#### Top-10 最重 spec

| spec | 行 | req | scen |
|---|---|---|---|
| agent/delegated-work-units | 2490 | 29 | 254 |
| research/research-wave-gate-implementation | 1425 | 24 | 128 |
| research/research-wave-phase-content | 1167 | 22 | 114 |
| agent/agentic-queue | 1077 | 28 | 95 |
| research/research-return-map | 963 | 8 | 89 |
| research/canonical-topic-state | 959 | 12 | 101 |
| engine/gate-skeleton | 899 | 19 | 104 |
| bundle/reference-flat-format | 854 | 12 | 65 |
| research/content-delivery-phase-content | 841 | 8 | 62 |
| engine/cli-phase-transition | 758 | 8 | 72 |

#### 场景墙（单 requirement ≥20 场景）

| spec / requirement | 场景数 |
|---|---|
| research-return-map → Return-map inspection SHALL verify current-round projection… | 59 |
| canonical-topic-state → Canonical topic mutation SHALL atomically materialize… | 38 |
| delegated-work-units → Work-unit dry-submit SHALL preflight submit validation… | 29 |
| canonical-topic-state → Topic-state operations SHALL preserve scope and authority… | 28 |
| post-final-recovery → Post-final recovery SHALL expose one direct eligibility… | 27 |
| delegated-work-units → Work-unit envelope SHALL carry binding surfaces | 25 |
| subagent-node-contract → Generated result schema and submit enforcement… | 25 |
| delegated-work-units → Timeout terminalization SHALL be guarded by progress-aware… | 23 |
| research-wave-gate-implementation → Blocking judgment contracts SHALL close… | 23 |
| wave1-intake → Wave1 gate checks deepening artifacts | 22 |
| research-wave-phase-content → Wave phase docs SHALL teach canonical gate-consumable refs… | 20 |
| runtime-reentry-debuggability → Reentry diagnostics SHALL summarize incident-shaped… | 20 |

#### Top-5 最大 engine 文件

| 文件 | 行 |
|---|---|
| engine/work-unit-submit.mjs | 2448 |
| engine/helpers/canonical-topic-state.mjs | 1880（本计划范围外，仅记录） |
| engine/helpers/gate-helpers-core.mjs | 1444 |
| engine/helpers/wave-depth-contracts.mjs | 1359 |
| engine/helpers/gate-helpers-checks.mjs | 1295 |

#### 计划进度探针（Baseline）

| 探针 | 状态 |
|---|---|
| C1: spec 复述 `semantic_boundary` 作 gate-hint kind | **OPEN（残渣仍在）** |
| C2: WORK_UNIT_ATTEMPT_DISPOSITIONS 导出存在 | ABSENT |
| C2: WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS 提升存在 | ABSENT |
| C2: 新治理 checker 存在 | ABSENT |
| C2: 死代码 `allowNonceNormalization` 残留 | **PRESENT（未清）** |
| C2: 死代码 `receipt_binding_identity_autofilled` 残留 | **PRESENT（未清）** |
| C2: forcedTimeoutAudit 携带 `preflight_candidate_projection` | ABSENT（未实现） |
| C2/B4: actor 自由文本字段已改名 `actor_guidance` | NOT-YET |
| C4: snapshot / late-retry / declaration-recovery 模块提取 | NOT-YET ×3 |
| C4: transaction-primitives/projection 已分层 | NOT-YET |

### 10.3 漂移台账（人工口径，与 §2 发现一一对应）

| 组 | 项数 | 明细 | Baseline 状态 | 归属 |
|---|---|---|---|---|
| A 类 spec 侧漂移 | 14 | A1–A14 | 全部 Open（其中 MEDIUM ×4：A1/A2/A4/A5；LOW-MED ×1：A6） | C1（A1–A5 spec 半、A8–A14）+ C2（A6/A7 代码半） |
| B 类死代码/未实现 | 4 | B1–B4 | 全部 Open | C2 |
| C 类账本 | 2 | C1–C2 | 全部 Open | C1（catalog 行）/ C3（registry 手术） |
| D 类跨 spec 复述 | 10 | D1–D10 | 全部 Open（D2 已实际漂移、D9 示例串已分叉） | C3 |
| 观察项/遗留 | 4 | CHI-004 决策表占位符、list-doc-locks 盲点、reference-target 迁移、CLI exit-code 无代码锁 | Open（非阻塞登记） | 独立 pending / 缓期 |

### 10.4 终局统计表（计划关闭时填写，格式固定）

| 指标 | Baseline | Final | Δ | 判读 |
|---|---|---|---|---|
| 漂移台账关闭率 | 0/30 | — | — | **主指标**：目标 30/30 |
| MEDIUM+ 漂移未决数 | 5 | — | — | 目标 0 |
| 死代码探针 | 2 PRESENT | — | — | 目标 0 |
| 词汇锁广度（z.enum / 冻结数组） | 59 / 57 | — | — | 目标 +2（disposition、candidate 提升）且 checker 上线 |
| 治理 check 数 | 16 | — | — | 目标 17（+`check-spec-enum-restatements`，全树 0 FAIL 0 误报） |
| 场景墙数（≥20 scen） | 12 | — | — | 目标 ≤9（三处表格化各消一墙） |
| Top-10 spec 合计行数 | 11433 | — | — | 预期下降（指针化）；不降不判失败（见 10.1 判读②） |
| spec 总行数 | 30958 | — | — | 同上 |
| 最大 engine 文件 | 2448 | — | — | 目标 ≤1030（T6 后 ≤550；注：canonical-topic-state.mjs 1880 将成为新最大值，范围外如实报告） |
| work-unit-* 模块数 | 22 | — | — | 预期 +4~5（文件数上升是刻意的：max-size 下降、层内无环） |
| 测试文件 / test() 数 | 301 / 123 | — | — | 预期显著上升（+S1–S12 +checker 自测 +disposition +改名/补齐回归）；npm test 全绿为硬前置 |

### 10.5 Post-C1 快照（2026-08-31，commit 266553455，finalizer 19/19）

变化 vs Baseline：spec 总行数 30958→30948（-10）；测试 301→302 文件 / 123→132 test()；**C1 探针 `semantic_boundary` 残渣 CLEARED**；台账 A1–A14、C1 项关闭（B/C2 归属项待 C2）；governance 16 check 全 PASS；npm test 2889/2889。其余指标持平（符合预期——C1 是 doc-only 重同步）。

## 度量快照（机器口径，重复运行可比）

| # | 指标 | 值 |
|---|---|---|
| 1 | spec 文件数 | 83 |
| 2 | spec 总行数 | 30948 |
| 3 | requirement 总数 | 654 |
| 4 | scenario 总数 | 2881 |
| 5 | guidance md 文件数 | 7 |
| 6 | Top-10 最重 spec 合计行数 | 11429 |
| 7 | 单 requirement ≥20 场景的"场景墙"数 | 12（合计 339 场景） |
| 8 | engine .mjs 文件数 / 总行数 | 87 / 35683 |
| 9 | work-unit-* 模块数 | 22 |
| 10 | 最大 engine 文件行数 | DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs = 2448 |
| 11 | schema z.enum 数 / 冻结数组数（词汇锁广度） | 59 / 57 |
| 12 | governance check 数 | 16 |
| 13 | tests/**/*.test.mjs 文件数 / test() 调用数 | 302 / 132 |

### Top-10 最重 spec

| spec | 行 | req | scen |
|---|---|---|---|
| agent/delegated-work-units/spec.md | 2488 | 29 | 254 |
| research/research-wave-gate-implementation/spec.md | 1425 | 24 | 128 |
| research/research-wave-phase-content/spec.md | 1167 | 22 | 114 |
| agent/agentic-queue/spec.md | 1072 | 28 | 95 |
| research/research-return-map/spec.md | 963 | 8 | 89 |
| research/canonical-topic-state/spec.md | 959 | 12 | 101 |
| engine/gate-skeleton/spec.md | 899 | 19 | 104 |
| bundle/reference-flat-format/spec.md | 854 | 12 | 65 |
| research/content-delivery-phase-content/spec.md | 844 | 8 | 62 |
| engine/cli-phase-transition/spec.md | 758 | 8 | 72 |

### 场景墙（单 requirement ≥20 场景）

| spec / requirement | 场景数 |
|---|---|
| research/research-return-map/spec.md → Return-map inspection SHALL verify current-round projection  | 59 |
| research/canonical-topic-state/spec.md → Canonical topic mutation SHALL atomically materialize plan a | 38 |
| agent/delegated-work-units/spec.md → Work-unit dry-submit SHALL preflight submit validation witho | 29 |
| research/canonical-topic-state/spec.md → Topic-state operations SHALL preserve scope and authority bo | 28 |
| research/post-final-recovery/spec.md → Post-final recovery SHALL expose one direct eligibility and  | 27 |
| agent/delegated-work-units/spec.md → Work-unit envelope SHALL carry binding surfaces | 25 |
| agent/subagent-node-contract/spec.md → Generated result schema and submit enforcement SHALL match k | 25 |
| agent/delegated-work-units/spec.md → Timeout terminalization SHALL be guarded by progress-aware p | 23 |
| research/research-wave-gate-implementation/spec.md → Blocking judgment contracts SHALL close across producer, aut | 23 |
| research/wave1-intake/spec.md → Wave1 gate checks deepening artifacts | 22 |
| research/research-wave-phase-content/spec.md → Wave phase docs SHALL teach canonical gate-consumable refs a | 20 |
| engine/runtime-reentry-debuggability/spec.md → Reentry diagnostics SHALL summarize incident-shaped recovery | 20 |

### Top-5 最大 engine 文件

| 文件 | 行 |
|---|---|
| DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs | 2448 |
| DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs | 1880 |
| DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs | 1444 |
| DEEP_RESEARCH_HARNESS/engine/helpers/wave-depth-contracts.mjs | 1359 |
| DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs | 1295 |

### 计划进度探针

| 探针 | 状态 |
|---|---|
| C1: spec 复述 `semantic_boundary` 作 gate-hint kind | CLEARED/ABSENT |
| C2: WORK_UNIT_ATTEMPT_DISPOSITIONS 导出存在 | ABSENT |
| C2: WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS 提升存在 | ABSENT |
| C2: 新治理 checker 存在 | ABSENT |
| C2: 死代码 allowNonceNormalization 残留 | PRESENT(死代码未清) |
| C2: 死代码 receipt_binding_identity_autofilled 残留 | PRESENT(死代码未清) |
| C2: forcedTimeoutAudit 携带 preflight_candidate_projection | ABSENT(未实现) |
| C2/B4: actor 自由文本字段已改名 actor_guidance | NOT-YET |
| C4: snapshot 模块已提取 | NOT-YET |
| C4: late-retry 模块已提取 | NOT-YET |
| C4: declaration-recovery 模块已提取 | NOT-YET |
| C4: transaction-primitives/projection 已分层 | NOT-YET |

### 10.6 Post-C2 快照（2026-08-31，C2 finalizer 19/19）

变化 vs Post-C1：词汇锁广度 z.enum 59→60 / 冻结数组 57→59；**治理 16→17（`check-spec-enum-restatements` 上线，全树 0 FAIL 0 误报）**；submit.mjs 2448→2440（死代码清除起效）；**C2 探针全部翻转**（disposition 锁/candidate 提升/checker/preflight 字段 PRESENT，actor 改名 RENAMED）；台账 B1–B4、A6/A7 关闭；测试 302→304 文件、2903/2903。场景墙 12 持平（归 C3/缓期处置）。

## 度量快照（机器口径，重复运行可比）

| # | 指标 | 值 |
|---|---|---|
| 1 | spec 文件数 | 83 |
| 2 | spec 总行数 | 30948 |
| 3 | requirement 总数 | 654 |
| 4 | scenario 总数 | 2881 |
| 5 | guidance md 文件数 | 7 |
| 6 | Top-10 最重 spec 合计行数 | 11429 |
| 7 | 单 requirement ≥20 场景的"场景墙"数 | 12（合计 339 场景） |
| 8 | engine .mjs 文件数 / 总行数 | 87 / 35635 |
| 9 | work-unit-* 模块数 | 22 |
| 10 | 最大 engine 文件行数 | DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs = 2440 |
| 11 | schema z.enum 数 / 冻结数组数（词汇锁广度） | 60 / 59 |
| 12 | governance check 数 | 17 |
| 13 | tests/**/*.test.mjs 文件数 / test() 调用数 | 303 / 133 |

### Top-10 最重 spec

| spec | 行 | req | scen |
|---|---|---|---|
| agent/delegated-work-units/spec.md | 2488 | 29 | 254 |
| research/research-wave-gate-implementation/spec.md | 1425 | 24 | 128 |
| research/research-wave-phase-content/spec.md | 1167 | 22 | 114 |
| agent/agentic-queue/spec.md | 1072 | 28 | 95 |
| research/research-return-map/spec.md | 963 | 8 | 89 |
| research/canonical-topic-state/spec.md | 959 | 12 | 101 |
| engine/gate-skeleton/spec.md | 899 | 19 | 104 |
| bundle/reference-flat-format/spec.md | 854 | 12 | 65 |
| research/content-delivery-phase-content/spec.md | 844 | 8 | 62 |
| engine/cli-phase-transition/spec.md | 758 | 8 | 72 |

### 场景墙（单 requirement ≥20 场景）

| spec / requirement | 场景数 |
|---|---|
| research/research-return-map/spec.md → Return-map inspection SHALL verify current-round projection  | 59 |
| research/canonical-topic-state/spec.md → Canonical topic mutation SHALL atomically materialize plan a | 38 |
| agent/delegated-work-units/spec.md → Work-unit dry-submit SHALL preflight submit validation witho | 29 |
| research/canonical-topic-state/spec.md → Topic-state operations SHALL preserve scope and authority bo | 28 |
| research/post-final-recovery/spec.md → Post-final recovery SHALL expose one direct eligibility and  | 27 |
| agent/delegated-work-units/spec.md → Work-unit envelope SHALL carry binding surfaces | 25 |
| agent/subagent-node-contract/spec.md → Generated result schema and submit enforcement SHALL match k | 25 |
| agent/delegated-work-units/spec.md → Timeout terminalization SHALL be guarded by progress-aware p | 23 |
| research/research-wave-gate-implementation/spec.md → Blocking judgment contracts SHALL close across producer, aut | 23 |
| research/wave1-intake/spec.md → Wave1 gate checks deepening artifacts | 22 |
| research/research-wave-phase-content/spec.md → Wave phase docs SHALL teach canonical gate-consumable refs a | 20 |
| engine/runtime-reentry-debuggability/spec.md → Reentry diagnostics SHALL summarize incident-shaped recovery | 20 |

### Top-5 最大 engine 文件

| 文件 | 行 |
|---|---|
| DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs | 2440 |
| DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs | 1880 |
| DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs | 1444 |
| DEEP_RESEARCH_HARNESS/engine/helpers/wave-depth-contracts.mjs | 1359 |
| DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs | 1295 |

### 计划进度探针

| 探针 | 状态 |
|---|---|
| C1: spec 复述 `semantic_boundary` 作 gate-hint kind | CLEARED/ABSENT |
| C2: WORK_UNIT_ATTEMPT_DISPOSITIONS 导出存在 | PRESENT |
| C2: WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS 提升存在 | PRESENT |
| C2: 新治理 checker 存在 | PRESENT |
| C2: 死代码 allowNonceNormalization 残留 | CLEARED |
| C2: 死代码 receipt_binding_identity_autofilled 残留 | CLEARED |
| C2: forcedTimeoutAudit 携带 preflight_candidate_projection | PRESENT |
| C2/B4: actor 自由文本字段已改名 actor_guidance | RENAMED |
| C4: snapshot 模块已提取 | NOT-YET |
| C4: late-retry 模块已提取 | NOT-YET |
| C4: declaration-recovery 模块已提取 | NOT-YET |
| C4: transaction-primitives/projection 已分层 | NOT-YET |

**"显著改善"的裁定标准（计划关闭时逐条打勾）**：① 台账 30/30 归零且无新增 MEDIUM；② 死代码与双代真相清零；③ 三个新锁 + 一个 checker 生效（未来词表漂移由机器拦截）；④ 场景墙 ≤9 且 Top-10 无增长；⑤ C4 后 work-unit 域最大文件 ≤1030 行且全部既有测试绿。①②③ 任何一条未达即计划不得关闭（可部分关闭并在台账注明 residual）。
