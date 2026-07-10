# BUG-075 — Wave1 gate 多规则 contract 墙：研究实质已完成，19 条 provenance/format/floor 规则首过全失败（BUG-069 的 wave1 实例 + ref-floor 可达性问题）

| 属性 | 值 |
|------|-----|
| ID | BUG-075 |
| 发现日期 | 2026-07-10 |
| 严重级别 | **P1** |
| 当前状态 | **活跃** |
| 来源 | `dpt_rb_ai-engineer-worlds-fair-2026-anatomy` 正式 run（exploratory_map，5 topics） |
| 关联 | [[BUG-069]] 根因 meta-bug（**wave1 实例**）；[[BUG-073]] wave2 finding-index（同源 contract 墙）；[[BUG-074]] 同 run 的 surfacing 违规 |
| 发现者 | 用户（HITL）在看到 wave1 gate 19 条失败后当场判定为 bug 并要求上报 |

---

## 1. 症状

Wave1 研究实质**已完成并提交**：5 个 `wave1_topic_deepening` work unit 全部 submit 成功（~32 条新源，全部 English 2026 AIEWF-anchored，含对抗性核实），evidence-summary.md / question-list.md 已写，32 份 Phase-owned reference，5 份 depth-review.yaml，15 个 seed backfill token 已替换。

但 `check-gate-wave1-complete.mjs` attempt 1 **19 条规则失败**，分布于 5 个 topic，**全部是 provenance/format/floor 技术性问题，无一关乎研究质量**：

```
still_failing (19):
  per_topic_depth_review_contract: 01, 04, 05
  per_topic_ref_md_count_floor: 01, 02, 03, 04   (需 8，实际 6/5/6/7)
  question_list_has_four_sections: 03, 04, 05
  source_url_present: 01, 02, 03, 04, 05          (5/5 全失败)
  key_findings_non_empty: 02, 03, 04, 05
+ depth-review 的 source_novelty_floor / source_claim_cache_mapping 子失败（topic 05 尤甚）
```

## 2. 六类失败（逐类：规则要求 vs phase MD/role spec 实际告诉 Agent 的）

### 2a. `source_url_present`（5/5 全挂）
- **gate 要求**：evidence-summary.md 匹配 `\[.+\]\(https?://[^)]+\)`（Markdown 链接）。
- **role spec §3.1 示例**：`## Source URLs` 下 `- [Source Title](https://example.com/source)` —— 形式对，但 sub-agent 实际产出常是裸 URL 或 `- <url>`。
- **问题**：该 regex 要求**未在 submit 时校验**，只在 gate 时炸；role spec 没把"必须是 `[text](url)` 链接、不能是裸 URL"作为硬约束强调。

### 2b. `key_findings_non_empty`（4/5）
- **gate 要求**：`## Key Findings\s*\n\s*(\*\*|[1-9]\.)` —— header 后**立即**跟 `**` 或 `N.` 前缀的 bullet。
- **role spec §3.1**：说 Key findings must start with exactly `**机制理解**:` or `**趋势观察**:` —— 对，但 sub-agent 常在 header 与首条 finding 间插空行/小节引言，导致 regex 不匹配。

### 2c. `question_list_has_four_sections`（3/5）
- **gate 要求**：4 个 header **精确、有序**：`## Topic Investigation Targets` → `## Question Reconciliation` → `## Emergent Question Protocol` → `## Exploration / Exploitation Decision`。
- **问题**：sub-agent 产出 `Exploration/Exploitation`（无空格）或 `Exploration / Exploitation`（有空格）漂移即挂；role spec 给了模板但未强调"空格敏感、顺序敏感"。

### 2d. `per_topic_depth_review_contract` + `source_novelty_floor`（01/04/05）
- **gate 要求**：depth-review.yaml 的 `new_source_urls[]` 必须只含 `is_new_vs_wave0:true` 的 claim；`new_source_floor.observed` 必须等于 exact-new claim 数；**任何在 wave0 出现过的 URL 不能标 new**。
- **phase MD §3.2.2 给的 depth-review 模板**：有 `is_new_vs_wave0` 字段，但**没说"要去 wave0 source.yaml 比对来判定 new"**，也没强调 observed 必须与 exact-new 计数一致。
- **后果**：helper sub-agent 把 wave0 已有的 URL（gopubby、ai.engineer/worldsfair、cerebralvalley hackathon）标成 `is_new_vs_wave0:true`，observed 虚高。

### 2e. `source_claim_cache_mapping`（topic 05 尤甚）
- **gate 要求**：depth-review 每个 accepted source_claim 必须有 safe `source_ref`（在 output_files 内）+ `cache_trail_refs[]` 或 `degraded_capture_ref`。
- **phase MD §3.2.2 模板**：source_claims 示例有这些字段，但 helper 实际产出时**漏抄了 result.json 里的 cache_trail_refs / source_ref**（模板没强调"必须逐条从 result.json 复制"）。

### 2f. `per_topic_ref_md_count_floor=8`（4/5 topics）—— **本 bug 的新问题，超出 BUG-069**
- **gate 要求**：每 topic ≥8 份 `reference/*{topic}*.md`（threshold = `wave1_per_topic_ref_floor=8`）。
- **现实**：wave1 single-pass deepening 每 topic 自然产出 **5–8 条新源**（本 run：6/5/6/7/8），其中 wave0 已有的还不能算 new → 可物化的 wave1 新 reference 天然 <8。
- **phase MD 未明确**：不足 8 时该怎么办——(a) 用 wave0-backed reference 补到 8？(b) 跑 supplementary `wave1_topic_deepening` 补新源？两者都合法但 phase MD §3.2.1/§7 没把"ref floor 可能因新源不足而不可达"作为显式 scenario。Agent 被迫自行推断（本 run 选了 wave0-backed 补足，但这是 Agent 推断而非契约明示）。

