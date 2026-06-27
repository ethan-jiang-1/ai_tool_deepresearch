## 1. Schema: Research style JSON definition files

Style 文件为 JSON 格式，仅供 JS 读取（Agent/MD 不碰）。`wave0_shared_ref` 是唯一的 topic-count-dependent 参数（存 `{ base, per_topic }` 因子，由 CLI 计算绝对值）。其余均为绝对值或布尔/枚举。

- [x] 1.1 Create `DPT_FRAMEWORK/schema/research-styles/debug.json` with all 12 parameter fields @impl RES-001, RES-005
- [x] 1.2 Create `DPT_FRAMEWORK/schema/research-styles/quick_factual.json` with V12-derived values @impl RES-001
- [x] 1.3 Create `DPT_FRAMEWORK/schema/research-styles/exploratory_map.json` with V12-derived values @impl RES-001
- [x] 1.4 Create `DPT_FRAMEWORK/schema/research-styles/claim_verification.json` with V12-derived values @impl RES-001

## 2. Profile schema extension + JS computation CLI

- [x] 2.1 Add `ResearchStyleParamsSchema` (13-field Zod object) to `DPT_FRAMEWORK/schema/contracts/profile.mjs` @impl RES-002
- [x] 2.2 Add optional `research_style_params` field to `ProfileSchema` (`.optional()`) @impl RES-002
- [x] 2.3 Add `debug` to `ResearchProfile` enum in `DPT_FRAMEWORK/schema/enums.mjs` @impl RES-005
- [x] 2.4 Update `DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl` with default `research_style_params:` placeholder section @impl RES-002
- [x] 2.5 Run existing schema tests (`node --test tests/schema/`) to confirm no regressions
- [x] 2.6 Create `DPT_FRAMEWORK/cli/apply-research-style.mjs` — reads JSON style file + `topic_registry` length → computes `wave0_shared_ref_total` → writes all params (absolute values only) to `rb_profile.yaml` → outputs result JSON to stdout. This is the sole computation point for topic-count-dependent parameters. @impl RES-002

## 3. Gate definition JSON: dynamic threshold

- [x] 3.1 Add `threshold_source` field to `shared_ref_count_floor` rule in `gate-wave0-complete.definition.json` pointing to `rb_profile.yaml#/research_style_params/wave0_shared_ref_floor`. Retain existing `threshold: 1` as fallback. @impl RES-003
- [x] 3.2 Add `threshold_source` field to `per_topic_count_floor` rule in `gate-wave0-complete.definition.json` pointing to `rb_profile.yaml#/research_style_params/wave0_shared_ref_floor`. Retain existing `threshold: 1` as fallback. @impl RES-003
- [x] 3.3 Add `threshold_source` field to `per_topic_ref_md_count_floor` rule in `gate-wave1-complete.definition.json` pointing to `rb_profile.yaml#/research_style_params/wave1_ref_floor_per_topic`. Retain existing `threshold: 1` as fallback. @impl RES-003

## 4. Gate CLI: read profile for dynamic threshold

- [x] 4.1 Add `readBundleProfile()` helper to `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — stateless YAML reader (mirrors existing `readBundlePlan()`), returns parsed object or `null` if file missing/unparseable. Callers that evaluate multiple rules should wrap with a lazy cache (same `_profileCache` pattern as `_planCache`). Cache is safe because `rb_profile.yaml` is immutable after HITL1. @impl RES-003
- [x] 4.1b Smoke-check `readBundleProfile()`: verify it returns parsed YAML object for a valid file, returns `null` for a missing file @impl RES-003
- [x] 4.2 Add `resolveThreshold(rule, profile)` to `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` — reads `threshold_source` `#/` path from profile, coerces walk result via `Number()` (YAML may parse integers as number or string), falls back to hardcoded `rule.threshold` if: no `threshold_source`, profile null, path not found, value not finite/positive. Safety: floor ≤ 0 always falls back (zero threshold would vacuously pass). @impl RES-003
- [x] 4.3 Update `count_floor` branch in `check-gate-wave0-complete.mjs` — add `_profileCache` lazy wrapper around `readBundleProfile()`, import `resolveThreshold` from gate-helpers, replace `rule.threshold` with `resolveThreshold(rule, getProfile())`, update failure message to show resolved threshold @impl RES-003
- [x] 4.4 Update `count_floor` branch in `check-gate-wave1-complete.mjs` — same changes as 4.3 (lazy cache + import + replace `rule.threshold` with shared `resolveThreshold`) @impl RES-003

