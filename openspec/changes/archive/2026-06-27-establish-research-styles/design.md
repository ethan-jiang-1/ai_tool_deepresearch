## Context

当前 HITL1 让用户选了研究画像（`quick_factual` / `exploratory_map` / `claim_verification`），写入 `rb_profile.yaml` 的 `research_profile` 字段，gate 验证了它不为 `not_selected`。但**选了画像之后，没有任何下游行为改变**——Wave 0 gate 永远 `count_floor: 1`，Wave 1 gate 永远 `count_floor: 1`，不卡质量，不追踪核心问题。

本 design 建立"研究风格"体系：一组 JSON 文件定义每种风格的参数值，HITL1 用户选择后 Agent 运行 `apply-research-style.mjs` 把参数写入 `rb_profile.yaml`，之后 Gate CLI 和 Phase MD 各自读同一个 profile 做决策。

V12 原始设计的核心洞察：三个研究画像在"搜多少、搜多深、怎么判断够、交付什么"四个维度上的行为不同。本 design 保留这四个维度，用具体参数值表达（不用公式）。

## Goals / Non-Goals

**Goals:**
- 建立 4 个研究风格 JSON 文件（`DPT_FRAMEWORK/schema/research-styles/` 下），每种风格是一组具体参数值，JS（`JSON.parse`）读取
- HITL1 用户选风格后，Agent 运行 `apply-research-style.mjs` 把对应 JSON 风格文件的全部参数写入 `rb_profile.yaml` 的 `research_style_params` section
- Gate CLI（wave0-complete、wave1-complete）的 `count_floor` rule 读 profile 里的动态阈值，不再用硬编码 `threshold: 1`
- Phase MD（wave0、wave1）明确引用画像的具体数字和 stop conditions
- `gate-helpers.mjs` 新增 `readBundleProfile()` 公共函数，避免各 CLI 重复实现
- 加第 5 种风格只需加一个 JSON 文件；加新参数只需在已有 JSON 里加一个 key

**Non-Goals:**
- 不实现 `isCountable()` 的内容级质量过滤（那是 `todo-evidence-quality` 的事）
- 不实现 gate 层的 Topic Investigation Targets 验证（那是 `todo-evidence-extraction` 产出 enriched reference 之后的事）
- 不实现探索/利用决策的内容验证（那是 `todo-explore-exploit` 的事）
- 不改 gate-loop.mjs / gate-fork.mjs（thin engine 未被当前 gate CLI 使用）
- 不加新的 gate 或 phase node
- cache：gate 不检查 `_cache/` 内容完整性——cache 是 non-authority，不由 gate 验证
- cache：不强制 Sub-agent 一定写三文件——那是 Agent discipline（task card + spawn prompt 指引），不是 engine 硬约束。今后可加 receipt check 升级为硬约束

## Decisions

### 1. 研究风格用 JSON 文件定义，仅供 JS 读取

**选择**：`DPT_FRAMEWORK/schema/research-styles/{style_name}.json`，每个风格一个独立 JSON 文件。JSON 是 JS 原生格式——`JSON.parse()` 零歧义（`12` 是 number，`"tier_2"` 是 string）。这些文件**只被 JS 读**——Agent 不读、MD 不读。

**替代方案**：
- YAML 文件：JS（`parseYaml`）和 MD（Agent `cat`）都能读，但 YAML 类型推断有歧义（`12` 是 number 还是 string？），且让 Agent 在 MD 里读 YAML 做乘法是架构错误——解释权应该在 JS
- JS 文件（`.mjs`）：Agent 仍然读不了，但 JSON 比 JS 更纯粹（纯数据，无执行语义）
- 放在 gate definition JSON 里：职责混乱——gate 只应该定义 rule，不应该定义参数策略

**理由**：JSON 类型明确，JS 原生支持。Agent 不碰这些文件——`apply-research-style.mjs` CLI 是唯一的 reader 和 computation 点。加第 5 种风格只需加一个 JSON 文件。

