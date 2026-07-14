## Why

> **触发来源**：`_backlog/plans/seed-backfill-round-continuity.md` — P0 结构性设计缺陷分析。该 plan 在 `repair-rerun-added-topic-bootstrap` 提交（`80d0c9e83`）之后进行了全面更新，基于实际代码验证了哪些已修复、哪些部分缓解、哪些仍未触及。本 change 直接承接该 plan 的 §4 Refined Design。

### 问题起源

种子 Topic 文件（`seed_topics/{slug}.md`）的「研究轮次追加区」预埋了 5 个 `__BACKFILL_*__` 回填占位 token，每个对应一个 wave 的回填内容：

| Token | 对应 Section（当前旧名） | 消费 Phase | Gate 检查 |
|---|---|---|---|
| `__BACKFILL_WAVE0_EVIDENCE__` | `## 本轮新增证据` | phase-wave0 §3.3 | **无**（wave0 gate 不检查此 token） |
| `__BACKFILL_WAVE1_MECHANISMS__` | `## 本轮新增机制理解` | phase-wave1 §3.3 | `gate-wave1-complete` — `negate: true` |
| `__BACKFILL_WAVE1_TRENDS__` | `## 本轮新增趋势与难点` | phase-wave1 §3.3 | `gate-wave1-complete` — `negate: true` |
| `__BACKFILL_WAVE2_JUDGMENT__` | `## 当前判断` | phase-wave2 §3.2.3 | `gate-wave2-complete` — `negate: true` |
| `__BACKFILL_PENDING_QUESTIONS__` | `## 待验证问题` | phase-wave1 §3.3 + phase-wave2 §3.2.3 | 两个 gate 均检查 — `negate: true` |

设计意图：Agent grep 定位 token → 替换为 return-map entry → gate 验证 token 已消失（`negate: true` pattern_match）。**这是单次消费结构**——token 在 round 1 被替换后永久消失。

### 为什么这是 P0 缺陷

框架明确支持多轮 rerun（HITL2 → rerun → seed-topics → wave0/1/2 → HITL2 循环），流程定义在 `phase-rerun.md`、`phase-seed-topics.md`（Rerun-Aware Behavior §320-338）、`phase-wave0.md`（§3.0 Classify Direct Facts）。但 token 消费后：

1. **Phase-rerun 不重新注入 token**：`renderSeed()`（`canonical-topic-state.mjs:182`）对已有 topic 保留 body byte-for-byte。`buildMutation()` 对 `update_intent`（line 539）和 `mutate_layout`（line 492）均保留已有 body。整个 codebase 中不存在任何重新注入 `__BACKFILL_*__` 的代码路径。

2. **Phase-wave1/phase-wave2 没有类似 wave0 的分类逻辑**：wave0 §3.0 Classify Direct Facts 让已有 valid submitted Wave0 coverage 的 topic 直接复用历史覆盖、不入队、不触发回填。wave1/2 无此逻辑——§3.1 仍在说 "enqueue one... per topic"，Agent 在 round 2 仍会为已有 topic 入队、执行、然后尝试找 token。

3. **Gate 产生虚假通过**：Gate 检查 `__BACKFILL_*__` 是否 **存在**（`negate: true` = token 存在则 fail）。Round 1 消费后 token 消失 → gate 通过。Round 2 Agent 找不到 token 跳过后 → gate 也通过（因为 token 在 round 1 就已经消失了）。Gate 无法区分「本轮消费」和「上轮消费」。

4. **问题逐轮恶化**：Round 1 正常 → Round 2 Agent 即兴发挥（追加在旧内容后？覆盖？跳过？）→ Round 3 回填区变成无结构的多轮混合内容。

详细分析见 `_backlog/plans/seed-backfill-round-continuity.md`。

### repair-rerun 提交（`80d0c9e83`）做了什么、没做什么

该提交构建了 work-unit-evidence-first 的 rerun 连续性基础设施，部分缓解了问题：

