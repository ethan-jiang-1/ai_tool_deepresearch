## Context

当前 workflow foundation 已有完整的 pre-research 支持（instantiation → HITL1 → setup），三个 pre-research gate 也已实现。现在进入 research 主体阶段：

```
setup-ready → wave0 → wave1 → wave2 → hitl2
```

当前 skeleton 中 wave0/1/2 的 phase node、gate definition、gate CLI 全是 placeholder（1 条 placeholder rule + hardcoded `passed: true`）。Agent 和 Engine 在 setup 之后没有任何实际的 research guidance 和 deterministic checkpoint。

本 change 用与 `wff-pre-research` 相同的模式（9-section phase body + definition-driven gate rule sets + 8 种 check types + real CLI evaluation）让三个 wave 跑通。

关键约束：
- Wave artifacts 落在 bundle 的 `reference/` 和 `artifacts/` 目录。
- Wave1 的 `subagent: true` 在 foundation 阶段只是 future marker，不启用真实 subagent dispatch。
- Gate 不做语义质量判断，只检查文件存在、可解析、数量、trace evidence、跨文件引用一致性。
- 延续 pre-research 的双 trace 模式：gate CLI 写 `rb_trace.jsonl`，playbook driver 写 `_trace.jsonl`。
- **Naming convention**: 本 change 存在三套命名域，必须区分清楚：
  - **Gate key**（definition JSON `gate` 字段 / CLI 文件名 `check-gate-*.mjs` / manifest `gate`）= **kebab-case**（`wave0-complete`、`seed-topics-ready`）
  - **Status value**（`rb_status.json#/current_gate` / `next_gate` + `enums.mjs` 的 `CurrentGate` 枚举）= **snake_case**（`wave0_complete`、`seed_topics_ready`）
  - **Node fileRef**（manifest `node` / `--current-node` flag / transition table key）= **`phases/phase-<name>.md`**（`phases/phase-wave0.md`）
  - Gate definition JSON 的 `status_value` rule 的 `expected` 字段是 snake_case，因为它是与 `rb_status.json` 比对的；CLI 用 kebab gate key 加载 JSON 文件，但不影响 status value 比对
  - 三套体系靠名字约定维持，不是靠类型系统或编译检查。加新 gate 时三个域的命名必须同时正确，否则 gate 会静默 fail（string 比对不通过，不会 crash）

## Goals / Non-Goals

**Goals:**
- 填充 `phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md` 的完整 9-section body。
- 为三个 wave gate 实现完整 deterministic rule set（definition JSON）。
- 让三个 wave gate CLI 从 hardcoded pass 升级为 definition-driven evaluation。
- Wave1 明确标记 foundation placeholder boundary，列出未来 expansion tracks。
- 微调 `shared-gate-rules.md` 和 `shared-schemas.md` 以覆盖 wave gate 和 wave artifact schema。
- 添加 wave 相关的 playbook 实验，覆盖 happy path、全链路串联、repair loop、Wave0 fail case、fault tolerance 和 review surface。
- 延续 runtime audit trace 与 experiment verdict trace 分离的双轨设计。

**Non-Goals:**
- 不实现真实 subagent dispatch / fan-out / fan-in。
- 不实现 candidate intake / backfill 的完整机制。
- 不实现 evidence ranking 的完整 ontology。
- 不改变 phase node frontmatter contract、gate helper API。
- 不判断语义研究质量、synthesis adequacy。
- 不引入新的 gate engine framework。

## Decisions

### D1: 延续 pre-research 的 gate helper 模式

所有三个 wave gate CLI 使用：

`parseGateCliArgs()` → `loadGateDefinition()` → `validateNodeGateBinding()` → iterate rules → `resolveRouting()` → `buildGateResult()` → `emitGateResult()`

保留 GSK-004 的架构，不创建新的 generic gate runner。

### D2: Wave gate 规则保持 deterministic

本 change 使用的 check types：

