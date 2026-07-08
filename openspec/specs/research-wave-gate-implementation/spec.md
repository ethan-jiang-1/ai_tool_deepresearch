# Research Wave Gate Implementation

> req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-008, RWG-009, RWG-010, RWG-011, RWG-012, RWG-013, RWG-014, RWG-016, RWG-017

## Purpose

定义 `wave0-complete`、`wave1-complete`、`wave2-complete` 三个 gate 的真实 deterministic rule set 和 CLI 实现要求。所有规则都基于当前 accepted executable surface：现有 bundle files、reference/artifacts 目录结构、reference metadata schema、trace contract。Gate 不做研究质量判断。
## Requirements
### Requirement: Wave0 complete gate rule set

The Wave0 complete gate definition SHALL include work-unit provenance checks for delegated source intake outputs: `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`. Wave0 SHALL NOT accept non-work-unit delegated artifacts or direct/orphan source files as delegated coverage.

#### Scenario: Wave0 source intake requires submitted work-unit coverage

- **WHEN** Wave0 source files exist but no submitted work-unit ledger row covers them
- **THEN** Wave0 complete gate SHALL fail
- **AND** the diagnostics SHALL report missing work-unit coverage

### Requirement: Wave1 complete gate rule set

The Wave1 complete gate definition SHALL include work-unit provenance checks for delegated topic deepening outputs. Wave1 SHALL validate per-topic output coverage through submitted work-unit ledger rows and SHALL reject non-work-unit-only evidence.

The Wave1 gate definition SHALL also include deterministic depth-contract checks for `artifacts/wave1/{topic}/depth-review.yaml`, exact source URL novelty relative to Wave0 accepted source URLs, structured source claim to submitted cache trail mapping, required depth-review keys, and supplementary queue coverage when depth review records a repair/refill path.

These checks SHALL remain deterministic process/structure checks. They SHALL NOT score prose quality, source insightfulness, homepage/path depth, Jaccard similarity, or self-reference content.

#### Scenario: Wave1 deepening coverage is ledger-first

- **WHEN** a topic deepening file exists without a matching submitted Wave1 work-unit ledger row
- **THEN** Wave1 complete gate SHALL fail delegated provenance

#### Scenario: Wave1 depth review is required

- **WHEN** a topic has `evidence-summary.md` and `question-list.md`
- **AND** `artifacts/wave1/{topic}/depth-review.yaml` is missing or unparsable
- **THEN** Wave1 complete gate SHALL fail with diagnostics naming the missing depth-review projection

#### Scenario: Wave1 exact source novelty floor blocks shallow output

- **WHEN** a topic's depth review records new source URLs below the profile-derived floor
- **THEN** Wave1 complete gate SHALL fail
- **AND** diagnostics SHALL name the topic, required floor, observed new source count, and supplementary work-unit repair path

#### Scenario: Wave1 missing floor parameter blocks hidden defaults

- **WHEN** the active profile/runtime data lacks a required parameter for deriving the Wave1 new-source floor
- **THEN** Wave1 complete gate SHALL fail with a `missing_profile_parameter` diagnostic
- **AND** the gate SHALL NOT substitute an unstated default threshold

### Requirement: Wave2 complete gate rule set

The Wave2 complete gate definition SHALL distinguish pure main-agent synthesis from delegated targeted evidence search. Delegated Wave2 targeted evidence outputs SHALL require submitted work-unit ledger rows; pure synthesis artifact checks SHALL continue to use synthesis artifact rules.

The Wave2 gate definition SHALL require deterministic evidence that the pure synthesis path was earned: scan matrix coverage, finding-index parseability, confidence/backing field consistency, unresolved search-required count, and targeted search receipt refs when a finding decision required delegated search. It SHALL fail when synthesis prose exists but scan/triage/gap-analysis artifacts are absent or inconsistent.

These checks SHALL NOT judge whether the synthesis is profound or whether a finding is semantically valuable. They only verify that the required process evidence and cross-file consistency exist.

#### Scenario: delegated Wave2 targeted search requires work-unit row

- **WHEN** Wave2 targeted evidence search creates new evidence outputs
- **THEN** Wave2 complete gate SHALL require submitted work-unit coverage for those outputs

