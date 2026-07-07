# BUG-054: Wave1 sub-agent 只做数据综合不做深度发掘，Phase Agent 照单全收

## 严重程度
P0 — 研究质量问题。Wave1 的定位是 per-topic deepening——在 wave0 foundation 之上独立发掘新来源、新视角、反向证据。但实际行为是：sub-agent 把 wave0 数据综合一下 → submit → Phase Agent 不审查深度就 accept → gate fail 后 force-advance。Wave1 没有产生 wave0 不知道的新发现，整个 phase 变成了"走过场"。

## 复现

在 `engelberg-tech-retreat-2026` run 中：

- Wave0: 5 个 sub-agent，每个 10+ WebSearch + 5+ WebFetch，~30min/agent，51 sources
- Wave1: 5 个 sub-agent，prompt="Use wave0 source.yaml as starting evidence"
  - Sub-agent 主要做**综合已有数据**而非**搜索新数据**
  - Topic 01 加了 2 个 venue 搜索，topic 03 搜索新参会者但"发现零新名字"就接受了
  - 每个 agent ~7-8 分钟（wave0 的 1/4）
  - 新增 source 极少（整体 ~5 个）
  - Phase Agent 对所有 submit **照单全收**，没有要求 sub-agent 回去深挖
- 对比：wave0 产出 source.yaml 含 evidence_meaning/relationship/next_hop；wave1 evidence-summary 只是 wave0 数据的重新组织

## 根因分析

### A. Sub-agent prompt 暗示"补充即可"

Wave1 sub-agent prompt 是 "Use wave0 source.yaml as starting evidence"——这暗示 sub-agent "已有的够了，补一点就行"。正确语义是 "wave0 只是 foundation——wave1 需要你独立发掘 wave0 没覆盖的新来源、新视角、反向证据"。

### B. Phase Agent 没有深度审查

Phase Agent 把 sub-agent 的 submit 当作完成信号，而不是产出质量的起点。phase-wave1.md §3.4 "Quality Self-Check" 列了 7 条 Agent 自检条件（core object list stable, must-answer backed, counterexample search 等），Phase Agent 一条都没执行。

应该检查：
- 是否有至少 3 个 wave0 没出现过的新 source URL？
- Evidence-summary 是否包含定量数据（不只是定性叙述）？
- Question-list 是否有具体的 open questions（不只是"待进一步研究"）？
- 如果检查不通过，将 work unit fail 并让 sub-agent 重做

### C. Gate 噪音挤占了深度审查的注意力

Wave1 gate 有 31 个 structural failures（reference count floor, section naming, source URLs）——Phase Agent 的注意力完全被这些结构性噪音占据，没有余力思考"evidence-summary 里的内容够不够深"。这是 BUG-053 的直接下游后果。

### D. force-advance 常态化

因为 wave0 gate 过不去（BUG-048），Phase Agent 学会了 force-advance。到了 wave1，即使 gate 失败有实质性原因（而不只是结构性），Phase Agent 也习惯性地 force-advance。

## 建议修复

1. **Wave1 sub-agent prompt 必须强调"深度发掘"而非"综合已有"。** 模板应包含：
   > "Wave0 found X sources. Your wave1 job is to find Y NEW sources that wave0 missed. If you find fewer than 3 genuinely new sources with unique content, your work is incomplete."

2. **Phase Agent 在 submit 前必须执行 Quality Self-Check（phase-wave1.md §3.4）。** 7 条逐条检查，结果写入 trace。>2 条未通过 → 禁止 advance，先修。

3. **Phase Agent 审查每个 wave1 work unit 的产出深度再决定 accept/fail。** 不通过的发回 sub-agent 重做，不能用 force-advance 绕过。

## 历史设计考古：v12 的 Wave1 本来设计了什么（全部丢失）

