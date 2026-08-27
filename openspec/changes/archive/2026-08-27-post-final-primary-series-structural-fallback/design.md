## Context

`proveNewerFinalAppend`（`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`）是 C5 retired
witness 的 immutable-append 证明：对绑定 basis（`primary_series` 或 legacy `whole_tree`）枚举
「移除 0..N 个最高 revision」前缀，retained 集 rehash 与 witness 比 digest。exact 失败时，只有
`whole_tree` basis 降级为 structural proof（`legacy_structural_fallback`，先例注释已承认无 per-file
prior hash 则字节级验证不可能）；`primary_series` basis 直接 `matched:false` →
`inspectNewerFinalStage` 报 `newer_final_inventory_drift` → `inspectInternal` 报
`accepted_lineage_drift`，apply 被 inspect 硬门控。BUG-247 证明：绑定态字节被合法越带重组改写后，
retained digest 候选集封闭于现存不可变字节、永不命中 witness，死锁永久且数据层不可修（来源
`_backlog/bugs/BUG-247-post-final-append-proof-deadlock-unrecoverable-bound-bytes.md`，真实 bundle
`dpt_rb_chinese-ai-inference-chips-vs-nvidia` 已复现 blocked）。

## Goals / Non-Goals

**Goals:**

- `primary_series` basis 在 exact 证明不可达（绑定态字节不存在于任何 retained 前缀）且 retained 系列
  结构合法时，获得与 `whole_tree` 先例同级的 structural 降级证明，独立诊断 basis
  `primary_series_structural_fallback`。
- 任何 structural fallback 接受（legacy 或 primary_series）都在 inspect 结果中被确定性警示，
  retired→eligible 路径并在 `facts` 暴露所接受的证明：弱证明永不静默。
- BUG-247 真实 bundle 从 `blocked: accepted_lineage_drift` 解锁为 `eligible`。

**Non-Goals:**

- 不实现 bug 卡选项 B（`rebind` CLI 操作）与选项 C（publisher 重组/收据能力）；C 是防复发的后续
  独立 change。
- 不改 `enter-phase` 的 pre-load exact digest 准入（spec 规定 pre-load 阶段 drift 必须阻塞；本 bug 的
  load 与 status 同步历史上已完成，阻塞点只在 append proof）。
- 不改 C5 event/manifest schema、workspace/recover 协议、exact 证明语义、primary series 分类/digest
  契约（BUG-246 已修的规范顺序不动）。
- 不动任何 bundle 交付内容、历史字节或 append-only trace。

## Decisions

### D1: fallback 分支统一，basis 按绑定面命名

`proveNewerFinalAppend` 的 early-return 从「exact 多义 **或** basis 不是 whole_tree」收窄为仅
「exact 多义」（`exactMatches.length > 1` 仍 fail-closed）；随后对**两个** basis 走同一 structural
证明：沿用同一 `finalRemovalPrefixes` 枚举 + `retainedPrimarySeriesValid` 结构校验，取
`structuralMatches.at(-1)`（镜像 legacy 先例的最长前缀语义）。返回 basis 按绑定面区分：
`whole_tree` → `legacy_structural_fallback`（不变），`primary_series` →
`primary_series_structural_fallback`（新）。结构匹配为零仍 `matched:false`。

- 备选：为 primary_series 新写独立 fallback 分支——否决，两条 basis 的结构证明语义完全同构，统一
  分支 + 按 basis 命名消除第二份近似逻辑（One Truth Path）。
- 备选：fallback 接受要求「至少一个 revision 被移除」以强制视为 append——否决，legacy 先例允许
  zero-removal（delivery pending），镜像语义优先；结构合法 + 绑定态不可达本身已是最强可得证明。

### D2: 警示在 inspect 结果的确定性暴露

`inspectInternal`（`post-final-recovery.mjs`）在两个出口消费 stage 结果携带的 `append_proof`：

- `unchanged`（含 `newer_final_delivery_pending`）与 retired→`eligible` 出口：当
  `append_proof.basis` ∈ {`legacy_structural_fallback`, `primary_series_structural_fallback`} 时，
  `warnings` 追加一条确定性文案（含 basis 名），声明字节级证明不可得、仅结构级接受。
- retired→`eligible` 出口：`facts.retired_append_proof` 暴露所接受的完整证明（exact 或 fallback 皆
  暴露，形状一致），供审计区分证明强度。