#### Scenario: Wave2 synthesis without scan matrix fails

- **WHEN** `artifacts/wave2/synthesis.md` exists
- **AND** `cross-topic-ledger.md` lacks the Cross-Topic Scan Matrix section or `finding-index.yaml` lacks scan coverage fields
- **THEN** Wave2 complete gate SHALL fail structure/preflight checks
- **AND** inspect/advice SHALL direct the Agent to complete scan matrix, confidence triage, and gap analysis before synthesis

#### Scenario: Search-required finding without receipt or deferral fails

- **WHEN** `finding-index.yaml` contains a finding with `search_required: true`
- **AND** the finding has no submitted targeted evidence receipt refs and no explicit `defer_hitl2`, `requires_internal_data`, or `record_only` decision
- **THEN** Wave2 complete gate SHALL fail convergence checks

### Requirement: Gate CLI evaluates wave0 rules from definition

The Wave0 gate CLI SHALL evaluate work-unit provenance rule types from the gate definition and SHALL use work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/hash mismatches.

#### Scenario: Wave0 CLI rejects stale index

- **WHEN** Wave0 gate finds a ledger row whose work-unit index entry is not `submitted`
- **THEN** the CLI SHALL fail the work-unit provenance check

### Requirement: Gate CLI evaluates wave1 rules from definition

The Wave1 gate CLI SHALL evaluate work-unit provenance rule types and Wave1 depth-contract rule types from the gate definition. It SHALL use work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/hash/cache mismatches and SHALL use deterministic readers for `depth-review.yaml`, Wave0 source URL sets, structured source claims, and submitted cache trail mappings.

The Wave1 CLI SHALL not scan non-work-unit delegated directories as a production coverage source, and SHALL not reintroduce retired content heuristics as blocking checks or diagnostic advice.

#### Scenario: Wave1 CLI ignores non-work-unit coverage

- **WHEN** non-work-unit delegated directories contain Wave1-looking result files
- **AND** no submitted work-unit ledger rows cover the outputs
- **THEN** Wave1 gate CLI SHALL fail delegated provenance

#### Scenario: Wave1 CLI evaluates depth review from definition

- **WHEN** the Wave1 gate definition contains a depth-review rule
- **THEN** the CLI SHALL parse the rule target from the active bundle
- **AND** the rule SHALL contribute to the overall pass/fail determination

### Requirement: Gate CLI evaluates wave2 rules from definition

The Wave2 gate CLI SHALL evaluate work-unit provenance rule types for delegated targeted evidence and SHALL preserve existing artifact-reference checks for pure synthesis artifacts.

The Wave2 gate CLI SHALL also evaluate finding-index consistency, scan matrix coverage, pure-synthesis eligibility, and targeted-search receipt consistency from the gate definition. It SHALL preserve the accepted split: pure synthesis does not require delegated work-unit rows, but skipped scan/triage/gap analysis cannot pass as pure synthesis.

#### Scenario: Wave2 synthesis artifact check remains separate

- **WHEN** Wave2 has no delegated targeted evidence work
- **THEN** Wave2 gate CLI SHALL evaluate synthesis artifact rules without requiring a work-unit row for pure synthesis

#### Scenario: Wave2 CLI evaluates pure-synthesis eligibility

- **WHEN** `finding-index.yaml` declares unresolved search-required findings
- **THEN** the Wave2 gate CLI SHALL fail pure-synthesis eligibility unless those findings have submitted targeted evidence refs or explicit deferral decisions

### Requirement: Wave2 phase-internal feedback checks are distinct from phase boundary gate

Wave2 phase-internal feedback checks SHALL remain distinct from the phase boundary gate, but any delegated Wave2 evidence work created by those checks SHALL enter the same work-unit claim/submit loop before gate coverage can pass.

#### Scenario: feedback-created evidence work enters loop

- **WHEN** Wave2 feedback identifies a missing evidence gap requiring delegated search
- **THEN** the Engine SHALL enqueue delegated queue demand
- **AND** the gap SHALL be resolved through a new work-unit claim/submit before gate pass

### Requirement: Wave gate CLIs follow established double trace convention

