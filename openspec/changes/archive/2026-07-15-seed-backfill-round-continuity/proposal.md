## Why

> **触发来源**：`_backlog/plans/seed-backfill-round-continuity.md` — P0 结构性设计缺陷分析，在 `repair-rerun-added-topic-bootstrap` 提交（`80d0c9e83`）之后基于实际代码验证更新。

### 问题

种子 Topic 文件的 `__BACKFILL_*__` 回填占位 token 是单次消费结构——round 1 消费后永久消失。多轮 rerun 场景下三个连锁缺陷叠加：

1. **Seed projection 无跨轮更新机制**：Token 消费后 wave phase 仍说 "Locate `__BACKFILL_*__` and replace"——token 不存在，Agent 即兴发挥。`renderSeed()` 保留已有 body byte-for-byte，不重新注入 token。

2. **`## 本轮重跑方向` 无当前轮次绑定**：Phase-rerun 写入 `action: supplement` 等标记但不绑定唯一请求身份。Round 3 可能重复执行 round 2 的陈旧 intent。`checkRerunAddFullSynthesis`（`wave-contract-evaluators.mjs:323`）匹配任意 `action: add`，完全不看轮次。

3. **Wave1/Wave2 未实现既有 RWP-014 分类**：RWP-014 已规定 "existing topic with valid historical coverage SHALL reuse that coverage, supplement intent SHALL create normal supplementary demand"。Wave0 §3.0 已实现，Wave1/Wave2 仍不区分。

Gate 的 `negate: true` 虚假通过是症状，不是根因。

### 根因

**Projection freshness 缺乏当前轮次 authority 绑定。** 缺失三样东西：(1) 每轮 rerun 有唯一请求身份，(2) submitted work 可被确定性绑定到请求身份，(3) Engine 在 gate 之前验证本轮 authority 是否已进入 projection。

## What Changes

### 1. 当前轮次方向绑定（phase-rerun + shared direction resolver）

**方向写入**：Phase-rerun Stage 3 计算 `target_rerun_count = profile.rerun_count + 1`。将 `rerun_count: <target>` 写入 `## 本轮重跑方向`。然后递增 profile 到 target。下游 phase 比较方向中的 `rerun_count` 与 profile 当前值——两者应相等（均为 target）。

**崩溃恢复**：Stage 1 检查方向是否已存在且 `rerun_count == profile.rerun_count + 1`（即 target——本轮已写入方向但可能未递增 profile）。若是 → 跳到递增+gate。若方向不存在或 `rerun_count != target` → 进入 Stage 3 写新方向。此逻辑区分 "同一轮重试"（方向已写）和 "新一轮请求"（方向是旧值 ≠ target）。

**共享 direction resolver**（`wave-contract-evaluators.mjs`）：单一解析器，输出 5 种状态供 Wave 分类和 `checkRerunAddFullSynthesis` 共用：
- `matching`: direction.rerun_count == profile.rerun_count（当前轮）
- `stale`: direction.rerun_count < profile.rerun_count（旧轮残留）
- `future`: direction.rerun_count > profile.rerun_count（崩溃窗口——方向已写，profile 未递增）
- `legacy_unbound`: direction 无 `rerun_count` 字段（pre-v0.29 bundle）
- `invalid`: direction 有 `rerun_count` 但不可解析

### 2. Queue lineage 轮次身份（Engine-owned, claim 时写入）

`operate-work-unit claim` 在创建 work unit index record 时从 `rb_profile.yaml` 读取当前 `rerun_count`，写入 index record 的 `rerun_count` 字段。Index record 是 Engine-owned、claim 后不可变——Agent 不可修改。

**兼容性**：无 `rerun_count` 的旧 index record → `legacy_unbound`。仅可作为历史 reuse coverage，不作为本轮 freshness authority。基线 `rerun_count = 0` 为首次运行（`shared-profile.md:159` schema default）。

### 3. Seed projection 从本轮 authority 更新（wave phase §3.3/§3.2.3）

Token 降为首次物化 marker。Wave phase 回填指令：
- Token 存在 → 替换为 return-map entries（首次物化，保留现有行为）
- Token 不存在 → 读取**本轮** submitted rows（index record `rerun_count == profile.rerun_count`），从 submitted outputs 提取 return-map entries，以 `entry_id: <work_id>/<n>` 去重，追加到 section 底部

**Agent 读取 authority**：扩展 `operate-work-unit inspect` 输出（`work-unit-inspect.mjs`），新增 `eligible_rows` 字段：经 ledger/index/manifest/queue-snapshot/canonical-topic 校验后的本轮 submitted rows，含 work_id、result_path、round binding。Agent 直接使用此输出，不需手工遍历内部文件。