- 备选：新增 reason_code / stage 枚举——否决，verdict/stage 封闭枚举是既有 schema 契约，警示用
  既有 `warnings[]` 通道即可，不新增状态面。
- 备选：只给新 basis 警示、不动 legacy——否决，同一不变量「fallback 接受永不静默」应覆盖两种
  basis；legacy 行为仅在既有结果 envelope 的 warnings 字段增加文案，无 verdict/语义变化。

### D3: 真值表按「证明强度」重划

unit 真值表（`tests/engine/helpers/handoff-final-append-proof.test.mjs`）：原「primary basis 字节
篡改必 block」负例按新边界改写——结构合法的字节漂移经 fallback 接受（BUG-247 形状：witness 绑定
另一字节态 + 现行系列结构合法）；负例改为「结构破坏仍 block」（base 被移除留 orphan revision）。
exact-match 正例与 legacy fallback 用例全部保持不变（证明未放宽字节级 exact 语义）。integration
（`tests/integration/cli/post-final-recovery.test.mjs`）：`driveNewerFinalCycle` 增加 base 字节改写
选项，新增 BUG-247 变体断言 eligible + fallback warning + `facts.retired_append_proof` + 新 C5 事件
绑定当前 lineage。

## Risks / Trade-offs

- [字节级篡改在 `primary_series` basis 下不再被 proof 单独排除（结构合法即 fallback 接受）] → 与
  `whole_tree` fallback 同级的既有妥协，spec delta 如实改写该边界；缓解：fallback 接受必然携带
  basis 诊断 + inspect 警示（永不静默），且 pre-load 准入与 exact 路径的语义不变；源头治理（越带
  重组无合法通道）归选项 C 后续 change。
- [fallback 语义上「接受结构」可能掩盖真实的内容篡改交付] → retired→eligible 的 fresh C5 事件绑定
  的是**当前** inventory 的 primary digest，后续任何证明回到 exact 路径；warning 文案明确「bound
  byte-level verification was unavailable」。
- [`warnings[]` 新增文案可能影响消费方] → 现有测试与 CLI 消费方均未断言 warnings 封闭集；文案为
  确定性字符串，前缀含 basis 名可 grep。
- [结构校验对 `inventory.primary_series.entries` 的复用依赖 classification 字段稳定] →
  `retainedPrimarySeriesValid` 是既有 helper，legacy fallback 已在生产使用同一输入面，无新依赖。

## Migration Plan

单向后向兼容迁移：引擎判定放宽（原 block → fallback 接受）+ 结果 envelope 的 warnings/facts 增量；
无 schema 版本变化、无存储迁移。回滚即 revert 两个 helper 文件改动（delta spec 随 change 归档回滚），
真实 bundle 的解锁不写任何 repo 文件（bundle 为 git-ignored runtime state）。

## Constitutional Review

- **语义边界（abstraction-semantic-precision）**：本 change 不新增状态/命令/生命周期节点，只给既有
  proof-result basis 诊断词汇增加一个成员 `primary_series_structural_fallback`。读者的有界问题从
  「证明是否成立」精确化为「证明以何种强度成立」；停止点是 `append_proof.basis` + `warnings[]`。
  必须保留的区别（exact 字节级 vs structural 结构级）由 basis 命名承载，不合并。
- **最短合法闭环与 SoR（simple-reliable-control）**：direct facts 仍是 trace 中的 C5 事件绑定 digest
  与现行 `final/` inventory snapshot；判定收敛在单一 evaluator（`proveNewerFinalAppend`），无新
  authority/projection/二次 validator。净简化：把 legacy fallback 的不对称特例收编为统一分支，删除
  「basis ≠ whole_tree 即短路」这条隐含规则；同时消除「合法重组后唯一出路是手改 trace/字节」的
  非法修复诱因（质量控制误判诱发手改 authority 的反模式）。
- **责任边界（helper-oriented-agent）**：fallback 判定是 Engine deterministic verdict；是否在警示下
  继续 request 是 Agent 语义判断（inspect 提供被警示的 eligibility，不自动恢复）；无新的用户许可面、
  无 override flag、无第二 recovery controller。

## Open Questions

（无——bug 卡已给出 sanctioned 方向（选项 A + warning），证据边界由 7380 组合穷举与本机复现闭合。）
