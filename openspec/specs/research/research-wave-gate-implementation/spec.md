# Research Wave Gate Implementation

> req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-008, RWG-009, RWG-010, RWG-011, RWG-012, RWG-013, RWG-014, RWG-016, RWG-017, RWG-018, RWG-019, RWG-020, RWG-021, RWG-022

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

The Wave1 complete gate definition SHALL include work-unit provenance checks
for delegated Topic deepening outputs and SHALL validate per-Topic output
coverage through submitted work-unit ledger rows. It SHALL reject
non-work-unit-only evidence. It SHALL include deterministic depth-contract
checks for `artifacts/wave1/{topic}/depth-review.yaml`; submitted work-unit rows
remain direct authority for source claims, accepted URLs, cache/degraded refs,
and actor provenance. The checker SHALL derive exact source-URL novelty, cache
mapping, observed new-source count, and profile-derived floor from
`reviewed_work_unit_refs[]`, current Wave0 source authority, and profile facts.
The review owns only non-derivable Phase judgments and supplementary decision
closure; copied source/cache/floor fields SHALL not become a second blocking
authority.

Wave1 reference-format checks SHALL evaluate the existing common metadata keys,
one canonical Topic binding resolved from `related_topic_uid` or legacy
`related_topic`, and the five required semantic sections. An exact registered
UID without the legacy field remains valid; the normal legacy binding form
remains readable; dual forms must resolve identically or fail once as a binding
conflict. Numeric eligibility SHALL continue to use the narrow shared predicate
of accepted status plus at least one parseable `source_url` on already
authority-selected references. Fixed Core Content Capture character count,
fixed Key Facts bullet count, section order/case/heading level, homepage/path
depth, Jaccard similarity, duplicate-looking URL, self-reference, and other
prose-quality heuristics SHALL not affect numeric count. The retired
`key_facts_min_lines` rule SHALL not return as a blocking gate rule.

The same reviewed-and-manifest-bound submitted-backing reader SHALL select
materialization candidates for each current Topic. A candidate is projection
closed only when its exact locator path is canonical-current and passes the
required reference-format, parseable-URL, and narrow numeric-eligibility checks
and its normalized metadata URL plus scannable body backing refs bind to that
same candidate's submitted source/cache/work-unit coordinates. A missing,
legacy, misnamed, generically-but-not-candidate-backed, unbacked, or
format-invalid canonical projection is its direct projection root; it SHALL not
fall through to an index or count-floor result. Only an empty candidate set or
a set of closed candidates is materialization-exhausted.

For each current canonical Topic, the gate SHALL obtain current reference-floor
coverage only from `canonical_current` paths selected by the shared Wave1
locator and convergence evaluator. The old target expression
`reference/*{topic}*.md` SHALL not be a second success predicate. A recognized
legacy `NN-wave1-*` row/file remains readable/indexable but SHALL not count;
nor shall an arbitrary filename containing a full slug. A current canonical
path counts only after the existing submitted-backing, reference-format,
parseable-URL, and numeric eligibility checks pass.

The accepted eight-column `reference/_INDEX.md` table remains required for
consumer navigation. Its parent validation precedes per-reference row coverage.
The gate SHALL direct a stale/invalid index through the narrow index
synchronization operation, not through hand-maintained rows or new evidence
work. Only after all legal current submitted-backing projection and index
repairs are exhausted may a positive shortfall become one existing
supplementary `wave1_topic_deepening` demand or a new ordinary supplementary
demand carrying the exact snapshot-bound `reference_floor_deficit`. The
deficit is an acquisition objective, not a gate-passing assertion; the next
evaluation derives closure again from current direct facts.

These checks remain deterministic process/structure checks. They SHALL not
score source insightfulness or another Agent-owned semantic quality. Existing
new-source/depth floors remain separately derived from their accepted direct
authorities and are not replaced by reference-floor convergence.

#### Scenario: full current slug counts and legacy layout does not

- **WHEN** a current Topic has one canonical backed reference and one
  `NN-wave1-*` legacy reference for the same Topic
- **THEN** only the canonical path SHALL contribute to that current Topic's
  reference-floor count
- **AND** the legacy file may remain in the index as navigation history

#### Scenario: true floor deficit becomes bounded supplementary work

- **WHEN** the profile floor is `8`, current canonical backed count is `5`, no
  submitted backing can materialize another canonical reference, the index is
  synchronized, and no same-Topic supplementary demand is live
- **THEN** the Wave1 result SHALL retain `per_topic_ref_md_count_floor` with
  observed `5`, required `8`, and deficit `3`
- **AND** the nearest legal action SHALL be one ordinary supplementary
  `wave1_topic_deepening` demand whose snapshot carries
  `reference_floor_deficit: 3`

#### Scenario: candidate closure cannot borrow generic submitted backing

- **WHEN** a canonical-locator path for one manifest-bound submitted candidate
  has metadata URL or body backing refs that bind only to another submitted row
- **THEN** convergence SHALL return that candidate's direct projection root
  rather than treat the path as closed or countable
- **AND** it SHALL not fall through to index synchronization or a floor deficit

#### Scenario: existing supplementary demand prevents duplication

- **WHEN** a true current reference-floor deficit exists and a canonical
  same-Topic supplementary Wave1 demand is already queued or in flight
- **THEN** convergence SHALL return that existing demand as the next action
- **AND** it SHALL not create a duplicate queue demand or second controller

#### Scenario: Numeric count does not repeat content-format checks

- **WHEN** an authority-backed canonical accepted reference has a parseable
  source URL but short prose or fewer than five Key Facts bullets
- **THEN** the numeric count-floor evaluator SHALL still count it
- **AND** only a genuinely missing required semantic section MAY fail the
  separate shared reference-format rule

#### Scenario: Depth facts come from reviewed submitted rows

- **WHEN** a depth review identifies submitted work-unit refs and omits copied
  source/cache/new-source fields
- **THEN** Wave1 gate SHALL derive source claims, cache mapping, novelty,
  observed count, and required floor from direct authority
- **AND** omission of the retired duplicate fields SHALL not fail the review

#### Scenario: Wave1 deepening coverage is ledger-first

- **WHEN** a topic deepening file exists without a matching submitted Wave1
  work-unit ledger row
- **THEN** Wave1 complete gate SHALL fail delegated provenance

#### Scenario: Wave1 depth review is required

- **WHEN** a Topic has `evidence-summary.md` and `question-list.md`
- **AND** `artifacts/wave1/{topic}/depth-review.yaml` is missing or unparsable
- **THEN** Wave1 complete gate SHALL fail with diagnostics naming the missing
  depth-review projection

#### Scenario: Wave1 exact source novelty floor blocks shallow output

- **WHEN** reviewed submitted Wave1 rows contain exact-new accepted source URLs
  below the profile-derived floor
