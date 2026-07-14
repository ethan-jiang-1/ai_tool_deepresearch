# Research Wave Gate Implementation

> req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-008, RWG-009, RWG-010, RWG-011, RWG-012, RWG-013, RWG-014, RWG-016, RWG-017, RWG-018, RWG-019

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

The Wave1 gate definition SHALL also include deterministic depth-contract checks for `artifacts/wave1/{topic}/depth-review.yaml`. Submitted work-unit rows SHALL be the direct authority for source claims, accepted URLs, cache/degraded refs, and actor provenance. The checker SHALL derive exact source URL novelty, cache mapping, observed new-source count, and the profile-derived floor from `reviewed_work_unit_refs[]`, current Wave0 source authority, and profile facts. The review SHALL own only non-derivable Phase judgments and supplementary decision closure; copied source/cache/floor fields SHALL NOT become a second blocking authority.

Wave1 reference-format checks SHALL evaluate the eight common metadata keys plus one canonical topic binding resolved from `related_topic_uid` or legacy `related_topic`. An exact registered UID without the legacy field SHALL be valid; the existing normal first-run legacy form SHALL remain valid; dual forms SHALL resolve identically or fail once as a binding conflict. Reference-index coverage SHALL continue to require the accepted eight-column `reference/_INDEX.md` table. A missing or unparseable parent table SHALL fail as one parent root before per-reference row coverage is evaluated.

Numeric `count_floor` SHALL use the narrow shared countability predicate: accepted status plus at least one parseable `source_url` on already authority-selected references. Required semantic section availability SHALL remain in `reference_format`. Fixed Core Content Capture character count, fixed Key Facts bullet count, section order/case/heading level, homepage/path depth, Jaccard similarity, duplicate-looking URL, self-reference, and other prose-quality heuristics SHALL NOT affect numeric count. The existing `key_facts_min_lines` rule SHALL be removed from the blocking Wave1 gate definition; Key Facts quantity MAY remain a non-blocking inspect advisory rather than being duplicated beside `reference_format` and `count_floor`.

These checks SHALL remain deterministic process/structure checks. They SHALL NOT score source insightfulness or other Agent-owned semantic quality.

#### Scenario: Wave1 deepening coverage is ledger-first

- **WHEN** a topic deepening file exists without a matching submitted Wave1 work-unit ledger row
- **THEN** Wave1 complete gate SHALL fail delegated provenance

#### Scenario: Wave1 depth review is required

- **WHEN** a topic has `evidence-summary.md` and `question-list.md`
- **AND** `artifacts/wave1/{topic}/depth-review.yaml` is missing or unparsable
- **THEN** Wave1 complete gate SHALL fail with diagnostics naming the missing depth-review projection

#### Scenario: Wave1 exact source novelty floor blocks shallow output

- **WHEN** reviewed submitted Wave1 rows contain exact-new accepted source URLs below the profile-derived floor
- **THEN** Wave1 complete gate SHALL fail
- **AND** diagnostics SHALL name the topic, required floor, observed new source count, and supplementary work-unit repair path

#### Scenario: Wave1 missing floor parameter blocks hidden defaults

- **WHEN** the active profile/runtime data lacks a required parameter for deriving the Wave1 new-source floor
- **THEN** Wave1 complete gate SHALL fail with a `missing_profile_parameter` diagnostic
- **AND** the gate SHALL NOT substitute an unstated default threshold

#### Scenario: UID-only reference satisfies Wave1 topic binding

- **WHEN** a historical or rerun-time reference has all common required metadata and exact `related_topic_uid` but omits legacy `related_topic`
- **THEN** Wave1 reference-format evaluation SHALL bind it to the registered canonical topic
- **AND** it SHALL NOT fail solely because the legacy key is absent

#### Scenario: Invalid reference index is one parent failure

- **WHEN** `reference/_INDEX.md` is missing or contains a prose summary/list instead of the accepted eight-column table
- **THEN** Wave1 SHALL fail with one parent index-table root
- **AND** per-reference missing-row failures SHALL remain masked until the parent table is valid