**已解决：**
- **BUG-081**：`renderNewSeedBody()` 为新 topic（`add_topic`）产出完整骨架+5 个 token
- **BUG-082**：新 topic 的 work-unit provenance 通过 gate
- **Supplementary 引用**：`buildSourceRefLineage()`（`work-unit-validation.mjs:473`）让 Wave1 supplementary 工作单元引用同一 topic/wave/kind 的先前的 `evidence_summary` 输出，无需重新声明
- **声明恢复**：`recover-declaration`（`work-unit-submit.mjs:475`）从 index/status/result/receipt/cache/trace 证据重建缺失的 ledger 行
- **深度审查合同变更**：`wave-depth-contracts.mjs:483-514` 从已审查的已提交行中得出事实，忽略 depth-review.yaml 中的投影字段

**部分缓解：**
- **Wave0 §3.0 Classify Direct Facts**：已有 valid submitted Wave0 coverage 的 topic 不入队、不触发回填。Agent 指令级别，非 Engine 强制。

**未解决：**
- Phase-rerun.md **从未被修改**——无 token 重新注入
- Phase-wave1/phase-wave2 **无 Classify Direct Facts**——无复用/跳过逻辑
- 种子模板仍使用 **round-relative header**（`## 本轮新增证据` 等）
- Wave phase 回填指令 **无缺失 token 回退路径**

### 为什么现在做

该缺陷阻塞了所有 round 2+ 的 rerun 场景。Round 1 正常工作，但 round 2 的 wave1/wave2 回填是 broken 的——新证据可能被提交到 work-unit ledger，但种子 topic 文件永远得不到更新。用户 rerun 补成本分析，种子 topic 里看不到成本分析的发现。

## What Changes

本 change 不引入新 Engine 模块、新 CLI、新 Gate rule、新 schema。所有变更均为 Agent-facing phase MD 指令 + 一个 template 字符串变更。

- **Phase-rerun 新增 token 重新注入阶段**（Stage 3 step 1d）：在写入 `## 本轮重跑方向` 和递增 `rerun_count` 之间。对每个受影响的已有 topic（非 `add_topic`），对 5 个 wave section 各检测对应 `__BACKFILL_*__` token 是否存在——存在则跳过（上轮未完成回填），不存在则在 section 底部重新注入。幂等：重复运行不产生重复 token。新增 topic 跳过（已有 `renderNewSeedBody()` 产出的 fresh skeleton）。staged write（tmp → verify → atomic rename）。

- **Phase-wave1/phase-wave2 新增 Classify Direct Facts**（§3.0）：镜像 wave0 §3.0 模式。分类依据 direct bundle authority（已提交的 ledger 行，非文件系统假象）：
  - `existing Topic + valid submitted Wave1 deepening -> reuse`
  - `new Topic + no submitted Wave1 deepening -> normal deepening pipeline`
  - `supplement intent -> normal supplementary deepening`
  
  同时更新 §3.1 的灌料指令：不为被分类为 reuse 的 topic 重复入队。Wave2 同理补充分类逻辑。

- **种子模板 header 重命名**：去掉 "本轮"（round-relative），改为 wave-fixed：
  - `## 本轮新增证据` → `## Wave0 证据`
  - `## 本轮新增机制理解` → `## Wave1 机制`
  - `## 本轮新增趋势与难点` → `## Wave1 趋势与缺口`
  - `## 当前判断` → `## Wave2 发现`
  - `## 待验证问题` → `## 待解决问题`
  
  同步更新 `phase-seed-topics.md` 模板（§3.1 预埋说明表格 + 实际 section header）和 `canonical-topic-state.mjs` `renderNewSeedBody()`（line 156-169）。**安全性已验证**：门控 `pattern_match` 检查匹配 `__BACKFILL_*__` token 字符串（raw content grep），不依赖 section header。`parseMarkdownSemanticSections` 仅操作英文 section。Engine 代码中唯一的硬编码中文 header 引用是 `## 本轮重跑方向`（`wave-contract-evaluators.mjs:329`），是一个独立的 section，本次不改。

- **Wave phase 缺失 token 回退指令**：在 phase-wave0 §3.3、phase-wave1 §3.3、phase-wave2 §3.2.3 增加简短回退路径——若 token 未找到，先检查该 topic 是否被分类为 reuse，若是则跳过后继续；否则 token 应已被 phase-rerun 重新注入，记录 diagnostic trace event 并将回填内容追加在 section 最后内容之后。回退是指令级别的边缘情况处理，不是主要路径（主要路径：token 被 phase-rerun 重新注入 → wave phase grep 到 → 替换）。