**参数中的 topic-count-dependent 值**：`wave0_shared_ref` 是一个 `{ base, per_topic }` 对象——JS CLI 在运行时读 `topic_registry` 长度，计算 `wave0_shared_ref_total = base + per_topic × topic_count`，写入 profile。Agent 不需要知道这个公式的存在。

### 2. Profile 的 `research_style_params` 是单点真相，由 JS CLI 写入

**选择**：HITL1 完成后，Agent 运行 `apply-research-style.mjs --bundle <path> --style <name>`。CLI 读 JSON style 文件 + `topic_registry` 长度 → 计算所有 topic-count-dependent 值 → 写入 `rb_profile.yaml#/research_style_params`。后续所有 Gate CLI 和 Phase MD 都只读 profile 中的**绝对值**，不读 JSON 源文件，不碰公式。

**替代方案**：
- Agent 读 JSON + 手写 profile：Agent 做乘法不可靠——会忘公式、会算错、会跳过。JS 的活不该让 MD 做
- Gate CLI 运行时去读 JSON 源文件：每次都要做"style → topic_count → 计算"的映射，且 gate CLI 不知道 topic_count（需要额外读 plan）

**理由**：Profile 是单一真相源，存绝对值。`apply-research-style.mjs` 是 computation 的 trust root——同一个 style JSON + 同一个 topic_count 一定产出相同结果，由测试保证正确性，不由 Agent 记忆力保证。

**Rerun 路径的责任**：HITL2 决定 rerun 后，`phase-rerun` 可能添加或移除 topic（通过 `## 本轮重跑方向` 标注）。这会导致有效 topic_count 变化。`phase-rerun` 做完 topic delta 后 SHALL 同步更新 `rb_plan.md` 的 `topic_registry`，然后重新运行 `apply-research-style.mjs` 以重算 `wave0_shared_ref_total`。`phase-seed-topics`（rerun-aware 模式）SHALL 将 `action: add`/`action: remove` 的结果同步回 `topic_registry`。`apply-research-style.mjs` 本身不需要任何修改——它始终从 `topic_registry` 实时读长度，跑第二次自然产出正确结果。此改动仅在 MD 层，不动 CLI 和 schema。

### 3. Gate CLI `count_floor` rule 用 `threshold_source` 引用 profile

**选择**：Gate definition JSON 的 `count_floor` rule 新增 `threshold_source` 字段（指向 `rb_profile.yaml` 的 JSON path）。`resolveThreshold(rule, profile)` 在 `gate-helpers.mjs` 中**共享实现**——wave0 和 wave1 的 gate CLI 各自 import 使用，不重复实现。`threshold: 1` 保留为 fallback（向后兼容没有 `research_style_params` 的旧 bundle）。

**明确不做的**：不在 gate definition JSON 里加 `threshold_profile_map`。同一个阈值不需要存在两个地方——profile 已经是单点真相。gate JSON 只需要知道 "去哪读"，不需要自己存一份副本。不在两个 gate CLI 中各自实现 `resolveThreshold()`——共享逻辑放 helpers，CLI 只负责调用。

**替代方案**：
- 只在 gate JSON 里写 profile→threshold 映射表（不从 profile 读）：阈值逻辑分散在多个 gate JSON 里，改数字要改多处
- 只从 profile 读，不保留 fallback：旧 bundle break
- 两个 CLI 各自实现 `resolveThreshold()`：代码重复，bug 修复容易漂移

**理由**：`threshold_source` 指向 profile 的一个字段，清楚直接，不冗余。`threshold` 作为 fallback——向后兼容没有新 profile 字段的旧 bundle。共享 `resolveThreshold()` 放 `gate-helpers.mjs`，和已有的 `readBundlePlan()` 共享模式一致。

**Path 解析**：`threshold_source` 的 `#/` 路径格式与现有 `status_value` rule 的 `target` 字段一致（`status_value` 在 `rb_status.json` 上用 `#/` walk）。`rb_profile.yaml` 经 `parseYaml` 后是纯 JS object，逐层 `.reduce()` walk 逻辑完全相同，不需要新解析器。