Wave gate CLIs SHALL 延续 `wff-pre-research` 中建立的双 trace 约定：

- Gate CLI SHALL 通过 stdout 返回标准 JSON gate result（`check / routing / inspect / advice`）
- Gate CLI SHALL 把真实 gate attempt 追加到 active bundle 的 `rb_trace.jsonl`
- Playbook thin driver SHALL 负责调用 gate CLI、解析 result、向 `_trace.jsonl` 追加 `event: "check"` trace entry
- Experiment verdict SHALL 只读 `_trace.jsonl`

#### Scenario: Wave gate CLI output and trace verdict stay separate

- **WHEN** experiment 执行某个 wave gate
- **THEN** gate CLI stdout SHALL 提供 machine-readable JSON result
- **AND** active bundle `rb_trace.jsonl` SHALL 记录对应 runtime audit entry
- **AND** `_trace.jsonl` 中对应的 `check` event SHALL 由 playbook driver 基于该真实 result 追加

### Requirement: Wave2 gate cross_field verifies Markdown link artifact references

`check-gate-wave2-complete.mjs` 的 `cross_field` check（`mode: "markdown_link_resolution"`）SHALL 解析 `artifacts/wave2/synthesis.md` 中所有 Markdown link `[text](path)`，对每条 link 提取 path 并解析为 bundle-relative 路径，然后验证目标文件存在。至少 1 条引用目标存在时该 rule pass；所有引用目标均不存在时该 rule fail。

此 `cross_field` mode 与 `setup-ready` gate 使用的 `mode: "basename_consistency"` 不同：后者比较三个 source 的 plan_basename 是否 byte-for-byte 一致，不涉及 Markdown 解析。CLI SHALL 根据 gate definition JSON 中的 `mode` 字段选择对应 evaluator。

#### Scenario: Cross_field resolves Markdown links relative to synthesis location

- **WHEN** synthesis 包含 `[topic-a skeleton](../wave1/topic-a/skeleton.md)`
- **THEN** `cross_field` check SHALL 将 path 解析为 `artifacts/wave1/topic-a/skeleton.md`
- **AND** SHALL 验证该文件存在

#### Scenario: Cross_field fails when all targets missing

- **WHEN** synthesis 有 3 条 Markdown links 但所有目标文件均不存在
- **THEN** `cross_field` rule SHALL return `passed: false`
- **AND** `inspect` SHALL 列出所有失效路径

#### Scenario: Cross_field passes when at least one target exists

- **WHEN** synthesis 有 3 条 links，1 条目标存在、2 条不存在
- **THEN** `cross_field` rule SHALL return `passed: true`
- **AND** `advice` SHALL 列出 2 条失效路径供修复

### Requirement: Setup-ready gate validates bundle structural integrity

The `setup-ready` gate SHALL validate that the bundle is structurally complete before research waves begin. In addition to existing file existence, directory existence, schema validation, status value, and basename consistency checks, the gate SHALL verify that `rb_plan.md` body is non-empty and does not contain required-fill template markers—the prefix patterns `(待填充` and `(尚无话题`. Intentionally-allowed markers (`(待 HITL1 填充 — …)`, `(由 Engine — …)`, `(待 HITL2 确认 — …)`) SHALL NOT cause gate failure. See `plan-hostfile-sections` spec for the full marker convention.

Gate rules added:
- `plan_body_non_empty` (`field_non_empty` on `rb_plan.md` body, after stripping frontmatter via `stripMdFrontmatter()`) — catches completely empty body.
- `plan_body_no_unfilled_marker` (`pattern_match` with negate, pattern `\((?:待填充|尚无话题)`) — catches required-fill markers the Agent failed to replace. The pattern uses prefix match: it detects `(待填充 — …)` tokens where `— …` is arbitrary guidance text.

#### Scenario: Plan with filled body and no required-fill markers passes

- **WHEN** `rb_plan.md` body contains research content and no prefix matches `(待填充` or `(尚无话题`
- **THEN** both `plan_body_non_empty` and `plan_body_no_unfilled_marker` rules SHALL pass

#### Scenario: Plan with empty body fails