#### Scenario: Numeric count does not repeat content-format checks

- **WHEN** an authority-backed accepted reference has a parseable source URL but short prose or fewer than five Key Facts bullets
- **THEN** the numeric count-floor evaluator SHALL still count it
- **AND** only a genuinely missing required semantic section MAY fail the separate shared reference-format rule

#### Scenario: Depth facts come from reviewed submitted rows

- **WHEN** a depth review identifies submitted work-unit refs and omits copied source/cache/new-source fields
- **THEN** Wave1 gate SHALL derive source claims, cache mapping, novelty, observed count, and required floor from direct authority
- **AND** omission of the retired duplicate fields SHALL NOT fail the review

### Requirement: Wave2 complete gate rule set

The Wave2 complete gate definition SHALL distinguish pure main-agent synthesis from delegated targeted evidence search. Delegated Wave2 targeted evidence outputs SHALL require submitted work-unit ledger rows; pure synthesis artifact checks SHALL continue to use synthesis artifact rules.

The Wave2 gate definition SHALL require deterministic evidence that the pure synthesis path was earned: scan matrix coverage, finding-index parseability, confidence/backing field consistency, unresolved search-required count, and targeted search receipt refs when a finding decision required delegated search. It SHALL fail when synthesis prose exists but scan/triage/gap-analysis artifacts are absent or inconsistent.

`cross-topic-ledger.md` SHALL contain the six required non-empty semantic sections: Cross-Topic Scan Matrix, Wave1 Legacy Questions, Cross-Topic Resolutions, Emergent Cross-Topic Questions, Exploration Decisions, and HITL2 Handoff. The historical `ledger_fixed_sections` rule id MAY remain stable for compatibility, but its checker SHALL evaluate section availability as a tolerant set rather than an ordered regex. Section order, heading level, spacing, and equivalent case SHALL NOT independently fail the Gate.

These checks SHALL NOT judge whether the synthesis is profound or whether a finding is semantically valuable. They only verify that the required process evidence, semantic sections and cross-file consistency exist.

#### Scenario: Delegated Wave2 targeted search requires work-unit row

- **WHEN** Wave2 targeted evidence search creates new evidence outputs
- **THEN** Wave2 complete gate SHALL require submitted work-unit coverage for those outputs

#### Scenario: Wave2 synthesis without scan matrix fails

- **WHEN** `artifacts/wave2/synthesis.md` exists
- **AND** `cross-topic-ledger.md` lacks the Cross-Topic Scan Matrix section or `finding-index.yaml` lacks scan coverage fields
- **THEN** Wave2 complete gate SHALL fail structure/preflight checks
- **AND** the primary finding SHALL name the missing semantic/structured fact rather than a heading-format preference

#### Scenario: Search-required finding without receipt or deferral fails

- **WHEN** `finding-index.yaml` contains a finding with `search_required: true`
- **AND** the finding has no submitted targeted evidence receipt refs and no explicit `defer_hitl2`, `requires_internal_data`, or `record_only` decision
- **THEN** Wave2 complete gate SHALL fail convergence checks

#### Scenario: Six ledger sections may be reordered

- **WHEN** all six required non-empty sections exist in a different order or equivalent heading presentation
- **THEN** the `ledger_fixed_sections` compatibility rule SHALL pass
- **AND** no ordered-regex shadow checker SHALL fail formal Gate or inspect

#### Scenario: delegated Wave2 targeted search requires work-unit row

- **WHEN** Wave2 targeted evidence search creates new evidence outputs
- **THEN** Wave2 complete gate SHALL require submitted work-unit coverage for those outputs

### Requirement: Gate CLI evaluates wave0 rules from definition

The Wave0 gate CLI SHALL evaluate work-unit provenance rule types from the gate definition and SHALL use work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/hash mismatches.

#### Scenario: Wave0 CLI rejects stale index

