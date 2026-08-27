## Why

C5 事件（`post_final_reentry`）在 `primary_series` basis 下把绑定时刻的 primary 系列字节 digest 作为
Final lineage witness。绑定之后，若 final/ 发生一次**语义合法、通道越权**的重组（rename/renumber/重写既有
primary 字节），绑定态字节即不可复原——BUG-247（来源
`_backlog/bugs/BUG-247-post-final-append-proof-deadlock-unrecoverable-bound-bytes.md`）用真实 bundle
`dpt_rb_chinese-ai-inference-chips-vs-nvidia` 证明：全部 5 个候选 retained digest 永不等于 witness
（7380 组合穷举零命中，且 retained 集合封闭于现存不可变字节），而 `proveNewerFinalAppend`（
`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` line 481-526）对 `primary_series` basis
无 exact match 时直接 `matched:false`——只有 `whole_tree` basis 拥有 legacy structural fallback。
结果是 `inspectNewerFinalStage` 永久 `newer_final_inventory_drift` → `operate-post-final-recovery
inspect` 永久 `blocked: accepted_lineage_drift`（已在本机复现），apply 被 inspect 硬门控，rerun 预算
3/10 完全不可达，数据层无合法修复路径。BUG-236 的 basis 迁移只闭合了 `whole_tree` 侧，`primary_series`
侧从未获得等价 fallback，这是直接的框架缺口。

## What Changes

本 change 只补齐 `primary_series` basis 的 append-proof 结构化降级证明（bug 卡修复方向选项 A），并把降级
接受显式暴露为诊断 + 警示；不改 C5 事件 schema、workspace 协议、`whole_tree` fallback 语义、series
分类/分配规则，也不实现选项 B（`rebind` 操作）与选项 C（publisher 重组能力）——两者是后续独立演进。

- **BUG-247**：`proveNewerFinalAppend` 在 `primary_series` basis 无 exact match 时，镜像 `whole_tree`
  先例降级为结构化证明：沿用同一 removal-prefix 枚举，接受「retained 系列仍是合法 base + 连续
  revision」的前缀，返回独立诊断 basis `primary_series_structural_fallback`；绑定态字节不可复原时
  （合法重组后必然如此）死锁解除，newer Final 交付可被结构性证明，inspect 恢复 fresh C5 eligibility。
- **降级永不静默**：凡 stage evaluator 接受了 structural fallback 证明（legacy 或 primary_series 皆然），
  `operate-post-final-recovery inspect` 结果 `warnings[]` 必须携带确定性警示，retired 路径并在
  `facts` 中暴露所接受的 append proof，使弱证明始终可审计。
- **篡改边界如实收窄**：结构合法的字节级篡改（改写 base/历史 revision 内容且保持系列结构）在
  `primary_series` basis 下从此**不再被字节级排除**，只能经被警示的 fallback basis 接受——这是与
  `whole_tree` fallback 同级的既有妥协（无 per-file prior hash 无法字节级证明），由 delta spec 如实
  改写；破坏系列结构的篡改（orphan/duplicate/断号）仍在两个 basis 下 block。
- **回归测试**：unit 真值表新增「绑定态字节不可复原 + retained 结构合法 → fallback 接受」正例与
  「结构破坏仍 block」负例（原「篡改必 block」用例按新边界改写）；integration 新增 BUG-247 形状的
  second-rerun 变体（modern base 字节在 newer-final 周期中被改写），锁定 eligible + warning + 新 C5
  事件绑定当前 lineage。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md`（Final inventory lineage witness / append proof 段落与 scenarios）、`handoff-helpers.mjs`、`post-final-recovery.mjs` | Modify | accepted spec 只为 legacy whole-tree 绑定规定 structural fallback（"primary-series content drift … SHALL block"）；本 change 把同一降级证明扩展到 primary-scoped 绑定的「绑定态字节不可达」情形，并规定 fallback 接受必须以独立诊断 basis + inspect 警示暴露，属 requirement 级行为修改。 |
| `final/primary-report-series` | `openspec/specs/README.md` 导航；`final-report-series.mjs`（digest/series 解析 owner） | Verify-only | 本 change 不改 primary series 分类、digest 规范顺序或 allocation 语义；只消费 `resolveFinalReportSeries`/`digestFinalReportPrimarySeriesEntries` 的既有契约（BUG-246 已修复顺序一致性）。 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md`（C5 联合 owner 之一，CONTEXT.md C5 条目） | Verify-only | 本 change 不改 Final 交付内容契约或 C5 资格语义本身，只改 drift 判定的降级证明与警示面；交付/资格边界维持不变。 |

