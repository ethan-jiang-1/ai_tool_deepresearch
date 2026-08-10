# 重建 HITL1 research_access 为本 run 的 access envelope

## Why

`rb_profile.yaml#/research_access` 当前建模的是**一次探测的事件结果**，而它承担的职责是**本 run 拥有什么访问能力**这个状态。用事件的形状承载状态的职责，导致五个症状同源：分类靠 prose 前缀、前缀词汇在 prompt 里只覆盖一半分支、分类法缺一根轴、无分类时静默降级、观察在 Gate 处即死。

BUG-215（`_backlog/bugs/BUG-215-hitl1-probe-unavailable-reason-prefix-classification-lost.md`）是这个建模错误的一次真实暴露：受限网络环境下，search 正常返回候选、fetch 侧失败，run 永久卡在 `hitl1-recorded` gate 且只得到一条通用重试消息。数据模型是唯一不能改两次的东西——它一旦落到 accepted schema，每个后续 consumer 都会长在它上面，因此本 change 一次性重建，而非逐症状缝补。

## What Changes

### 1. 数据模型：事件 → 状态（**BREAKING**：observation 形状变更）

`research_access` 重建为 access envelope：一组**有界的、静态声明的 source class**，每个 class 携带一个闭合枚举结果。

关键边界：**定宽，不是矩阵**。`engine/schema-core` 现禁止存储 "derived gate verdict, response body, query text or history, candidate URL list, retry list, or HTTP status matrix"——被禁的共同特征是**随尝试次数增长**。class 列表是静态框架资产，class 数固定，每 class 一个 enum，不留 URL、不留 HTTP 状态码、不留 query 文本。此边界在 delta spec 中正面论证，不夹带。

### 2. 分类法：一维列表 → 两根正交轴

现有 `unavailable_roots: [surface_absent, permission_required]` 把**边界位置**与**边界范围**压成一维。拆为两轴：

**轴一「边界在哪」** — 唯一决定 owner，owner **推导** repair kind（不是并列字段）：

| root | owner | repair_kind |
|---|---|---|
| `host_surface` | selected host runtime | `external_action` |
| `host_policy` | selected host policy | `external_action` |
| `network_path` | 网络环境（用户侧） | `external_action` |
| `probe_relay` | Agent | `agent_action` |

`network_path` 是 BUG-215 缺失的那根：宿主 surface 在、policy 不是障碍、但目标在网络层不可达。`probe_relay` 修正现有误路由——`check-gate-hitl1-recorded.mjs:179` 对所有 unavailable 一律 `external_action`，包括 Phase 自己写的 `probe_agent_spawn_failed:` / `probe_agent_return_invalid:`，那是 Agent 侧问题却告诉用户去解决外部前置条件。owner→repair_kind 接成推导关系后，此类误路由在结构上不再可能。

**轴二「边界多大」** — `universal`（所有已声明 class 同样失败）vs `class_scoped`（部分 class 可达）。这根轴不需额外机制，有了声明式 class 阶梯即自动落出。两轴必须同时引入：只补 `network_path` 而无范围轴，仍分不清"整个出站断了"与"某类目标被挡"。

### 3. 准入语义：形状不变，保真度提升

Gate 保持二元、保持 fail-closed。准入条件从"那一个固定 URL 抓到真实页面"改为"**至少一个已声明 class 抓到真实页面**"。

这不是放宽契约：`shared-hitl1-capability-probe.md:33-35` 本就写明该 probe "does not prove that future research work will be available"，即 Gate 既有语义一直是"此 host 能搜能抓"而非覆盖保证。固定单一 Wikipedia 目标族是在**偷偷宣称一个更强的东西**，并以受限网络下的系统性假阴性付账。多 class any-success 是对同一既有声明的忠实实现。结果上确实更易通过——这正是意图，假阴性就是那个缺陷。

准入线：**有得抓就走，全抓不着才停**。零 class 可达仍 fail-closed 停在 HITL1。happy path 零成本：第一个 class 命中即停，健康环境开销不变。

### 4. 删除 prose 前缀解析（不是扩展）

移除 `selectedAdapterUnavailableRoot()` 的散文前缀查表，路由改由枚举字段承载；`reason` 保留为人类可读散文、不再承担机器职责。这才真正满足 `engine/gate-skeleton` 的 "SHALL NOT ... deriving rule identity or repair lineage from prose position/prefix"，而非把已知反模式再养一轮。

**消灭静默降级**：无可路由 root 时，Gate 明确输出"该观察未携带可路由 root"这个 direct fact。honest-unclassified 仍是合法状态，但合法 ≠ 无声。

### 5. 修复 prompt 分支覆盖漂移（BUG-215 真根因）

