# 第二波打扫：engine 第二梯队切缝、测试守护网与账本清扫（cleanup-wave2-carving-test-guards-and-ledger）

> 状态: **active（调查完成——四路审计全部回填，§5 终稿 + value÷risk 评估已落；**待用户确认后开工**）** | 创建: 2026-08-31 | 上游: CLS-082 `drift-resync-locks-hygiene-and-work-unit-deepening`（已完成）的成功模式复用
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
| AUD-1 | engine 第二梯队四文件深挖 + Next-5 榜单 | ✅ **完成**。跨文件事实：四文件间仅 1 条边（canonical-topic-state→wave-depth-contracts）；**全部零模块级可变状态**（无缓存/单例/动态 import）；`gate-helpers.mjs` 是 116 行桶，facade 切法对消费者不可见。逐文件：①`canonical-topic-state`（1879，32 消费者，101 声明）→ 4 新模块 + ~556 行残余，**零环风险、无需三层**，测试安全网最强（4/5 簇有符号级测试 + crashAt 注入）；②`gate-helpers-core`（1443，仅 5 直消费+桶屏蔽 ~20）→ 4 模块 + ~60 facade，簇 3（attempt 诊断）仅间接覆盖需最后搬；③`wave-depth-contracts`（1358，11 消费者）→ 3 模块 + ~20 facade，技术上最干净但边际收益最低；④`gate-helpers-checks`（1294，8 helper 直依赖，簇交错）→ **DEFER**。排序：canonical-topic-state → gate-helpers-core（可并行）→ wave-depth-contracts → DEFER checks。红线：新模块**不得 import 桶** `gate-helpers.mjs`（环）；**纯 facade 规则**（混合 facade↔module 会造环）；测试锁 5 处需在 apply 前后处理（canonical-topic-state-contract 源文本锁、wave-depth:471 源文本断言、no-phase-bypass、acyclicity 守卫、static-regression 文件清单）。免费清理：dead imports（core 的 relative/parseYaml、canonical 的 PROJECTION_ENTRY_FIELDS）、wave-depth 重复 topic-layout import、checks 三个导出数组 freeze |
| AUD-2 | 第二轮死代码清查 | ✅ **完成**（149 文件，~879 导出符号 + 664 私有函数，机器验证 + 全仓 grep 双侧证据）：**170 项发现**——A. DEAD 导出 ×15（2 个 R3：`inspectSeedTopicReturnMaps`/`hasBackfillToken` 被现行 return-map spec 条款锁定，须先改 spec 再删）；B. DEAD 私有 ×8（含 1 文档漂移：machine-checks-catalog 仍记录已死函数）；C. **DEAD-FLEXIBILITY ×2**：`sideEffects`/`requireInFlight` 参数面（全部调用点恒 false，C2 同款）+ `handoff_preflight: false` 常量散布 10 个 gate CLI；D. TEST-ONLY ×18（2 个故意 test-lock）；E. **DE-EXPORT ×127**（零外部 importer、仅内部调用的导出，含 C4 新模块的内部 seam 函数——与 C4 D1 纪律一致，应收紧）；F. CLI 死 flag ×0。**审计例外（不采纳）**：`WorkUnitAttemptDispositionSchema`（C2 的 disposition 锁面，故意的 schema-owned export，同 `REPAIR_KIND_CLI_VERB` 模式）；已验证的非发现（`requireLoad`/`currentOnly`/`persist`/`legacy` 等真实变化的参数）不得触碰。跨文件注记：最高风险=两个 R3 return-map 符号（一个 OpenSpec change 可同时退休两个条款 + 修 #19 文档漂移）；DE-EXPORT 需同步各文件头 "Navigation: public API" 注释；建议扩展 `residual-spec-drift-text-locks.test.mjs` 的 absence-lock 模式到新退休符号；`gate-helpers-readers.mjs:265-275` 疑似整块被取代的 reader |
| AUD-3 | 测试层守护面（C4 切分后的 stale module-path 引用、零覆盖模块清单、helper 重复度量化、check-all 并发 flakiness 根因） | ✅ **完成**：①C4 切分后无测试因此失败，但 **3 个真实缺陷**——(S1) 残余 token 负向扫描只覆盖 3 个旧文件、未覆盖 5 个新 C4 模块（回归逃逸洞）；(S2) rerun-added-topic 测试的 negative 清单同样漏新模块；(S3) attempt-recovery 结构锁 indexOf 切片无边界守卫（当前有效但脆弱）。②覆盖图：92 模块中 16 个零直测引用（含 C4 的 primitives/projection 仅经 facade 可达）；模块级孤岛：composition-handoff-operation、gate-degradation-policy（仅 CLI 面可达）；>500 行文件 24 个全部有 ≥1 直测引用。③**helper 重复 ~650 行**（tempBundle×6、cleanup×6、authoritySnapshot×5、wait 系双胞胎等）→ 收拢净减 ~500 行，wave-1（等价体）~130 行近零风险。④**check-all flakiness 根因确认**：(a) test script 无 --test-concurrency → node 默认 cores-1 并发；(b) check-all 测试 2 在真实 openspec/changes 树建删 fixture change，并行 checker 可见且 test 1 的 before/after deepEqual 会被并行写入打爆；(c) per-checker 120s 预算仅 ~2x 最差观测；(d) waitForFile 3s vs 5s 不一致。修复选项：并发限流 / 超时余量 / fixture hermetic 化（mkdtemp + --root 透传）/ waitForFile 提额 |
| AUD-4 | spec 侧第二轮（`.mjs` 284 处三分类全量、四归档 change 自身引入的新漂移抽检、experiments 族与 user-research-controls 陈旧 prose、头部 meta 卫生） | ✅ **完成**（308 处实测）：CLASS-A 295（96%，合法保留）/ **CLASS-B 13 处·12 站点·10 文件（清扫目标，完整清单见审计报告）** / CLASS-C **0**（所有 MISS 均有合规解释）；四归档 change 自身**未引入新漂移**，仅 1 处 C2 引致的 owner 指针落后一跳（`check-inspect-feedback:200` disposition 词汇应改指 `WORK_UNIT_ATTEMPT_DISPOSITIONS` 冻结导出）；另确认 schema-core Purpose 计数过时（10→14 枚举/6→10 契约）、`research-wave-experiments` Purpose 引用不存在的 playbook 文件名、delta-synced 标记约定需一次裁决。清扫分组建议：finding-shape 三兄弟 / shorthand 路径对 / governance 对 / 四个单点；**前置：10 个涉改文件先跑 list-doc-locks** |