- **WHEN** Wave0 gate finds a ledger row whose work-unit index entry is not `submitted`
- **THEN** the CLI SHALL fail the work-unit provenance check

### Requirement: Gate CLI evaluates wave1 rules from definition

The Wave1 gate CLI SHALL evaluate work-unit provenance rule types and Wave1 depth-contract rule types from the gate definition. It SHALL use work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/hash/cache mismatches and SHALL use deterministic readers for `depth-review.yaml`, Wave0 source URL sets, structured source claims, submitted cache trail mappings, canonical reference topic binding, and the reference-index table.

Formal gate and side-effect-free Wave1 inspect SHALL consume the same pure reference-format and reference-index evaluator results. The evaluator SHALL use the shared UID/current/previous-layout resolver through one reference-metadata adapter; neither wrapper SHALL maintain a hard-coded required legacy field list or a second topic parser. The formal wrapper MAY retain its existing gate-attempt/trace ownership, while inspect remains read-only.

The Wave1 CLI SHALL not scan non-work-unit delegated directories as a production coverage source, and SHALL not reintroduce retired content heuristics as blocking checks or diagnostic advice. If a submitted index/status binding exists but the corresponding bundle declaration row is missing, the shared evaluator SHALL return `submitted_declaration_missing` as the parent root and SHALL mask dependent output/cache/count/bypass symptoms until declaration recovery or a new legal attempt is completed.

All Wave0/Wave1/Wave2 shared evaluator roots SHALL expose the static contract lineage needed for one repair: `repair_kind`, `missing_fact`, and `write_to`; inspect and formal Gate wrappers SHALL add the exact invoked checkpoint as `rerun`. These are read-only feedback coordinates, not a new authority or generic repair controller. `repair_kind` SHALL identify the legal next-action class, `missing_fact` SHALL identify the earliest direct failed fact and its owning contract, and `write_to` SHALL name the exact next-action coordinate interpreted by that kind. Existing `inspect`/`advice` strings MAY remain for compatibility but SHALL NOT be the only repair information.

Wave1 semantic Markdown checks SHALL protect section/content availability while tolerating equivalent presentation. `question_list_has_four_sections` SHALL require the four named semantic sections without fixed order, case, heading level, spacing, or list style. `source_url_present` SHALL accept a parseable bare HTTP(S) URL or Markdown link. `key_findings_non_empty` SHALL accept common bullet, numbered, or non-empty paragraph content under the semantic Key Findings section. These tolerant evaluators, not the historical regex presentation, SHALL own the blocking result.

#### Scenario: Wave1 CLI ignores non-work-unit coverage

- **WHEN** non-work-unit delegated directories contain Wave1-looking result files
- **AND** no submitted work-unit ledger rows cover the outputs
- **THEN** Wave1 gate CLI SHALL fail delegated provenance

#### Scenario: Wave1 CLI evaluates depth review from definition

- **WHEN** the Wave1 gate definition contains a depth-review rule
- **THEN** the CLI SHALL parse the rule target from the active bundle
- **AND** the rule SHALL contribute to the overall pass/fail determination

#### Scenario: Inspect and gate share reference evaluation

- **WHEN** Wave1 inspect and the formal Wave1 gate evaluate the same bundle bytes
- **THEN** both SHALL report the same reference topic-binding, parent-index, row-coverage and source-layer result
- **AND** only the formal gate wrapper MAY perform its accepted durable gate side effects

#### Scenario: Normal legacy reference remains valid

- **WHEN** a normal first-run bundle uses the existing valid `related_topic` metadata form and an accepted index table
- **THEN** the shared Wave1 evaluator SHALL continue to accept that reference binding
- **AND** no rerun-only producer or gate branch SHALL be required

#### Scenario: Missing declaration masks downstream Wave1 symptoms

- **WHEN** a Wave1 work unit is submitted in index/status but its bundle ledger row is absent
- **THEN** inspect and gate SHALL report one `submitted_declaration_missing` parent root for that work ID
- **AND** they SHALL mask dependent missing-output, cache-mapping, count-floor, and delegated-bypass symptoms