**类型安全**：JSON style 文件中 `12` 一定是 number、`"tier_2"` 一定是 string——零歧义。Profile 中的值是 JS 写入的，类型确定。`resolveThreshold()` 仍做 `Number()` 安全转换作为 defense-in-depth（floor ≤0 → fallback）。

### 4. `readBundleProfile()` 放 `gate-helpers.mjs`

**选择**：在 `gate-helpers.mjs` 里新增 `readBundleProfile()`，已有 `readBundlePlan()` 做先例。Gate CLI 通过已有的 import 使用。

**理由**：避免 10 个 gate CLI 各自重复 `const profile = parseYaml(readFileSync(join(bundlePath, 'rb_profile.yaml'), 'utf-8'))`。和 `readBundlePlan()` 对称。

### 5. debug 风格靠 `user_visible: false` 隐藏

**选择**：每种风格有一个 `user_visible` 字段。`debug` 设为 `false`。HITL1 只展示 `user_visible: true` 的选项。

**理由**：最小机制。`debug` 在其他方面和其他风格完全一样——只是 HITL1 不展示。框架内部可以手动改 profile 为 `debug` 来跑低门槛测试。

### 6. 每个参数字段的语义和 enforcement

参数的**语义归属**（这个参数为哪个 phase 提供信息）和**本 change 的 enforcement 方式**（Gate 强制还是 Agent checklist）：

| 字段 | 语义：W0 | W1 | W2 | 质量/final | 本 change 的强制方式 |
|------|----------|----------|----------|-------------|-------------------|
| `wave0_per_topic_source_floor` | gate count_floor（per-topic） | — | — | — | **Gate**（count_floor rule 读 threshold_source） |
| `wave0_shared_ref_total` | gate count_floor（global） | — | — | — | **Gate**（同上。由 `apply-research-style.mjs` 根据 base + per_topic × topic_count 计算） |
| `wave1_per_topic_ref_floor` | — | gate count_floor | — | — | **Gate**（同上） |
| `topic_unique_ratio` | — | Agent checklist | — | — | Agent checklist（phase-wave1 指引自查） |
| `counterexample_search` | — | Stop Condition | — | — | Agent checklist（phase-wave1 stop conditions） |
| `cross_verification` | — | Stop Condition | — | — | Agent checklist（同上） |
| `p0p1_independent_backing` | — | — | Quality Self-Check（P0/P1 backing count） | final-output-eval | **Agent checklist + Queue re-fill loop**（phase-wave2.md § Quality Self-Check → gap detected → supplementary task card → Q re-fill → drain → re-check） |
| `quality_min_tier` | — | — | Quality Self-Check（source tier floor） | evidence-quality | **Agent checklist + Queue re-fill loop**（同上——backing source tier 不达标 → re-fill Q 找更高质量 source） |
| `quality_min_substance` | — | — | Quality Self-Check（source substance floor） | evidence-quality | **Agent checklist + Queue re-fill loop**（同上——backing source substance 不达标 → re-fill Q 找更高质量 source） |
| `wave2_cross_topic_depth` | — | — | Quality Self-Check（cross-topic connection 数量） | cross-topic integrity | **Agent checklist + Queue re-fill loop**（每 topic 至少深度个其他 topic 连接，不足 → re-fill Q 搜 cross-topic evidence）。Per-topic 整数：0=不做，1=≥1 connection/topic，2=≥2/topic 含 ≥1 contradiction |
| `wave2_emergent_search_rounds` | — | — | Quality Self-Check（emergent content search 轮次） | evidence completeness | **Agent checklist + Queue re-fill loop**（每 topic 做 rounds 轮 emergent search，每轮换角度，不足 → 追加轮次）。Per-topic 整数：0=不做，1=1轮/topic，2=2轮/topic |

**Enforcement 三级体系（本 change）：**