- **THEN** Wave1 complete gate SHALL fail
- **AND** diagnostics SHALL name the Topic, required floor, observed new-source
  count, and supplementary work-unit repair path

#### Scenario: Wave1 missing floor parameter blocks hidden defaults

- **WHEN** active profile/runtime data lacks a required parameter for deriving
  the Wave1 new-source floor
- **THEN** Wave1 complete gate SHALL fail with a `missing_profile_parameter`
  diagnostic
- **AND** the gate SHALL NOT substitute an unstated default threshold

#### Scenario: UID-only reference satisfies Wave1 topic binding

- **WHEN** a historical or rerun-time reference has all common required
  metadata and exact `related_topic_uid` but omits legacy `related_topic`
- **THEN** Wave1 reference-format evaluation SHALL bind it to the registered
  canonical Topic
- **AND** it SHALL NOT fail solely because the legacy key is absent

#### Scenario: Invalid reference index is one parent failure

- **WHEN** `reference/_INDEX.md` is missing or contains a prose summary/list
  instead of the accepted eight-column table
- **THEN** Wave1 SHALL fail with one parent index-table root
- **AND** per-reference missing-row failures SHALL remain masked until the
  parent table is valid

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

For an unmet definition-owned `shared_ref_count_floor`, the structured repair coordinates and compatible feedback text SHALL identify the existing `wave0_source_intake` delegated output/submit path for a real `reference/00-shared-<slug>.md` with `source_url`. They SHALL NOT direct the Phase Agent to create an unsubmitted file directly under `reference/`. The CLI remains a read-only verdict producer; the submitted output ledger remains the count authority.

#### Scenario: Wave0 CLI rejects stale index

- **WHEN** Wave0 gate finds a ledger row whose work-unit index entry is not `submitted`
- **THEN** the CLI SHALL fail the work-unit provenance check

#### Scenario: Shared-reference floor feedback names legal producer

- **WHEN** Wave0 has fewer submitted `reference/00-shared-*.md` outputs than the profile-derived floor
- **THEN** the gate CLI SHALL return the definition-owned failure with non-empty repair coordinates naming the existing delegated `wave0_source_intake` submit path
- **AND** its feedback SHALL NOT name direct Phase creation under `reference/` as the repair

### Requirement: Gate CLI evaluates wave1 rules from definition

The Wave1 gate CLI SHALL evaluate work-unit provenance rule types, Wave1
depth-contract rule types, and definition-owned direct output-contract
descriptors from the active gate definition. It SHALL use work-unit helper
diagnostics for ledger/index/manifest/result/receipt/beacon/hash/cache
mismatches and deterministic readers for `depth-review.yaml`, Wave0 source URL
sets, structured source claims, submitted cache-trail mappings, canonical
reference Topic binding, and the reference-index table.

`question_list_has_four_sections` SHALL use a typed
`semantic_sections` descriptor whose parsed `required_sections` names Topic
Investigation Targets, Question Reconciliation, Emergent Question Protocol,
and Exploration / Exploitation Decision. Its evaluator SHALL dispatch on that
descriptor type, normalize only equivalent heading presentation, and require
each named section to be present and non-empty. It SHALL not dispatch by the
rule ID, use an ordered regex, require `pattern`/`negate`, or make case,
heading level, spacing, list style, or section order a blocking fact. Other
active `pattern_match` rules retain their existing independently declared
semantics.

Formal gate and side-effect-free Wave1 inspect SHALL consume the same pure
Wave1 reference-convergence result for current Topic identity, submitted
backing, canonical consumer projections, index state, supplementary demand,
and reference-floor judgment. The evaluator SHALL reuse the existing
reference-format, backing, numeric-eligibility, Topic-layout, profile, index,
and queue readers rather than copy their parsers or authority logic. The formal
wrapper MAY retain its accepted gate-attempt/trace ownership only after
evaluation; inspect remains read-only. Neither wrapper SHALL retain an
independent broad `reference/*{topic}*.md` count, filename interpretation, or
index/floor repair decision.

Wave1 inspect composition SHALL keep the direct evaluator families separate:
the shared Wave1 evaluator owns submitted output/artifact/reference/backing
checks; the Seed Topic projection evaluator owns return-map entry shape,
identity, and concrete-navigation checks. A generic return-map reader SHALL
not scan `evidence-summary.md`, `question-list.md`, or rich reference files.
The returned return-map classification SHALL derive from the Seed Topic
projection evaluator alone, while independently invalid Wave1 artifacts retain
their declared artifact rule IDs and direct repair coordinates.

The convergence result SHALL return the earliest usable direct parent root or
one per-Topic nearest action in this order:

1. unusable canonical Topic/profile/submitted declaration/backing authority;
2. canonical projection materialization for authenticated submitted backing,
   including a legacy or misnamed current projection that has equivalent
   backing;
3. `reference/_INDEX.md` synchronization when canonical projections exist but
   index parent/row coverage is stale;
4. an existing same-Topic supplementary demand when one already owns the
   remaining work;
5. a true positive supplementary reference-floor deficit; or
6. satisfied.

For this purpose, submitted Wave1 backing SHALL come from one shared pure
reader, not a broad declaration/file scan. For the current Topic it SHALL
resolve `depth-review.yaml#/reviewed_work_unit_refs` to hash-valid submitted
`wave1_topic_deepening` rows and verify each row's work-unit manifest embeds a
hash-bound queue item whose `topic_uid` and current `topic_slug` resolve to the
same canonical Topic. It SHALL reuse existing accepted source-claim, accepted
URL, cache/degraded mapping, and URL-normalization rules to return a stable
deduplicated set of backing candidates. Missing/invalid reviewed refs, ledger,
manifest, snapshot, Topic binding, claim/cache/degraded mapping, or URL fact is
a parent root. A filename, index row, reference body, unbound submitted row, or
raw filesystem scan SHALL not be treated as materializable backing or as proof
that backing is exhausted.

When no submitted work-unit row can supply a reviewed ref, the depth contract
SHALL return one submitted-evidence/binding root before source-claim mapping,
source novelty, new-source comparison, `per_topic_ref_md_count_floor`, depth
derivative, or provenance symptoms. The same Topic's reference-floor branch
SHALL be masked rather than project a second submitted-backing root. It SHALL
not advise the Agent to invent `reviewed_work_unit_refs[]`, treat a bare
work-unit directory as submitted, or present an unassigned output as evidence.
Feedback may name only an existing legal submitted-work or replacement owner;
without one it SHALL state `missing_contract`/no-path and the same Wave1
checkpoint.