> 无 New capability（不设 `skip_specs`：有 `research/post-final-recovery` 的 requirement 修改）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `research/post-final-recovery`: append-proof requirement 扩展——primary-scoped 绑定在 exact digest
  证明不可达（绑定态字节不复存在）且 retained 系列结构合法时，降级为 structural proof，以独立诊断 basis
  `primary_series_structural_fallback` 暴露并强制 inspect 警示；「primary-series content drift SHALL
  block」按此收窄为「结构性破坏 SHALL block，字节级漂移只能经被警示的 fallback 接受」。

## Impact

- `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`：`proveNewerFinalAppend` 的 fallback 分支
  扩展到 `primary_series` basis（新诊断 basis 字符串）。
- `DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs`：`inspectInternal` 在
  `unchanged`（delivery-pending）与 retired→`eligible` 两个出口把 fallback 证明以 `warnings[]` +
  `facts` 暴露。
- `tests/engine/helpers/handoff-final-append-proof.test.mjs`：primary basis 真值表按新边界改写/新增。
- `tests/integration/cli/post-final-recovery.test.mjs`：新增 BUG-247 形状 modern-series second-rerun
  fallback 变体（断言 eligible、warning、新事件绑定当前 lineage）。
- 真实 bundle `dpt_rb_chinese-ai-inference-chips-vs-nvidia`（git-ignored runtime state）：修复后
  `inspect` 应从 `blocked: accepted_lineage_drift` 变为 `eligible`（验收用，不写入 repo）。
- 不触碰：C5 event/manifest schema、workspace/recover 协议、`whole_tree` basis 的 exact 证明语义、
  `legacy_structural_fallback` 行为（仅补警示暴露）、`enter-phase` 的 pre-load exact digest 准入
  （spec 明言 pre-load 阶段 drift 必须阻塞，不属本 bug 解锁面）、任何 bundle 交付内容与 append-only trace。
- 依赖不变：Node.js >=20 纯 ESM，仅 `zod`/`yaml`。

### 责任边界

Engine 继续独占 drift/fallback 判定（deterministic verdict）；Agent 经被警示的 inspect 输出知晓证明强度
并决定是否继续 request（semantic judgment）；本 change 不新增任何用户许可面或恢复控制器。最短合法闭环：
不新增状态、不新增 CLI 动作、不新增事件字段——只放宽一个已有判定的可恢复分支并强制其可见性，net
simplification 体现为消除「合法重组后唯一出路是人工改 trace/字节」的非法修复路径。

### Semantic-precision reflection

新具名值 `primary_series_structural_fallback` 是既有 proof-result basis 诊断枚举（`primary_series` /
`whole_tree` / `legacy_structural_fallback`）的新成员，不是新状态或新生命周期节点。读者（Agent/审计者）
的有界问题从「证明是否成立」变为「证明以何种强度成立：exact（字节级）或 structural（结构级、被警示）」；
正常推理停止点是 `append_proof.basis` + `warnings[]`——看到 fallback basis 即知字节级证明不可得，无需
追问恢复操作。既有 `legacy_structural_fallback` 先例已确立该区分方式，本 change 不引入新读者面。