- `file_exists` — 检查 artifact 文件存在
- `dir_exists` — 检查 artifact 目录存在
- `schema_valid` — Zod schema 校验（需要对应的 Zod contract）
- `count_floor` — artifact 数量下限（如 reference metadata 数量 ≥ foundation floor）**【本 change 新增】**
- `field_non_empty` — 字段非空
- `field_value` — 字段等于指定值
- `status_value` — `rb_status.json` 中的状态值
- `cross_field` — 跨文件引用一致性。**本 change 存在三种 mode（均通过 gate definition JSON 的 `mode` 字段区分，CLI 根据 mode 选择对应 evaluator）：**
  - `mode: "basename_consistency"`（pre-research 已用，`setup-ready` gate）：比较 bundle 目录名、`rb_plan.md` 和 `rb_profile.yaml` 中的 plan_basename 是否 byte-for-byte 一致。不涉及 Markdown 解析或集合比较。
  - `mode: "slug_consistency"`（本 change 新增，`seed-topics-ready` gate）：读取 `seed_topics/` 下所有 `.md` 的 frontmatter `slug` + 文件名 stem 组成磁盘 slug 集合，与 `rb_plan.md#/topic_registry` 的 slug 集合做双向比较（无缺失、无多余）。同时逐文件检查 frontmatter `slug` 与文件名 stem 一致（per-file 单文件检查是 `slug_consistency` mode 的子步骤——"slug 是否在所有视图里一致"是同一个问题）。
  - `mode: "markdown_link_resolution"`（本 change 新增，`wave2-complete` gate）：解析 synthesis.md 中的 Markdown link → 相对路径解析（相对于 `artifacts/wave2/`）→ 验证目标文件存在。至少 1 条引用目标存在时 pass。
  - **Mode 共存理由与未来拆分条件**：三种 mode 都涉及"跨文件/跨视图引用一致性"——basename 跨三个 source、slug 跨 registry 和磁盘、Markdown link 跨 synthesis 和 artifact 文件。共享 `cross_field` 这个 check type 名是为保持概念聚集，不要让 gate definition 的 check type namespace 碎成每 mode 一个名。如果将来出现新 mode 不再属于"引用一致性"范畴（如跨文件内容相似度比较、语义等价判断），应拆分为独立 check type。当前三种 mode 的 evaluator 互不依赖（分别在三四份 CLI 的 rule iteration 中实现），拆分成本低。
- `trace_event_present` — trace 中有对应 event
- `pattern_match` — 文本模式匹配。**本 change 存在两种 target 模式：**
  - `target: "basename"`（pre-research 已用，`instantiation-complete` gate）：对 bundle 目录 basename 做 regex 匹配
  - `target: "<file_path>"`（本 change 新增，`wave1-complete` gate）：当 target 为文件路径时，读取该文件内容并对全文做 regex 匹配，用于检测 skeleton.md 中的 placeholder marker（`capability: foundation-placeholder`）和 false completion claim（`full subagent coverage completed` 等字样）
  - **`target` 分发 heuristic 与安全性**：`pattern_match` evaluator 通过检查 `target` 字符串判断 mode：若 `target === "basename"` → basename 匹配；否则视为文件路径（相对于 bundle root），读取文件内容做 regex 匹配。这个 heuristic 依赖一个前提：bundle basename 不含 `.md` 后缀或 `/` 字符——当前命名 convention（`dpt_rb_<name>` / `dpt_disp_<name>_<case>_<hex>`）保证这一点，故 heuristic 是安全的。如果将来引入新 target 语义（如匹配 `rb_status.json` 某个字段的值），应加 `pattern_source` 字段（如 `"pattern_source": "basename" | "file_content" | "field_value"`）显式区分，不再依赖字符串内容推断。

新增相对于 pre-research 的 check types：`count_floor`（Wave0 数量下限检查）、`dir_non_empty`（seed-topics 目录非空检查，统计目录下匹配 glob 的文件数）。`cross_field` 在 pre-research 仅支持 `basename_consistency` 一种 mode，本 change 新增 `markdown_link_resolution` 和 `slug_consistency` 两种 mode（详见上方 `cross_field` 条目）。`pattern_match` 在 pre-research 仅支持 basename target，本 change 扩展为同时支持文件内容 target。

**`count_floor` 与 `schema_valid` 的交互**：`count_floor` 统计 YAML 数组的所有条目（不区分 schema 是否 valid），`schema_valid` 独立校验每条。两者是 AND 关系——`count_floor` guard 数量，`schema_valid` guard 质量。Agent 必须两项都 pass gate 才过。

**新 check type evaluator 的放置策略**：现有 gate CLI 的 check type 求值逻辑写死在每个 CLI 的 if/else 链中（instantiation 4 种、hitl1 2 种、setup 6 种），`gate-helpers.mjs` 只提供 pipeline 函数 + `validateRules`（静态校验 rule 形状），没有通用 evaluator 表。本 change 只引入一个跨 CLI 共享的 helper 放 `gate-helpers.mjs`：`readTraceEvents`（3 个 wave CLI 和 seed-topics CLI 都读 `rb_trace.jsonl`）。其余新 check type（`count_floor`、`dir_non_empty`、`cross_field(slug_consistency)`、`cross_field(markdown_link_resolution)`、`pattern_match` 文件内容扩展）都是单 CLI 使用，放各自 CLI 的 rule iteration 中实现，延续 pre-research 的 per-CLI if/else 模式。这与 D1 的"延续 GSK-004，不创建 generic gate runner"一致——GSK-003 约束的是 CLI 层，evaluator 不进 helpers 不影响共享 pipeline 函数。