An invalid/missing index table SHALL produce exactly one
`reference_index_table_invalid` parent root and mask row symptoms. A
materializable projection, legacy/misnamed current projection, invalid index,
or unresolved submitted backing SHALL not be reported as a degradable floor
failure. A true floor deficit SHALL retain the existing
`per_topic_ref_md_count_floor` rule identity and accepted degradation policy.

All Wave0/Wave1/Wave2 shared evaluator roots SHALL expose the static contract
lineage needed for one repair: `repair_kind`, `missing_fact`, and `write_to`;
inspect and formal gate wrappers SHALL add their exact invoked checkpoint as
`rerun`. These are read-only feedback coordinates, not a new authority or
generic repair controller. `repair_kind` SHALL identify the legal next-action
class, `missing_fact` SHALL identify the earliest direct failed fact and its
owning contract, and `write_to` SHALL name the exact next-action coordinate
interpreted by that kind. Existing inspect/advice strings MAY remain for
compatibility but SHALL NOT be the sole repair information.

Wave1 semantic Markdown checks SHALL protect section/content availability while
tolerating equivalent presentation. `question_list_has_four_sections` SHALL
use its definition-owned semantic-section descriptor. `source_url_present`
SHALL accept a parseable bare HTTP(S) URL or Markdown link.
`key_findings_non_empty` SHALL accept common bullet, numbered, or non-empty
paragraph content under the semantic Key Findings section. These tolerant
evaluators, not historical regex presentation, SHALL own the blocking result.

#### Scenario: Inspect and gate share reference evaluation

- **WHEN** Wave1 inspect and the formal Wave1 gate evaluate identical bundle
  bytes for a current Topic
- **THEN** both SHALL report the same parent/materialization/index/existing-work
  /true-deficit/satisfied convergence class and repair coordinates
- **AND** only the formal gate wrapper MAY perform accepted durable gate side
  effects

#### Scenario: Wave1 return-map inspection has one declared input family

- **WHEN** valid `evidence-summary.md`, `question-list.md`, and rich reference
  documents lack return-map fields while a Seed Topic slot is malformed
- **THEN** Wave1 inspect SHALL emit return-map feedback only for the Seed Topic
  coordinate
- **AND** it SHALL preserve any independently applicable artifact or backing
  finding with its existing rule ID

#### Scenario: canonical materialization masks floor deficit

- **WHEN** submitted, cache-backed Wave1 source facts can materialize a current
  canonical reference but that reference is absent or only a legacy/misnamed
  path exists
- **THEN** inspect and gate SHALL report the canonical materialization root
- **AND** they SHALL not report a supplementary floor deficit until that legal
  projection repair is exhausted

#### Scenario: invalid index masks dependent row findings

- **WHEN** `_INDEX.md` is missing, empty, or has no accepted inventory table
- **THEN** inspect and gate SHALL report one `reference_index_table_invalid`
  root
- **AND** they SHALL not enumerate missing index rows or use the index state as
  a floor failure

#### Scenario: Wave1 CLI ignores non-work-unit coverage

- **WHEN** non-work-unit delegated directories contain Wave1-looking result
  files and no submitted work-unit ledger rows cover the outputs
- **THEN** Wave1 gate CLI SHALL fail delegated provenance
- **AND** convergence SHALL not treat those files as materializable backing

#### Scenario: Affected root carries contract-lineage repair coordinates

- **WHEN** an in-scope Wave1 rule rejects a deterministic fact
- **THEN** its primary structured diagnostic SHALL include non-empty
  `repair_kind`, `missing_fact`, `write_to`, and `rerun`
- **AND** the Agent SHALL not need to inspect Engine source to locate the
  authorized repair surface or checkpoint

#### Scenario: Wave1 CLI evaluates depth review from definition

- **WHEN** the Wave1 gate definition contains a depth-review rule
- **THEN** the CLI SHALL parse the rule target from the current run bundle
- **AND** the rule SHALL contribute to the overall pass/fail determination

#### Scenario: Normal legacy reference remains valid

- **WHEN** a normal first-run reference uses the existing valid
  `related_topic` metadata form and an accepted index table
- **THEN** the shared Wave1 evaluator SHALL continue to accept that reference
  binding through the canonical Topic resolver
- **AND** no rerun-only producer or gate branch SHALL be required, while a
  legacy file path remains non-counting until canonical projection repair

#### Scenario: Missing declaration masks downstream Wave1 symptoms

- **WHEN** a Wave1 work unit is submitted in index/status but its bundle ledger
  row is absent
- **THEN** inspect and gate SHALL report one `submitted_declaration_missing`
  parent root for that work ID
- **AND** they SHALL mask dependent missing-output, cache-mapping, count-floor,
  and delegated-bypass symptoms

#### Scenario: no submitted work can satisfy a depth review

- **WHEN** a Wave1 depth review has no reviewed ref that resolves to a
  submitted work-unit row for its current Topic
- **THEN** inspect and Gate SHALL return one submitted-evidence/binding root
- **AND** they SHALL mask source-claim mapping, source novelty, new-source
  comparison, `per_topic_ref_md_count_floor`, and dependent depth-review
  symptoms
- **AND** feedback SHALL not authorize fabrication of a reviewed ref or an
  unassigned output role, and SHALL return `missing_contract`/no-path when no
  existing submitted-work or replacement owner is established

#### Scenario: Question-list descriptor tolerates equivalent presentation

- **WHEN** all four required question-list semantic sections are present and
  non-empty in an equivalent order, case, heading level, spacing, or list style
- **THEN** the shared evaluator SHALL accept the structure through its parsed
  semantic-section descriptor
- **AND** the historical ordered regex SHALL not participate in the result

#### Scenario: Question-list semantic section is missing or empty

- **WHEN** one declared question-list semantic section is absent or has no
  meaningful content
- **THEN** the shared evaluator SHALL return one
  `question_list_has_four_sections` direct root naming that section
- **AND** Gate and inspect SHALL not add a second regex-derived failure for the
  same artifact

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

Wave gate definitions and CLIs SHALL distinguish Phase-owned reference
projections from delegated fetched evidence. Wave1 gates SHALL require current
canonical Topic reference files for accepted submitted sources suitable for
consumer navigation, or an explicit direct limitation/backing root when no
materializable submitted source exists. They SHALL validate reference format,
index entries, parseable source URLs, canonical path class, and submitted
backing. They SHALL not require a Phase-owned reference path itself to be a
delegated output when that projection is backed by submitted Wave1 source
claims, accepted source URL surfaces, verified cache trails, or explicit
degraded-capture records.

Wave1 materialization is legal only after formal submit. A gate SHALL not
create evidence authority from filesystem presence, an index row, a source
layer, a legacy/misnamed filename, or a Phase-authored prose declaration. It
SHALL report a direct submitted-backing root when no legal materialization path
exists, a materialization root when available backing lacks its canonical
projection, and a narrow index-sync root when canonical projections lack a
valid inventory. Only the remaining actual shortfall becomes the existing
supplementary evidence path.

