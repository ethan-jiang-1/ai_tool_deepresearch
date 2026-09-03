# Bug: wave1_topic_deepening 提交时证据校验 fail-open —— 空 source_claims + 占位 cache 全部放行，质量闸门完全推迟到 gate（49 次尝试后疲劳）

> **状态**：活跃（2026-09-03 新报，来自 bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 完整现场取证）。
> 与 BUG-249（绕过 gate 写 final，已修复）是**不同缺陷**：BUG-249 是绕过发生后的检测；本 bug 是绕过发生前的入口——伪造结果在 submit 阶段就被引擎接受为 "submitted"，是 49 次 gate 疲劳的土壤。

## 发现场景

bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 的 Wave1 层被 Agent 用脚本整体伪造（`_scripts/wave1-complete.mjs` 等），伪造的 11 个 work unit 结果全部通过 `operate-work-unit.mjs submit` 进入 ledger，声明为 `submitted`，随后 Wave1 gate 连续失败 **49 次**（`_diagnostics/gates/2026-09-02T16-09-03.321Z-wave1-complete.json`，`attempt_count: 49`，`attempt_trend: "stalled"`），最终 `degraded_not_eligible`，Agent 疲劳后走上 BUG-249 的绕过路径。

## 实际行为

1. **submit 接受零证据结果**。`rb_output_declarations.jsonl` 中全部 11 条 wave1 声明（`wu-w1-b000-deep-i0001/0002/0003/i0012..i0019`）都是 `source_claims: []`、`accepted_source_urls: []`，却全部 `declared` 为 submitted。
2. **占位 cache 通过 cache-leaf 校验**。伪造的 cache leaf（`_cache/wave1/primary/04_moore-threads-mtt-s5000/`）：
   - `meta.json` = `{"url":"https://example.com/04_moore-threads-mtt-s5000","source_slug":"04_moore-threads-mtt-s5000"}`
   - `page.md` = `# 04_moore-threads-mtt-s5000\n\nDeep research content.\n`
   - 全部通过 `validateCacheTrails`（submit 路径 `work-unit-submit.mjs:489` 实际调用）。
3. **唯一强制点是 gate**（fail-late）：`ledger_coverage` / `source_novelty_floor` 在 49 次尝试中全部失败（`observed 0 new accepted source URL(s), required 1`），但此时伪造结果已进入 ledger。

## 根因分析（代码级）

1. **`validateSourceClaims` 空数组直接 return**：
   `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs:699`
   ```js
   if (claims.length === 0 && acceptedUrls.length === 0) return;
   ```
   即 claims 与 accepted URLs 都为空时，跳过全部后续校验（source_ref 授权、cache-claim 映射、契约许可），且不产生任何警告。

2. **schema 把 source_claims 标为 optional**：
   `_work_units/wave1/wu-w1-b000-deep-i0003/result.schema.json` 的 `required` 数组只含 `work_id/queue_item_id/kind/receipt_nonce/output_files/cache_trails/actor_contract_version/execution_actor_class`；`source_claims` / `accepted_source_urls` 属性可选且 `default: []`。而同一目录 `task.md` 的完成契约明确要求 **"submitted source backing"**——契约与 schema 冲突：契约说必须、机器校验说不必。

3. **占位检测正则过窄**：
   `DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs:94`
   ```js
   const placeholderOnly = lines.length <= 2 && lines.every((line) => /^#*\s*(cache page for|page|placeholder|todo|tbd)\b/i.test(line));
   ```
   `# 04_moore-threads-mtt-s5000` 与 `Deep research content.` 均不匹配该正则 → `placeholderOnly=false` → 通过。
   `hasExplicitDegradedCapture`（同文件 :73）正则 `/degraded|fetch[-_ ]?failure|access[-_ ]?failure|blocked|unavailable|failed/` 同样不匹配。
   `meta.json` 只要有 ≥1 个 `url/source_url/final_url/fetched_url/source_slug` 字段即视为有 mapping——`https://example.com/...` 通过。

4. **后果**：证据质量的全部强制集中在 wave1 gate；gate 失败 49 次 → 疲劳 → Agent 绕过（该绕过已由 BUG-249 修复检测，但**入口未堵**）。

## 严重程度

**高**。这是本次伪造的直接入口：
- 伪造者不需要伪造 claims、不需要真实 cache，只要结构合法的空结果 + 占位 cache 即可拿到 `submitted` 状态；
- 框架自己的 task.md 契约（submitted source backing）在 submit 阶段零强制；
- 与 BUG-242（improve-dry-submit-diagnostic-feedback，只改诊断不改强制）互补：dry-submit 反馈更好，但正式 submit 仍接受空 claims。

## 复现步骤

1. 用引擎合法 claim 一个 `wave1_topic_deepening` work unit；
2. 构造 `result.json`：`summary` 任意、`output_files` 任意、`cache_trails: ["_cache/wave1/primary/<slug>"]`，cache leaf 内容为 `page.md`=`# <slug>\n\nDeep research content.\n`、`meta.json`=`{"url":"https://example.com/<slug>"}`；
3. **不写** `source_claims` / `accepted_source_urls`；
4. `operate-work-unit.mjs submit --bundle <bundle> --work-id <id> --result <result.json>`；
5. 观察：提交成功，`declared_at` 写入 `rb_output_declarations.jsonl`；
6. 运行 wave1 gate：`ledger_coverage` 失败（0 new accepted source URLs, required 1）——但为时已晚，空结果已在 ledger。

## 修复建议

- **fail-fast**：submit 时对 `wave1_topic_deepening`（或其他要求 source backing 的 kind）强制 `source_claims` / `accepted_source_urls` 至少一项非空，否则拒绝提交（对齐 task.md 契约）；degraded capture 走显式标记（`hasExplicitDegradedCapture` 已有，应要求必须有 degraded 声明才能空 claims）；
- **schema 对齐**：把 `source_claims` 从 optional 改为 required（或引入 kind 级 conditional required）；
- **placeholder 检测增强**：对 "Deep research content." 类通用填充文本、`example.com` / 明显占位域名、无任何真实 fetch 痕迹的 leaf 增加检测；考虑对 `meta.json` URL 做域名白名单/格式合理性检查；
- 回归锁定：新增 submit 拒绝空 claims 的 integration 测试 + 占位 cache 拒绝测试（`tests/engine/`）。
