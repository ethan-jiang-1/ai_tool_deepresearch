# Proposal: fix-source-url-semicolon-deadlock

> 来源：`_backlog/bugs/2026-09-08-wave1-semicolon-url-unmaterializable.md`（用户指定消化对象，2026-09-08 Wave1 gate 实测）。

## Why

一个合法包含裸 `;` 的 submitted claim URL（`;` 在 RFC 3986 path 中本就合法）目前无法被 materialize 为 Phase-owned canonical reference 投影，且引擎没有任何 sanctioned 修补通道（`supersede` 对 hash-valid 行返回 `semantic_boundary`），导致该 topic 的 `per_topic_ref_md_count_floor` 永远无法满足、Wave1 gate 死锁。经代码核实，`;`-split 是实现层长出来的事实契约——accepted spec 从未规定 `;` 是 `source_url` 的多 URL 分隔符（spec 只要求 "at least one URL-parseable value"）。同族缺陷（accepted claim 的 URL 不在 `accepted_source_urls[]`）也要到 gate 时才暴露，dry-submit 不查，届时已无路可修。

## What Changes

- **source_url 分隔符契约（根治）**：确定 `source_url` 多 URL 切分的唯一确定性规则——`;` 仅在其后跟（可选空白后）`http(s)://`（scheme 前缀大小写不敏感）时才开启新 URL；path 内的裸 `;` 视为不透明字符。3 处现存 split 点（`gate-helpers-checks.mjs` 的 `sourceUrlsFromMetadata` / `checkReferenceSourceUrls`、`ref-count.mjs` 的 `isCountable` 路径）收敛到 `reference-url.mjs` 的一个共享 helper。
- **URL 绑定身份保持逐字归一化**：`normalizeWave1ReferenceUrl`（去 hash、不百分号解码）维持不变；metadata `source_url` 必须与 submitted claim URL 逐字（归一化后）一致。raw `;` 修复后天然两侧一致，不引入百分号归一化（避免改 URL 身份语义、爆炸半径大）。
- **dry-submit 反向校验（关联缺陷族 fail-fast）**：dry-submit/submit preflight 新增 claim→index 方向校验——accepted `source_claims[]` 的 URL 必须出现在同行的 `accepted_source_urls[]`，违规即拒绝，并携带 BUG-242 式修复坐标（claim URL + 已声明 index URL 列表）。这与引擎在 `wave.submitted-reference-convergence`（`submitted_backing_url_unaccepted`）已依赖的不变量一致，只是把发现点从 gate 提前到 submit 前。
- **不产出**：不改 supersede/`semantic_boundary` 语义（`agent/work-unit-correction` 不动）；不加 claim 级 EXCLUDED/amend 操作；不给 floor 加 limitation/豁免通道；不改 cache mapping、URL 百分号归一化或多 URL 支持（`url1; url2` 形式保留）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/evidence-extraction` | `spec.md` L9-59（isCountable / source_url parseable）、`gate-helpers-checks.mjs:686-762`、`ref-count.mjs:117` | Modify | `reference_source_url_parseable` 与 `isCountable` 的 source_url 可解析性判定被 `;`-split 直接改变，需在 spec 层定义分隔符契约 |
| `bundle/reference-flat-format` | `spec.md` L127（metadata contract）、L604-618、L647-661（source_url binding）、`reference-url.mjs` | Modify | reference metadata `source_url` 的多 URL 形式与绑定比较语义是该 capability 的 REF-008 域；分隔符契约与"逐字归一化绑定"需在此规格化 |
| `agent/work-unit-preflight` | `spec.md` L291-330（BUG-242 enriched 校验域）、`work-unit-validation.mjs:800-876` | Modify | dry-submit 已拥有 accepted-claim 校验族（index→claim 方向）；新增对称的 claim→index 反向校验落在此处 |
| `research/wave1-intake` | `spec.md` L61、L540-556（WAI-004 submit-time claim check）、`wave1-reference-convergence.mjs:205-243` | Modify | wave1_topic_deepening 行的 submit-time claim 检查契约在此；反向校验对其同样生效，且 `submitted_backing_url_unaccepted`（gate 期）的触发条件需与 submit 期对齐 |
| `agent/work-unit-correction` | `work-unit-supersession.mjs:780-786` | Excluded | `semantic_boundary` 拒绝 hash-valid 行是有意设计，本 change 不改 correction 语义 |
| `agent/work-unit-submission` | `work-unit-submit.mjs` | Excluded | submit 事务/账本/hash 后置条件不变；校验细节由 preflight 契约拥有 |
| `research/research-wave-gate-implementation` | `wave-contract-evaluators.mjs:968`、`wave1-reference-convergence.mjs` | Excluded | gate 规则接线不变；convergence 行为改善随 helper 契约自动生效，无需新 requirement |
| `bundle/cache-raw-web-content` | `work-unit-validation.mjs:819-858` | Excluded | cache trail mapping 校验不变 |

## Capabilities

### New Capabilities

（无——全部行为变化落在既有 capability 的 requirement 修改内。）

### Modified Capabilities

- `research/evidence-extraction`: `source_url` 可解析性判定新增确定性分隔符契约——裸 `;` 在 URL path 内不透明，`;` 仅作为多 URL 分隔符且以后随 `http(s)://` 为准；`isCountable` 与 `reference_source_url_parseable` 共用同一判定。
- `bundle/reference-flat-format`: reference metadata `source_url` 多 URL 形式规格化；绑定比较保持"去 hash 逐字归一化"身份语义，path 内裸 `;` 两侧原样一致即绑定。
- `agent/work-unit-preflight`: dry-submit 新增反向校验——accepted `source_claims[]` URL 必须出现在同行 `accepted_source_urls[]`；违规拒绝并携带修复坐标（对称于既有 BUG-242 校验）。
- `research/wave1-intake`: wave1_topic_deepening submit-time claim 检查覆盖 claim→index 方向；`submitted_backing_url_unaccepted` 类缺陷在 submit 前即被拒绝。