The materialization root SHALL carry the stable ordered submitted-backing
candidate coordinates returned by the shared submitted-backing reader and the
exact canonical target derived for each candidate by the existing canonical
locator. It is one bounded Phase closeout action, not a queue selector or an
instruction to search; the Phase Agent may author only those consumer
projections from their authenticated submitted backing, then reruns the same
convergence checkpoint.
When that root exists, it SHALL be the only primary closeout hint for its
own ordered convergence branch: `sync_reference_index` and
`reference_floor_deficit` SHALL not be emitted until materialization and the
same convergence checkpoint rerun. A legacy/misnamed path, missing index row,
count-floor result, or unbacked-reference/ledger symptom produced by a
separate checker SHALL remain an independent primary finding unless that
checker itself sets `masked_by_rule_id`. The Wave1 adapter SHALL NOT create
such a dependency by Topic text, filename shape, source URL, rule order, or
filesystem proximity.

Wave2 gates SHALL retain their accepted pure-synthesis and targeted-evidence
authority split. Delegated bypass diagnostics SHALL remain precise: unbacked
fetched-source references block, while legitimate Phase-owned projections do
not fail solely because the Phase Agent wrote them. A legal filename, valid
reference format, or `_INDEX.md` row SHALL not pass a reference when the gate
cannot bind it to accepted backing.

#### Scenario: Wave1 gate accepts backed Phase-owned topic reference

- **WHEN** a canonical-current Wave1 reference passes format/index checks and
  its source URL binds to submitted Wave1 source claims, accepted source URLs,
  verified cache trails, or explicit degraded-capture records
- **THEN** the Wave1 gate SHALL treat it as backed without requiring that
  reference path in delegated `output_files[]`
- **AND** delegated evidence coverage SHALL still require submitted
  evidence-summary/question-list/source/cache backing

#### Scenario: materialization root short-circuits its own downstream outcomes

- **WHEN** exact reviewed submitted backing can materialize a current Topic's
  missing canonical projection
- **THEN** inspect and formal Gate SHALL project one candidate-exact
  materialization hint with exact canonical target/backing coordinates and the
  existing same-check rerun
- **AND** the convergence evaluator SHALL not emit its index-sync or floor
  outcome until that materialization completes and the same checkpoint reruns

#### Scenario: a concrete checker root remains visible during materialization

- **WHEN** a materialization root coexists with a separately evaluated legacy,
  index, ledger, queue, receipt, provenance, or format finding
- **THEN** that finding SHALL remain a primary hint unless its own evaluator
  already declares it dependent
- **AND** the adapter SHALL NOT mask it from Topic text, filename shape, source
  URL, rule order, or filesystem proximity

#### Scenario: Wave1 gate rejects unbacked topic reference

- **WHEN** a reference file exists but its source URL cannot be tied to
  submitted Wave1 backing
- **THEN** the Wave1 gate SHALL fail or diagnose reference-backing drift
- **AND** it SHALL not count or materialize the file from filename/index
  evidence alone

#### Scenario: reference index remains navigation, not evidence

- **WHEN** Wave1 materializes a reference and synchronization adds a matching
  index row
- **THEN** the row SHALL satisfy consumer-navigation inventory only after its
  own table contract passes
- **AND** it SHALL not substitute for submitted source/cache/work-unit backing

#### Scenario: Wave2 gate accepts existing-backed pure-synthesis cross reference

- **WHEN** Wave2 pure synthesis writes `reference/00-cross-*.md`
- **AND** the reference cites `W2F-xxx` plus concrete submitted Wave0/Wave1
  backing refs
- **THEN** the Wave2 gate SHALL NOT require a Wave2 targeted-evidence row
  solely because the cross reference exists

#### Scenario: Wave2 gate rejects new evidence without targeted coverage

- **WHEN** a Wave2 `00-cross` reference claims a newly fetched external source
  or a finding records targeted search as submitted
- **AND** no submitted `wave2_targeted_evidence` row backs that source/finding
- **THEN** the Wave2 gate SHALL fail delegated provenance
- **AND** delegated-bypass diagnostics SHALL name the missing targeted
  work-unit coverage

#### Scenario: Wave2 gate rejects synthetic cross-reference source URL

- **WHEN** an existing-backed `reference/00-cross-*.md` uses a `source_url`
  that is not a prior accepted backing URL
- **AND** no submitted `wave2_targeted_evidence` row backs that URL
- **THEN** the Wave2 gate SHALL fail reference-backing validation
- **AND** diagnostics SHALL direct repair to a prior accepted source URL, body
  backing refs, targeted evidence, or a limitation

#### Scenario: reference index remains required for consumer navigation

- **WHEN** Wave1 or Wave2 materializes reference files
- **THEN** `reference/_INDEX.md` SHALL include matching rows with the correct
  source layer
- **AND** missing index rows SHALL be reported as reference navigation drift,
  not as delegated work-unit evidence by themselves

#### Scenario: gate refuses ambiguous reference authority

- **WHEN** a reference has valid format and appears in `_INDEX.md`
- **AND** the gate cannot determine whether it is a backed Phase-owned
  projection or a submitted fetched-source evidence surface from bundle facts
- **THEN** the gate SHALL fail or emit blocking diagnostics
- **AND** advice SHALL name the missing submitted backing, missing targeted
  evidence row, or missing prior-wave refs needed for repair

+### Requirement: Wave0 shared-reference convergence SHALL evaluate submitted backing before a floor verdict

Wave0 inspect and formal Gate SHALL consume one shared, side-effect-free convergence result before reporting a `shared_ref_count_floor` deficit. The evaluator SHALL combine the existing current canonical topic/layout facts, profile floor, ledger-ordered retained Wave0 source-contribution prefixes through the current rerun, authenticated source/cache/work-unit facts, legacy delegated reference coverage, Phase-owned projection coverage, reference/index navigation facts, and existing numeric count result without creating a second ledger, source catalog, parser, controller, or persistent status. Generic current-round work eligibility remains separate demand coverage and SHALL NOT reassign a retained prefix identity.

For each relevant source identity, the convergence result SHALL distinguish: valid legacy delegated coverage; valid Phase-owned projection coverage; a materializable submitted source contribution; invalid, ambiguous, superseded, or unsubmitted backing; genuinely missing acquisition coverage; and a true remaining shared-reference floor deficit. Its materialization outcome SHALL include only bounded exact backing and target coordinates needed for the Phase Agent to author one legal consumer projection and rerun the same inspect. Gate execution SHALL remain read-only and SHALL not select source relevance, author a reference, mutate an index, or convert a candidate into authority.

