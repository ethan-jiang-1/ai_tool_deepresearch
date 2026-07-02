# DONE: wave1-sufficiency-gates（研究充分性——三个画像定"跑够了"的标准）

> 状态: 已完成（已移入 done/） | 创建: 2026-06-26 | 更新: 2026-06-27
>
> **完成方式：** OpenSpec change `establish-research-styles`（2026-06-27 归档至 `openspec/changes/archive/2026-06-27-establish-research-styles/`）。5 个 Goals + 4 个设计问题全部实现。4 套 research style JSON（debug/quick_factual/exploratory_map/claim_verification）、`apply-research-style.mjs` CLI、gate `threshold_source` 动态阈值、三个 phase MD 的 re-fill loop、placeholder 三层防线、debug style 隐藏——全部落地。Spec 已同步至 `openspec/specs/research-styles/`。
>
> 本 TODO 的核心问题：**研究什么时候算"跑够了"？**
> V12 用一个非常好的 UX 设计回答这个问题——三个研究画像。当前框架把这三个画像丢了。

## Why：三个画像丢了

V12 的用户一上来就面对三个清晰的选择：

| 画像 | 我想… | 跑到什么程度算够 |
|------|--------|-----------------|
| **快速事实答案** | 查一个窄事实，快点拿到答案 | 每个 topic 至少 5 条有质量的 reference，核心事实有本地证据支撑 |
| **探索地图** | 摸清一个领域的全貌，包括未知区 | 每个 topic 至少 8 条 reference，未知区/缺口/优先级都明确标注出来 |
| **说法验证** | 验证一组 claims 的真伪——哪些站得住、哪些被削弱、哪些证据不足 | 每个 topic 至少 10 条 reference，每个 P0/P1 claim 有 ≥2 个独立来源支撑或明确标注置信度不足，反例/限制已专门搜索 |

这三个画像回答的其实是同一个问题，只是**深度不同**：

> "我研究这个问题，搜到什么程度就可以停？"

快速事实：事实清楚、限制明确就可以停。
探索地图：结构清楚、未知区标注了就可以停。
说法验证：每个 claim 的支撑/削弱/边界都查清楚了才可以停。

**这个 UX 设计非常好**——用户不需要理解"floor 公式"、不需要理解"tc/ctd 参数"。用户只需要说"我想验证说法"，系统就知道该跑到什么深度。

### 当前框架把画像丢了

当前框架的 `phase-hitl1.md` **确实问了用户选画像**（快速事实/探索地图/说法验证），也写入了 `rb_profile.yaml` 的 `research_profile` 字段，gate 也验证了它不为空。

**但选了之后什么都没变。** 不管选什么画像：

- Wave 0 gate 要求：**1 条**共享 reference
- Wave 1 gate 要求：**1 条** topic reference（`*{topic}*.md` 通配就行）
- 不计质量（URL + 标题就算一条）
- 不追踪核心问题有没有被回答
- 不要求反例搜索

**三个画像选了等于没选。** 用户说要"说法验证"，系统还是搜 1 条就过——这就是"几圈就跑完"的根因。

### V12 的三画像不只是 floor 数字

三个画像在 V12 里改变了**四个维度**的行为：

| 维度 | 快速事实 | 探索地图 | 说法验证 |
|------|---------|---------|---------|
| **搜多少** | 少（5-12 共享 + 5/每 topic） | 中（8-18 共享 + 8/每 topic） | 多（10-24 共享 + 10/每 topic） |
| **搜多深** | 核心事实有支撑即可 | 每个维度有覆盖，缺口标注即可 | 每个 claim 有支撑/削弱/反例 |
| **怎么判断够** | 事实清楚 + 限制明确 | 结构清楚 + 未知区已标注 | claim 支撑/削弱/边界全查清 |
| **交付什么** | 事实结论 + 置信度 + 限制 | 覆盖图 + 未知区 + 优先级 | claim 判断账本 + 反例 + 范围限制 |

当前框架这四个维度都塌缩成了一个东西：`count_floor: 1`。

## 核心挑战：把三个画像接回当前框架

当前框架的基础设施已经分得很细了——profile schema、gate definition JSON、gate CLI、phase MD 各司其职。好处是**改动点非常明确**：把画像→行为的映射接上就行。

需要回答的设计问题（本 TODO 的核心产出）：

### 1. 三个画像各自的具体"完成标准"是什么？

不只是 floor 数字。每个画像需要定义：

- **搜多少**：Wave 0 共享 reference floor、Wave 1 每 topic reference floor
- **搜多深**：reference 的质量门槛（哪些不算数——营销文章？没硬数据的？）
- **怎么判断够**：什么条件下可以申报 "这个 phase 做完了"（Stop Conditions checklist）
- **交付什么**：最终产物的判断姿势（事实结论 vs 覆盖图 vs claim 判断账本）

### 2. 画像怎么改变 Gate 行为？

当前 Gate 的门槛是硬编码的 `threshold: 1`。画像选了之后，Gate 应该按画像的不同标准来判定。具体机制是次要的——关键设计问题是：

**Gate 应该从哪读画像对应的标准？**
- 从 `rb_profile.yaml` 的 `configured_floors` 字段（实例化时算好写入）
- 还是 Gate definition JSON 自带画像→阈值的映射表
- 还是 Engine 层实时根据画像动态算

