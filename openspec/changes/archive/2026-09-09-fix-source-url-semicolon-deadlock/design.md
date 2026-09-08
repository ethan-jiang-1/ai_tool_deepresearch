# Design: fix-source-url-semicolon-deadlock

## Context

现状（详见 proposal.md 的 Why 与 `_backlog/bugs/2026-09-08-wave1-semicolon-url-unmaterializable.md`）：

- `source_url` 的多 URL 切分在 3 处独立实现（穷尽 grep 确认无其他站点）：`gate-helpers-checks.mjs:92`（`sourceUrlsFromMetadata`）、`gate-helpers-checks.mjs:720`（`checkReferenceSourceUrls`）、`ref-count.mjs:117`（`isCountable` 路径），均为 `raw.split(';')`；bound 校验经 `urlsBound → normalizeUrl → normalizeWave1ReferenceUrl`（`reference-url.mjs`，去 hash、不百分号解码）。
- URL 身份比较是去 hash 的逐字归一化；`new URL` 保留 `%3B` 原样，故 `%3B` 与裸 `;` 归一化后不等。
- dry-submit 已有 index→claim 方向校验（`work-unit-validation.mjs:861-875`，BUG-242 enriched），claim→index 方向缺失；该不变量目前在 gate 期由 `wave1-reference-convergence.mjs:209-211`（`submitted_backing_url_unaccepted`）强制。
- 约束：Node >=20、纯 ESM、仅 zod/yaml 依赖、`node:test`；`DEEP_RESEARCH_HARNESS/` 在 apply 前只读。

## Goals / Non-Goals

**Goals**

- 一个共享的确定性 `source_url` 切分函数，成为唯一判定点。
- dry-submit/submit 的 claim→index 反向成员校验 + 一步修复坐标。
- spec 层首次规格化分隔符契约与 URL 绑定身份语义（4 个 delta spec）。

**Non-Goals**

- 不改 `normalizeWave1ReferenceUrl` 的身份语义（不加百分号归一化）。
- 不改 supersede/`semantic_boundary`、不加 claim 级 amend 操作。
- 不改 cache mapping、provenance、floor 判定逻辑。
- 不做 gate 期 limitation/豁免通道。

## Decisions

### D1: 分隔符规则——`;` 后随（可选空白）`http(s)://` 才切分

规则：`splitSourceUrls(raw)` 扫描每个 `;`，若其后（跳过空白）以 `http://` 或 `https://` URL 前缀（大小写不敏感，镜像 URL scheme 解析）开头则在此切分；否则 `;` 是 path 不透明字符。每个切分片段 trim 后按既有流程逐段 `new URL()` 解析。

- 备选 A：只在 `; `（分号+空白）处切分 —— 更简单，但会拒绝真实存在的 `url1;http://...` 紧凑写法，且对 `"a; b"` 这类 path 含 `"; "` 的 URL（合法但罕见）仍误切。
- 备选 B：双侧百分号归一化比较 —— 不修可解析性炸裂这一根因，且改 URL 身份语义会波及 `wave1-source-claim-mapping`、depth contracts、wave2 等多个消费点，违反最短闭环。
- 备选 C：解析失败时回退整串重试 —— 隐式、难解释，失败路径依赖"恰好解析不出来"，可预期性差。
- 选定规则是确定性纯函数，行为可枚举、可逐格测试，且完整保留 `url1; url2` 既有用法。

**Semantic-precision**：读者（Phase Agent）的有界问题是"`;` 什么时候分隔多 URL"；答案是可枚举的一条规则；推理停止点是"写出与 claim 逐字一致的 URL"。**Simple reliable control**：Source of Record 是 `reference-url.mjs` 的单一 helper；闭环 = 写 URL → gate/dry-submit 重跑，无新状态。**Helper-oriented**：切分与绑定是 Engine 确定性 verdict；Agent 只做写 URL 的机械动作；无 user decision。

### D2: helper 落点 `reference-url.mjs`，身份/切分同文件

