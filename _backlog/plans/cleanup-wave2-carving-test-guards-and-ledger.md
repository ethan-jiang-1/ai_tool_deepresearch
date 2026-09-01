# 第二波打扫：engine 第二梯队切缝、测试守护网与账本清扫（cleanup-wave2-carving-test-guards-and-ledger）

> 状态: **active（审计回填期）** | 创建: 2026-08-31 | 上游: CLS-082 `drift-resync-locks-hygiene-and-work-unit-deepening`（已完成）的成功模式复用
> 定位: `_backlog` 上游分析与决策记录，非运行时真相；落地一律走 OpenSpec change 生命周期。
> 执行协议: 沿用 CLS-082 §9——每个 change propose → `/polish-openspec-change` 打磨至 ready for apply → 不停顿直通 apply → governed archive → git commit → 快照复测；合法停靠点仅限三项（open question 需裁决 / 未预见语义冲突 / change 外部 blocker）。
> 意图（用户原话精神）: "非常有效的打扫卫生"——把 C1–C4 验证过的打法（不变量先行 + 深模块切缝 + 指针化 + 账本增补）推广到第二梯队，**每一步都先让机器可验证**。

---

## 1. 背景与意图

CLS-082 波次验证了三件事：①工作单元深水区可以零行为变化地切缝（submit 2439→1048）；②"不变量测试先行 + 程序化搬动 + 全量回归"是安全的重构姿势；③漂移清零后，词汇锁 + 新 checker 能把复发关掉。

本波把同一打法推广到：**engine 第二梯队大文件**（切缝）、**测试层守护网**（先于切缝部署）、**第二轮死代码/无主导出**（C2 打法推广）、**spec 侧账本**（`.mjs` 引用 284 处分类清扫等）。

## 2. 已确认线索（本会话实测，非猜测）

### 2.1 engine 体量分布（Post-C4 实测）

| 文件 | 行数 | 已知消费者（粗 grep，口径待审计修正） | 备注 |
|---|---|---|---|
| `helpers/canonical-topic-state.mjs` | **1879** | 7 文件 | 新任最大文件；topic mutation workspace + layout resolver；C4 快照明确"范围外，已登记" |
| `helpers/gate-helpers-core.mjs` | 1443 | 粗 grep 0（疑似经 `gate-helpers.mjs` 桶再导出） | 待审计核实真实消费图 |
| `helpers/wave-depth-contracts.mjs` | 1358 | 2 文件 | 低扇入大文件——可能是"下沉/合并"候选而非切分候选 |
| `helpers/gate-helpers-checks.mjs` | 1294 | 粗 grep 0（同上，疑桶导出） | 待核实 |
| `helpers/artifact-persistence.mjs` | 1284 | 待查 | 第二梯队新入榜 |
| `engine/work-unit-lifecycle.mjs` | 1280 | — | CLS-082 C4 明确不动；本波是否纳入待定 |
| `helpers/handoff-helpers.mjs` | 1273 | 待查 | — |
| `helpers/wave-contract-evaluators.mjs` | 1264 | 待查 | gate 规则评估器族 |
| `engine/helpers/return-map.mjs` | 1031 | 待查 | — |
| `engine/work-unit-supersession.mjs` | 1025 | — | C4 后首次入榜 |

### 2.2 账本/残余（上一波 §10.9 登记，本波候选）

1. **spec prose `.mjs` 引用 284 处 / 55 文件**——需按 CLS-082 确立的规则三分类（A 合法=代码面即主题 / B 无谓=所有权证据 / C 过时=路径不存在）；C1 已清 3 处示范。
2. **场景墙**：RRM 59 场景、CTS 38、RWG 23——scenario 块无表格化 house 先例，需专门 explore（非机械活）。
3. **CHI-004 决策表回归测试占位符**：`tests/engine/work-unit-recovery-decision-table.test.mjs` 为 1 行 placeholder，而 `RUN.md:78` 与 `invariants-brief.md` 引用它作为锁定面。
4. **sha256Bytes / transactionRoot 统一**：C4 deviation（等价私有实现并存）。
5. **CLI exit-code 无代码锁**：纯文档约定（tri-state 0/1/2），新 CLI 可静默违规。
6. **check-all 全量并发下偶发失败**：`check-all aggregation` integration 测试在全量套件并发下曾失败两次、单跑通过——并发/超时机制待诊断。