## 3. 为什么这是 bug（与 BUG-069 同根，wave1 实例）

同 [[BUG-069]] 的"四 surface 漂移"根因，但**全部在 wave1 重现**：

| surface | wave1 的表现 |
|---------|------------|
| phase MD（§3.2.1/§3.2.2） | depth-review 模板、reference 物化、ref-floor 可达性 —— 不完整、不精确 |
| role spec（dpt-evidence-extractor §3） | evidence-summary/question-list 格式要求不强调 gate regex 的硬约束 |
| emitted `result.schema.json` | 只校验 result.json 结构，**不校验 evidence-summary/question-list/depth-review 内容格式** |
| gate definition（gate-wave1-complete） | 19 条精确 regex/contract 规则 |
| validator（wave-depth-contracts / gate-helpers） | 真正的判定逻辑，Agent 不读源码看不到 |

**关键放大器**：这些 format/provenance 检查**全部不在 `operate-work-unit submit` 预检**里 —— submit 成功（result.json 合法、cache/receipt 齐），但 gate 仍因 evidence-summary/depth-review 的格式/provenance 炸。Agent 以为 submit 过了就稳了，到 gate 才发现还要修 5 类下游 artifact。**无人值守前提（首过成功或确定性自愈）在 wave1 不成立。**

## 4. 与 BUG-069 / BUG-073 的关系

- **BUG-069**（根因 meta-bug）：wave0 的"四 surface 漂移"。本 bug 是其 **wave1 复现** —— v0.12–v0.14 的 dry-submit preflight + auto-normalize 收口了 wave0 的 result.json 面，但**没覆盖 wave1 的 evidence-summary / question-list / depth-review 内容格式面**。
- **BUG-073**（wave2 finding-index）：同源 contract 墙的 wave2 实例。三者构成"每个 wave 都有自己的 contract 墙"的模式 —— 说明收口是**逐 wave、面-by-面**的，没有一次性把所有 agent-facing 内容格式契约钉死。

## 5. 修复方向

### 方向 A（最高杠杆）：把 wave1 的 format/provenance 检查前移到 submit preflight
`source_url_present`、`key_findings_non_empty`、`question_list_has_four_sections`、depth-review 的 `source_novelty_floor` / `source_claim_cache_mapping` —— 这些都应在 `operate-work-unit submit`（或 dry-submit）时一次性校验并给出 actionable inspect，而不是等到 gate。这与 BUG-069 的 dry-submit 收口同理，但**范围要扩到 evidence-summary/question-list/depth-review 的内容格式**，不只 result.json。

### 方向 B：phase MD §3.2.1/§3.2.2 + role spec 显式钉死 gate regex
把 gate 的精确 regex/字段要求**逐字写进** role spec §3 和 phase MD §3.2.2 的 depth-review 模板（含"必须去 wave0 source.yaml 比对判定 is_new_vs_wave0"、"observed 必须 = exact-new 计数"、"cache_trail_refs 必须逐条从 result.json 复制"）。

### 方向 C（ref-floor 可达性，本 bug 特有）：明确 `per_topic_ref_md_count_floor` 不可达时的合法路径
在 phase MD §3.2.1 显式写明：wave1 新源不足以达 floor 时，**允许用 wave0-backed reference（同 topic、submitted-backed）补足**，或显式触发 supplementary deepening。当前是 Agent 自行推断。

### 方向 D（根因，承接 BUG-069）：single-source 所有 agent-facing 内容契约
phase MD / role spec / emitted schema / gate definition / validator 五者从同一 contract 生成（如 `.strict()` Zod），消除逐 wave、逐面的漂移。

## 6. 当前判定

**P1**。理由：
- 直接导致一次正式 run 的 wave1 gate 首过 19 规则全挂，需大量逐 topic、逐规则的手动/子代理修复（本 run 试图 spawn 5 个 repair helper 修复，被用户中断并要求先报 bug）。
- 研究实质（5 单元、~32 新源、对抗性核实）已完成，但被 contract 技术性卡在 gate 前 —— 与 BUG-069/073 同后果：用户得到的研究深度/交付节奏低于框架设计目标。
- 暴露了 BUG-069 收口的盲区：**wave1 内容格式面（evidence-summary/question-list/depth-review）未被 dry-submit/preflight 覆盖**。

---

## 现场证据

### Wave1 已完成的实质工作（gate 前）
| 维度 | 数值 |
|------|------|
| submitted wave1 work units | 5（wu-w1-b000-deep-i0001..i0005，全部 submit ok） |
| 新源（vs wave0） | ~32（6/5/6/7/8 per topic） |
| Phase-owned reference 文件 | 32（6/5/6/7/8 per topic） |
| depth-review.yaml | 5 |
| seed backfill token 替换 | 15（3/topic） |

### Wave1 gate attempt 1 结果
```
passed=false, degraded=false, still_failing=19 rules
（详见 §1 列表；全部 provenance/format/floor，无研究质量项）
```

### rb_status.json
```json
{ "current_gate": "wave0_complete", "next_gate": "wave1_complete", "current_node": "phases/phase-wave1.md" }
```
— wave1 进行中，gate 未过。