When a materializable candidate exists, inspect and Gate SHALL expose that candidate before a dependent floor result from the same convergence branch. An independent malformed reference, provenance, queue, receipt, cache, or navigation root SHALL remain independently visible. A true floor deficit may be reported only after materializable coverage cannot satisfy the applicable floor and relevant direct authority prerequisites have been evaluated.

#### Scenario: materializable submitted backing precedes a Wave0 floor deficit

- **WHEN** Wave0 has an authenticated submitted source identity without a countable shared reference and its exact backing can materialize a legal Phase-owned projection
- **THEN** inspect and Gate SHALL return the same materialization-first root with exact source identity and rerun checkpoint
- **AND** they SHALL not report that candidate's remaining shared-reference floor deficit until the projection path is rerun

#### Scenario: true deficit remains after convergence

- **WHEN** every relevant submitted source identity is either already covered, explicitly unavailable through the existing direct authority, or not materializable
- **AND** countable valid references remain below the applicable shared-reference floor
- **THEN** inspect and Gate SHALL report one true remaining floor deficit with the existing repair boundary
- **AND** they SHALL not invent a delegated rich-reference output route for a new Wave0 attempt

#### Scenario: independent invalid backing is not hidden by a candidate

- **WHEN** one submitted Wave0 source identity is materializable and a separate shared reference has malformed or unsubmitted backing
- **THEN** the materialization result SHALL suppress only its own later convergence floor outcome
- **AND** the separate invalid-backing root SHALL remain a primary blocking diagnostic

#### Scenario: later rerun append keeps prior backing and exposes only its new identity

- **WHEN** one accepted prior contribution owns a retained source prefix and a current rerun accepts a strictly longer source array at the same canonical target
- **THEN** inspect and Gate SHALL retain the prior contribution's identities and expose the later work unit only for its appended interval
- **AND** they SHALL not invalidate a correctly backed prior Phase-owned reference solely because that work unit is not current-round demand coverage


### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard

Each blocking deterministic Wave gate/output contract SHALL use a closed and
minimal executable chain: one direct runtime authority surface; one checker
path that consumes that authority and returns a root-specific structured
finding; one shared projection that exposes the smallest actionable root cause
and repair coordinates; and focused changed-contract coverage that catches
future drift. Agent producer guidance SHALL describe changed Agent-owned output
contracts at the owning Phase/controller surface; it SHALL not be copied into a
per-rule audit mapping. Engine-operation, user-decision, external-action, and
missing-contract roots SHALL use their real operation or boundary.

For Wave1 reference closeout, one pure convergence evaluator SHALL be the only
owner of the cross-fact classification among current canonical Topic identity,
profile floor, submitted/backed source facts, committed reference projections,
index inventory, and existing supplementary demand. It SHALL call existing
specialized readers/checkers for their direct facts; it SHALL not add a generic
dependency engine, a second source catalog, a duplicate metadata parser, a new
durable state, a watcher, retry tree, or generic repair controller. It SHALL
replace the parallel broad-glob count/index/backing interpretations in Wave1
inspect and formal gate, leaving `countReferences()` as the one narrow
numeric-eligibility implementation with an exact selected-path mode.

A specialized rule that can fail for multiple direct reasons, including
provenance, reference/index, depth, cache, or finding-contract checks, SHALL
use checker-owned findings and SHALL return the blocking basis and
repair-kind/write coordinate on each concrete root. The definition SHALL not
flatten those distinct roots into one static basis/repair. If a checker-owned
blocking result lacks either part of the root contract, the standard projection
SHALL fail as configuration integrity rather than infer it from rule metadata
or prose. Formal gate and inspect SHALL reuse the same pure evaluator result
and stable rule ID; their primary root object SHALL share `repair_kind`,
`missing_fact`, and `write_to`, with only `rerun` checkpoint-specific.

Blocking rules SHALL protect required structure, deterministic authority,
provenance, consumer navigation, or explicit accepted floors. Presentation or
maintenance preferences SHALL use tolerant parsing or advisory feedback unless
they are necessary to locate/parse direct authority. If a prerequisite
authority is absent or unparseable, the checker SHALL report that prerequisite
first and short-circuit dependent symptoms. For reference inventory, an invalid
or missing eight-column table SHALL mask row/source-layer symptoms until it
parses. The implementation SHALL use local guards rather than a generalized
dependency engine.

Formal lifecycle checks such as node binding, handoff preflight, routing,
degraded eligibility, gate-attempt durability, checkpoint, and
`trace_event_*` remain formal-only and SHALL not be duplicated in inspect.

The existing Wave0 source-metadata array fact, Wave1 Key Findings availability
fact, and Wave1 four-question-section availability fact SHALL remain owned by
one neutral target-level direct-output module selected only by a closed
direct_contract ID. Its interface SHALL accept the current run bundle root, one
Engine-resolved concrete bundle-relative target, and that ID; it SHALL own
bounded open/read, fatal UTF-8 plus single-BOM handling, tolerant parsing, and
contract-local structured roots without reading queue, manifest, result,
receipt, ledger, profile, phase state, or gate definition. Neutral roots SHALL
use only `root_class: semantic_content|contract_integrity`: target missing and
parse/schema/required-section failure are semantic_content, while
unsafe/non-regular/escaping target, bounded-read/oversize failure and invalid
UTF-8 are contract_integrity. Submit-specific mechanical classification,
repair_scope and recommended_action remain candidate-adapter concerns. The
interface SHALL return only bounded snapshot metadata and roots, not
raw/decoded bytes or parsed entries that an adapter could independently
reinterpret. For `wave0.source-metadata-array.v1` only, a successful validated
top-level YAML array SHALL expose `validated_array_length`; a failed result
shall expose no usable validated length. That scalar describes the current
resolved target evaluation only: it neither hashes/freezes target bytes nor
selects a target, contract, or work unit or mutates runtime state.

The work-unit candidate adapter, Wave evaluator adapter, and Wave0 submitted
candidate-projection reader SHALL remain the concrete consumers of that seam.
Candidate validation maps neutral roots to submit violations and repair scope;
Wave inspect/formal Gate map the same roots to existing rule IDs, findings,
hints, and checkpoint-specific reruns. The Wave0 candidate-projection reader
shall authenticate the current submitted declaration, exact required output
tuple, and hash-bound result before calling the neutral operation; after
success it may consume only `validated_array_length`, never parser output.
Existing rule IDs, including `per_topic_reference_schema_valid`,
`key_findings_non_empty`, and `question_list_has_four_sections`, remain
stable. Source URL presence remains a separate Wave-only rule and does not
enter the neutral candidate contract.