> 来源：`_backlog/_done/_old_topics/_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/`
> 以下内容是对原始 v12 设计的提炼和术语映射，不是直接照搬。v12 的术语（`STATUS_PATH`、`seed_topics/_reference/`、`_cache/intake/`）与当前框架不同，但**设计思想完全适用**。

### v12 的 Wave1 五层深化维度（当前全部缺失）

v12 定义 wave1 的 "deepening" 有五个具体维度，不只是 "多找几个 source"：

| 维度 | v12 定义 | 当前 engelberg run 里做了什么 |
|------|---------|---------------------------|
| **Evidence** | 按 topic 独立搜索新 reference，至少一半来自 topic-unique 源（非复用 wave0 shared foundation） | 综合 wave0 已有数据，新增 ~5 source（几乎全是 wave0 的变体搜索） |
| **Mechanism** | 理解 topic 内部运作机制，写入 evidence-summary "Mechanism" section | 无。evidence-summary 没有 Mechanism section |
| **Trend** | topic 随时间如何演化，写入 "Current Judgment" + seed backfill "本轮新增趋势与难点" | 无。没有时间趋势分析 |
| **Difficulty** | topic 特有的障碍、挑战、摩擦点 | 无 |
| **Limitation / Dispute / Failure-mode** | **强制搜索**反向证据——counterexample、争议、失败案例。v12 有专门的 source floor 要求 | 无。没有任何 counterexample search |

**结论**：当前 wave1 只在 Evidence 维度上做了最浅的操作（补充几个搜索），其余四个深化维度完全没有触及。这不是 "执行不到位"——是 phase-wave1.md 和 sub-agent prompt 里根本没有这五个维度的指令。

### v12 的 Exploration/Exploitation 结构化机制（当前完全缺失）

v12 的 wave1 不是一个线性的 "搜索→写文件→submit" 流程，而是一个**循环**：

1. **Question Reconciliation**（问题对账）：逐条检查已有问题——哪些被新证据回答了？哪些需要降级？哪些仍然 blocked？
2. **Emergent Question Protocol**（涌现问题协议）：四个检查——`new_concept`（出现了新概念？）、`contradiction`（证据之间有矛盾？）、`missing_information_gap`（明显的证据空白？）、`noise_pattern`（噪音中有模式？）→ 生成 `[涌现]` 标记的新问题
3. **Exploration/Exploitation Decision**：9 种路由——`continue`、`exploit_current_line`、`explore_new_line`、`topology_candidate`、`complete`、`early_saturation_review`、`suspend`、`archive`、`redirect`。每个决策带 `trigger_refs`（哪条证据触发了这个决策）+ `queue_consequence`（下一步入队什么）+ `next_action`

**固定顺序**：Question Reconciliation → Emergent Question Protocol → Exploration/Exploitation Decision。顺序不可逆，保证可审计性。

当前 wave1 的 question-list.md 是一个自由格式的 markdown 文件。v12 的 question-list 是一个四段 ledger：
1. Topic Investigation Targets
2. Question Reconciliation
3. Emergent Question Protocol
4. Exploration/Exploitation Decision

### v12 的渐进式 Artifact 生产（vs 当前的一次性 submit）

v12 的关键设计：**artifact 不是 wave1 结束时一次性生产的**。

- 当 topic 获得第一个 topic-unique reference（`topic_unique_ref_count >= 1`）时，`evidence-summary.md` 和 `question-list.md` **必须立即生产**初版
- 之后每 delta >= 2 个新 reference 就刷新一次 artifact
- 这迫使 Agent 在每个 reference 里程碑处综合已知信息，而不是把所有 synthesis 推迟到 gate audit 时

当前框架：sub-agent 搜完 → 一次性写 evidence-summary + question-list → submit。所有的 synthesis 发生在 submit 前的那一刻，而不是渐进式的。

### v12 的 Profile 感知（当前完全丢失）

