# BUG-230: Wave2 `finding-index.yaml` 的必填 top-level `ledger`/`synthesis` keys 与 `cross_topic_resolution` 非空 `origin_refs` 不在契约文档的 15 字段表中

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-17 | source: 真实 run 执行（dpt_rb_ai-transformation-organization，Wave2）

## Why（完整上下文）

Wave2 closeout 要求 Phase Agent 写 `artifacts/wave2/finding-index.yaml`。
`shared/shared-schemas.md` 的「finding-index.yaml — JS-Readable Shadow Index」给出：

- Top-level keys 列表：`version` / `source_layer` / `ledger` / `synthesis` / `scan` /
  `findings` / `synthesis_eligibility`（只列名，未标注哪些必填）
- Per-finding 15 个必填字段表（`id` … `gap_status`），其中对 `origin_refs` 只写
  「Legacy question 来源；emergent 可为空但必须显式 `[]`」——**没有说
  `cross_topic_resolution` 类型的 origin_refs 必须非空且 blocking**。

实际 `inspect-wave2-output.mjs`（`wave-depth-contracts.mjs#checkWave2FindingIndexContract`）
会：

1. 把 `ledger`、`synthesis` 当作**必填 top-level key**（缺失即 `finding_index_contract`
   FAIL），但文档没说必填；
2. 对 `cross_topic_resolution` finding 要求**非空 `origin_refs[]`**（
   `cross_topic_resolution W2F-001 requires origin_refs[]`），但文档只暗示
   「emergent 可为空」的反面，未明确 resolution 必填非空。

Agent 按文档的 15 字段表 + top-level 列表构造 finding-index，首轮必然被 inspect
打回两项；只能从 inspect 文本反推这两个隐含约束。

## 复现

1. 构造 finding-index.yaml：只含文档 15 字段表要求的 per-finding 字段，
   `origin_refs: []`（cross_topic_resolution 类型），top-level 只写
   `version/source_layer/scan/findings/synthesis_eligibility`（不写 ledger/synthesis）。
2. `node DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs --bundle <bundle>`
   → FAIL 列表：
   - `missing top-level key: ledger`
   - `missing top-level key: synthesis`
   - `cross_topic_resolution W2F-001 requires origin_refs[]`（逐 finding）
3. 补上 `ledger: { ref: ... }` / `synthesis: { ref: ... }`（任意非空对象即可通过
   key 存在性检查），并把 resolution 的 origin_refs 填非空（如 trigger refs 前两条）
   后才通过。

## 影响（本 run 实账）

- Wave2 finding-index 首轮被 inspect 打回一次（3 类问题同时报），逐项修复 + 重新
  persist + 重新 inspect 约耗时 10-15 分钟。
- 若契约文档把这两个约束写清，首轮即可通过。

## 为什么是框架缺陷（不是 Agent 执行错误）

- `shared-schemas.md` 是 finding-index 的 canonical 字段契约；「15 个必填字段」
  的表与 top-level 列表没有标注这两个 blocking 约束（必填 top-level key、resolution
  的 origin_refs 非空）。Agent 按文档构造必然失败，只能从 inspect 反推或读源码。

## Owner / 最小修复方向

- Owner: `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-schemas.md`
  （finding-index.yaml 节）+ `wave-depth-contracts.mjs`（如需统一校验语义）。
- 最小修复：
  1. top-level 列表标注 `ledger` / `synthesis` 为必填（并给出合法形状示例）。
  2. 15 字段表补充 `origin_refs` 的完整约束：
     `cross_topic_resolution` 必填非空；`wave1_legacy_question` 必填（来源）；
     `cross_topic_emergent_question` 可显式 `[]`。
- 回归测试建议：用最小合法 finding-index fixture 断言 inspect 一次性通过；
  断言文档字段表与校验约束一致（防止再次漂移）。