| 级别 | 参数 | 机制 |
|------|------|------|
| **Gate enforcement** | `wave0_per_topic_source_floor`、`wave0_shared_ref_total`、`wave1_per_topic_ref_floor` | Gate CLI `count_floor` rule 读 `threshold_source`，不可绕过 |
| **Agent checklist + Queue re-fill loop** | `counterexample_search`、`cross_verification`、`p0p1_independent_backing`、`quality_min_tier`、`quality_min_substance`、`wave2_cross_topic_depth`、`wave2_emergent_search_rounds` | Phase MD body 约束 + Phase Agent 自主检测 gap → re-fill Q → drain → re-check → gate。Agent 自检，Queue 提供循环动力 |
| **Agent checklist only** | `topic_unique_ratio` | Phase MD body 约束，Agent 自行遵守，无 gate 验证，无 re-fill loop |

所有 quality 参数在本 change 中**不做 Gate rule**——gate 不做内容级质量判断（那是 `todo-evidence-quality` 和 `todo-explore-exploit` 的事）。但通过 Agent checklist + Queue re-fill loop，它们在 phase body 层面有结构化的执行力，不是空洞的"建议"。Phase Agent 读 `research_style_params`，逐条自查，不足就 re-fill Q——静默自主，模式与 wave0/wave1 count_floor re-fill 完全一致。

### 7. Wave0/1/2 统一使用 Active Queue Re-Fill Loop

**选择**：三个 research phase 全部采用同一套执行模型——进入 phase → fill Q → drain Q → check → (gap?) → re-fill Q → drain → re-check → ... → gate pass。Wave0 和 Wave1 的 check 由 Gate CLI `count_floor` 执行（JS 返回数字 gap），Wave2 的 check 由 Agent Quality Self-Check 执行（Agent 读 `research_style_params` 逐条对比）。Gap 检测后，三个 wave 都通过 **supplementary task card → enqueue Q → drain → re-check** 自主补足。

**为什么必须统一：**
- Phase Agent 进任意 wave 不需要切换心智模型——同一套循环原语
- Queue 是 phase 内的统一编排引擎——所有 task（灌料、gap-fill）走同一通道
- 循环有界——max 3 gate attempt + no-progress detection，防止无限循环

**为什么 Wave2 的 check 不是 Gate rule：**
- Wave2 的 5 个参数（`p0p1_independent_backing`、`quality_min_*`、`wave2_cross_topic_depth`、`wave2_emergent_search_rounds`）检查的是**内容质量**——backing source 够不够独立、tier 够不够高、cross-topic connection 够不够深
- 这些是 Agent judgment 范畴，不是 deterministic checkpoint。Gate 不做内容级质量判断（那是 `todo-evidence-quality` 的事）
- 但在 phase body 层面，它们有**结构化的执行力**——Agent checklist + Queue re-fill loop，不是空洞的"建议"

**三个 wave 的 check 对比：**

| | Wave0 | Wave1 | Wave2 |
|---|---|---|---|
| Check 什么 | source 数量 | reference 深度 | finding 质量 + cross-topic 覆盖 |
| 谁 Check | Gate CLI `count_floor` | Gate CLI `count_floor` | Agent Quality Self-Check |
| Gap 形式 | 数字（N < T） | 数字（N < T） | 结构化 gap（backing 不足 / depth 不够 / rounds 不够） |
| Supplementary task | `wave0-suppl-{topic}-r{N}` | `wave1-suppl-{topic}-r{N}` | 3 种：backing / cross-topic / emergent |
| Re-fill 位置 | §3.3.1 | §3.3.2 | §3.3.2 |
| Bounded by | 3 attempts + no-progress | 3 attempts + no-progress | 3 attempts + no-progress |

**替代方案：**
- Wave2 的 gap-fill 留在 synthesis task 内部做嵌入式循环（当前实现）：Phase Agent 需要两套模式——wave0/1 用 Q re-fill，wave2 用 manual loop。增加认知负担，且 manual loop 缺乏 receipt check、无 Q 级 visibility
- Wave2 的 quality 参数全部做成 gate rule：需要新增 3 种 gate rule type（`backing_count`、`source_quality`、`cross_topic_depth`），scope 超出本 change（留给 `todo-evidence-quality`）