- **WHEN** `rb_plan.md` body is empty after `stripMdFrontmatter()`
- **THEN** `plan_body_non_empty` rule SHALL fail with inspect: "rb_plan.md body is empty"

#### Scenario: Plan with required-fill markers fails

- **WHEN** `rb_plan.md` body contains `(待填充 — …)` or `(尚无话题 — …)`
- **THEN** `plan_body_no_unfilled_marker` rule SHALL fail with inspect listing which marker prefix was detected

#### Scenario: Plan with intentionally-allowed markers passes

- **WHEN** `rb_plan.md` body contains `(待 HITL1 填充 — …)` or `(由 Engine — …)` but NO `(待填充 — …)` or `(尚无话题 — …)` markers
- **THEN** `plan_body_no_unfilled_marker` rule SHALL pass

### Requirement: Wave gates SHALL return repair-targeted diagnostics for YAML shape, ledger-only counting, cache coverage, and hash drift

Wave gate diagnostics SHALL identify the deterministic surface that failed and the next repair target. Diagnostics SHALL be specific enough for an Agent to repair the current phase without bypassing status or weakening gate authority.

At minimum, wave gates SHALL distinguish YAML parse errors, top-level YAML object-vs-array errors, missing source fields, ledger-only reference counting gaps, cache trail mapping gaps, delegated bypass suspicion, submitted work-unit hash drift, and degraded-pass eligibility.

Diagnostics SHALL classify known cascade symptoms under their root cause when the Engine can determine the dependency. The gate SHALL preserve full detail in diagnostic artifacts, but primary advice SHALL remain root-cause-first and SHALL NOT instruct manual edits to authority files.

#### Scenario: YAML object wrapper receives shape-specific diagnostic

- **WHEN** a `source.yaml` file parses as an object with keys such as `wave`, `topic`, or `sources`
- **THEN** the wave gate SHALL fail the source schema rule
- **AND** inspect/advice SHALL state that `source.yaml` must be a top-level YAML array
- **AND** diagnostics SHALL name the object keys that were found

#### Scenario: Missing source fields receive entry-specific diagnostic

- **WHEN** a `source.yaml` list entry omits `url`, `title`, `retrieved_date`, or `topic_tag`
- **THEN** the wave gate SHALL fail the source schema rule
- **AND** diagnostics SHALL name the entry and missing field path

#### Scenario: Ledger-only reference counting gap is explicit

- **WHEN** `reference/00-shared-*.md` files exist but no submitted work-unit ledger row declares them
- **THEN** the wave gate SHALL fail the relevant count or provenance rule
- **AND** diagnostics SHALL state that filesystem-only files do not count as delegated coverage
- **AND** advice SHALL direct the Agent to produce or repair them through work-unit submit

#### Scenario: Cache coverage diagnostics name mapping rule

- **WHEN** a ledger-declared reference output has no valid cache trail mapping
- **THEN** diagnostics SHALL name the reference path and source URL when available
- **AND** advice SHALL state the expected `_cache/` leaf mapping mechanism through `meta.json.url` or source slug plus required leaf files

#### Scenario: Hash drift blocks pass with work-unit context

- **WHEN** a submitted work-unit row fails index, manifest, result, receipt, beacon, output, cache, or hash cross-check
- **THEN** the wave gate SHALL fail before pass
- **AND** diagnostics SHALL name the `work_id`, failed binding surface, and repair path
- **AND** advice SHALL not tell the Agent to hand-edit ledger or hash-bound result files

#### Scenario: Gate friction does not advise phase bypass

- **WHEN** a wave gate has failed repeatedly
- **THEN** advice MAY include fatigue and strategy-change guidance
- **AND** advice SHALL NOT instruct the Agent to hand-edit `rb_status.json`, skip required phases, or surface to the user during `stop: no`

### Requirement: Wave gates SHALL implement Phase-owned reference projection and delegated evidence split

Wave gate definitions and CLIs SHALL distinguish Phase-owned reference projections from delegated fetched evidence. Wave1 gates SHALL continue to require topic reference files for accepted submitted sources suitable for consumer navigation, or an explicit limitation/repair diagnostic when no materializable submitted source exists. They SHALL validate reference format, index entries, parseable source URLs, and submitted backing. They SHALL NOT require the topic reference file itself to be a delegated output when it is Phase-owned and backed by submitted Wave1 source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records.