## 5. Phase MD: HITL1 copies parameters to profile

- [x] 5.1 Update `phase-hitl1.md` to instruct Agent: after user selects research_profile, run `node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle <path> --style <profile>` to write all parameters to `rb_profile.yaml#/research_style_params`, then self-check that parameter values are consistent with the selected profile (e.g. claim_verification should not get debug-level floor=1) @impl RES-002, RES-005
- [x] 5.2 Update `shared-profile.md` to document the new `research_style_params` section and its fields @impl RES-002

## 6. Phase MD: Wave 0 references profile targets

- [x] 6.1 Update `phase-wave0.md` to replace "foundation floor" with explicit reference to `rb_profile.yaml#/research_style_params/wave0_shared_ref_floor` — Agent SHALL read this value to know the exact target @impl RES-004

## 7. Phase MD: Wave 1 references profile targets + Stop Conditions checklist

- [x] 7.1 Update `phase-wave1.md` to reference `rb_profile.yaml#/research_style_params/wave1_ref_floor_per_topic` and `topic_unique_ratio` as explicit targets @impl RES-004
- [x] 7.2 Add Stop Conditions checklist to `phase-wave1.md` §3.3.1 (before gate command) — 7 conditions with style-dependent requirements: (1) core objects stable, (2) must-answer backed, (3) synthesis entries have Wave 2 route, (4) limitation search attempted, (5) counterexample search (mandatory if `counterexample_search: true`), (6) cross-verification (mandatory if `cross_verification: true`), (7) remaining unknowns listed. Agent SHALL confirm each condition before running gate @impl RES-004

## 6b. Wave0 Count-Floor Re-Fill Loop（source 数量不足时的自主补充循环）

Wave0 的 `per_topic_count_floor`（数 `source.yaml` YAML 条目）和 `shared_ref_count_floor`（数 `00-shared-*.md` 文件）使用动态阈值后，单次 source intake 可能无法产出足够条目/文件。与 wave1 相同的架构许可（Queue §5.3 Rule 3）。全部改动在 MD 层。

- [x] 6b.1 Update `phase-wave0.md` §3.1 primary task card `action` / `writes_to` to also produce `00-shared-*.md` files for cross-topic shared references. Add note clarifying that reaching the dynamic floor is NOT this task card's responsibility. @impl RES-004
- [x] 6b.2 Add §3.3.1 Count-Floor Re-Fill Loop to `phase-wave0.md` — supplementary task card appends to `source.yaml` (preserving existing entries) and/or writes new `00-shared-*.md` files. Same loop bounds as wave1 (max 3 attempts, no-progress detection). @impl RES-004
- [x] 6b.3 Update `phase-wave0.md` §7 gate fail table: split `count_floor` row into `per_topic_count_floor` and `shared_ref_count_floor`, both pointing to §3.3.1. Update persistent failure text. @impl RES-004
- [x] 6b.4 Update `phase-wave0-subagent.md` §6: add supplementary task note — same sub-agent role (`dpt-source-intake`), append-only behavior. @impl RES-004

## 7b. Wave1 Count-Floor Re-Fill Loop（reference 数量不足时的自主补充循环）

Gate 的 `per_topic_ref_md_count_floor` 规则使用动态阈值后，单次 deepening 可能无法产出足够 reference 文件。Phase Agent 在 gate fail 时进入自主补充循环——利用 Queue §5.3 Rule 3（Q empty + gate fail → re-fill Q）架构许可。全部改动在 MD 层，不动 engine/CLI/schema。

