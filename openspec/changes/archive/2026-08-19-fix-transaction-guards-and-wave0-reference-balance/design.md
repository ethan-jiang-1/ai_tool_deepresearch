# Design: fix-transaction-guards-and-wave0-reference-balance

## Context

四个 P1 缺陷同根：**确定性守卫/证明的作用面与合法变更面不一致**。来源 bug 卡片：
BUG-232 / BUG-233 / BUG-234 / BUG-236（`_backlog/bugs/`，均出自真实 run
`dpt_rb_enterprise-ai-transformation-six-cases`）。

| Bug | 守卫/证明 | 错配的作用面 | 合法变更面 |
|---|---|---|---|
| 234 | `withWorkUnitTransaction` undeclared 检测 | 整 bundle 递归快照 | 声明 mutation targets（work-unit authority 文件） |
| 233 | orphan 检查 + `recover-transaction` | 全有或全无（any unresolved → block all），恢复入口自身也是事务 | 恢复事务的唯一操作目标是 journal 文件 |
| 232 | wave0 收敛候选选择 + `isCountable` | 全局字典序取首；exact `accepted` 字符串 | 跨 topic 分布 floor；accepted 家族（模板含 `accepted :warning:`） |
| 236 | C5 lineage 见证（全树 digest + append proof） | `final/` 全部文件不可变 | primary series 不可变 + non-primary 合法可更新（`persist-final-report`） |

## Fix 1 — BUG-234：事务变更检测收窄到 work-unit authority 面（DEW-023）

**现状**（`work-unit-transaction.mjs`）：`listBundleFiles` 递归 hash bundle 全树（仅排除
lock/audit/journal 自身）；callback 前后比对，任何差集非声明目标即 `mutated undeclared
targets` → journal `suspect`、`rollback_proven=false`。并行 sub-agent 写 `_cache/` 必然误伤。

**改动**：
- `listBundleFiles(bundleDir, currentJournalRef)` 的枚举范围收窄为 **work-unit authority
  面**：`_work_units/**`（继续排除 lock 与当前 journal）+ 根 `rb_output_declarations.jsonl`。
  其余路径（`_cache/`、`_scripts/`、`_diagnostics/`、`reference/`、`artifacts/`、report、
  plan/profile 等）不再进入快照。
- 检测语义不变：authority 面内出现非声明目标变更 → 照旧 fail-closed `suspect`。
- `rollbackProven = rollback.ok && !(error.undeclared_targets?.length > 0)` 逻辑不变；由于
  `undeclared_targets` 现在只可能含 authority 路径，无关并发写不再污染 rollback 证明。
- `AUDIT_ONLY_PATHS` 常量随全树扫描一并消亡（audit 路径本就在 authority 面之外）。
- 附带收益：快照成本从整 bundle 降为 `_work_units` 子树，事务窗口变短。

**为什么这是正确作用面**：事务 manifest 只声明 work-unit authority 文件（result/receipt/
status/ledger/index/queue + 本事务 cache page target）。cache page 目标已显式声明进
manifest（`work-unit-submit.mjs` 的 `mutationTargets` 含 `cachePageTargets`），因此无需为
`_cache/` 设例外规则——非声明 cache 写入不再被观测，声明 cache 写入仍在 manifest 内受
before-image 保护。声明目标落在 authority 面之外（如 cache page）时保留 manifest 的
before-image 快照与回滚保护，只是不参与 undeclared 差集（它本就是声明目标，无可检测）。
这是一个 net simplification：删除全树扫描，不新增任何检查、状态或例外。

## Fix 2 — BUG-233：多 orphan 依赖序恢复（DEW-023）

**现状**：`unresolvedOrphanJournals()` 非空 → 一切事务被拒；`recoverWorkUnitTransaction`
自身是事务，只豁免 `allowOrphanTxId`（被恢复者）。双 orphan 时两个 recover 互踢。