**理由**：三个 wave 的 gap-fill 本质相同——"产出不够 → 追加 task → 再做 → 再检查"。Queue 是这套循环的最自然的引擎。Wave2 的 check 方式不同（Agent vs Gate），但循环机制相同。

## Risks / Trade-offs

- **参数数字可能不准**——用 V12 公式的默认值（tc=2, ctd=2）反推，实际跑起来可能需要调整。→ 改 JSON 文件里的值即可，不需要改代码。
- **`wave0_shared_ref` 的 base/per_topic 假设线性增长**——topic count 很大时可能偏高。→ 数值可后调；gate 是下限不是上限，Phase Agent 可以产出更多。
- **旧 bundle 兼容**——没有 `research_style_params` section 的旧 bundle，Gate CLI fallback 到 `threshold: 1`，行为不变。
- **`apply-research-style.mjs` CLI 是 computation 单点**——如果 CLI 有 bug，所有 bundle 的参数都会错。→ 必须写测试覆盖 topic_count=0/1/3/10 场景。
- **Gate CLI 读 profile 增加了 I/O**——每个 `count_floor` rule 的 resolve 读一次文件。→ lazy cache：第一次读，后续用 cache。
- **`_cache/` 路径依赖 Phase Agent 正确传参**——如果 Phase Agent 忘记 `mkdir -p` 或传错 batch 名，该批次的原始数据丢失。→ 三重保障（spawn prompt + task card + mkdir）降低风险；今后可加 engine-level 自动创建作为 defense-in-depth。
- **`_cache/` 目录随时间增长**——多次 re-fill 后 `_cache/` 可能很大。→ wave 完成后 Phase Agent MAY 删除对应 wave 子目录；`agentic-queue/` 保留。
- **`meta.json` 字段是约定而非 schema 约束**——Sub-agent 可能漏填字段。→ 今后可加 Zod schema 做 validate，本 change 先建立约定。

### 8. _cache/ directory structure — wave / batch / scope / source

**选择**：`_cache/` 下采用四级目录结构 `_cache/{wave}/{batch}/{scope}/{source_dir}/`，替代文档中的 `_cache/waveN/slot_MM/` 三层 slot 编号结构。

```
_cache/
  README.md                         ← bundle instantiation 时自动创建
  wave0/
    primary/                        ← 首次 source intake queue drain
      01_{topic-slug}/
        s01_{source-slug}/          ← source-slug = reference 文件名中的 qualifier
          websearch.json
          page.md
          meta.json
    suppl-r1/                       ← count-floor 补充第1轮
    suppl-r2/
    suppl-r3/
  wave1/
    primary/                        ← 首次 deepening
    suppl-r1/
    suppl-r2/
    suppl-r3/
  wave2/
    synthesis/                      ← cross-topic scan (dpt-topic-scout)
      {finding_id}/                 ← 按 finding_id 组织
    backing-r1/                     ← backing gap 补充
    depth-r1/
    emergent-r1/
  agentic-queue/                    ← 保留现有 queue projection
```

**路径公式**：

| 变量 | wave0 | wave1 | wave2 |
|------|-------|-------|-------|
| `wave` | `wave0` | `wave1` | `wave2` |
| `batch` | `primary` / `suppl-r{1,2,3}` | `primary` / `suppl-r{1,2,3}` | `synthesis` / `backing-r{1}` / `depth-r{1}` / `emergent-r{1}` |
| `scope` | `{NN}_{topic_slug}` 或 `shared` | `{NN}_{topic_slug}` | `{finding_id}` |
| `source_dir` | `s{NN}_{source-slug}` | `s{NN}_{source-slug}` | `s{NN}_{source-slug}` |