All adapters SHALL call that same target-level operation. Identical target
bytes under the same direct contract SHALL agree on pass/fail, missing semantic
sections, schema issues, BOM treatment, invalid-UTF8/read prerequisites, and,
for successful Wave0 arrays, `validated_array_length`. A Wave adapter may add
direct authorities outside the neutral contract, including file-existence
expansion, count floors, source URL presentation, submitted provenance,
profile/depth, reference/index/backing, cross-artifact, return-map, phase
completeness, and formal lifecycle checks. A missing, unsafe, or unreadable
admitted target SHALL project through the existing earliest file-existence or
authority rule and mask dependent schema/semantic rules; after successful read,
parse/schema/semantic roots project through the existing direct rule. The Wave
adapter SHALL not duplicate an existence/read path, YAML reader, Key Findings
parser, or question-section parser for the same admitted fact.

Implementation SHALL remove inlined Wave-only copies of
`ReferenceMetadataArraySchema` evaluation, Key Findings parsing,
question-list-section parsing, and the Wave0 count-floor YAML read after the
adapters use the target-level operation. It SHALL not retain a submit-specific
clone, add a generic linter CLI, introduce a plugin registry, or dispatch from
user-authored IDs or path regexes. Parent snapshot/read/parse failure SHALL
produce one neutral prerequisite root and mask dependent direct facts; each
adapter preserves the same missing fact and mutable surface while naming its own
dry-submit, inspect, or formal-Gate rerun.

#### Scenario: convergence replaces parallel Wave1 interpretations

- **WHEN** a current Wave1 Topic has the same submitted backing, reference
  paths, index bytes, profile floor, and queue state in inspect and gate
- **THEN** both commands SHALL obtain their reference/floor class from one
  convergence result
- **AND** no separate broad glob, index count, or queue-advice branch may
  return a contradictory success/failure result

#### Scenario: prerequisite root short-circuits derived symptoms

- **WHEN** canonical Topic/profile/submitted backing authority is unavailable
- **THEN** the checker SHALL report that parent root with one repair coordinate
- **AND** it SHALL mask materialization, index, and floor symptoms derived from
  that unavailable authority

#### Scenario: quality-floor policy remains scoped

- **WHEN** canonical materialization, index synchronization, or backing repair
  is required before a reference can count
- **THEN** that finding SHALL not inherit the degradation eligibility of
  `per_topic_ref_md_count_floor`
- **AND** only a true post-repair count shortfall SHALL retain the existing
  quality-floor rule and policy

#### Scenario: blocking rule has a closed contract chain

- **WHEN** an active gate rule contributes to pass/fail
- **THEN** its descriptor, declared finding source, and checker finding SHALL
  identify direct authority, root-specific basis/repair, and diagnostic
  projection without a second inventory row
- **AND** in-scope Wave artifact/provenance rules SHALL use the shared evaluator
  route consumed by formal and inspect
- **AND** active-definition execution, unknown-check fail-closed coverage, or a
  focused changed-rule regression SHALL fail when the executable path is absent

#### Scenario: Specialized Wave rule does not flatten distinct roots

- **WHEN** one work-unit/depth/reference rule can fail on an Agent-owned file,
  an Engine-owned binding, or a missing legal capability
- **THEN** the checker SHALL return a distinct structured finding with blocking
  basis and repair coordinate for the observed root
- **AND** no definition-level fallback basis/repair SHALL override or obscure
  that root

#### Scenario: presentation preference is not promoted to authority

- **WHEN** direct structured authority proves a required fact and Markdown
  differs only in harmless presentation
- **THEN** the command SHALL accept tolerant equivalent parsing or emit
  advisory feedback
- **AND** it SHALL NOT create an independent blocking rule for that preference

#### Scenario: authority conflict is resolved by truth type

- **WHEN** producer docs, submitted ledger rows, return-map refs, helper
  checks, or inspect wording disagree about the same deterministic fact
- **THEN** implementation SHALL resolve the conflict using the Source of Record
  for that fact's truth type
- **AND** the lower-authority surface SHALL be updated or diagnosed rather than
  silently broadening gate acceptance

#### Scenario: missing prerequisite masks dependent rules

- **WHEN** a parent YAML object, required array, or required field cannot be
  read
- **THEN** the checker SHALL report the parent/field as the blocking root
- **AND** dependent rules SHALL be recorded as masked or omitted rather than
  failed independently

#### Scenario: Root feedback names one authorized repair loop

- **WHEN** a blocking rule has one actionable direct root
- **THEN** primary feedback SHALL name `repair_kind`, the fact in
  `missing_fact`, its mutable or Engine-owned repair surface in `write_to`, and
  the same checkpoint in `rerun`
- **AND** it SHALL NOT provide competing repair branches or require the Agent to
  infer contract lineage from opaque prose

#### Scenario: Wave root projection feeds the standard Gate hint

- **WHEN** a shared Wave blocking root reaches a formal Gate wrapper
- **THEN** the standard top-level `hints[]` entry SHALL be projected from that
  root rather than reconstructed from inspect/advice prose
- **AND** matching inspect SHALL expose the same direct fact and authorized
  repair surface without formal routing side effects

#### Scenario: delegated bypass scan has one side-effect owner

- **WHEN** inspect and formal gate evaluate delegated-bypass provenance for the
  same bundle
- **THEN** both SHALL consume the same pure scan result
- **AND** only the formal wrapper MAY emit durable bypass trace/log evidence
- **AND** one formal invocation SHALL emit that diagnostic at most once

#### Scenario: Invalid index table masks row cascade

- **WHEN** the reference index parent cannot be parsed as the accepted table
- **THEN** the shared evaluator SHALL return one
  `reference_index_table_invalid` or equivalent root and the index path as the
  nearest repair target
- **AND** it SHALL NOT return one primary `missing_index_row` failure for every
  reference file in the same evaluation

#### Scenario: Wave0 direct output exposes bounded cardinality only after validation

- **WHEN** `wave0.source-metadata-array.v1` reads a schema-valid YAML array
  containing two entries
- **THEN** its successful result SHALL expose `validated_array_length: 2`
- **AND** it SHALL expose neither parsed entries nor raw/decoded target bytes

#### Scenario: Wave0 count floor consumes the successful direct result

- **WHEN** the Wave0 schema route has a successful direct result for a Topic's
  declared source output
- **THEN** the corresponding count-floor route SHALL use that result's
  `validated_array_length`
- **AND** it SHALL not independently parse or reread the YAML file

#### Scenario: Candidate projection does not reinterpret direct output

- **WHEN** an authenticated current Wave0 submitted declaration reaches its
  declared `source_yaml` output
- **THEN** the candidate-projection reader SHALL derive only ordinals from a
  passed `validated_array_length`
- **AND** it SHALL not receive or reconstruct source-array entries or decoded
  YAML content

#### Scenario: candidate, candidate-projection, and Wave adapters agree on Wave0 schema fact