#### Scenario: Affected root carries contract-lineage repair coordinates

- **WHEN** an in-scope Wave1 rule rejects a deterministic fact
- **THEN** its primary structured diagnostic SHALL include non-empty `repair_kind`, `missing_fact`, `write_to`, and `rerun`
- **AND** the Agent SHALL not need to inspect Engine source to locate the authorized repair surface or checkpoint

#### Scenario: Question-list order is not blocking authority

- **WHEN** all four required question-list semantic sections are present and non-empty in an equivalent order or harmless heading presentation
- **THEN** the shared evaluator SHALL accept the structure
- **AND** the historical ordered-regex presentation SHALL NOT fail Wave1

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

### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard

Each blocking deterministic Wave gate/output contract SHALL use a closed and minimal executable chain:

- one direct runtime authority surface identified by the rule descriptor or detecting helper;
- one checker path that consumes that authority and returns a structured finding with root-specific blocking basis and repair;
- one shared projection that exposes the smallest actionable root cause and repair coordinates; and
- focused checker-class or changed-contract coverage that catches future drift.

Agent producer guidance SHALL describe changed Agent-owned output contracts at the owning phase/controller surface. It SHALL NOT be copied into a permanent rule-id audit mapping. Engine-operation, user-decision, external-action, and missing-contract roots SHALL use their real operation or boundary without a per-rule non-Agent-produced exemption row.

A Wave rule with one stable declarative root contract MAY use definition-owned blocking-basis/repair metadata. A specialized rule that can fail for multiple direct reasons, including provenance, reference/index, depth, cache, or finding-contract checks, SHALL use checker-owned findings and SHALL return the blocking basis and repair-kind/write coordinate on each concrete root. The definition SHALL NOT flatten those distinct roots into one static basis/repair. If a checker-owned blocking result lacks either part of the root contract, the standard projection SHALL fail as configuration integrity rather than inferring it from rule metadata or prose.

For in-scope Wave artifact/provenance rules, formal gate and inspect SHALL reuse the same pure evaluator result and rule id. Their primary root object SHALL also share the same `repair_kind`, `missing_fact`, and `write_to`; each command SHALL project its own exact checkpoint in `rerun`. Formal lifecycle checks such as node binding, handoff preflight, routing, degraded eligibility, gate-attempt durability, checkpoint, and `trace_event_*` SHALL remain formal-only and SHALL NOT be duplicated in inspect.

Blocking rules SHALL protect required structure, deterministic authority, provenance, consumer navigation, or explicit accepted floors. Presentation/maintenance preferences SHALL use tolerant parsing or advisory feedback unless they are necessary to locate or parse a direct authority surface.

If a prerequisite authority surface is absent or unparseable, the checker SHALL report that prerequisite as the primary root cause and SHALL short-circuit dependent checks whose results would only be downstream symptoms. For reference inventory, an invalid or missing eight-column `_INDEX.md` table SHALL mask per-reference row and source-layer symptoms until the table parses. The implementation SHALL use local guards rather than a generalized dependency engine.

#### Scenario: blocking rule has a closed contract chain

- **WHEN** an active gate rule contributes to pass/fail
- **THEN** its parsed descriptor, declared finding source, and actual checker finding SHALL identify the direct authority, root-specific blocking basis/authorized repair, and diagnostic projection without a second inventory row
- **AND** in-scope Wave artifact/provenance rules SHALL use the shared evaluator route consumed by formal and inspect
- **AND** active-definition execution, unknown-check fail-closed coverage, or focused changed-rule regression SHALL fail when the executable path is missing

#### Scenario: Specialized Wave rule does not flatten distinct roots

- **WHEN** one work-unit/depth/reference rule can fail on an Agent-owned file, an Engine-owned binding, or a missing legal capability
- **THEN** the checker SHALL return a distinct structured finding with blocking basis and repair coordinate for the observed root
- **AND** no definition-level fallback basis/repair SHALL override or obscure that root