新导出 `splitSourceUrls(raw)` 与既有 `normalizeWave1ReferenceUrl` 同文件——两者共同构成"URL 身份与多 URL 形式"的最小模块，3 个调用点全部改 import 它。不建新模块、不建新 facade：该文件已是 Wave1 URL identity 的既有 ownership 点（`@impl REF-001, REF-008, RWG-012`）。

### D3: 绑定比较保持逐字归一化，`%3B` 判不等

不改 `normalizeWave1ReferenceUrl`。metadata 写 `%3B` 与 claim 裸 `;` 归一化后不同 → 维持 `canonical_projection_url_unbound` 拒绝；spec（REF-012）明确要求 Agent 逐字写 claim URL。理由：URL 身份即 submitted claim 的逐字事实，宽松解码会让两条不同 URL 意外合并，扩大歧义面；spec 文字即是 Agent 侧修复指引。

### D4: 反向校验放 `work-unit-validation.mjs` 既有 source-claim 校验块

在 `work-unit-validation.mjs` 现有 accepted-claim 循环后追加：对每个 accepted claim 的 URL（经 `normalizeUrlForSourceCache` 归一化，与既有 claim/cache 匹配同一套归一化），检查是否出现在同行 `accepted_source_urls[]` 归一化集合中；缺失则 `throwRepeatedEnriched`，携带 `json_pointer: /source_claims/<i>/url` 与 `details.declared_accepted_source_urls`（BUG-242 式坐标）。dry-submit 与 submit 共用该函数，天然同语义、同 reason。实证注记：既有 raw index→claim 检查（index 项必须 raw 匹配某 claim）先于本检查触发，因此归一化比较的可达域与 raw 比较等价——保留归一化写法以与 convergence 的绑定语义对齐，行为无额外放宽；测试锁定这一先触发关系。

- 备选：只在 convergence 侧放宽（把 claim 视作隐式 index 成员）——会弱化 `accepted_source_urls[]` 作为声明性 index 的既有语义，且把失败继续留在 gate 期。否决。

### D5: wave1-intake delta 只做 submit 期作用域声明

WAI-013 的 MODIFIED 只新增"wave1 行在 submit 期也会因此拒绝"的作用域文字与场景；判定细节、诊断形状的权威在 WUP-007（work-unit-preflight delta），避免两处规格化同一判定表。

## Risks / Trade-offs

- [历史 bundle 中存在 `source_url` 以裸 `;` 分隔多 URL 且第二个 URL 非紧随 `http` 写法（如 `url1 ; url2` 分号前带空格）] → 规则对 `; ` 后随 http 的形式已覆盖；`;` 前空白由 trim 消化。真正不兼容的只有"分号后既有空白之外的字符又是 URL"的畸形写法，apply 时以全量 `npm test` + 现有 fixture 扫描确认。
- [dry-submit 新增拒绝改变既有候选的 verdict] → 该类结果在 gate 期本就必死（`submitted_backing_url_unaccepted`），前移只改变发现时机与可修复性；verdict plan 已按 fail-fast 记录。
- [`;` 规则对非 http 协议 URL（如 `ftp://`）不做切分识别] → 既有合同只接受 http(s) source_url（`normalizeWave1ReferenceUrl` 返回 null），行为不变。
- [convergence 与 submit 期归一化函数不同源（`normalizeUrlForSourceCache` vs `normalizeWave1ReferenceUrl`）导致边界差] → 反向校验用 submit 侧既有归一化（与 claim/cache 匹配一致）；两个 spec 场景分别覆盖 `;` path URL 与 normalized 等价情形，测试同时锁定两侧。

## Migration Plan

1. Apply：`reference-url.mjs` 加 helper → 3 个调用点切换 → `work-unit-validation.mjs` 反向校验 → 测试逐条落地（先 red 后 green）。
2. 回滚：单 commit 粒度，revert 即回到现状；无数据迁移、无 schema 变更、无状态文件变更。
3. 存量 bundle：不受影响——修复只改变引擎对已提交数据的判定结果，不要求回写任何已提交行。

## Open Questions

（无——分隔符规则、落点、校验方向均已定；实现中的局部细节（诊断字段命名对齐 BUG-242 风格）不改变 spec 或任务分解。）