**改动**：
- `withWorkUnitTransaction` 新增内部选项 `orphanBlocking: 'all' | 'none'`（默认 `'all'`，
  保持现有语义）。仅 `recover_work_unit_transaction` 操作传 `'none'`：恢复事务的 callback
  只写被恢复 journal 的 settled 状态，其他 orphan 的存在不构成阻塞。普通事务（submit/
  claim/timeout/…）阻塞语义完全不变——spec 要求的「fail-closed before authority mutation」
  对非恢复操作保持。
- `recoverWorkUnitTransaction(bundleDir, { tx_id })` 入口新增依赖序判定：若存在另一个
  unresolved orphan W，其 `mutation_manifest.targets` 含 `_work_units/_transactions/<tx_id>.json`
  （W 是针对 tx_id 的失败恢复 wrapper），则本次调用不执行变更，返回
  `suspect_transaction` + `repair_kind: recover-transaction` + `write_to` = W 的 journal +
  `rerun` = `recover-transaction --tx-id <W>`。先结清 W 后，原 tx_id 的恢复自然可行
  （W settled 后不再有 wrapper 关系；W 的 before-image 对 tx_id journal 文件的断言在
  crash 后未变，可正常 proof）。
- 互指环不可能：journal manifest 在 tx 启动时捕获，tx-A 声明 tx-B 的文件要求 B 先于 A
  存在，B 声明 A 的文件要求 A 先于 B 存在，矛盾；依赖图是 DAG，依赖序唯一确定。
- `inspectWorkUnitTransaction` 多 orphan 投影：不再统一 `unlocked: false`（死路
  `missing_contract`），改为计算 **first-recoverable** 坐标：若无 wrapper 关系，取
  `started_at` 最早（tx_id 字典序 tiebreak）；若存在 wrapper 关系，取不被任何其他 orphan
  声明为 target 的 wrapper。`unlocked: true` 当该坐标 journal 为 v2、manifest 完整、
  targets 匹配 before-image → `repair_kind: recover-transaction` + 精确 rerun；否则保持
  `missing_contract` 并在 `missing_fact` 里给出确定坐标。
- 不新增 repair_kind、不新增 journal 状态、不授权删除/清扫。恢复路径完全复用现有
  `suspect → rolled_back` 转换。

## Fix 3 — BUG-232：wave0 跨 topic 平衡 + `accepted :warning:` 计数（RWG-022 / EEX-001）

**平衡选择**（`wave0-reference-convergence.mjs`）：
- 新增纯函数 `selectBalancedCandidate(candidates, projectedIdentityIds, deferredIdentityIds)`：
  1. 过滤已投影/deferred 身份（不变）；
  2. 按 `topic_slug` 分组，计算每 topic 的已投影数：projected 身份的 `work_id` 经候选
     `work_id → topic_slug` 映射归属 topic（未知 work_id 的 legacy 投影不参与平衡计数）；
  3. 选择已投影数最少的 topic（并列取 `topic_slug` 字典序），再取该 topic 内
     `source_ordinal` 最小（并列取 `entry_id` 字典序，保留现有最终 tiebreak）的候选。
- `evaluateWave0ReferenceConvergence` 的 `unprojected[0]` 替换为该选择器；单 candidate
  的 `materialize_projection` 结果形状不变（backing 读取、finding 构造照旧）。
- 不引入 per-topic floor 数值、不引入新 outcome、不触碰 `research-styles` 的
  `wave0_shared_ref_total` 计算；floor 仍是计数，选择器只决定「下一个引导物化谁」。
- min-count 轮转的性质（可测）：任一 topic 获得第 2 个投影之前，所有仍有未投影候选的
  topic 都已获得第 1 个。

**`accepted :warning:` 计数口径**（`ref-count.mjs` `isCountable`）：
- Condition 1 从 `acceptance_status !== 'accepted'` 改为 accepted 家族判定：
  `new Set(['accepted', 'accepted :warning:'])`（值经 trim；YAML 引号形式解析产物即
  `accepted :warning:`）。