- [x] 7b.1 Update `phase-wave1.md` §3.1 primary task card `action` / `writes_to` / `done_condition` to explicitly require reference/*.md file production per source. Add note clarifying that reaching the dynamic floor is NOT this task card's responsibility — gaps are filled by §3.3.2. @impl RES-004
- [x] 7b.2 Add §3.3.2 Count-Floor Re-Fill Loop to `phase-wave1.md` — full autonomous loop with flow diagram, supplementary task card JSON template, drain notes, and loop termination conditions (max 3 attempts, no-progress detection). Supplementary task: `work_id: wave1-suppl-{topic.slug}-r{N}`, only produces reference/*.md, does NOT modify evidence-summary/question-list, `required_receipts: []`, `completion_receipt: null`. @impl RES-004
- [x] 7b.3 Update `phase-wave1.md` §7 gate fail table: count_floor row → explicit "进入 §3.3.2 Re-Fill Loop" with operational steps. Persistent failure text → mention count_floor re-fill attempts in escalation. @impl RES-004
- [x] 7b.4 Update `phase-wave1-subagent.md` §6 Relationship to Phase Agent: add supplementary task note — same sub-agent role (`dpt-evidence-extractor`), same relay contract, focused reference-only action. @impl RES-004

## 7c. Wave2 Quality Self-Check + Queue Re-Fill Loop（P0/P1 finding 质量不足 + cross-topic/emergent gap 时的自主补充循环）

Wave2 没有 `count_floor` gate rule，但 5 个 research_style_params 定义了 wave2 的行为目标和质量基线：
- **质量底线**: `p0p1_independent_backing`（int）、`quality_min_tier`（enum）、`quality_min_substance`（enum）——每个 P0/P1 finding 的 backing source 达标检查
- **行为目标**: `wave2_cross_topic_depth`（int, per-topic, 每 topic 至少连几个其他 topic）、`wave2_emergent_search_rounds`（int, per-topic, 每 topic 做几轮 emergent search）

Phase Agent 在跑 gate 前执行 Quality Self-Check，逐条检查。不足 → 创建 supplementary task card → enqueue + drain Q → re-check。全部改动在 MD 层，模式与 wave0/wave1 re-fill loop 完全一致。两个 wave2 独有参数都是 per-topic 整数，自动 scale with topic count，无需 JS 计算。

- [x] 7c.1 Update `phase-wave2.md` to add Quality Self-Check section (§ before gate command): Agent reads all 5 wave2 params, iterates P0/P1 findings in finding-index.yaml for backing quality, checks cross-topic-ledger.md for cross-topic connection count per topic, and checks whether emergent_search_rounds were executed. Marks gaps. @impl RES-004
- [x] 7c.2 Add § Wave2 Quality Re-Fill Loop to `phase-wave2.md`: parse quality gap（backing count/tier/substance insufficient, cross-topic depth unmet, emergent rounds incomplete）→ create supplementary task card (`work_id: wave2-suppl-{finding_id}-r{N}`, sub-agent `dpt-evidence-extractor`) → enqueue + drain → re-run quality check → gate. Same loop bounds: max 3 attempts, no-progress detection. @impl RES-004
- [x] 7c.3 Update `phase-wave2.md` § On Gate Fail table: add quality-related fail rows covering all 5 wave2 params. @impl RES-004
- [x] 7c.4 Update `phase-wave2-subagent.md` § Relationship to Phase Agent: add note that sub-agent may receive quality-gap + cross-topic + emergent supplementary tasks (same role, focused action per gap type). @impl RES-004

## 8. Regression tests

### 8a. Unit: `readBundleProfile()` (`tests/engine/read-bundle-profile.test.mjs`)

- [x] 8a.1 Profile file exists → returns parsed YAML object with expected keys @impl RES-003
- [x] 8a.2 Profile file missing → returns `null` (not throw) @impl RES-003
- [x] 8a.3 ~~Second call returns cached value (no disk re-read)~~ → N/A: `readBundleProfile()` is stateless; caching is at CLI level via `_profileCache` wrapper, tested implicitly by gate CLI integration tests @impl RES-003
- [x] 8a.4 YAML parse error → graceful error (return `null` or throw descriptive message) @impl RES-003
- [x] 8a.5 Empty YAML → returns `null` or empty object @impl RES-003

### 8b. Unit: `resolveThreshold()` (`tests/engine/resolve-threshold.test.mjs`)

- [x] 8b.1 `threshold_source` path resolves to value in profile → returns that value @impl RES-003
- [x] 8b.2 `threshold_source` path not found in profile → falls back to rule's hardcoded `threshold` @impl RES-003
- [x] 8b.3 Profile is `null` (missing file) → falls back to rule's hardcoded `threshold` @impl RES-003
- [x] 8b.4 Rule has no `threshold_source` field → uses rule's hardcoded `threshold` directly (backward compat) @impl RES-003
- [x] 8b.5 `threshold_source` resolves to a non-number or zero → falls back to hardcoded `threshold` (safety: never use floor=0) @impl RES-003
- [x] 8b.6 Deep path e.g. `rb_profile.yaml#/research_style_params/wave1_ref_floor_per_topic` resolves correctly (multi-level walk) @impl RES-003

### 8c. Integration: dynamic threshold in gate CLI (`tests/integration/gate-dynamic-threshold.test.mjs`)

- [x] 8c.1 Create disposable bundle with `claim_verification` profile and populated `research_style_params` (wave0=12), run `check-gate-wave0-complete` with 0 reference files → verify output shows `threshold: 12` (not 1) in `inspect` failure detail @impl RES-003
- [x] 8c.2 Same bundle, run `check-gate-wave1-complete` with 0 topic reference files → verify output shows `threshold: 10` (not 1) in failure detail @impl RES-003
- [x] 8c.3 Create disposable bundle with `quick_factual` and populated `research_style_params` (wave0=6), run `check-gate-wave0-complete` → verify threshold=6 @impl RES-003
- [x] 8c.4 Create disposable bundle with NO `research_style_params` section → run `check-gate-wave0-complete` → verify threshold falls back to hardcoded 1 (backward compat) @impl RES-003
- [x] 8c.5 Create disposable bundle with `debug` profile and populated `research_style_params` (wave0=1) → verify threshold=1 (debug is lowest, but should still work) @impl RES-003
- [x] 8c.6 Gate definition JSON with `threshold_source` field loads without error via `tryLoadGateDefinition()` @impl RES-003
- [x] 8c.7 Create disposable bundle with populated `research_style_params` but `threshold_source` path resolves to undefined in profile → verify threshold falls back to hardcoded 1 (graceful degradation, no crash) @impl RES-003
- [x] 8c.8 ~~Nested path integration~~ → covered by unit test 8b.6 (`resolveThreshold` multi-level walk verified at unit level; integration test would require modifying gate definition JSON which is unnecessary) @impl RES-003

### 8d. Schema: gate definition round-trip (`tests/schema/gate-definition-threshold-source.test.mjs`)

- [x] 8d.1 `gate-wave0-complete.definition.json` parses successfully → every `count_floor` rule has `threshold_source` field populated @impl RES-003
- [x] 8d.2 `gate-wave1-complete.definition.json` parses successfully → `count_floor` rule has `threshold_source` field populated @impl RES-003
- [x] 8d.3 All other gate definition JSONs still parse (no regression from schema changes) @impl RES-003
- [x] 8d.4 `ResearchStyleParamsSchema.safeParse()` accepts valid style JSON content, rejects missing required fields @impl RES-002
- [x] 8d.5 `ProfileSchema` accepts optional `research_style_params` field; profile without it still parses (optional) @impl RES-002

## 9. Governance checks

- [x] 9.1 Register requirement IDs RES-001 through RES-005 in `openspec/governance/req-registry.yaml` (research-styles capability, prefix RES) — already registered (lines 362-367). RES-006 registration deferred to §14.1
- [x] 9.2 Run `node openspec/governance/check-project-reqs.mjs` — no RES-related duplicate/orphan/unregistered issues. Pre-existing PHS-* orphan IDs are unrelated to this change.
- [x] 9.3 Run `node openspec/governance/check-project-specs.mjs` — 1 violation (plan-hostfile-sections missing `> req:` header), pre-existing and unrelated to this change.

## 10. Phase MD: Rerun recomputes research_style_params

HITL2 决定 rerun 后，`phase-rerun` 可能 add/remove topic，导致有效 topic_count 变化。`wave0_shared_ref_total` 基于旧 topic_count 计算，必须重算。责任归于 `phase-rerun`：做完 topic delta → 同步 `topic_registry` → 重跑 `apply-research-style.mjs`。`phase-seed-topics`（rerun-aware 模式）同步 registry。CLI 和 schema 不动，仅 MD 层变更。

- [x] 10.1 Update `phase-rerun.md` — after topic delta (add/remove via `## 本轮重跑方向`), sync `topic_registry` in `rb_plan.md`, then re-run `apply-research-style.mjs --bundle <path> --style <research_profile>` to recompute `wave0_shared_ref_total` and replace `research_style_params` in `rb_profile.yaml` @impl RES-002
- [x] 10.2 Update `phase-seed-topics.md` — rerun-aware mode: `action: add` and `action: remove` results SHALL be synchronized with `topic_registry` in `rb_plan.md` (relax current "不在 registry 中移除" constraint for rerun path) @impl RES-002

## 11. Experiment playbooks

Agent-driven trace-based 实验，验证 gate 动态阈值在真实 disposable bundle 中端到端可运行。放在 `exp_wff_wave-gates` 下（接在 case-121~124 后面）。

- [x] 11.1 Write `experiments_playbook/exp_wff_wave-gates/case-125-light-dynamic-threshold.md` — claim_verification style 下 wave0-complete gate shared_ref_count_floor 使用动态阈值 12（不达则 fail，达到则 pass），per_topic_count_floor 同步使用动态阈值 @impl RES-003
- [x] 11.2 Write `experiments_playbook/exp_wff_wave-gates/case-126-light-style-switch.md` — 同一批数据（6 shared refs）quick_factual 下 pass（threshold=6），切到 claim_verification 后 fail（threshold=12），证明 style 参数真正驱动 gate 行为变化 @impl RES-003
- [x] 11.3 Execute both playbooks via coding agent runner — case-125 PASS（2/2 checks, threshold=12 动态阈值生效），case-126 PASS（2/2 checks, style switch 改变 gate 行为）。trace-based verdict 均 PASS。

## 12. Placeholder Reference Prevention（占位符 reference 防护）

实施中发现 Wave1 Count-Floor Re-Fill Loop 产出大量 `source_url: "https://example.com"` 占位符 reference 文件（20 个，4/topic × 5 topics）。三层防护。@impl RES-006

- [x] 12.1 Layer 1 — Task card ban：`phase-wave1.md` §3.3.2 suppl task card `action` 加占位符禁令、最低内容标准（≥3 条 Key Facts）、诚实失败指令（写 `suppl-failure-r{attempt}.md` 而非占位符 ref）
- [x] 12.2 Layer 1 — `phase-wave0.md` §3.3.1 suppl task card `action` 同样加占位符禁令（wave0 的 `00-shared-*.md` 产出路径）
- [x] 12.3 Layer 2 — Gate rule：`gate-wave1-complete.definition.json` 新增 `no_example_com_ref_url` rule（`pattern_match` + glob target + `negate: true`）
- [x] 12.4 Layer 2 — Gate rule：`gate-wave0-complete.definition.json` 新增 `no_example_com_shared_ref_url` rule
- [x] 12.5 Layer 2 — Gate CLI：`check-gate-wave1-complete.mjs` `pattern_match` handler 加 glob 支持（target 含 `*` 时 expand 为匹配文件列表）
- [x] 12.6 Layer 2 — Gate CLI：`check-gate-wave0-complete.mjs` 新增完整 `pattern_match` handler（含 glob 支持）
- [x] 12.7 Layer 3 — Post-drain check：`phase-wave1.md` §3.3.2 Drain 注意事项加 Post-Drain Placeholder Check + Loop 终止条件更新（占位符-only round → immediate escalation，不等待 3 次 attempt）
- [x] 12.8 Bonus — inspect：`inspect-wave1-output.mjs` 新增占位符 source_url 检测；修复 `parseMetadataBlock` 改用 `parseMdFrontmatter`（原 regex 不匹配 YAML frontmatter 格式）
- [x] 12.9 Bonus — inspect：`inspect-wave0-output.mjs` 同上
- [x] 12.10 运行全部 728 tests → PASS（0 fail）

## 13. Cache Raw Web Content Architecture（CRC-001 ~ CRC-004）

`_cache/` 目录从空壳变为结构化原始数据缓存。四级目录 `{wave}/{batch}/{scope}/{source_dir}/`，spawn prompt 机制传递路径，source-slug 与 reference 一致，`meta.json` 11 字段。

README 模板（`_cache/README.md.tmpl`、`_logs/README.md.tmpl`）已创建，待接入 instantiation。

### 13.1 文档更新

- [x] 13.1.1 @impl CRC-001：`shared-subagent-protocol.md` §2 更新 `_cache/` 目录结构为新四级结构，废弃 `_cache/waveN/slot_MM/` 三层文档
- [x] 13.1.2 @impl CRC-001：`shared-schemas.md` 更新 `_cache/` 条目为 `_cache/{wave}/{batch}/{scope}/{source_dir}/`

### 13.2 引擎：spawn prompt 传递 cache 路径

- [x] 13.2.1 @impl CRC-002：`subagent-relay.mjs` 的 `buildSpawnPrompt()` 增加 `cacheDir` 可选参数——传入时 spawn prompt 含 `Cache directory: {绝对路径}` 行，不传时不显示（向后兼容）
- [x] 13.2.2 @impl CRC-002：`taskMarkdownForSlot()` + `createDispatchManifest()` 支持从 custom dispatch map 读取 `cacheDir` 并传递给 spawn prompt 和 task.md

### 13.3 Sub-agent 指令文件：要求写三文件

- [x] 13.3.1 @impl CRC-001, CRC-003：`phase-wave0-subagent.md` 更新缓存路径说明——废弃 `_cache/waveN/slot_MM/`，改为 Phase Agent 通过 spawn prompt 传入的具体路径；要求每个 source 写 `websearch.json` + `page.md` + `meta.json`（11 字段）
- [x] 13.3.2 @impl CRC-001, CRC-003：`phase-wave1-subagent.md` 同上
- [x] 13.3.3 @impl CRC-001, CRC-003：`phase-wave2-subagent.md` 同上

### 13.4 Phase MD：task card action 精确化

- [x] 13.4.1 @impl CRC-001, CRC-002：`phase-wave0.md` primary task card `action` 加精确 cache 路径；suppl task card `action` 加精确 cache 路径
- [x] 13.4.2 @impl CRC-001, CRC-002：`phase-wave1.md` primary task card `action` 加精确 cache 路径；suppl task card `action` 加精确 cache 路径
- [x] 13.4.3 @impl CRC-001, CRC-002：`phase-wave2.md` synthesis + backing + depth + emergent 四种 task card `action` 加精确 cache 路径

### 13.5 README 接入 instantiation

> 14.1/14.2（模板创建）已完成，模板文件位于 `DPT_FRAMEWORK/rb_templates/_cache/README.md.tmpl` 和 `DPT_FRAMEWORK/rb_templates/_logs/README.md.tmpl`。

- [x] 13.5.1 @impl CRC-004：`instantiate-run-bundle.mjs` template copy list 增加 `_cache/README.md` 和 `_logs/README.md` 两行；scaffold count 3→5
- [x] 13.5.2 运行 `instantiate-run-bundle.mjs` 创建测试 bundle，验证两个 README 均已生成且内容正确

## 14. Governance

- [x] 14.1 在 `openspec/governance/req-registry.yaml` 注册 CRC-001 ~ CRC-004 + RES-006（capability: `cache-raw-web-content` + `research-styles` 补充）；修复 RES-001 "YAML"→"JSON"
- [x] 14.2 运行 `node openspec/governance/check-project-reqs.mjs` — 无新增 RES/CRC 问题（仅 pre-existing PHS orphans）
- [x] 14.3 运行 `node openspec/governance/check-project-specs.mjs` — 1 violation (plan-hostfile-sections)，pre-existing
- [x] 14.4 运行全部 regression tests（`node --test tests/`）— 728 pass, 0 fail
- [x] 14.5 `MAX_CONCURRENT_SUBAGENTS` 4→8（engine + protocol doc + test 同步更新）

## 15. Missing Regression Test Coverage（补充测试缺口）

> 以下任务覆盖 review 发现的缺口。不修改已有 [x] task。
> 
> **已知 artifacts 与实现的名词偏差**（实现正确，artifact 文本是目标名称，不修改已有 task）：
> - tasks §3.1/3.2 描述 `threshold_source` 路径用了 `wave0_shared_ref_floor`，实际 gate definition JSON + profile 字段名为 `wave0_shared_ref_total`。spec 已修正。

- [x] 15.1 @impl RES-006：`tests/integration/cli/check-gate-wave1-complete.test.mjs` 增加 test 8 — 创建含 `source_url: "https://example.com"` 的 reference 文件，验证 gate 返回 fail 且 inspect 包含 "placeholder" 或 "example.com"
- [x] 15.2 @impl RES-006：`tests/integration/cli/check-gate-wave0-complete.test.mjs` 增加 test 8 — 同上，针对 `00-shared-*.md`
- [x] 15.3 @impl CRC-004：`tests/integration/cli/instantiate-run-bundle.test.mjs` 增加 `_cache/README.md` + `_logs/README.md` 存在性及内容验证