`shared-hitl1-capability-probe.md:46-51` 仅在 search 失败/零候选分支要求 root 词汇；正候选 unavailable 分支（116-123）只要求 "one direct non-empty reason"，完全未提。而 adapter contract（`research-access-adapter.md:48-51`）是**不分 search/fetch** 地要求的。BUG-215 那次 run 全程失败在 fetch 侧，走的正是未要求分类的那条分支——**probe 忠实执行了 guide**。这是 contract→prompt 的投影漂移，是确定性框架缺陷而非弱模型执行纪律问题。

### 6. class 阶梯作为静态框架声明资产

class 列表落为一张**静态声明表**，不硬编码进 probe prompt。具体站点选择需真实网络环境实测标定；届时是**改数据不是改架构**，因此不阻塞本 change。

### 7. HITL1 如实告知，不新增决策点

部分 class 不可达时，在 HITL1 既有沟通模板中如实告知用户"哪类来源够不着"，然后继续。不拦人、不问用户要指示、不新增 HITL 停点——HITL1 已有一个决策点。

### 8. 为下游设计，但只随包发一个 consumer

envelope 自第一天按"被读三次"设计（准入 / wave 执行期避坑 / 交付期 limitation 声明），三者共用同一数据模型，后两个**不需再改 schema**。本 change 只实现 consumer #1（准入）。

### 本 change 明确不产出

- **不开 partial coverage → degraded pass 的口子。** `research/research-wave-gate-implementation` 的降级机制只允许 quality-only roots 降级，structural / provenance / queue / receipt / lifecycle / configuration / routing / checker-owned roots 保持 blocking。开这个口要动 Wave 准入契约，不该由一个 HITL1 缺陷顺带完成。
- **不实现 wave 侧消费与 claim 归因**（区分"我够不着" vs "它不存在"）。要动 Wave 准入/降级契约，单独立项。
- **不选定具体探测站点。** 见第 6 点，需实测标定。
- **不改 Gate 的二元性、不改 fail-closed、不新增 HITL 停点、不新增 retry/fallback provider/permission 逃逸。**

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/schema-core` | `spec.md:55-80`（Six Zod contracts 中 Profile contract 段落，含 `research_access` 状态分支与禁止清单） | Modify | observation 形状由此拥有；envelope class 集合与两轴 root 字段改变其 requirement |
| `research/research-access-adapter` | `spec.md:12-105`（三条 requirement：capability boundary / probe binds search to fetch / evidence bounded），`REA-001..003` | Modify | `unavailable_roots` taxonomy 与 available 判定的 owner |
| `research/pre-research-gate-implementation` | `spec.md:71-90`（HITL1 rule set）、`spec.md:311-330`（HITL1 Gate feedback exposes the adapter-owned unavailable root） | Modify | Gate 准入条件与 adapter-owned feedback 投影由此拥有 |
| `research/pre-research-phase-content` | `spec.md:405+`（HITL1 uses the selected semantic research-access adapter）、`spec.md:42-130`（body completeness、payload checklist） | Modify | Phase 写入义务、probe 分支覆盖、HITL1 告知模板由此拥有 |
| `engine/gate-skeleton` | `spec.md`（"SHALL NOT ... deriving rule identity or repair lineage from prose position/prefix"；`GATE_REPAIR_KINDS` 投影规则） | Verify-only | 本 change 使实现**更加**符合该既有 requirement；未改其 behavior |
| `engine/check-inspect-feedback` | `spec.md:55-71,126-160`（one direct fact / one owner / one reachable action 或 `missing_contract`） | Verify-only | 新 root 的 feedback 沿用既有 requirement，不修改 |
| `research/research-wave-gate-implementation` | `spec.md:1331-1384`（降级 root 分类） | Excluded | 明确排除；partial coverage → degraded pass 不在本 change 范围 |
| `agent/delegated-work-units` | `spec.md:1763-1775`（禁止把 HITL1 generic access 当作 role-bound native observation） | Excluded | wave 侧消费单独立项；本 change 不触碰该边界 |
| `agent/hitl-ux` | `spec.md:100-171`（HITL1 recommendation-first alignment prompt，含 `brief/hitl1.md` 三条 exact 文案与其 timing） | Modify | 第 7 点的部分不可达告知需要一条 exact user-facing 文案，而 exact-text ownership 属该 requirement；仍不新增 HITL 停点 |
| `research/research-return-map` | `spec.md` requirement 列表 | Excluded | 属 wave 返回契约，与 HITL1 access 观察无关 |

无 New capability：所有变更的 observable behavior 均已由上述既有 accepted contract 拥有。因此**不创建** `requirement-reservation.yaml`（无新 capability path、无新 3 字母 prefix、无新 requirement ID 需预留）；delta 在既有 capability 内以 MODIFIED requirement 表达。`skip_specs` 不适用——本 change 有实质 spec-level behavior 变更。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `engine/schema-core`: Profile contract 的 `research_access` 从单次探测 observation 改为定宽 access envelope（有界 class 集合 + 每 class 闭合枚举结果 + 两轴 root 字段）；显式重申并扩展"不得成为矩阵"的禁止边界。
- `research/research-access-adapter`: `unavailable_roots` 从一维两值改为两根正交轴（边界位置四值 + 边界范围二值）；owner→repair_kind 由推导关系确立；available 判定从单目标改为多 class any-success。
- `research/pre-research-gate-implementation`: HITL1 准入条件改为"至少一个已声明 class 可达"；Gate feedback 从 prose 前缀解析改为枚举字段路由；新增"无可路由 root 时必须显式暴露"的 requirement，取消静默降级。
- `research/pre-research-phase-content`: probe 分支覆盖修正（正候选 unavailable 分支须同样携带分类）；Phase 写入 envelope 的义务；部分不可达时的 HITL1 如实告知义务（不新增决策点）。
- `agent/hitl-ux`: `brief/hitl1.md` 新增一条 exact 部分不可达告知文案，只在 available 且存在不可达 class 时随第二条消息一并呈现；不新增 HITL 停点、不提供选项、不索取指示。

## Impact

**Accepted spec**：`engine/schema-core`、`research/research-access-adapter`、`research/pre-research-gate-implementation`、`research/pre-research-phase-content`、`agent/hitl-ux`。

**框架代码**（Apply 阶段才修改）：
- `DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs` — `ResearchAccessSchema` 重建
- `DEEP_RESEARCH_HARNESS/host_tools/lib/research-access-adapter.mjs` — 删除前缀解析，改枚举路由，owner→repair_kind 推导
- `DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md` — frontmatter taxonomy 与正文
- `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs` — 准入条件、feedback 投影、显式 unclassified 路径
- `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-capability-probe.md` — class 阶梯、分支覆盖修正、返回形状
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md` — §3d 写入义务、payload checklist、告知模板引用
- `DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md` — 部分不可达告知文案
- 新增静态 class 阶梯声明资产（位置在 design.md 定夺）