> 回填规则：审计结论逐条对照本计划的 change 分解（§5）；与计划冲突的发现（如某文件判定"合并而非切分"）以审计为准并在此登记修正。

> **铁律（用户裁定，2026-08-31）**：调查先行，动手在后。本波所有 W1–W5 change 在①四路审计全部回填、②§5 分解落成终稿、③逐项 value÷risk 评估通过、④用户审阅确认"值得做"之前，**一个都不开工**。不允许"边动手边调查"，也不允许"动手了再评估值不值"。任何审计发现与计划假设冲突的条目，先修正计划再谈执行。

---

## 4. 思路：为什么这样排

上一波的最大教训与最大成功都是**顺序**：S1–S12 不变量网先于任何搬动，使"纯搬动"成为可断言的事实而非口头承诺。本波沿用并加强：

1. **守护网先于切缝**：AUD-3 会找出零覆盖模块与脆弱引用——先补测试守护，再动 canonical-topic-state 这类 7 消费者的文件。切缝的"可安全性"= 不变量测试覆盖率，不是 reviewer 的自信。
2. **低扇入文件不做切分**：`wave-depth-contracts` 若确认只有 2 个消费者，切分只会增加文件数不增加可读性——候选动作变为"下沉到唯一消费者"或"保持原样"，由审计定夺。这防止把 C4 模式当成锤子。
3. **桶结构（gate-helpers.mjs）是双刃剑**：桶再导出让"谁在真正消费 core/checks"不可见——审计需要穿透桶建立真实消费图；切分方案必须保持桶面不变（compat re-export 模式，C4 已验证）。
4. **死代码清除独立于切缝**：C2 经验——死代码是漂移温床，但清除要有测试锁与全量回归双保险；第二轮清查出的 DEAD-FLEXIBILITY（永远同值的参数面）优先级最高（它们是未来漂移的伪装）。
5. **spec 侧不与 engine 侧混车**：`.mjs` 引用清扫是纯 spec 操作（可机械分类 + 人工抽验），与 engine 切缝的验证面完全不同——独立 change，避免 sprawl diff。