#### Scenario: presentation preference is not promoted to authority

- **WHEN** direct structured authority proves a required fact and Markdown differs only in harmless presentation
- **THEN** the command SHALL accept tolerant equivalent parsing or emit advisory feedback
- **AND** it SHALL NOT create an independent blocking rule for the preference

#### Scenario: authority conflict is resolved by truth type

- **WHEN** producer docs, submitted ledger rows, return-map refs, helper checks, or inspect wording disagree about the same deterministic fact
- **THEN** implementation SHALL resolve the conflict using the judgment-layer Source of Record for that truth type
- **AND** the lower-authority surface SHALL be updated or diagnosed rather than silently broadening gate acceptance

#### Scenario: missing prerequisite masks dependent rules

- **WHEN** a parent YAML object, required array, or required field cannot be read
- **THEN** the checker SHALL report the parent/field as the blocking root
- **AND** dependent rules SHALL be recorded as masked or omitted rather than failed independently

#### Scenario: Root feedback names one authorized repair loop

- **WHEN** a blocking rule has one actionable direct root
- **THEN** primary feedback SHALL name its `repair_kind`, the fact in `missing_fact`, its exact mutable or Engine-owned repair surface in `write_to`, and the same checkpoint in `rerun`
- **AND** it SHALL NOT provide competing repair branches or require the Agent to infer contract lineage from opaque prose

#### Scenario: Wave root projection feeds the standard Gate hint

- **WHEN** a shared Wave blocking root reaches a formal Gate wrapper
- **THEN** the standard top-level `hints[]` entry SHALL be projected from that root rather than reconstructed from inspect/advice prose
- **AND** the matching inspect command SHALL expose the same direct fact and authorized repair surface without formal routing side effects

#### Scenario: delegated bypass scan has one side-effect owner

- **WHEN** inspect and formal gate evaluate delegated-bypass provenance for the same bundle
- **THEN** both SHALL consume the same pure scan result
- **AND** only the formal wrapper MAY emit durable bypass trace/log evidence
- **AND** one formal invocation SHALL emit that diagnostic at most once

#### Scenario: Invalid index table masks row cascade

- **WHEN** the reference index parent cannot be parsed as the accepted table
- **THEN** the shared evaluator SHALL return one `reference_index_table_invalid` or equivalent root and the index path as the nearest repair target
- **AND** it SHALL NOT return one primary `missing_index_row` failure for every reference file in the same evaluation

### Requirement: Wave gate definitions, helpers, and phase docs SHALL align as one judgment layer

Active wave gate pass/fail semantics SHALL be aligned across gate definition JSON rule ids, helper/check implementations, phase instructions, inspect output, diagnostics/advice, and accepted specs. A gate rule that contributes to pass/fail SHALL have a known helper or CLI dispatch, a documented artifact shape, Agent-facing instructions that tell the Phase Agent how to produce the checked shape, and blocking diagnostics that identify the deterministic repair surface.

This alignment SHALL be maintained through a gate/output-rule audit artifact during apply and a static regression guard. The audit SHALL cover active gate definitions, including non-wave lifecycle gates, and adjacent output/navigation contract surfaces that feed wave gates. Implementation SHALL NOT stop after fixing the named BUG-068/BUG-070 symptoms if the audit discovers same-family deterministic drift affecting pass/fail, submitted coverage, reference navigation truth, or diagnostic classification.

#### Scenario: active gate rule has implementation and artifact contract

- **WHEN** an active gate definition contains a rule id
- **THEN** static audit SHALL identify its `check` implementation path or shared helper
- **AND** the change design or apply evidence SHALL document the artifact shape and Agent-facing producer instruction for that rule

#### Scenario: unknown active check name fails hygiene

- **WHEN** an active gate definition uses a `check` value with no known implementation
- **THEN** static gate audit SHALL fail
- **AND** diagnostics SHALL name the gate, rule id, and unsupported check value

#### Scenario: newly discovered same-family drift is fixed in the same change