**测试**（`tests/` 下，约 6 个文件）：`tests/schema/contracts/profile.test.mjs`、`tests/host_tools/research-access-adapter.test.mjs`、`tests/integration/cli/check-gate-hitl1-recorded.test.mjs`、`tests/integration/cli/hitl1-research-access-adapter.test.mjs`、`tests/integration/md/phase-hitl1-research-access.test.mjs`、`tests/e2e/hitl1-research-access-adapter.test.mjs`。

**兼容性**：legacy bundle 的自由文本 `reason` 与无 envelope 的旧 observation 保持 schema 可读，走显式 unclassified 路径；不静默重解释为任一 root。

**版本**：本 change 修改 `DEEP_RESEARCH_HARNESS/` 行为，**需要 version bump**。target version 与 CHANGELOG / RUN.md banner 更新在 Apply 阶段按 tasks.md 执行。

**已知连带项（独立于本 change，可单独修）**：`tests/integration/cli/hitl1-research-access-adapter.test.mjs:123` 静态串漂移，当前即复现失败——断言 `/不要求用户运行 \`curl\` 或手改 profile/`，而 `phase-hitl1.md` 现文本为"不要求用户重复回答 HITL1 choices、运行 \`curl\` 或手改 profile"。

## 责任边界

- **User decision**：解决外部前置条件（网络、host 权限）。本 change 不新增任何需要用户决策的停点；部分不可达时只告知，不索取指示。
- **Agent execution**：spawn 隔离 probe、把返回的 observation 写入 profile（Phase Agent 仍是 `rb_profile.yaml#/research_access` 唯一 writer）、按 Gate feedback 重跑同一 probe 与同一 Gate。
- **Engine verdict**：schema 校验、准入判定、owner→repair_kind 推导、feedback 投影、trace 写入。Engine 不发现 provider、不验证凭据、不启动 adapter、不写 profile observation、不创建 alternate Setup route。

告知用户"某类来源够不着"是**信息传递，不创造 permission 或 capability**；access envelope 是 Engine 可读的 direct fact，不是 Agent 的自述。

## Semantic-precision reflection

新增具名概念：**access envelope**（替代"单次探测 observation"）。

- **读者与有界问题**：Phase Agent 与 Gate checker 问的是"本 run 现在够得着什么"，而非"上一次探测发生了什么"。
- **必须保留的区别**：(a)「宿主没有能力」vs「宿主被策略拒绝」vs「网络够不着目标」vs「probe 自己没跑起来」——四者 owner 不同，因而 repair 不同；(b)「全都够不着」vs「部分够不着」——前者阻断，后者放行并告知。
- **正常推理停止点**：读到 envelope 即可直接判定准入与 owner，无需解析散文、无需推断、无需追溯探测过程。
- **净简化**：删除一条 prose 解析路径（`selectedAdapterUnavailableRoot`）与一条静默降级分支；新增字段均为闭合枚举。控制复杂度净减，Source of Record 从"散文 reason"变为"结构化字段"，反馈闭环长度不变。