---

## 5. 渐进式 change 分解（**终稿 v1**，2026-08-31 四路审计回填后落成；**待用户确认后开工**）

> 一次一个 active change，串行；每个 change：propose → polish（ready for apply）→ apply → governed archive → commit → 快照。 AUD 全部完成（AUD-1..4），下表每项的行号/清单均有双侧证据。

### W1 `harden-test-guards-before-carving`（测试守护网；纯测试，先做）

- AUD-3 三缺陷修复：(S1) 残余 token 负向扫描改为 glob 覆盖全部 `work-unit-*.mjs`（含 5 个新 C4 模块）；(S2) rerun-added-topic negative 清单补新模块；(S3) attempt-recovery 结构锁 indexOf 加边界守卫。
- check-all flakiness 四选项落地：fixture hermetic 化（mkdtemp + --root 透传）、`--test-concurrency=4`、per-checker 超时余量、`waitForFile` 3s→10s（explore 期定组合）。
- 零边际断言修复：`evaluateWorkUnitSubmitIntegrity` 恰 3 处（>=3 改为精确计数或登记）。
- canonical-topic-state 五簇**行为基线测试**（切缝前的不变量网，对齐 C4 的 T1 先行）。
- Done condition：全量绿 ×3 稳定；基线在案。规模 M；风险低。

### W2 `carve-canonical-topic-state`（最大文件切缝）

- AUD-1 §1：4 新模块（topic-state-plan-schema ~618 / bundle-io ~130 含 `evaluateCanonicalSeedBindings` 下沉基层 / wave-projection ~344 / inspect ~215）+ 残余 ~556；**零环、无需三层**；32 消费者经 facade 全部不动。
- 测试锁处理：`canonical-topic-state-contract.test.mjs` 源文本锁重指；dead import `PROJECTION_ENTRY_FIELDS` 删除；簇 2（IO）仅间接覆盖——搬动前后以 W1 基线对比。
- Done condition：主文件 ≤~560；导出面 grep 不变；全量绿。规模 L；风险中。

### W3 `carve-gate-helpers-core-and-wave-depth-contracts`（两个文件一批）

- gate-helpers-core（1443→~60 facade + 4 模块）：invocation/result/attempt-audit(~790，**最后搬**，间接覆盖)/plan-progress；mid-file logger import 随簇 3/4；dead imports `relative`/`parseYaml` 顺带删。
- wave-depth-contracts（1358→core ~45/wave1 ~775/wave2 ~545 + ~20 facade）：合并重复 topic-layout import；`wave-depth-contracts.test.mjs:471` 源文本断言重指。
- 红线：新模块不得 import 桶 `gate-helpers.mjs`（环）；纯 facade 规则。
- Done condition：两文件 facade 化 + 消费者零改动；全量绿。规模 M-L；风险中。

### W4 `clear-dead-code-second-wave`（AUD-2 代码侧）

- R1 删除：DEAD 导出 ×13（不含 2 个 R3）+ DEAD 私有 ×7（不含 #23）+ 死 import（relative/parseYaml/PROJECTION_ENTRY_FIELDS 已在 W2/W3 顺带）。
- DEAD-FLEXIBILITY：#24 `sideEffects`/`requireInFlight` 参数面删除 + `loadQueueReadOnly` 统一评估；#25 `handoff_preflight: false` ×10 gate CLI（**propose 期先查 spec 是否命名该字段**）。
- R2 配套：Navigation 注释同步、machine-checks-catalog 文档漂移修正（#19）、absence-lock 扩展到新退休符号。
- **不含**：R3 两个 return-map 符号（归 W6）；TEST-ONLY 18（默认保留/注记，de-export 需连同测试重构，另行评估）。
- Done condition：每条 finding 的 absence-lock + 全量绿。规模 M；风险低-中。

### W5 `sweep-spec-references-and-prose`（spec 侧，doc-only）

- AUD-4 CLASS-B 批量（13 处/12 站点/10 文件）按四主题组改写为所有权指针（C3 模式）；**前置：10 文件 list-doc-locks 盘点**。
- 小修：schema-core Purpose 计数（10→14/6→10）、CHI-004 disposition owner 指针重指 `WORK_UNIT_ATTEMPT_DISPOSITIONS`（C2 引致的落后一跳）、`research-wave-experiments` Purpose 幽灵 playbook 名。
- delta-synced 标记约定裁决（累积 vs 退役）——19 处标记的处置规则定稿后执行。
- Done condition：CLASS-B 清零 + absence-lock 扩展 + 全量绿。规模 M；风险低-中。