- **WHEN** apply-time audit finds that a phase doc, helper, gate selector, submitted ledger expectation, or inspect output describes a different deterministic shape for the same active gate contract
- **AND** the mismatch affects pass/fail, submitted coverage, reference/navigation truth, or blocking/advisory/diagnostic classification
- **THEN** the mismatch SHALL be fixed in this change
- **AND** a focused regression or static test SHALL guard the repaired contract

#### Scenario: hidden stop:no contract is treated as same-family drift

- **WHEN** a stop:no phase can fail a deterministic gate or inspect check
- **AND** the Agent-facing phase docs plus CLI diagnostic do not reveal the required path, role, ref spelling, field, or repair surface
- **THEN** the hidden contract SHALL be treated as in-scope judgment/output drift
- **AND** the repaired docs or diagnostics SHALL make the deterministic contract self-sufficient

### Requirement: Wave1 depth-review refs SHALL canonicalize safe submitted work-unit refs

Wave1 `depth_review_contract` SHALL compare `reviewed_work_unit_refs[]` against submitted work-unit authority surfaces after canonicalizing safe harmless spelling drift. The Agent-facing canonical ref SHALL omit a trailing slash: `_work_units/wave1/<work_id>`. A validator SHALL accept the same safe ref with a single trailing slash after canonicalization.

Unsafe refs and refs that cannot bind to submitted work-unit rows SHALL continue to fail. Accepted submitted refs MAY include the submitted row's `work_id`, `work_unit_ref`, or `result_ref` when those values are legal bundle-relative refs.

#### Scenario: trailing slash work-unit ref passes after canonicalization

- **WHEN** `depth-review.yaml` contains `reviewed_work_unit_refs: ["_work_units/wave1/wu-w1-b000-deep-i0001/"]`
- **AND** the submitted ledger row contains `_work_units/wave1/wu-w1-b000-deep-i0001`
- **THEN** `depth_review_contract` SHALL treat the ref as submitted after canonicalization

#### Scenario: unsafe depth ref still fails

- **WHEN** `reviewed_work_unit_refs[]` contains an absolute path or a path with `..`
- **THEN** `depth_review_contract` SHALL fail
- **AND** diagnostics SHALL identify the unsafe ref

#### Scenario: unsubmitted depth ref fails

- **WHEN** `reviewed_work_unit_refs[]` names a safe work-unit-looking ref absent from submitted ledger authority surfaces
- **THEN** `depth_review_contract` SHALL fail
- **AND** diagnostics SHALL identify that the ref is not submitted

### Requirement: Return-map reference navigation SHALL block concrete-ref drift when navigation readiness is checked

Wave gate and inspect implementations that validate seed-topic return maps SHALL distinguish consumer navigation failures from advisory map-shape diagnostics. For evidence-bearing seed-topic return-map entries, concrete existing `reference/*.md` refs SHALL be required when `inspect-wave0-output`, `inspect-wave1-output`, `inspect-wave2-output`, or an active gate/check is checking consumer navigation readiness.

Internal surfaces such as `artifacts/`, `_cache/`, and `_work_units/` MAY be reported as secondary provenance, but they SHALL NOT satisfy the concrete reference navigation requirement by themselves.

#### Scenario: seed-topic entry with only internal refs fails navigation

- **WHEN** an evidence-bearing seed-topic return-map entry includes only `artifacts/`, `_cache/`, or `_work_units/` refs
- **THEN** the command/gate return-map navigation check SHALL fail
- **AND** diagnostics SHALL request a concrete existing `reference/*.md` ref or explicit limitation state

#### Scenario: concrete existing reference ref passes navigation

- **WHEN** an evidence-bearing seed-topic return-map entry includes `reference/01_topic-source.md`
- **AND** that file exists under the active bundle root
- **THEN** the concrete reference navigation check SHALL pass for that entry

### Requirement: Wave2 cross-reference backing SHALL preserve targeted-evidence and existing-backed projection authorities