### 4. Wave1/Wave2 实现既有 RWP-014 分类（新增 §3.0）

镜像 wave0 §3.0。使用共享 direction resolver 判断方向是否 matching。Supplement intent 仅在 direction 为 `matching` + `action: supplement` 时生效。Stale/legacy_unbound/invalid → 视为无 supplement。

### 5. Wave2 finding 轮次标记

`finding-index.yaml` 的 per-finding contract 新增可选 `created_in_rerun_count` 字段。Phase Agent 在 Wave2 synthesis 时写入（从 profile 读取当前值）。旧 finding 无此字段 → `legacy_unbound`，始终包含在 projection 和 authority 验证中（不因缺失字段而漏掉）。

### 6. return-map inspect 扩展（return-map.mjs）

- Per-wave token 过滤：`hasBackfillToken()` 按目标 wave + 显式 token-wave 映射过滤
- Section-scoped authority 检查：仅扫描目标 section 内解析后的 refs 字段。对 Wave0/Wave1：每个本轮 submitted row（index.rerun_count == profile.rerun_count）的 work_id 必须出现在 section refs 中——缺失任何一个则 blocking。对 Wave2：检查 `finding-index.yaml` 中 `created_in_rerun_count == profile.rerun_count` 的 findings 的 W2F-xxx id 是否出现在 section refs 中。
- 验收标准：每条本轮 row/finding 被引用或有无需投影的明确 disposition（如 `relationship: defers`、`status: deferred`、`next_hop` 含 limitation reason）。不采用 at-least-one——每条 row 独立验证。

### 不做什么

- 不重新注入 token。Token 是 `renderNewSeedBody()` 的一次性产物。
- 不重命名 section header。旧 header 保持不变。
- Wave2 per-topic reuse 分类（冲突 pure synthesis 和全量重综合要求）。
- 不新增 capability——Wave1/2 分类落实既有 RWP-014；direction resolver 是 Engine 实现；finding round marker 是 contract 扩展。

## Capabilities

### Modified Capabilities
- `rerun-topic-integration` (RTI): Phase-rerun SHALL 使用 `target_rerun_count = profile + 1` 写入方向，先写方向后递增。共享 direction resolver SHALL 输出 5 种状态（matching/stale/future/legacy_unbound/invalid）。
- `research-wave-phase-content` (RWP): Phase-wave0/1/2 SHALL 从本轮 submitted authority 更新 seed projection。Phase-wave1/2 SHALL 新增 §3.0 分类（落实既有 RWP-014，使用共享 direction resolver）。
- `research-return-map` (RRM): `hasBackfillToken()` SHALL 按目标 wave 过滤。新增每条-row 独立验证的本轮 authority 引用检查。`operate-work-unit inspect` SHALL 输出经校验的 eligible_rows 供 Agent 使用。
- `work-unit-provenance-gate` (WPG): Work unit index record SHALL 在 claim 时由 Engine 写入 `rerun_count` 字段（WPG-015）。

## Impact

- 受影响文件：10 个
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md` — target_rerun_count 时序 + 崩溃恢复（~20 行）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` — §3.3 authority-driven rebuild（~15 行）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` — 新增 §3.0 + §3.3 rebuild（~35 行）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` — 新增 §3.0 + §3.2.3 rebuild + finding round marker（~35 行）
  - `DPT_FRAMEWORK/engine/helpers/return-map.mjs` — per-wave token + section-scoped per-row authority check（~60 行）
  - `DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs` — 共享 direction resolver 5 状态（~30 行）
  - `DPT_FRAMEWORK/engine/work-unit-inspect.mjs` — eligible_rows 输出扩展（~25 行）
  - `DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs` — claim 时写入 index.rerun_count（~5 行）
  - `DPT_FRAMEWORK/schema/contracts/work-unit.mjs` — index record 新增 rerun_count 字段（~5 行）
  - `CHANGELOG.md` + `DPT_FRAMEWORK/RUN.md` — v0.29
- **Engine 代码影响**：~130 行 JS（return-map + evaluator + inspect + lifecycle + schema）。Gate definition 不变。`operate-topic-state` 不变。`operate-work-unit inspect` 新增 `--eligible-rows` flag（非新 CLI 命令——扩展现有 inspect 命令）。
- **Contract 变更**：Work unit index record 新增 `rerun_count`（optional non-negative integer, Engine 写入）。Finding-index per-finding 新增 `created_in_rerun_count`（optional non-negative integer, Phase Agent 写入）。旧记录无此字段 → `legacy_unbound` 语义。
- 需要 version bump：**v0.29**。