### W6 `retire-return-map-locked-symbols-and-de-export`（R3 退休 + 表面收紧，最后做）

- R3：spec delta 退休/re-home `research-return-map:266-289`（`hasBackfillToken`）与 `:276`（`inspectSeedTopicReturnMaps`）两条款 → 代码删除两符号 + machine-checks-catalog #19 同步（若 W4 未清）。
- DE-EXPORT 127 项（AUD-2 E 类）按目录分批：去掉无外部 importer 的 `export` 关键字，Navigation 注释同步；**排除**：#27/28（故意 test-lock）、#29 `WorkUnitAttemptDispositionSchema`（C2 锁面，审计例外保留）、TEST-ONLY 18 项。
- Done condition：de-export 后全仓 import 解析零失败（逐文件 load 验证）+ absence-lock + 全量绿。规模 M；风险低-中（量大但机械）。

### 排序与依赖

W1 → W2 → W3 → W4 → W5 → W6。W1 是 W2/W3 的安全带；W4 需在 W2/W3 之后（切缝完成后再扫一遍死代码更准）；W5/W6 独立于 W2/W3 但排在后面（de-export 清单在布局稳定后才最终化）。若中途需要腾手，W5/W6 可无限期后置而不阻塞 W1–W4 收益。

### value÷risk 评估（逐项）

| Change | 价值 | 风险 | 裁定建议 |
|---|---|---|---|
| W1 | 高（守护网是后续一切的前提 + 修真 bug：并发竞态、逃逸洞） | 低 | ✅ 做 |
| W2 | 高（最大文件 1879→~556，消费面最广但 facade 全保护，测试网最强） | 中 | ✅ 做（AUD-1 排名第 1） |
| W3 | 中-高（1443+1358→facade 化；attempt-audit 簇仅间接覆盖是唯一暗礁） | 中 | ✅ 做（batch 处理桶编辑） |
| W4 | 中-高（23 项死代码 + 2 个 DEAD-FLEXIBILITY，全双侧验证） | 低-中 | ✅ 做 |
| W5 | 中（CLASS-B 13 处清零 + 账本卫生） | 低-中 | ✅ 做 |
| W6 | 中（表面收紧 127 项 + 2 个 R3 退休） | 低 | ✅ 做（量大机械，排最后）|

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

---

## 10. 渐进式执行阶梯（Progressive Ladder）

> 每一级：准入 → 执行 → 退出门（gates）→ 提交 → 快照。上一级的退出门是下一级的准入。任何一级的门不满足，停在原地修复，不跳级。

```
M0 审计回填 ──✅──▶ M1 用户确认 ──✅──▶ W1 测试守护网 ──▶ W2 canonical-topic-state 切缝
                                             │
                                             ▼
            W6 R3 退休 + DE-EXPORT ◀── W5 spec 引用清扫 ◀── W4 第二轮死代码 ◀── W3 gate-helpers 切缝
                                             │
                                             ▼
                                      M-终局 统计表 + plan 关闭（CLS-083）
```

### 里程碑门（gates）

| 级 | 准入 | 退出门（全部满足才进下一级） |
|---|---|---|
| M0 | — | 四路审计全部回填 ✅ |
| M1 | — | 用户确认分解与排序（2026-08-31 ✅） |
| W1 | propose+polish ready；AUD-3 清单在案 | S1/S2/S3 三缺陷修复断言绿；check-all 并发竞态不再复现（fixture hermetic + 并发限流）；canonical-topic-state 行为基线在案；全量绿 ×2 |
| W2 | W1 退出；AUD-1 §1 切缝地图在案 | 4 新模块落地、主文件 ≤~560、导出面 grep 不变、W1 基线+全量绿 ×2 |
| W3 | W2 退出；AUD-1 §2/§3 地图在案 | 两文件 facade 化、桶/消费面 grep 不变、源文本锁重指、全量绿 ×2 |
| W4 | W3 退出；AUD-2 R1/R2/DEAD-FLEX 清单在案 | 全部删除 + absence-lock；全量绿 ×2 |
| W5 | W4 退出；AUD-4 CLASS-B 清单在案 | CLASS-B 清零、三处小修、absence-lock；全量绿 ×2 |
| W6 | W5 退出；AUD-2 E 类清单终版 | 127 项 de-export 逐文件 load 验证；R3 两符号退休（spec delta 先行）；全量绿 ×2 |
| M-终局 | W6 退出 | 终局 Δ 统计表（§6 指标）+ plan 关闭（CLS-083）+ 复盘登记 |