Wave2 `reference/00-cross-*.md` gate and inspect checks SHALL preserve the existing authority split between newly fetched evidence and existing-backed Phase-owned projections. A new fetched Wave2 cross reference SHALL require submitted `wave2_targeted_evidence` authority. An existing-backed pure-synthesis `00-cross` projection MAY pass without a new Wave2 submitted row only when it is backed by prior accepted evidence and the deterministic Wave2 process refs that make the projection auditable.

`source_layer: wave2_cross`, reference index coverage, or filesystem presence SHALL NOT by itself establish evidence authority for a `00-cross` reference.

#### Scenario: submitted targeted evidence backs a new Wave2 cross reference

- **WHEN** `reference/00-cross-new-gap.md` uses a source URL introduced by Wave2 targeted search
- **AND** a submitted `wave2_targeted_evidence` work-unit row declares the reference output or otherwise binds the accepted source URL and receipt authority
- **THEN** Wave2 provenance checks MAY classify the reference as delegated fetched evidence
- **AND** the reference SHALL NOT be rejected merely because it is also indexed with `source_layer: wave2_cross`

#### Scenario: existing-backed projection passes without a new Wave2 row

- **WHEN** `reference/00-cross-existing-backed.md` uses a prior accepted source URL
- **AND** its body includes `W2F-xxx` plus refs to `finding-index.yaml` and `cross-topic-ledger.md`
- **AND** the referenced prior backing resolves to concrete prior submitted evidence or accepted backing surfaces
- **THEN** Wave2 provenance checks MAY classify the reference as a Phase-owned projection
- **AND** `wave2_work_unit_submission_presence` SHALL NOT require a new Wave2 work-unit row for that projection

#### Scenario: source layer alone does not establish authority

- **WHEN** a `reference/00-cross-*.md` file has `source_layer: wave2_cross` or a matching `reference/_INDEX.md` row
- **AND** it has neither submitted `wave2_targeted_evidence` backing nor existing prior submitted backing with W2F/finding-index/cross-topic-ledger refs
- **THEN** Wave2 provenance checks SHALL fail
- **AND** diagnostics SHALL explain whether the repair is submitted targeted evidence or existing-backed projection backing

### Requirement: Blocking diagnostics SHALL not be labeled diagnostic-only

Wave gate and inspect outputs SHALL accurately classify findings that affect pass/fail. A finding counted into `check.passed: false` SHALL NOT be labeled `diagnosticOnly: true` or described as unable to affect the current command result.

#### Scenario: blocking return-map issue is labeled blocking

- **WHEN** return-map concrete reference validation fails and the command returns `check.passed: false`
- **THEN** output SHALL label the issue as blocking or equivalent
- **AND** it SHALL NOT call that specific failure diagnostic-only

### Requirement: Blocking diagnostics SHALL be self-sufficient for deterministic repair

For in-scope deterministic gate/output failures, gate and inspect diagnostics SHALL provide enough contract information for a Phase Agent in a stop:no run to repair the failed runtime surface without reading Engine helper source. This requirement applies to deterministic shape failures such as required roles, bundle-relative refs, concrete reference navigation, missing artifact/field contracts, explicit floors, submitted provenance, and blocking/advisory/diagnostic classification.

Primary blocking diagnostics SHALL identify the failing rule or finding id, the bundle-relative artifact or ledger/ref/field surface, the expected deterministic shape or canonical value, and one nearest repair target. When a prerequisite failure explains dependent symptoms, primary diagnostics SHALL report the prerequisite root cause and SHALL omit, mask, or group downstream symptoms outside the primary repair list.

Full post-mortem detail MAY remain in existing formal durable diagnostic artifacts. Side-effect-free inspect SHALL not create a new durable surface for this purpose. Diagnostics SHALL NOT require the Engine to choose research strategy, synthesize content, or make semantic evidence judgments.

#### Scenario: role coverage diagnostic names canonical role repair

- **WHEN** Wave1 required output coverage fails because a required path is absent from canonical submitted coverage
- **THEN** diagnostics SHALL name the missing path and expected canonical role
- **AND** diagnostics SHALL direct repair toward submit normalization or a replacement/supplementary submitted work-unit declaration

