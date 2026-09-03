# Bug cluster: Wave1 delegated submit result-authoring gotchas (2026-09-03 genuine rerun)

真实重跑 Wave1（11 topics，每个 topic 一个 dpt-evidence-extractor agent）中，多个 agent 产出的
`result.json` 被 dry-submit 拒绝。不是研究质量问题，而是**结果书写合约的边界没有被 task.md /
result.schema 充分说清楚**，导致所有 agent 犯同类错误。修复是机械的（Phase Agent 修正后
dry-submit 通过），但每个都值得在模板/task 层消除：

## G1 — degraded_capture_ref 被写成文件路径
- 现象：`dry-submit` → `missing_cache`：
  `accepted source claim cache/degraded ref is not declared in cache_trails[]: <leaf>/page.md`
- 原因：agent 把 `degraded_capture_ref` / `cache_trail_refs` 指向 leaf **目录内的 page.md 文件**，
  而 `cache_trails[]` 声明的是 **leaf 目录**。校验要求 ref ∈ declared cache_trails（目录集合）。
- 修复：把 refs 统一成目录路径；若该目录的 page.md 已含 explicit degraded 记录，
  直接删除 `degraded_capture_ref`（目录本身已 degraded）即可通过。
- 影响：topic 04 (i0023)、09 (i0028) 等 5+ 个 agent 首次提交均被此问题拦截。
- 建议：task.md「Cache And Source Facts」应加一句：`cache_trail_refs`/`degraded_capture_ref`
  必须是声明过的 cache **leaf 目录**路径，禁止写 `<leaf>/page.md` 文件路径。

## G2 — source_ref 被写成 slug / 自由字符串
- 现象：`source_ref_not_authorized`：
  `accepted source claim source_ref '<slug>' was searched in current outputs (not found) and prior submitted outputs (0 exact match(es))`
- 原因：topic 10 agent 把 `source_ref` 写成 leaf slug（如 `benchmark-sglang-h200`），
  而不是 output_files 里声明的当前证据路径（evidence-summary.md）。
- 修复：source_ref = `artifacts/wave1/<topic>/evidence-summary.md`。
- 影响：topic 10 (i0029) 被拦截。
- 建议：task.md 应明确 source_ref 的合法取值集合 = 本 WU output_files 路径（或先前同 topic
  同 kind 的 evidence_summary 路径）。

## G3 — 同一 URL 的 claim 被复制多份 + accepted_source_urls 与 claims 脱节
- 现象：topic 10 的 result.json 有 16 个 claims 但只有 4 个 distinct URL / 4 个 cache trails；
  `accepted_source_urls[]` 与 claims 不一致 → `invalid_result`。
- 修复：从磁盘 cache leaf 权威重建 claims（每 URL 一条），并把 accepted_source_urls 同步为
  claims 的 url 集合。
- 建议：dry-submit 应在 `invalid_result` 信息里点出 duplicate claims count，减少人工 diff。

## G4 — claim.url 与 leaf meta.json url 有 query/域名差异
- 现象：`missing_cache`：`cache trail maps to a different URL ... cache leaf records: <url?query>`
- 原因：agent 搜索时 URL 带 query（如 `?hardware=b300`），写 meta.json 用了带 query 的 url，
  但 claim.url 写了无 query 版本（或 www/m 域名互换）。
- 修复：以 leaf meta.json 的 url 为权威同步 claim.url（或反向），再同步 accepted_source_urls。
- 影响：topic 02 (i0021)、08 (i0027) 被此问题拦截过。

## G5 — 总 comment：task.md 的 result 模板带空 source_claims / accepted_source_urls，
本身没问题，但没有任何“正例”或字段取值约束说明；六个 agent 中五个按各自理解填了
url/source_ref/refs，dry-submit 成了事实上的唯一校验点。建议在 shared-subagent-protocol 或
task.md Completion Contract 放一个 **已接受 submit 的正例 result.json 片段**（含 1 accepted +
1 degraded 两种写法），能一次消除 G1–G4。

Related: `retry-attempt-supersede-lineage-edge.md`（supersede 引擎边缘）。
