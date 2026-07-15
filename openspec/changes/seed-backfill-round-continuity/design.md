## Context

问题、现有基础设施和根因分析见 proposal §Why。本 design 定义技术决策。

## Goals / Non-Goals

**Goals:**
- Phase-rerun SHALL 用 `target = profile + 1` 写方向，比较用 target 而非 profile
- Engine SHALL 在 claim 时写入 index.rerun_count（Engine-owned，Agent 不可改）
- 共享 direction resolver SHALL 输出 5 种确定状态
- Wave phases SHALL 从本轮 authority 更新 seed projection，以 entry_id 去重
- Wave1/Wave2 SHALL 实现 RWP-014 分类（使用共享 resolver）
- return-map inspect SHALL 每条-row 独立验证本轮 authority 引用
- `operate-work-unit inspect` SHALL 输出 eligible_rows 供 Agent 消费

**Non-Goals:** 不重新注入 token，不重命名 header，Wave2 不做 per-topic reuse

## Decisions

### Decision 1: 方向比较用 target (= profile + 1)，不用 profile

**问题**：方向写 profile 当前值 N，递增到 N+1 → 下游读到 N+1 判定方向为 stale。方向写 N，不递增（崩溃）→ 重入时 N == N，跳过写方向（但方向未写！）。

**修正**：target_rerun_count = profile.rerun_count + 1。Stage 1 检查：方向已存在且 `direction.rerun_count == target` → 本轮方向已写，跳到递增+gate。否则 → 进入 Stage 3 写方向。

**三种场景**：
- 新请求（round 2）：profile=1, target=2, 方向有 rerun_count=1（旧）≠ 2 → 写新方向
- 崩溃恢复（方向已写，profile 未递增）：profile=1, target=2, 方向有 rerun_count=2 == 2 → 跳到递增
- 再次崩溃恢复（全部完成）：profile=2, target=3, 方向有 rerun_count=2 ≠ 3 → 但 profile==2 无需重入（phase-rerun 已完成）。若真的重入 → 写新方向（新一轮）

**不变量**：正常完成时 direction.rerun_count == profile.rerun_count（两者均为 target）。崩溃窗口中 direction.rerun_count > profile.rerun_count（direction == target, profile == target - 1）。

### Decision 2: 共享 direction resolver 输出 5 种状态

`resolveRerunDirection(content, profileRerunCount)` 在 `wave-contract-evaluators.mjs` 中实现：

| 状态 | 条件 | 含义 | 消费者行为 |
|---|---|---|---|
| `matching` | direction.rerun_count == profile | 当前轮方向 | 分类/评估器正常生效 |
| `stale` | direction.rerun_count < profile | 旧轮残留 | 忽略 action |
| `future` | direction.rerun_count > profile | 崩溃窗口 | 同 matching（方向为本轮目标） |
| `legacy_unbound` | 无 rerun_count 字段 | pre-v0.29 bundle | 按旧规则处理（不阻断） |
| `invalid` | 有字段但不可解析 | 损坏 | 报告 diagnostic，不生效 |

**共用消费者**：Wave 分类（判断 supplement intent 是否生效）、`checkRerunAddFullSynthesis`（判断 action:add 是否生效）。两个消费者使用同一个 `resolveRerunDirection()` 调用——不各自实现判定逻辑。Rerun-ready gate 检查 profile-level 不变量（rationale、count、structure），不消费 per-seed direction resolver。

### Decision 3: Engine 在 claim 时写入 index.rerun_count

**为什么不是 Agent 写**：Agent 写入 queue lineage 是 fail-open——Agent 漏写或错写时 inspect 的 round 过滤得到空集，直接通过（缺乏本轮 rows）。Engine-owned 字段是 fail-closed——claim 时 Engine 从 profile 读取并写入，Agent 无写入权限，不会遗漏。

**实现**：`operate-work-unit claim` 在创建 index record 时调用 `readRerunCount(bundle)` 读取 `rb_profile.yaml` 当前值，写入 index record 的 `rerun_count` 字段（number | null）。`rerun_count: null` 仅当 profile 字段缺失或 schema default 0 时（首次运行，无 rerun）。

**兼容旧 index record**：无 `rerun_count` 字段 → `legacy_unbound`。仅可作为历史 reuse coverage 的证明，不作为本轮 freshness authority。

**Schema**：`DPT_FRAMEWORK/schema/contracts/work-unit.mjs` 的 WorkUnitIndexRecord 新增 `rerun_count: z.number().int().nonnegative().optional()`。

### Decision 4: Finding round marker

**为什么需要**：Wave2 的 current-round authority 验证必须知道哪些 findings 是当前轮产生的。现有 finding contract（15 个字段，`wave-depth-contracts.mjs:762`）无此信息。若不加标记，inspect 无法区分 new findings 和 legacy findings。

**实现**：`finding-index.yaml` 的 per-finding contract 新增可选字段 `created_in_rerun_count`（non-negative integer）。Phase Agent 在 Wave2 synthesis 时从 `rb_profile.yaml` 读取当前值并写入新创建的 findings。旧 findings 无此字段 → `legacy_unbound`，始终包含在 projection 中（保守策略——不因缺字段漏掉旧 finding）。

**不新增 `updated_in_rerun_count`**：一轮内多次 Wave2 更新 tracking 过于复杂。Finding 归属其创建轮次。后续轮次若修改 finding，应创建新 finding 而非修改旧 finding（W2F-xxx id 不可变）。