- **WHEN** all three consumers evaluate identical source.yaml bytes through
  `wave0.source-metadata-array.v1`
- **THEN** they SHALL agree on top-level-array and
  `ReferenceMetadataArraySchema` pass/fail plus the earliest issue
- **AND** only the Wave adapter SHALL add count-floor or phase-wide findings

#### Scenario: candidate and Wave adapters agree on tolerant Wave1 sections

- **WHEN** both adapters evaluate identical evidence-summary or question-list
  bytes with tolerated heading case, level, spacing, order or list presentation
- **THEN** they SHALL return the same neutral direct result
- **AND** the Wave adapter SHALL preserve its existing Gate rule ID while the
  candidate uses a submit violation code

#### Scenario: source URL presence remains Wave-only

- **WHEN** an evidence summary has non-empty Key Findings but no Markdown URL
  while structured submit source authorities are valid
- **THEN** the neutral evidence-summary direct contract SHALL pass
- **AND** the existing Wave `source_url_present` rule MAY still fail at its
  owning Wave checkpoint

#### Scenario: unavailable snapshot masks direct symptoms without changing ownership

- **WHEN** the target-level operation cannot obtain a safe bounded UTF-8
  snapshot
- **THEN** it SHALL emit one prerequisite root: semantic_content for a missing
  target, or contract_integrity for unsafe/unreadable/oversized/invalid-UTF8
  input
- **AND** it SHALL not additionally claim missing YAML entries, Key Findings,
  or question sections from unavailable bytes

#### Scenario: Wave missing file keeps one existing rule identity

- **WHEN** an admitted Wave0 or Wave1 target is missing or unreadable
- **THEN** the target-level read root SHALL map to the existing earliest
  file/authority rule and mask the dependent direct rule
- **AND** Wave inspect/Gate SHALL not emit both an independent file-exists
  failure and a second reader failure for that target

#### Scenario: phase-wide Wave facts do not move into submit

- **WHEN** neutral direct facts pass but submitted provenance, count floor,
  depth review, reference backing, return map, queue drain, or completion event
  fails
- **THEN** candidate validation SHALL not evaluate or accept those phase-wide
  facts
- **AND** Wave inspect/Gate SHALL remain their verdict owner

#### Scenario: direct fact implementation is not duplicated

- **WHEN** apply completes the candidate, candidate-projection, and Wave
  adapters
- **THEN** one neutral target-level module SHALL own the three admitted direct
  contracts
- **AND** focused static or behavioral coverage SHALL fail if an adapter retains
  an independent equivalent parser/checker

#### Scenario: adapter reruns preserve checkpoint ownership

- **WHEN** one neutral root appears during dry-submit, Wave inspect, and formal
  Gate
- **THEN** `missing_fact` and `write_to` SHALL describe the same direct fact
  and artifact
- **AND** each projection SHALL name its own exact dry-submit, inspect, or Gate
  rerun without creating a competing acceptance authority

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
- **AND** that file exists under the current run bundle root
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

### Requirement: Wave gate CLIs and playbook verdict checks use one root trace with distinct ownership

Wave gate CLIs SHALL return standard machine-readable `check / routing / inspect / advice` JSON on stdout and append real gate-attempt audit rows to the current run bundle's `rb_trace.jsonl`. A command-experiment Playbook Agent/thin driver SHALL parse the real result and append its strict case-owned `event: check`, `source: playbook`, explicit boolean `passed`/`expected` verdict row through the accepted trace writer/helper to the same root trace. Native completion SHALL evaluate only accepted playbook-owned checks under V2 policy. `_trace.jsonl`, console verdict text and gate-authored substitute checks SHALL NOT be current authority.

#### Scenario: Wave gate output and verdict-check ownership stay distinct in one trace

- **WHEN** a command experiment executes a Wave gate
- **THEN** gate stdout SHALL expose machine-readable JSON and bundle-root `rb_trace.jsonl` SHALL retain the gate attempt
- **AND** the Playbook Agent/thin driver SHALL derive any case verdict check from that result as a separately owned strict row in the same root trace
- **AND** native completion SHALL bind and evaluate the accepted root-trace prefix without a second trace sink

#### Scenario: Wave gate CLI output and trace verdict stay separate

- **WHEN** a command experiment executes a Wave gate
- **THEN** gate stdout exposes machine-readable JSON and bundle-root `rb_trace.jsonl` retains the gate attempt
- **AND** the Playbook Agent/thin driver derives the strict case verdict check from that real result in the same trace

### Requirement: Wave Gates SHALL preserve declared target closure through one receipt

The Wave1 Gate evaluator SHALL validate every canonical Topic's CTS-008-selected depth review. Each review SHALL contain `carried_targets`, an explicit array which MAY be empty; every entry SHALL have exactly `target_id` (a declaration-local unique string matching `^[A-Za-z0-9][A-Za-z0-9._-]*$`) and `target_text` (a YAML string scalar that is nonempty after NFC, LF-line-ending and trim normalization). The evaluator SHALL derive each `target_revision` as lowercase-hex `sha256` of canonical JSON `{target_id,target_text}`; derive lowercase-hex `intent_sha256` from canonical JSON of the current Topic's title, stored-order must-answer set, scope role, and stored-order dependencies; and aggregate every selected entry in strict `(topic_uid,target_id)` order with no duplicate pair.

The resulting one Gate input SHALL be `carried_target_receipt` with exact shape `{ contract_version: "wave1-carried-targets/v1", receipt_sha256, targets[] }`; each target SHALL contain `{ topic_uid, intent_sha256, target_id, target_revision }`, every digest SHALL match `^[0-9a-f]{64}$`, and `receipt_sha256` SHALL be the `sha256` of canonical JSON `{contract_version,targets}` excluding the digest field itself. The canonical JSON object key order is the field order shown in this requirement and arrays retain their stated order. The Wave1 CLI SHALL pass this validated object only through `writeGateAttempt(bundlePath, result, { carriedTargetReceipt })`; it SHALL not put it in `extraCheck`. A missing, ambiguous, or malformed review/declaration SHALL fail the whole Wave1 Gate with the exact depth-review repair coordinate; it SHALL not emit a partial receipt. An explicit all-empty declaration set SHALL pass this part of the contract.

The Wave2 evaluator SHALL select only the receipt on the successful Wave1 `gate_attempt` whose legal handoff and route-bound load entered the current Wave2 path. For a receipt that presents the Engine-owned contract version, it SHALL first require every receipt `(topic_uid,intent_sha256)` pair to equal the same current canonical Topic's CTS-008-derived binding. An unknown UID or changed binding is a parent-integrity root cause at the existing Wave1 handoff boundary, and SHALL short-circuit target-coverage checks for that receipt; Wave2 SHALL not direct the Agent to bind an old target in `finding-index.yaml`. Only after that prerequisite passes, it SHALL require every receipt target to have at least one exact binding in the existing finding index and a valid existing finding disposition route. It SHALL not treat common topic, prose similarity, origin ref, trigger ref, or a mutable depth review as a binding. A historical selected Wave1 handoff with no receipt is legacy-compatible; a trace event that presents the contract version but lacks, malforms, or disagrees with its receipt is a blocking trace/handoff fact, not legacy.