v12 的 `RESEARCH_PROFILES.md` 为不同 profile 定义了不同的 wave1 行为参数：
- `exploratory_map`：`wave1_doc_floor_per_topic`、`topic_unique_ratio`、counterexample search、cross-verification 的开关
- `quick_factual`：仍然是完整的 wave0/wave1/wave2 流程，只是参数降低

当前 `rb_profile.yaml` 虽然定义了 `wave1_per_topic_ref_floor: 8`、`topic_unique_ratio: 0.4`、`counterexample_search: false`、`cross_verification: false`，但 phase-wave1.md 和 sub-agent prompt **完全没有读取和使用这些参数**。Profile 定义了行为，但执行层忽略了它。

### 为什么这些设计丢失了

从 v12 到当前 DPT_FRAMEWORK 的重写过程中，wave1 的 phase 定义（`phase-wave1.md`）只保留了**结构骨架**（入队→claim→sub-agent→submit→gate），丢失了**深化逻辑**（五维度、Exploration/Exploitation 循环、渐进式 artifact、Emergent Question Protocol）。

这不是 bug——是设计迁移中的功能缺失。v12 的 wave1 是一个有状态的、循环的、由 exploration/exploitation 信号驱动的深化引擎。当前的 wave1 是一个无状态的、"搜索→写文件→submit" 的线性管道。

## 建议修复（更新）

### P0 — 恢复 Wave1 的深化架构

1. **在 phase-wave1.md 中恢复五层深化维度作为 sub-agent 的必做任务。** Sub-agent prompt 不应是 "use wave0 as starting evidence"，而是显式列出五个维度的搜索和产出要求。

2. **恢复 question-list 的四段 ledger 结构**（Topic Investigation Targets → Question Reconciliation → Emergent Question Protocol → Exploration/Exploitation Decision）。Question-list 不再是自由格式 markdown，而是结构化 ledger。

3. **恢复 Exploration/Exploitation 循环**。Wave1 不应是单次 submit——每个 topic 可能需要多轮 evidence search，由 exploration/exploitation signal 驱动。`rb_profile.yaml` 中的 `counterexample_search`、`cross_verification` 参数必须被 phase-wave1.md 读取和执行。

4. **恢复渐进式 artifact 生产**。第一个 topic-unique reference 到达时立即生产 evidence-summary 初版，之后每 delta>=2 刷新。不等到 submit 时刻才做所有 synthesis。

5. **Phase Agent 必须读取并尊重 `rb_profile.yaml` 的参数。** `wave1_per_topic_ref_floor`、`topic_unique_ratio`、`counterexample_search`、`cross_verification` 等参数不是装饰——它们定义了 wave1 的行为契约。Phase Agent 必须在启动 wave1 时验证：我是否理解了这些参数？我是否会在执行中强制执行它们？

### 设计原则

v12 的 wave1 设计虽然术语和文件布局不同，但核心思想是清晰的：**Wave1 不是"在 wave0 基础上多搜几个关键词"——Wave1 是一个有结构的深化过程。** Gate 的复杂不是为了折腾 Agent——是因为深化过程本身需要多个维度的检查。当前的问题是：深化过程丢了，gate 的复杂度还在，但 gate 检查的东西（五维度产出、exploration/exploitation decision、progressive artifact freshness）全都不存在了，所以 gate 只能报 structural failure（"文件不存在"、"section 命名不对"）。

**先恢复深化过程，再审视 gate 该查什么。** 顺序不能反。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave1 完成后对比 wave0 发现新增 source 极少；结合 v12 设计考古确认五层深化维度 + Exploration/Exploitation 机制全部丢失

## 关联
- [[BUG-053]] — gate 噪音挤占审查注意力；gate 的复杂度继承自 v12，但深化过程已丢失
- [[BUG-048]] — force-advance 被常态化
- [[BUG-055]] — wave2 同样深度不足
- v12 参考：`_backlog/_done/_old_topics/_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/specs/METHODOLOGY.md`