### 2.3 上一波遗留中明确**不进**本波的

- H8/H9 能力拆分（`return-map-inspection`、topic-layout-resolver）——触发条件未到。
- H5 IOC 字段清单——执行期复核后已维持现状。
- 元层面治理（Charter 级新词表硬门槛）——仍需用户裁决是否立项。

---

## 3. 四路只读审计（in-flight，结果回填本节）

| # | 审计 | 回答的问题 | 状态 |
|---|---|---|---|
| AUD-1 | engine 第二梯队四文件深挖（canonical-topic-state / gate-helpers-core / wave-depth-contracts / gate-helpers-checks）+ Next-5 榜单 | 聚类地图、消费图、环风险、测试覆盖、切分/下沉/合并建议与排序 | **进行中** |
| AUD-2 | 第二轮死代码清查（exported-never-imported、private-never-called、dead-flexibility 参数面、孤儿 schema 枚举、test-only 面） | 哪些是 DEAD / DE-EXPORT / TEST-ONLY / DEAD-FLEXIBILITY | **进行中** |
| AUD-3 | 测试层守护面（C4 切分后的 stale module-path 引用、零覆盖模块清单、helper 重复度量化、check-all 并发 flakiness 根因） | ✅ **完成**：①C4 切分后无测试因此失败，但 **3 个真实缺陷**——(S1) 残余 token 负向扫描只覆盖 3 个旧文件、未覆盖 5 个新 C4 模块（回归逃逸洞）；(S2) rerun-added-topic 测试的 negative 清单同样漏新模块；(S3) attempt-recovery 结构锁 indexOf 切片无边界守卫（当前有效但脆弱）。②覆盖图：92 模块中 16 个零直测引用（含 C4 的 primitives/projection 仅经 facade 可达）；模块级孤岛：composition-handoff-operation、gate-degradation-policy（仅 CLI 面可达）；>500 行文件 24 个全部有 ≥1 直测引用。③**helper 重复 ~650 行**（tempBundle×6、cleanup×6、authoritySnapshot×5、wait 系双胞胎等）→ 收拢净减 ~500 行，wave-1（等价体）~130 行近零风险。④**check-all flakiness 根因确认**：(a) test script 无 --test-concurrency → node 默认 cores-1 并发；(b) check-all 测试 2 在真实 openspec/changes 树建删 fixture change，并行 checker 可见且 test 1 的 before/after deepEqual 会被并行写入打爆；(c) per-checker 120s 预算仅 ~2x 最差观测；(d) waitForFile 3s vs 5s 不一致。修复选项：并发限流 / 超时余量 / fixture hermetic 化（mkdtemp + --root 透传）/ waitForFile 提额 |
| AUD-4 | spec 侧第二轮（`.mjs` 284 处三分类全量、四归档 change 自身引入的新漂移抽检、experiments 族与 user-research-controls 陈旧 prose、头部 meta 卫生） | ✅ **完成**（308 处实测）：CLASS-A 295（96%，合法保留）/ **CLASS-B 13 处·12 站点·10 文件（清扫目标，完整清单见审计报告）** / CLASS-C **0**（所有 MISS 均有合规解释）；四归档 change 自身**未引入新漂移**，仅 1 处 C2 引致的 owner 指针落后一跳（`check-inspect-feedback:200` disposition 词汇应改指 `WORK_UNIT_ATTEMPT_DISPOSITIONS` 冻结导出）；另确认 schema-core Purpose 计数过时（10→14 枚举/6→10 契约）、`research-wave-experiments` Purpose 引用不存在的 playbook 文件名、delta-synced 标记约定需一次裁决。清扫分组建议：finding-shape 三兄弟 / shorthand 路径对 / governance 对 / 四个单点；**前置：10 个涉改文件先跑 list-doc-locks** |

> 回填规则：审计结论逐条对照本计划的 change 分解（§5）；与计划冲突的发现（如某文件判定"合并而非切分"）以审计为准并在此登记修正。

---

## 4. 思路：为什么这样排

上一波的最大教训与最大成功都是**顺序**：S1–S12 不变量网先于任何搬动，使"纯搬动"成为可断言的事实而非口头承诺。本波沿用并加强：