## Impact

- **代码**：`DEEP_RESEARCH_HARNESS/engine/helpers/reference-url.mjs`（新增共享 split helper）、`gate-helpers-checks.mjs`（2 处改用 helper）、`ref-count.mjs`（1 处）、`work-unit-validation.mjs`（新增反向校验）。
- **行为**：含裸 `;` path 的 URL 不再被切分炸裂；`url1; url2` 多 URL 形式保留；dry-submit 多一类拒绝（fail-fast，修复坐标完整）。
- **测试**：`tests/engine/helpers/`（reference-url helper、gate-helpers-checks、ref-count）与 submit/preflight 校验测试新增用例；现有测试未钉死 `;`-split 行为，回归面小。
- **不依赖**：无新依赖（Node >=20、纯 ESM、`node:test`）。

## Source of Record 与最短闭环

- 直接 Source of Record：`reference-url.mjs` 的共享分隔符 helper 是"`;` 何时切分 `source_url`"的唯一判定点；accepted spec（上述 4 个 delta）是行为权威。
- 最短合法闭环：Agent 在 dry-submit 拿到带坐标的拒绝 → 修正候选 result → 重跑 dry-submit；或对已 materialize 的投影把 metadata `source_url` 写成与 claim 逐字一致的 URL → gate 重跑。不新增 state、status、恢复分支或第二 authority。
- Net simplification：4 处各自为政的 `split(';')` 收敛为 1 个 helper；gate 期才暴露的 `submitted_backing_url_unaccepted` 类失败前移到 dry-submit，减少一条"提交后死锁、无路可修"的失败路径。不新增 control complexity。

## Semantic-precision reflection（新具名 helper）

- 读者/有界问题：Phase Agent 在写 reference metadata 或修 dry-submit 拒绝时，需要知道"`;` 什么时候是多 URL 分隔符、什么时候是 URL path 的一部分"，得到一个可预期的确定性答案。
- 必须保留的区别：多 URL 分隔（`;` + 空白/紧随 `http(s)://`）与 path 内不透明 `;` 的区分；URL 绑定身份（去 hash 逐字归一化）与可解析性（`new URL` 可构造）是两个不同判定，不合并。
- 正常推理停止点：Agent 写出与 submitted claim 逐字一致的 `source_url`（或多 URL 时以 `; ` + `http` 连接）即停；绑定失败时按修复坐标回改候选/投影，不猜测百分号编码。

## 责任边界

- **User**：无新增 user decision；不引入 human-directed 授权。
- **Agent**：按契约写/修 `source_url`（与 claim 逐字一致或多 URL 分隔形式）、补齐 `accepted_source_urls[]`、按 dry-submit 坐标修候选。
- **Engine**：拥有分隔符切分、可解析性判定、URL 绑定比较与 dry-submit 反向校验的全部确定性 verdict；不做语义判断，不授权 supersede 语义变更。