### 与已有基础设施的关系

- `buildSourceRefLineage`：supplementary 工作单元引用先前的输出时不需重新声明——分类（Change A）决定是否入队，血统机制避免不必要的重新产出，token 重新注入（Change B）为新回填提供结构性目标。三者互补。
- `recover-declaration`：先轮 ledger 行保持完整；round 2 工作不需要重建它们。
- Gate `negate: true` 检查：继续工作——验证 token 消费，不分轮次。
- `renderNewSeedBody()`：新 topic 获得 fresh token（BUG-081 已修）；Change C 更新 header 名称对齐。

## Capabilities

### New Capabilities
- `rerun-backfill-continuity`: Phase-rerun 检测已消费的 `__BACKFILL_*__` token 并在对应 wave section 底部重新注入，确保每轮 rerun 都有结构性回填目标。幂等：已存在 token 的 section 直接跳过。新增 topic（`add_topic`）跳过。

### Modified Capabilities
- `research-wave-phase-content`: Phase-wave0 §3.3、phase-wave1 §3.3、phase-wave2 §3.2.3 增加缺失 token 回退指令。Phase-wave1 和 phase-wave2 新增 §3.0 Classify Direct Facts（镜像 wave0 §3.0 模式，按 direct bundle authority 分类，已有 valid submitted coverage 的 topic 复用历史覆盖）。
- `rerun-topic-integration`: Phase-rerun Stage 3 新增 step 1d（Refresh Backfill Targets）——在 research_style_params 重算之后、rerun_count 递增之前执行。
- `canonical-topic-state`: `renderNewSeedBody()` 的回填 section header 从 round-relative（`## 本轮新增证据`）改为 wave-fixed（`## Wave0 证据`）。不影响 `renderSeed()` 的已有 body 保留逻辑。
- `seed-topic-materialization`: Phase-seed-topics.md 模板的回填 section header 同步改名（5 个 section header + 预埋说明表格的 4 行 target column）。

## Impact

- 受影响文件：6 个
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md` — Stage 3 新增 step 1d（~30 行）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` — §3.3 缺失 token 回退指令（~5 行）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` — 新增 §3.0 + 更新 §3.1 + §3.3 回退指令（~25 行）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` — 新增 §3.0 + 更新 §3.1 + §3.2.3 回退指令（~25 行）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` — 预埋说明表格 + 5 个 section header 改名（~15 行改动）
  - `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` — `renderNewSeedBody()` 5 个 section header 改名（5 行改动）
- **Engine 代码影响：零**。Gate definition 不变。`operate-topic-state` 不变。`operate-work-unit` 不变。无新 CLI。无新 schema。无新依赖。
- **Gate 兼容性**：5 个 token 的 `negate: true` pattern_match 检查继续工作——匹配 token 字符串，不依赖 section header。Wave0 gate 原本就不检查 `__BACKFILL_WAVE0_EVIDENCE__`（14 条 rule 均不涉及 seed topic backfill），无变化。
- **已知限制**：Wave1/Wave2 gate 的 `negate: true` token 检查在 rerun 场景下仍然存在理论上的误通过可能——gate 无法区分 "本轮消费" 和 "上轮消费"。缓解措施：(1) 分类直接事实减少不必要的入队，(2) token 重新注入确保回填目标存在，(3) wave phase 反作弊规则禁止保留未消费 token。彻底修复需要 Engine 级别的 round counter——超出本 change 范围，且与 work-unit-evidence-first 架构方向不一致。本 change 在 gate 不变的前提下消除了导致误通过的实际发生条件。
- **无 BREAKING 变更**。已有 bundle 的旧格式 seed topic 文件保留旧 header 直到 seed 被 topic-state apply 重新生成。Token 重新注入按 token 名称检测（不依赖 header 格式），旧格式文件的回填功能不受影响。新 header 仅对 `renderNewSeedBody()` 产出的新 seed 和 phase-seed-topics 模板生效。无需迁移脚本，不强制已有文件改写 header。
- 需要 version bump：**否**（变更仅影响 Agent 行为指令和 template 字符串，不影响 Engine API、schema、数据格式或 gate 定义）。