1. **守护网先于切缝**：AUD-3 会找出零覆盖模块与脆弱引用——先补测试守护，再动 canonical-topic-state 这类 7 消费者的文件。切缝的"可安全性"= 不变量测试覆盖率，不是 reviewer 的自信。
2. **低扇入文件不做切分**：`wave-depth-contracts` 若确认只有 2 个消费者，切分只会增加文件数不增加可读性——候选动作变为"下沉到唯一消费者"或"保持原样"，由审计定夺。这防止把 C4 模式当成锤子。
3. **桶结构（gate-helpers.mjs）是双刃剑**：桶再导出让"谁在真正消费 core/checks"不可见——审计需要穿透桶建立真实消费图；切分方案必须保持桶面不变（compat re-export 模式，C4 已验证）。
4. **死代码清除独立于切缝**：C2 经验——死代码是漂移温床，但清除要有测试锁与全量回归双保险；第二轮清查出的 DEAD-FLEXIBILITY（永远同值的参数面）优先级最高（它们是未来漂移的伪装）。
5. **spec 侧不与 engine 侧混车**：`.mjs` 引用清扫是纯 spec 操作（可机械分类 + 人工抽验），与 engine 切缝的验证面完全不同——独立 change，避免 sprawl diff。

---

## 5. 渐进式 change 分解（预估 4–6 个，串行，一次一个 active）

> 编号预留给本波：W1–W5。每个 change 的 proposal 前置 = 对应审计结果 + polish 打磨。审计若推翻分解（如 canonical-topic-state 判定"不切"），本节按审计修正。

### W1 `harden-test-guards-before-carving`（测试守护网，先做；小代码=纯测试）

- 范围（依 AUD-3）：
  1. 修复 check-all 并发 flakiness（超时/并发参数或测试隔离，二选一，explore 定）；
  2. stale module-path 引用修正（C4 切分后仍指向旧位置的测试断言）；
  3. 为第二梯队四个大文件的**现有公开行为**补最小守护测试（切缝前的不变量基线——不追求 S1-S12 的深度，只求搬动前后可对比）；
  4. helper 重复收拢（仅当审计显示 ≥3 处同体 helper 且收拢 diff 有界）。
- Done condition：全量绿 + 四个目标文件的"行为基线测试"在案。
- 规模：M。风险：低（纯测试）。

### W2 `carve-canonical-topic-state`（最大文件切缝；依 AUD-1）

- 范围：按 AUD-1 的聚类地图拆 `canonical-topic-state.mjs`（1879 行，7 消费者）。候选缝（预判，待审计确认）：topic mutation workspace / layout resolver / seed projection——三者边界在 spec（CTS-005/006/007）本就分明。
- 纪律：move-only；桶/导入面 grep 不变；W1 基线测试 + 既有全套回归双网；若审计发现环，采用 C4 transaction 的三层解法。
- Done condition：主文件 ≤ 修复目标行数（审计给出）；公开导出面不变；全量绿。
- 规模：L（1879 行 + 7 消费者）。风险：中——消费面广。

### W3 `carve-or-consolidate-gate-helpers-and-tier2`（依 AUD-1/AUD-2 排序，可能拆成 W3a/W3b）

- 范围：gate-helpers-core/checks（桶穿透后的真实切分或保持）、wave-depth-contracts（预判：下沉/合并）、artifact-persistence/handoff-helpers（视审计）。
- 每个文件的处置四选一：**切分 / 下沉至唯一消费者 / 合并近亲 / 保持原样**——由消费图与环风险决定，不预设。
- Done condition：逐文件处置表 + 全量绿 + 导出面不变。
- 规模：M–L。风险：中（gate 评估器是 HITL/质量门禁区， Helper-Oriented 宪法要求确定性裁决不动）。

### W4 `clear-dead-code-and-de-exports`（第二轮死代码；依 AUD-2）

- 范围：AUD-2 的 DEAD（删除）、DE-EXPORT（收窄导出）、DEAD-FLEXIBILITY（删参数面）三类；TEST-ONLY 单列不入（登记）。
- Done condition：每条 finding 的回归锁（删除后 token 零命中）+ 全量绿。
- 规模：S–M。风险：低-中（死代码判定需双侧证据，C2 已有先例）。

### W5 `sweep-spec-mjs-references-and-ledger`（spec 账本；doc-only）