**与 reference 文件的关联**：source-slug 在 reference 文件名和 cache 路径中保持一致——`reference/01_topic-xinhua-box-office.md` ↔ `_cache/wave1/primary/01_topic/s01_xinhua-box-office/`。

**每个 source 三文件约定**：`websearch.json`（原始搜索结果）、`page.md`（页面内容）、`meta.json`：
```json
{
  "url":               "https://...",
  "title":             "页面标题 — Sub-agent 抓取时的一手观察",
  "source_domain":     "从 URL 提取，机器可靠",
  "source_name":       "人可读来源名，未知填 \"unknown\"",
  "fetched_at":        "ISO 8601 时间戳",
  "fetch_method":      "实际成功的那一层：WebFetch / curl / node / python3",
  "fetch_chain":       "降级链完整路径，如 [\"WebFetch\",\"curl\",\"node\"]",
  "content_type":      "text/html / application/pdf / ...",
  "reliability_tier":  "Sub-agent 第一印象 tier_1~4，非最终判定",
  "reliability_basis": "official_media / academic / government / personal_blog / unknown",
  "whitelist_status":  "\"none\" 默认 — 今后白名单接入后替换"
}
```
`meta.json` 字段可扩展——今后加 `byte_size`、`language`、`paywall_detected` 等直接加 key。

**替代方案**：
- 沿用 `waveN/slot_MM/` 的 slot 编号 — 拒绝。slot 编号对人不友好（`slot_03` 对应哪个 topic？），且与 authority `_subagents/wave_NN/` 命名不一致。
- 按内容类型分 `search-results/` / `fetched-pages/` / `extraction-notes/` — 拒绝。同一来源的三层内容分散在三处，不利于"一个来源→一个目录"的诊断模型。
- 直接用 `{source-slug}/` 不加 `sNN_` 序号 — 拒绝。无序号时无法区分发现顺序，且 source-slug 可能重复。

**理由**：四级结构是"按工作组织"而非"按技术机制组织"——任何人打开 `_cache/` 顺着 wave → batch → topic → source 往下走，不查文档也能定位到想要的内容。

### 9. Cache path communication mechanism — spawn prompt + task card + mkdir

**选择**：三重保障确保 Sub-agent 知道 cache 路径：

1. **`buildSpawnPrompt()` 增加 `cacheDir` 参数**：spawn prompt 中显示 `Cache directory: {绝对路径}`。Phase Agent 通过参数传入。未传入时不显示此行（向后兼容）。
2. **Task card `action` 字段包含精确路径**：从模糊的 "搜索中间结果写入你的 slot 缓存目录" 改为包含精确路径的具体指令。
3. **Phase Agent spawn 前 `mkdir -p`**：确保目标 cache 目录在 Sub-agent 启动前已存在。

**替代方案**：
- Sub-agent 自己推导路径 — 拒绝。Sub-agent 不知道 batch 名、topic slug 等上下文信息。
- 引擎自动创建 `_cache/waveN/slot_MM/` — 部分采纳（可做为基础目录），但 batch/scope 信息只有 Phase Agent 知道，无法完全自动化。
- 写入 `_subagents/` 下的子目录 — 拒绝。`_subagents/` 是 authority 域，缓存是 non-authority。

**理由**：当前 Sub-agent 完全不知道 cache 路径——spawn prompt 不含此信息，task card 只说"写入 slot 缓存目录"不给具体路径。三重保障让路径确定性地到达 Sub-agent，不再靠运气。

### 10. _cache/README.md 和 _logs/README.md 在 instantiation 时创建

**选择**：类似 `reference/README.md` 和 `artifacts/README.md`，`_cache/README.md` 和 `_logs/README.md` 在 bundle instantiation 时从模板创建。

**理由**：README 是结构提醒——bundle 一出生就告诉所有人"这里会存什么、按什么规矩存"。不需要查文档、不需要记约定。`_cache/README.md` 解释四级结构和 source 三文件约定；`_logs/README.md` 解释各 trace/log 文件的写入者和用途。
