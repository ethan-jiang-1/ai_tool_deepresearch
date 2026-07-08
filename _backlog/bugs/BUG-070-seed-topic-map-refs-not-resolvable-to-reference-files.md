# BUG-070 — seed_topics 信息地图的 `refs` 无法按图索骥到 `reference/` 具体文件：回填指向内部 build 产物、用 glob 通配、且大量条目零 reference 引用

| 属性 | 值 |
|------|-----|
| ID | BUG-070 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1（seed_topics 是整份研究的**导航脊柱/信息地图**；`refs` 指不到 `reference/` 具体文件，则 consumer/下游 synthesis 按图索骥失败）+ 根因是本应拦截此问题的校验太宽松 |
| 来源 | `dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run（exploratory_map，5 topics），用户复盘 `seed_topics/` 回填质量时发现 |
| 相关 Bug | [[BUG-068]]（depth-review ref 尾斜杠 / role 漂移）、[[BUG-064]]（Wave1 reference 文件未产出）、[[BUG-065]]（Wave2 cross-reference 未产出）——同族「reference 层作为一等导航目标未被契约强制」 |
| 影响文件 | `engine/helpers/return-map.mjs`（`requireWave1Refs`/`requireWave2Refs`/`hasNakedEvidenceList` 把 `reference/` 与 `artifacts/`、`_cache/`、`_work_units/` 等价对待）、`workflows/nodes/phases/phase-wave1.md`（§ line 141/197/227 主动指示 refs 指向内部 build 面）、`workflows/nodes/phases/phase-wave0.md` / `phase-wave2.md`（同类回填指引）、`workflows/nodes/phases/phase-seed-topics.md`（预埋区未声明「refs 必须解析到 reference/ 具体文件」的地图契约） |

---

## 0. 一句话核心诊断

**`seed_topics/*.md` 是本研究的信息地图（information map）——每个 return-map 条目的 `refs` 字段本应让读者/下游 agent 按图索骥直达 `reference/` 目录下的某个具体证据文件。但回填（wave0/wave1/wave2）实际写出的 `refs` 大多指向内部 build 产物（`artifacts/`、`_cache/`、`_work_units/`），少数指向 `reference/` 的又是 glob 通配（`reference/01_...-*.md（8 个）`）而非枚举的具体文件；且本应拦截此问题的 `return-map.mjs` 校验把 `reference/` 仅当作若干可接受面之一，从不强制、不枚举、不校验存在性。结果：地图指向施工脚手架，读者顺着地图找不到证据。**

---

## 1. 期望契约（信息地图的本质）

`seed_topics/` 的「═══ 研究轮次追加区 ═══」是**给人和下游 synthesis 消费的导航层**，不是内部账本。其 `refs` 的语义应当是：

> 「这条判断/机制/趋势/待验证问题，其证据落在 `reference/<具体文件>.md` —— 那个文件里大概说了什么。」

因此每个 return-map 条目的 `refs` **至少要有一个可解析、真实存在、被枚举命名的 `reference/` 文件**。`artifacts/`、`_cache/`、`_work_units/` 是引擎内部 provenance，可作**附属**溯源，但**不能替代** reference 主引用——它们不是信息地图的目标层，读者顺着它们落进 build scaffolding，不是「某个文件里说了啥」。

---

## 2. 实际现象（本 run 逐条取证）

`seed_topics/01_deer-valley-retreat-feb-2026.md`：

- **wave0 证据条**（line 88）：
  `artifacts/wave0/.../source.yaml（15 源）; reference/00-shared-agentic-programming.md; reference/00-shared-humans-and-agents-loops.md; _cache/wave0/...; _work_units/wave0/wu-w0-b000-src-i0001/`
  → 有 2 个具体 `reference/` 文件（✓），但淹没在 3 个内部路径里，无「主引用 vs 附属溯源」层级。
- **wave1 机制条**（line 95）：
  `artifacts/wave1/.../evidence-summary.md; reference/01_deer-valley-retreat-feb-2026-*.md（8 个 topic ref）; _work_units/...`
  → reference 引用是 **glob 通配 + 中文计数**（`-*.md（8 个）`）。**glob 不是地图条目**——读者无法按图索骥到「哪一个」文件；「8 个」也无法机器解析或校验。
- **wave1 趋势条**（line 102）：
  `artifacts/wave1/.../evidence-summary.md; _work_units/wave1/wu-w1-b000-deep-i0001/`
  → **零 `reference/` 引用**。这个地图节点完全指向内部 build 面。
- **待验证问题条**（line 111）：
  `artifacts/wave1/.../question-list.md`
  → **零 `reference/` 引用**。

topic 02–05 完全同构（每份都有 `reference/0X_...-*.md（8/9 个）` 的 glob、以及只含 `artifacts/`+`_work_units/` 的趋势/问题条）。即：**5/5 topic 的信息地图都无法按图索骥到具体证据文件。**

对照 `reference/_INDEX.md`：topic 1 实际有 8 个 `wave1_topic` 文件（`01_..-davepaola-*`、`-connsulting-*`、`-joncamp-*`、`-codescene-*`、`-thoughtworks-cto-*`、`-thoughtworks-fosd-report-*`、`-pulse24-*`、`-ubos-*`）——这些**具体文件名本就存在且可枚举**，回填却用 `-*.md（8 个）` 把它们糊成一个通配。地图有能力精确，却选择了模糊。

---

## 3. 根因（校验太宽松 + 文档主动误导）

### 3.1 `return-map.mjs` 把 `reference/` 降级为「可接受面之一」

`validateReturnMapContent` 的 wave1 refs 检查（line 90）：

```js
if (requireWave1Refs && !/\b(?:artifacts\/wave1\/[^/\s]+\/(?:evidence-summary|question-list)\.md|reference\/[^)\s]+\.md|_cache\/|_work_units\/)/.test(text)) {
```

- 这是一个**大 OR**：只要出现 `artifacts/wave1/.../evidence-summary.md` **或** `reference/X.md` **或** `_cache/` **或** `_work_units/` 任意一个，就算通过。
- 于是「趋势条只写 `artifacts/... ; _work_units/...`」（本 run line 102）**完全通过校验**——`reference/` 从来不是必需项。
- 即便命中 `reference/`，正则 `reference\/[^)\s]+\.md` 也**只校验形状**：不校验是否 glob、不校验文件是否真实存在、不要求枚举。`reference/01_...-*.md` 照样匹配。

`hasNakedEvidenceList`（line 25-31）同样把 `reference/`、`artifacts/`、`_cache/`、`_work_units/` **平等**列为「evidence 路径」——从设计上就没有「reference 是一等导航目标」的概念。

`requireWave2Refs`（line 94）只认 `cross-topic-ledger.md`/`finding-index.yaml`，**根本不要求任何 `reference/` 引用**——wave2 回填天然不指向信息地图目标层。

> 注：这些检查标了 `diagnosticOnly: true`（不阻断 gate）。这本身是问题的一部分——**唯一有机会拦截「地图指不到 reference」的校验，既太宽松又不阻断**，于是坏地图一路放行到最终产物。

### 3.2 phase 文档主动指示 refs 指向内部 build 面

`phase-wave1.md` 反而把「指向内部产物」写成规范：

- line 141：`include body refs/links to submitted backing such as artifacts/wave1/{topic}/evidence-summary.md, ..., _cache/wave1/..., and _work_units/wave1/{work_id}/;`
- line 197：`refs to submitted source claims, accepted_source_urls[], artifacts/wave1/{topic}/evidence-summary.md, ..., Phase-owned reference/ projections, _cache/, and _work_units/ surfaces`
- line 227：把 `reference/` 只描述为「Phase-owned reference/ projections」——与 `_cache`/`_work_units` 并列的**其中一项**，无主次。

`phase-seed-topics.md` 的预埋区（本 run seed 文件 line 79-80）只说「回填含 evidence_meaning / relationship / refs / status / next_hop」，**从未声明** refs 必须解析到 `reference/` 具体文件。契约缺失 → Agent 自由发挥 → 指向手边最方便的 `artifacts/`。

---

## 4. 影响

- **信息地图失效**：seed_topics 的核心用途是「看到某 topic → 顺 refs 找到那份证据文件 → 知道里面大概说了啥」。当前 refs 指向 build 脚手架或 glob，consumer / 下游 wave2 synthesis / final report agent **无法从地图定位到具体证据**。
- **不可验证**：`reference/X-*.md（8 个）` 这类计数摘要既不能被工具解析，也无法校验「8 个是否真的都存在、是否都被引用」。
- **与 [[BUG-064]]/[[BUG-065]] 同族**：reference 层作为一等导航目标，在产出（064/065）和引用（本 bug）两端都未被契约强制。

---

## 5. 复现

1. 跑一次正式 run 到 wave1/wave2，让 Phase Agent 回填 `seed_topics/*.md`。
2. `grep -n "refs" seed_topics/*.md` → 观察：多数条目 refs 只含 `artifacts/`+`_work_units/`；含 `reference/` 的多为 `reference/{topic}-*.md（N 个）` glob。
3. 对任一趋势/待验证问题条，尝试顺 `refs` 打开一个 `reference/` 具体文件 → 找不到（要么是内部路径，要么是通配）。
4. 跑 `inspectSeedTopicReturnMaps(bundle, {wave:'wave1'})` → **不报错**（`requireWave1Refs` 被 `artifacts/`/`_work_units/` 满足），证明校验漏过。

---

## 6. 修复方向

1. **契约层（phase-seed-topics.md / phase-wave0/1/2.md）**：显式规定「每个 return-map 条目的 `refs` **必须**至少枚举一个真实存在的 `reference/<具体文件>.md`；`artifacts/`、`_cache/`、`_work_units/` 只能作为**附属** provenance，不能单独构成 refs」。禁止 glob 与计数摘要（`-*.md（N 个）`），要求逐个列出文件名。
2. **校验层（return-map.mjs）**：把 wave1/wave2 的 refs 检查从「OR 任意面」改为「**必须命中至少一个 `reference/` 具体文件**」；对命中的 `reference/` ref 追加：(a) 拒绝含 `*` 的 glob；(b) 校验该文件在 `reference/` 下真实存在（`existsSync`）；(c) 可选校验其 topic 前缀与当前 seed topic 一致。把该校验从 `diagnosticOnly` 升级为 wave gate 的**阻断项**，或至少让它对「零 reference 引用」硬失败。
3. **一致性测试**：新增 `tests/engine/` 用例——构造一个只含 `artifacts/`+`_work_units/` refs 的 seed 回填样例，断言校验 FAIL；构造含 glob `reference/x-*.md` 的样例，断言 FAIL；含枚举且存在的 `reference/x-file.md` 的样例，断言 PASS。把这类「地图 refs 可解析性」漂移在 CI 拦截。
4.（可选）提供 helper：回填时从 `reference/_INDEX.md` 按 `related_topic` 反查该 topic 的具体文件名清单，避免 Agent 手写 glob。

---

## 7. 归属边界（诚实声明）

本 bug 针对**框架契约与校验**，非本次 run 的一次性偏差：`return-map.mjs` 的 OR 结构、`phase-wave1.md` 的 refs 指引、`phase-seed-topics.md` 预埋区的契约缺失，都会让**任何** run 的 seed_topics 地图重现同样问题。已核对本 run 的 `reference/` 具体文件确实存在且可枚举（见 `reference/_INDEX.md` 42 行），证明「地图有能力精确、却因契约/校验不强制而模糊」——是框架问题，不是数据缺失。