- 范围（依 AUD-4）：
  1. `.mjs` 284 处分类结果落地：CLASS-C 过时引用修正；CLASS-B 无谓所有权证据改契约 token/导出名（保留 CLASS-A 合法面：export-lock requirement、CLI 命名、schema 契约引用）；
  2. CHI-004 决策表回归测试填充（RUN.md 表行 × `WORK_UNIT_RECOVERY_ACTIONS` 导出派生，C2 checker 同族手法）；
  3. AUD-4 新发现的陈旧 prose。
- 不含：场景墙表格化（独立 explore）、exit-code 代码锁（观察项转正与否需单独裁决）。
- Done condition：CLASS-B/C 清零 + 决策表测试绿 + 全量绿。
- 规模：M。风险：低-中（registry 只增纪律）。

### 顺序与依赖

AUD → **W1（守护网）** → W2（最大文件）→ W3（梯队处置）→ W4（死代码）→ W5（spec 账本）。W1 必须最先（守护网是 W2/W3 的安全带）；W4/W5 互不依赖、可按审计完成度插队；W2/W3 串行（同验证面，避免并行 sprawl）。

---

## 6. 度量追踪（沿用 CLS-082 快照机制）

- 工具：`_backlog/_done/_closed_plans/drift-resync-metrics-snapshot.mjs`（随 CLS-082 归档，本波直接复用；若需新指标再增补，不修改已归档工具）。
- 本波新增追踪指标（在既有 13 项之上）：
  | 指标 | Baseline（本波启动时） | 说明 |
  |---|---|---|
  | 第二梯队四文件行数合计 | 5986（1879+1443+1358+1294） | 切缝/下沉后最大单文件 ≤ 修复目标 |
  | engine 零覆盖模块数 | 待 AUD-3 | 目标 0（每个 >500 行模块至少一个直测文件）|
  | helper 重复份数 | 待 AUD-3 | 收拢后下降 |
  | spec `.mjs` 引用 CLASS-B/C | 284 总量中待分类 | CLASS-C 清零、CLASS-B 收敛 |
  | DEAD / DE-EXPORT / DEAD-FLEXIBILITY | 待 AUD-2 | 逐条清零或登记 TEST-ONLY |
- 快照节奏：每个 change archive 后一次（Post-W1…），计划关闭时终局 Δ 统计表（沿用 CLS-082 §10.8 三列格式 + 判读规则：质量指标优先于行数）。

## 7. 非目标（显式排除）

- 不改任何运行时行为语义（本波仍是"打扫"：搬动、删除死代码、补测试、改 spec 指针——无新行为）。
- `work-unit-lifecycle.mjs` 是否纳入待 AUD-1 结论与用户裁决（上一波明确不动；本波默认仍不动）。
- 不做场景墙表格化（独立 explore）、不做能力拆分（H8/H9 触发条件未到）、不做元层面治理（Charter 级门槛）。
- gate 评估器的确定性裁决逻辑（HITL/质量门语义）一个字节不改——Helper-Oriented 宪法红线。
- 不新增运行时依赖；测试基线的 `npm test` 全绿是每个 change 的硬前置。

## 8. Open questions（propose 期裁决）

1. `work-unit-lifecycle.mjs`（1280）是否纳入本波 W2/W3？（默认：不纳入）
2. `wave-depth-contracts.mjs` 若确认低扇入：下沉 vs 合并 vs 保持？
3. check-all flakiness 修复方向：测试隔离（串行化该测试）vs infra 参数（并发/超时）？
4. `.mjs` 清扫中 CLASS-A 的边界案例（schema/contracts 契约引用算 A 还是 B）——抽样裁决后形成判例。
5. CHI-004 决策表测试是否随 W5 落地（本波唯一"补测试面"的 spec 账本项）？

## 9. 与上一波（CLS-082）的关系

- 复用：S 网不变量方法、codemod 搬动 + 逐文件 diff 复核、export-face grep 对照、快照度量、执行协议（§头部）。
- 差异：本波目标多为 `helpers/` 下的 gate 评估器族（上一波是 work-unit 域）——确定性裁决密集，搬动纪律要更严（D4 move-only 红线 + 宪法 Helper-Oriented 检查）。
- 继承遗留：§2.2 六项中本波吸收 4 项（`.mjs` 清扫、CHI-004 测试、check-all flakiness、死代码第二轮），缓期 2 项（场景墙、exit-code 锁）。