### 进度勾选

- [x] M0 审计回填（AUD-1/2/3/4）
- [x] M1 用户确认
- [x] W1 测试守护网 ✅（finalizer 19/19；全量 ×2 绿 @concurrency=4；三缺陷修复 + 基线 4/4）
- [x] W2 canonical-topic-state 切缝 ✅（finalizer 19/19；1879→604 + 4 模块；全量 0 fail）
- [x] W3a wave-depth-contracts 切缝 ✅（finalizer 19/19；1358→4 模块 + 11 名 facade；全量 0 fail）
- [x] W3b gate-helpers-core 切缝 ✅（finalizer 19/19；1443→facade + 4 模块；全量 0 fail；第三次尝试成功）（**两次尝试均回滚**：第一次 export-const 缺陷，第二次 e2e 层 47 处失败=隐藏语义耦合：codemod 切割后跨组 import 解析未收敛（submittedFactByRef/loadWave2FindingIndexFact/CARRIED_BINDING_KEYS/ACCEPTED_SOURCE_STATUSES 四处跨组引用错配），已恢复绿色检查点。**重入指引（第二次尝试后更新）**：第一次回滚根因=codemod export 前缀漏 const（已修）；第二次回滚根因=e2e 层 47 处失败（"no latest passed gate_attempt"）——即使补回被丢弃的中部 logger import 后仍复现，说明 **gate-helpers-core 的 attempt/result 簇与 handoff-helpers/enter-phase 读取路径存在 AUD-1 未识别的语义耦合**（可能为 trace 写入时序或 buildGateResult 的 next 派生对未搬动函数的依赖）。**重入前必须**：①先只切 wave-depth-contracts（三次尝试中最干净、无 e2e 依赖），单独验证；②gate-helpers-core 切分前对 buildGateResult/writeGateAttempt 的调用链做逐函数追踪（含 handoff-helpers 的 gate_attempt 读取），确认无隐藏耦合；③codemod 模式见 git 历史（6b0a4e188/W2 commit），export 前缀需覆盖 const。检查点策略：每次切割后立即全量回归，绿则 commit，红则 checkout 回滚。
- [x] W4 第二轮死代码清除 ✅（finalizer 19/19；19 项删除全仓零命中；#25 缓期）
- [ ] W5 spec 引用与 prose 清扫
- [ ] W6 R3 退休 + DE-EXPORT
- [ ] M-终局 统计表 + plan 关闭

#### Post-W1 快照（2026-08-31）

全量 0 fail ×2 @`--test-concurrency=4`（217s/221s）；测试 305→306 文件；spec/production 指标持平（纯测试守护，预期）；W2 准入达成。

#### Post-W2 快照（2026-08-31）

canonical-topic-state 1879→604（facade + transaction core）+ 4 新模块（663/177/389/263）；全量 0 fail；基线绿。W3 准入达成。

#### Post-W3a 快照（2026-08-31）

wave-depth-contracts 1358→facade（11 名 re-export）+ 4 模块（verdicts 87 / wave1-source-claim-mapping 227 / wave1-depth-review 614 / wave2 566）；全量 0 fail。W3b（gate-helpers-core）准入不变——重入指引要求先做调用链追踪。

#### Post-W3b 快照（2026-08-31）

gate-helpers-core 1443→facade + 4 模块（invocation 284 / result 186 / attempt-audit 656 / plan-progress 61）；全量 0 fail。W3 退出达成——W4 准入达成。

#### Post-W4 快照（2026-08-31）

W4 死代码清除落地；全量 0 fail。W5 准入达成。

> 快照节奏：每级 archive 后跑 `drift-resync-metrics-snapshot.mjs`，增量记入本节。终局统计表沿用 CLS-082 §10.8 三列格式。