**倾向**：从 profile 读。profile 是 single source of truth——用户在 HITL1 选画像，系统（JS 函数或 Agent）把对应的标准算出来写进 profile，后续所有 gate 都读同一个地方。干净、可审计、可手动覆盖。

### 3. Agent 怎么知道"做到什么程度算够"？

当前 phase MD 说"foundation floor"——但不说具体数字。数字藏在 gate definition JSON 里，Agent 看不到。

画像落地后，每个 phase MD 应该明确告诉 Agent：**"你是说法验证画像，这个 phase 的标准是 X 条 reference，其中至少 Y 条来自独立来源，且必须通过质量门槛 Z"**。数字从 profile 来，但指令要写在 phase MD 里让 Agent 看到。

### 4. "搜多深"怎么接上 evidence-quality？

V12 的网页诊断（`web_substance`、`commercial_intent`、`content_retention`）是画像的"搜多深"维度的核心机制——一条营销文章在"快速事实"画像下可能勉强算数，在"说法验证"画像下不算数。

但"搜多深"的具体实现是 `todo-evidence-quality` 的事。本 TODO 只需要定：**每个画像的质量门槛是什么**——哪些 reference 可以计数、哪些必须排除。evidence-quality 按这个标准实现 `isCountable()`。

## 从 V12 借鉴的设计精华

V12 的三画像设计有几个值得保留的东西：

### 1. 画像不是参数表，是用户体验

用户不需要知道 floor 公式。用户只需要说"我想快速查个事实"或"我要验证这些说法靠不靠谱"。系统从画像推导出所有参数。

### 2. 每个画像有不同的"完成姿势"

同一个研究问题，不同画像下"完成"的含义不同：

- 快速事实："市场规模约 500 亿，数据来自 X 报告 2025 年，置信度中。主要限制：Y 市场未计入。"
- 探索地图："市场分 A/B/C 三个细分，A 的数据最充分，C 基本是空白。以下 3 个方向值得深挖。"
- 说法验证："Claim 1 '市场年增 30%'——支撑不足，两个来源数据矛盾，建议暂不信。Claim 2 '头部集中度升高'——有 3 个独立来源支撑，置信度高。"

**同一个 research question，不同画像交付的东西完全不同。**

### 3. Stop Conditions 跟画像绑定

V12 的 7 个 Stop Conditions 对三个画像有不同的解释：

| Stop Condition | 快速事实 | 说法验证 |
|---------------|---------|---------|
| must-answer 有本地 ref 支撑 | 核心事实有 ≥1 条即可 | 每个 P0/P1 claim 有 ≥2 条独立来源 |
| 反例搜索 | 不强制 | 强制——没搜过反例不能申报 complete |
| 交叉验证 | 不强制 | 强制——official claims 必须交叉验证 |

**不是所有画像都要做所有事。** 快速事实不需要 counterexample search。说法验证不需要也不行。

## 实验范围

**Goals:**
1. 定义三个画像各自在 4 个维度的具体标准（搜多少、搜多深、怎么判断够、交付什么）
2. 定画像→Gate 行为的接入方式（倾向：profile → configured_floors → gate 读 profile）
3. 定每个画像的 Stop Conditions checklist（Agent-facing，写进 phase MD）
4. 定每个画像的质量门槛（哪些 reference 可计数、哪些必须排除——给 evidence-quality 提供输入）
5. 初期只完整实现 **claim_verification** 一个画像（最完整的，另外两个后续加）

**Non-Goals:**
- 不实现质量过滤的具体代码（那是 evidence-quality 的事）
- 不实现 floor 公式的 Engine 层计算（那是 implementation detail，OpenSpec change 时定）
- 不改 gate-loop.mjs / gate-fork.mjs（thin engine 没被用到）
- 不加新 gate 或 phase node

## 下一步

1. `/opsx:explore wave1-sufficiency-gates` — 定：三个画像的 4 维度标准、画像→Gate 的接入方式、Stop Conditions checklist 的内容
2. `/opsx:propose wave1-sufficiency-gates` — 出 proposal + design + specs + tasks
3. 实施：先做 claim_verification 一个画像，从 profile → gate → phase MD 完整打通

## 相关文件

| 文件 | 角色 |
|------|------|
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` | 当前已有画像选择——但选了没改变行为 |
| `DPT_FRAMEWORK/schema/contracts/profile.mjs` | ProfileSchema——需加 configured_floors |
| `DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json` | count_floor: 1——需改为按画像 |
| `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json` | 同上 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` | "foundation floor"——需引用画像的具体数字 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | 同上 + 需加 Stop Conditions checklist |
| `_backlog/todo-evidence-quality.md` | 本 TODO 的下游——质量门槛的具体实现 |
| `_backlog/todo-evidence-extraction.md` | 本 TODO 的下游——enriched reference 格式 |
| `_backlog/todo-explore-exploit.md` | 本 TODO 的下游——收敛检测的阈值应与画像对齐 |
| `_backlog/done/_old_topics/_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/specs/RESEARCH_PROFILES.md` | V12 三画像的原始出处 |
| `_backlog/done/_old_topics/_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/specs/METHODOLOGY.md` | V12 的 Stop Conditions + 证据质量阶梯 |