- 证据链：`bundle/reference-flat-format` accepted 场景「`acceptance_status:
  "accepted :warning:"` (quoted) … THEN the mapping parses and **the reference is accepted**」；
  `shared-reference-template.md` line 58 取值表把 `accepted :warning:` 列为合法取值。
  `EXCLUDED` 与其他值仍不可计数。不修改 `gate-helpers-checks.mjs` 的
  `ACCEPTED_SOURCE_STATUSES`（wave1 source_claims 是另一 surface，proposal 明确排除）。
- 顺带修正（evidence-backed）：EEX-001 delta 删除主 spec 中两个陈旧场景
  （"thin Core Content Capture is not countable" / `core_content_capture_too_thin`）——
  实现中从无此启发式（`ref-count.mjs` 全文无该 reason），且被同 requirement 正文
  「SHALL NOT require a minimum character count」直接否定；保留即自相矛盾。

## Fix 4 — BUG-236：Final lineage 见证收窄到 primary series（POF-001）

**现状**：C5 apply 绑定 `final_inventory_sha256 = readFinalReportInventory().sha256`
（全树 digest）；`proveNewerFinalAppend` 只移除最高 primary revision 后比对全树 digest。
non-primary 文件（`final/topics/*.md`）经 `persist-final-report` 合法更新后，任何基于旧
全树 digest 的严格 append 证明在数学上不可能成立（事件只存聚合 digest，无逐文件 prior
sha）——第二次 rerun 永久 `accepted_lineage_drift`。这是 accepted spec 间冲突：
artifact-persistence 授权 non-primary 更新 vs post-final-recovery 要求全树不可变。

**改动**：
1. **双 digest**（`final-report-series.mjs`）：`FinalReportInventorySchema` 新增
   `primary_sha256`（同一次安全快照内，仅 primary series 条目——base + contiguous
   revisions——的 sorted digest）；`sha256`（全树）保留，作为 legacy 基准与诊断。
   安全扫描语义（symlink/不可读/类型不支持/主分类歧义 → block）不变。
2. **新事件绑 primary 基准**（`post-final-recovery.mjs`）：C5 事件与 prepared manifest
   绑定 `final_inventory_sha256 = inventory.primary_sha256`，并新增显式
   `final_inventory_basis: 'primary_series'` 标记字段；commit 前自检比较同一 accessor。
   事件 envelope 其余形状不变。
3. **按基准消费**（`handoff-helpers.mjs`）：
   - pre-load admission（`enter-phase` 边界）：按事件 bound basis 比对（primary-scoped
     事件只比 primary series；legacy 事件保持全树 exact）。primary-series 漂移照旧 block
     load；non-primary 漂移不阻塞 primary-scoped 事件。
   - `proveNewerFinalAppend(inventory, priorDigest, basis)`：
     - `primary_series` 基准：移除候选 = primary revision 条目（同现有逆序前缀尝试），
       比对 retained primary 条目的 digest。
     - legacy（无标记）基准：先跑现有全树证明（无 non-primary 漂移时原样通过）；
       不匹配时执行 **structural fallback**：在与主算法相同的零或多个最高 revision
       移除前缀下，retained primary series 必须经 `resolveFinalReportSeries` 判定结构
       有效（合法 base + contiguous revisions）；零移除 fallback 匹配 = delivery
       pending，一或多移除 fallback 匹配 = immutable append。fallback 在 proof 结果中
       显式暴露（`basis: 'legacy_structural_fallback'`）。
   - `inspectNewerFinalStage` 透传 basis 与 fallback 诊断；`newer_final_inventory_drift`
     仅在 bound basis 无匹配、需移除 base/supplementary primary 条目、或 primary series
     结构无效时出现。