#### Scenario: missing parent structure suppresses derivative failures

- **WHEN** a required depth-review or finding object is missing or unparseable
- **THEN** diagnostics SHALL identify that parent structure as the primary repair target
- **AND** dependent novelty, cache, eligibility, handoff, enum, or backing checks SHALL not appear as separate primary failures

#### Scenario: reference navigation diagnostic names concrete repair

- **WHEN** a return-map navigation check fails because only internal refs or glob/count summaries are present
- **THEN** diagnostics SHALL name the offending seed-topic entry or ref
- **AND** diagnostics SHALL ask for enumerated existing `reference/*.md` refs or an explicit limitation state

#### Scenario: missing finding field names one nearest repair

- **WHEN** a Wave2 finding lacks required field `hitl2_handoff`
- **THEN** diagnostics SHALL name `artifacts/wave2/finding-index.yaml`, the finding id, the missing field, and expected canonical value/type
- **AND** the nearest repair SHALL be to add or correct that field and rerun the same inspect/gate

### Requirement: Wave gates SHALL aggregate accepted topic layouts by UID

For each canonical topic UID, Wave0 and Wave1 gate evaluators SHALL use the shared resolver's bounded current-plus-previous slug set when locating submitted artifact/reference coverage. Reference metadata SHALL use a thin adapter over the same resolver: exact `related_topic_uid`, or legacy `related_topic` current/previous ids or slugs, SHALL resolve to canonical UID sets without introducing another identity map. If both metadata forms are present, they SHALL agree or fail closed as one binding conflict.

Historical files SHALL remain at recorded paths and SHALL count only when existing submitted provenance authority binds them to the same UID. Historical reference files SHALL NOT require mass rewriting merely to replace a valid legacy binding with a UID. Current seed checks and new work eligibility SHALL continue to use only the current slug. A rerun-added topic without historical coverage SHALL enter the normal Wave0/Wave1 production and reference-materialization path.

Accepted slugs SHALL be alternatives for one UID, not separate mandatory targets. Per-topic floors SHALL evaluate aggregate submitted coverage across the UID's accepted slugs and SHALL NOT require one file per historical alias. The same physical file or submitted row SHALL count at most once for one UID. A previous slug SHALL NOT create a new topic, satisfy another UID or grant authority without existing submitted coverage.

#### Scenario: Renamed topic retains historical wave coverage
- **WHEN** a topic's submitted Wave1 outputs remain under a unique previous slug after canonical rename
- **THEN** the Wave1 gate SHALL attribute those outputs to the same UID without requiring file moves or ledger rewrites

#### Scenario: New rerun output uses current slug
- **WHEN** new work is enqueued after layout mutation
- **THEN** its required output paths SHALL use the current slug while historical coverage remains readable under previous slugs

#### Scenario: Duplicate match counts once
- **WHEN** one submitted output is discoverable through more than one accepted-layout check
- **THEN** gate counting SHALL deduplicate it by existing provenance identity

#### Scenario: Previous aliases are not extra floors
- **WHEN** one UID has several previous slugs but valid submitted coverage under only one accepted slug
- **THEN** a one-per-topic rule SHALL evaluate the UID aggregate rather than require coverage for every alias

#### Scenario: Historical reference binding does not require migration

- **WHEN** an existing covered reference resolves uniquely through legacy metadata or an exact UID
- **THEN** Wave1 SHALL retain that historical binding without requiring a metadata-only work unit or mass rewrite
- **AND** submitted backing and index navigation requirements SHALL remain unchanged

#### Scenario: Rerun-added topic uses normal Wave1 materialization

- **WHEN** a sanctioned rerun adds a topic with no historical Wave1 coverage
- **THEN** the topic SHALL use current layout coordinates and the normal Wave1 delegated/materialization contract
- **AND** rerun classification SHALL NOT create a second reference, gate or provenance path