### Decision 5: Entry identity 用显式 entry_id 字段

**问题**：隐式 `work_id + evidence_meaning[0:80]` hash 无定义（算法、归一化、碰撞处理），Agent 无法可靠执行。

**修正**：每条 return-map entry 包含显式 `entry_id` 字段，格式为 `<work_id>/<n>`（n 为 1-based index，同一 work unit 内递增）。Agent 在追加前检查 entry_id 是否已在 section 中出现。格式简单、可解析、确定性。

**旧 entry 兼容**：旧 projection 的 return-map entries 无 `entry_id` 字段。Agent 不应为旧 entries 补写 entry_id。去重仅对新增 entries 生效（检查 entry_id 是否已存在）。旧 entries 保留不动。这可能导致跨轮追加时旧 entry 重复——但比强制重写整个 section 风险更小。

### Decision 6: Per-row 独立验证，每条本轮 row 必须被引用或有明确跳过 disposition

**问题**：at-least-one 太弱——3 条本轮 rows 只投影 1 条不能证明 projection freshness。per-row blocking 太严——有些 rows 产出的是 intermediate outputs 不该进入 projection。

**修正**：每条本轮 submitted row（index.rerun_count == profile.rerun_count）独立验证。Row 可处于两种状态之一：
- `projected`：work_id 出现在目标 section 的解析后 refs 中
- `no_projection_disposition`：return-map entry 显式声明不投影，如 `relationship: defers`、`status: deferred`、`next_hop` 含 `limitation: no materializable evidence` 或 `not consumer-facing`

**未处于任一状态的 row → blocking finding**。此验收标准要求每条 row 都有明确的投影 disposition，但不要求每条 row 都进入 projection。

### Decision 7: Agent 通过 `operate-work-unit inspect --eligible-rows` 读取 authority

Agent 不应手工遍历内部 Engine 文件。扩展 `operate-work-unit inspect` 输出，新增 `--eligible-rows` flag，返回经 Engine 校验后的本轮 submitted rows。

**CLI contract（精确）**：
```
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect <bundle> --eligible-rows --phase wave0|wave1|wave2 [--topic <slug>]
```
- 输出：仍为 JSON。新增顶层 `eligible_rows: []` 字段。原有 `passed`/`check`/`inspect`/`projection`/`advice` 字段不变——`--eligible-rows` 仅扩展输出，不替代 normal inspect。
- `eligible_rows[]` 每项：`{ work_id, result_path, rerun_count, topic_uid, topic_slug, kind, status }`。
- 退出码：work-unit authority 不一致（index/ledger/manifest mismatch）→ exit 1。authority 一致但无匹配行 → exit 0，`eligible_rows: []`。
- 错误边界：profile 不可读、index 损坏、ledger/index 不匹配 → exit 1，不得返回空数组假通过。
- Legacy 行（index 无 `rerun_count`）：不返回。Inspect 的 `warnings[]` 字段报告 legacy 行数量。
- `--phase` 必填（仅 `wave0`/`wave1`/`wave2`）。`--topic` 可选（限定单个 topic slug）。

**关键约束**：`--eligible-rows` 必须先确认 work-unit authority 一致（运行 normal inspect），再过滤返回行。不得成为绕过 authority check 的轻量查询。

## Risks / Trade-offs

- **`legacy_unbound` 保守策略：included-for-projection, nonblocking**：Wave2 authority 验证中 legacy findings（无 `created_in_rerun_count`）被包含在投影范围中（Agent 在 rebuild 时需将它们纳入 projection），但其 W2F-xxx id 缺失不产生 blocking finding——仅产生 advisory（`repair_kind: agent_action` 但 `blocking_basis: advisory`，提示 Agent 将遗漏的旧 findings 纳入 projection 或记录 disposition）。旧 bundle 首次 v0.29 rerun 不会因为旧 findings 缺失而阻塞 inspect。新 findings（有 `created_in_rerun_count == profile.rerun_count`）的检查保持 blocking。

**Agent 机械动作（phase-wave2 §3.2.3）**：首次 v0.29 rerun 时，Agent SHALL 读取 `finding-index.yaml` 中所有 `created_in_rerun_count` 缺失或小于当前值的 findings，将它们纳入 Wave2 seed projection（追加 W2F-xxx entries）或为每个旧 finding 记录显式 no-projection disposition。后续 rerun 只增量追加当前轮 findings。

- **Direction resolver 的 `future` 状态仅在崩溃窗口出现**：direction > profile 是瞬态——正常运行中不应出现。若 evaluator 在 `future` 状态时运行（崩溃窗口内），应同 `matching` 处理（方向是本轮目标，尚未完全提交）。窗口关闭后（profile 递增完成）变为 `matching`。

- **`entry_id` 格式依赖 Agent 正确分配 index**：Agent 需为同一 work unit 的多条 entries 分配递增 index。若 Agent 错误分配相同 index → 去重失败 → 重复追加。缓解：phase 指令明确要求每条 entry 的 entry_id 唯一。Inspect 可检测重复 entry_id 并 report advisory。

- **旧 projection entries 无 entry_id → 去重不生效**：跨轮追加时可能产生重复。风险低——重复的 return-map entries 不影响 gate 或 authority，仅影响可读性。后续轮次可手动清理。