4. **存量 bundle 恢复**：BUG-236 实测 bundle（legacy 绑定）经 fallback 证明重新获得
   合法路径，无需任何手工迁移。
5. **完整性边界（明确放弃与保留）**：primary series 是 delivery lineage 唯一 authority，
   两基准下 primary 内容变更均被完整见证（primary-scoped 逐条目 hash；legacy 全树 hash
   或 fallback 结构校验）。legacy fallback 的已知弱化：全树证明因 non-primary 漂移不可
   用时，retained primary 条目的逐字节校验降为结构校验（无逐文件 prior sha 可比对）。
   该弱化只影响本变更前绑定的事件，且从不能恢复（死锁）变为可恢复——net improvement。
   新事件无此弱化。

**不做的替代方案**（记录取舍）：基于 `_diagnostics/artifact-persistence/` receipt 重建
逐文件 prior sha 的严格证明被否决——需要新增持久 authority surface 与 undo 语义，复杂度
远超收益；primary-scoped 见证 + 显式基准已覆盖 delivery lineage 完整性需求。

## 责任边界（Charter 对齐）

- Engine（确定性 verdict）：上述全部检测/证明/选择计算。
- Agent（语义决策）：仍决定是否物化收敛给出的候选、是否发起 rerun、non-primary 呈现
  内容本身。
- User（权限/风险决策）：无新增。BUG-236 的见证基准取舍已由用户在本 change 提案阶段
  确认（选 primary-scoped + legacy 回退）。

## Semantic Precision Reflections

- **work-unit authority surface**（新命名概念）：有界问题 =「本事务 callback 是否写了
  未声明的 authority 文件」；区别保留 = authority 文件（事务可回滚拥有）vs 非 authority
  并发写（他人拥有）；正常停止点 = authority 面差集为空即通过，不再对全 bundle 提问。
- **primary-scoped final inventory digest + basis 标记**：有界问题 =「delivery lineage
  的 primary series 是否原样保留并合法追加」；区别保留 = primary series（lineage
  authority，逐字节见证）vs non-primary 呈现文件（合法可变，不构成 drift）；正常停止点
  = 按事件 bound basis 一次证明，fallback 显式暴露。
- **structural primary-series append proof（legacy fallback）**：有界问题 =「legacy 事件
  在 non-primary 漂移下，retained primary series 是否仍是合法连续序列」；正常停止点 =
  结构有效即证明成立，弱化范围如上限定。
- **跨 topic 平衡选择**：不是新状态，是既有 `materialize_projection` outcome 的确定性
  选择函数替换；有界问题 =「floor 未满时下一个引导物化哪个已提交身份」。

## 测试策略（verification-plan.yaml 汇总）

| Class | 覆盖 |
|---|---|
| unit (`tests/engine/`) | 事务 authority 面快照/检测（迁移现有 undeclared 用例到 authority 路径 + 非 authority 并发写不 suspect）；多 orphan first-recoverable 排序与依赖序反馈；`selectBalancedCandidate` truth table（min-count、tiebreak、轮转性质）；`isCountable` `:warning:` 家族；`proveNewerFinalAppend` 双基准 + fallback + primary 篡改仍 block；`FinalReportInventorySchema.primary_sha256` |
| integration (`tests/integration/cli/`) | 双 orphan 真实 CLI `recover-transaction` 序列结清且不手改 journal；wave0 多 topic bundle 收敛引导分布（经 inspect CLI）；post-final 两次连续 rerun + rerun-1 修改 `final/topics/*.md` + 发布 final_v2 → 第二次 inspect eligible（新事件基准）与 legacy 绑定回退路径 |

执行 profile：全部 node:test + 临时 bundle fixture（`tempWorkUnitBundle` /
`post-final-recovery-fixture`），无网络、无 Agent 执行。

## Open Questions

（无——BUG-236 见证基准取舍已由用户确认；其余设计点均由 accepted contracts 与实现事实
唯一确定。）