#### Scenario: malformed declaration fails at Wave1
- **WHEN** a current depth review omits `carried_targets`, repeats a target ID, or contains an empty target text
- **THEN** Wave1 fails with the direct depth-review field as repair target
- **AND** no Wave1-to-Wave2 receipt is routed

#### Scenario: receipt aggregates every current Topic review
- **WHEN** two current canonical Topics have valid selected depth reviews with carried targets
- **THEN** one Wave1 Gate receipt contains the ordered union of both declarations
- **AND** a missing or invalid declaration for either Topic blocks the whole Gate rather than emitting a partial receipt

#### Scenario: receipt target requires exact finding binding
- **WHEN** a routed receipt declares one target and finding-index has only the same topic or origin artifact
- **THEN** Wave2 closure fails with that target as the smallest missing fact
- **AND** repair points to the existing finding-index surface

#### Scenario: versioned malformed receipt blocks rather than downgrades
- **WHEN** the selected Wave1 trace event presents the carried-target receipt contract version but lacks a complete valid receipt
- **THEN** Wave2 rejects that handoff as a trace persistence boundary
- **AND** it SHALL not classify the event as a legacy no-receipt handoff

#### Scenario: current intent drift blocks before finding coverage
- **WHEN** the selected versioned receipt names a current topic UID but its intent digest no longer equals that Topic's current canonical binding
- **THEN** Wave2 reports the Wave1 handoff parent mismatch as the only receipt-closure root cause
- **AND** it SHALL not treat a matching old finding binding as coverage or direct repair to `finding-index.yaml`

#### Scenario: existing disposition routes remain the only outcomes
- **WHEN** a receipt-bound finding uses a valid existing defer, internal-data, record-only, existing-evidence, or targeted-search route
- **THEN** it satisfies closure according to that existing route
- **AND** the Engine does not infer semantic adequacy or create a target-level status

### Requirement: Wave adapters SHALL project minimal independent roots and shared fail-closed degradation policy

Each Wave0, Wave1, and Wave2 formal/inspect adapter SHALL invoke the same pure evaluator once for its core primary-root projection. An evaluator prerequisite guard SHALL record only explicitly downstream skipped rule IDs in `masked_rule_ids`; it SHALL NOT manufacture a blocking finding for each skipped child. If an evaluator emits a dependent finding, it SHALL set that finding's `masked_by_rule_id`, and the standard projector SHALL omit it from `hints[]`. Independent roots SHALL remain distinct primary findings and mask context SHALL remain durable diagnostic context. The formal adapters SHALL use the shared Wave-only parsed eligibility helper, not local allowlists or `id` heuristics. Only definition-owned `required_floor` roots with an exact eligible parsed `rule_id` may be candidates; queue, receipt, provenance, binding, required structure, trace, lifecycle, checker-owned, and other authority roots SHALL remain ineligible. Format-specific additions SHALL not rebuild masking or eligibility. Current Wave0/Wave1 eligible quality policy remains unchanged; active Wave2 definitions remain ineligible.

For a Wave1 convergence materialization root, the adapter SHALL preserve the
existing ordered evaluator result: it SHALL project the candidate-exact
materialization root and defer only the evaluator's own later index-sync/floor
outcomes until the same checkpoint reruns. It SHALL NOT set
`masked_by_rule_id` on a separately evaluated reference/index/ledger/floor
finding by prose, filename glob, source URL, rule order, Topic text, or another
Topic. An invalid/missing submitted backing, legacy or misnamed concrete file
failure, unrelated queue/receipt/provenance root, or true post-closeout floor
deficit SHALL remain an independent primary root.

#### Scenario: prerequisite does not become a repair wall

- **WHEN** one missing parent artifact causes multiple dependent content checks to be unavailable
- **THEN** the adapter SHALL emit the parent as one primary root and retain only dependent rule IDs as masked detail
- **AND** an unrelated queue, provenance, or structure root SHALL remain independently visible

#### Scenario: materialization does not hide independent authority failure

- **WHEN** one Topic has a materialization root and another root lacks valid
  submitted backing, queue authority, receipt binding, or a concrete legacy
  reference defect
- **THEN** the materialization root SHALL defer only its own later convergence
  outcomes
- **AND** the independent authority root SHALL remain a primary blocking hint

#### Scenario: inactive Wave2 fixture proves adapter capability only

- **WHEN** a schema-valid inactive Wave2 definition fixture declares an eligible quality rule
- **THEN** the production schema and shared Wave formal-helper path SHALL exercise the same metadata path used by Wave0/Wave1
- **AND** the fixture SHALL not enter active inventory, change production Wave2 policy, or make an authority-root failure eligible

### Requirement: Wave Gate adapters and handoff consumers SHALL preserve the verdict partition

Wave0, Wave1, and Wave2 formal adapters SHALL use one shared, side-effect-free public-summary projection when it removes duplicated post-preflight classification. It consumes existing evaluator findings, degradation eligibility, and routing/durability facts only; it SHALL not decide eligibility, read runtime files, resolve transitions, write trace, or modify findings.

Adapters SHALL preserve complete unresolved quality findings in diagnostics while exposing only routing blockers through `check.failed_rule_ids`. Existing eligibility remains unchanged: only an eligible quality-only route may degrade; structural, provenance, queue, receipt, lifecycle, configuration, routing, checker-owned, and other ineligible roots remain blocking.

`gate_attempt`, `enter-phase`, `advance-status`, and existing readers SHALL retain `degraded`, `degraded_reason`, and `degraded_rules` for a legal route without treating it as clean completion. Wave guidance SHALL require checking degradation before consuming the existing `check.next`, without interaction, direct authority edits, or a new repair controller.

#### Scenario: Wave0 carried shared-reference floor is not reported as a blocker

- **WHEN** Wave0 reaches fatigue with only `shared_ref_count_floor` eligible
- **THEN** its Gate response and `gate_attempt` SHALL be a degraded handoff
- **AND** the floor SHALL remain diagnostic and in `degraded_rules`, but not `failed_rule_ids`

#### Scenario: Wave1 and Wave2 ineligible roots fail closed

- **WHEN** a Wave1 or Wave2 Gate has an ineligible root
- **THEN** it SHALL return blocking failure with no legal `next`
- **AND** it SHALL not emit `degraded: true` or move that root into `degraded_rules`