Wave2 gates SHALL allow pure-synthesis `reference/00-cross-*.md` files when they are existing-backed projections with concrete Wave0/Wave1 submitted evidence and Wave2 `W2F-xxx` ledger/index refs. Wave2 gates SHALL still require submitted `wave2_targeted_evidence` coverage for any `00-cross` reference or finding that claims newly fetched external evidence.

Delegated bypass diagnostics SHALL be precise: unbacked fetched-source references remain blocking, but legitimate Phase-owned projections SHALL NOT be reported as bypass solely because the Phase Agent wrote them.

When classification is ambiguous, Wave gates SHALL prefer blocking backing diagnostics over permissive inference. A legal file name, valid reference format, or `_INDEX.md` row SHALL NOT be enough for pass if the gate cannot bind the reference to submitted/prior accepted backing or to submitted targeted-evidence coverage.

For existing-backed Wave2 `00-cross` references, Wave2 gates SHALL verify that the reference does not satisfy `source_url` with a synthetic or newly discovered public URL. The `source_url` SHALL bind to prior accepted backing unless the reference is backed by submitted targeted evidence.

#### Scenario: Wave1 gate accepts backed Phase-owned topic reference

- **WHEN** a Wave1 topic reference file exists, passes reference format checks, appears in `_INDEX.md`, and its source URL binds to submitted Wave1 source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records
- **THEN** the Wave1 gate SHALL treat the reference projection as backed without requiring that reference path in delegated `output_files[]`
- **AND** delegated evidence coverage SHALL still require submitted evidence-summary/question-list/source/cache backing

#### Scenario: Wave1 gate rejects unbacked topic reference

- **WHEN** a Wave1 topic reference file exists but its source URL cannot be tied to submitted Wave1 source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture backing
- **THEN** the Wave1 gate SHALL fail or diagnose reference backing drift
- **AND** advice SHALL direct supplementary `wave1_topic_deepening` or reference repair

#### Scenario: Wave2 gate accepts existing-backed pure-synthesis cross reference

- **WHEN** Wave2 pure synthesis writes `reference/00-cross-*.md`
- **AND** the reference cites `W2F-xxx` plus concrete submitted Wave0/Wave1 backing refs
- **THEN** the Wave2 gate SHALL NOT require a Wave2 targeted-evidence row solely because the cross reference exists

#### Scenario: Wave2 gate rejects new evidence without targeted coverage

- **WHEN** a Wave2 `00-cross` reference claims a newly fetched external source or a finding records targeted search as submitted
- **AND** no submitted `wave2_targeted_evidence` row backs that source/finding
- **THEN** the Wave2 gate SHALL fail delegated provenance
- **AND** delegated bypass diagnostics SHALL name the missing targeted work-unit coverage

#### Scenario: Wave2 gate rejects synthetic cross-reference source URL

- **WHEN** an existing-backed `reference/00-cross-*.md` uses a `source_url` that is not a prior accepted backing source URL
- **AND** no submitted `wave2_targeted_evidence` row backs that URL
- **THEN** the Wave2 gate SHALL fail reference backing validation
- **AND** diagnostics SHALL direct repair to a prior accepted source URL, body backing refs, targeted evidence, or a limitation

#### Scenario: reference index remains required for consumer navigation

- **WHEN** Wave1 or Wave2 materializes reference files
- **THEN** `reference/_INDEX.md` SHALL include matching rows with the correct source layer
- **AND** missing index rows SHALL be reported as reference navigation drift, not as delegated work-unit evidence by themselves

#### Scenario: gate refuses ambiguous reference authority

- **WHEN** a reference has valid format and appears in `_INDEX.md`
- **AND** the gate cannot determine whether it is a backed Phase-owned projection or a submitted fetched-source evidence surface from bundle files
- **THEN** the gate SHALL fail or emit blocking diagnostics
- **AND** advice SHALL name the missing submitted backing, missing targeted evidence row, or missing prior-wave refs needed for repair

