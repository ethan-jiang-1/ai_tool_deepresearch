> req: RWG-005, RWG-012, RWG-017, RWG-018

## MODIFIED Requirements

### Requirement: Gate CLI evaluates wave1 rules from definition

The Wave1 gate CLI SHALL evaluate work-unit provenance rule types and Wave1
depth-contract rule types from the active gate definition. It SHALL use
work-unit helper diagnostics for ledger/index/manifest/result/receipt/beacon/
hash/cache mismatches and deterministic readers for `depth-review.yaml`, Wave0
source URL sets, structured source claims, submitted cache-trail mappings,
canonical reference Topic binding, and the reference-index table.

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
require the four named semantic sections without fixed order, case, heading
level, spacing, or list style. `source_url_present` SHALL accept a parseable
bare HTTP(S) URL or Markdown link. `key_findings_non_empty` SHALL accept common
bullet, numbered, or non-empty paragraph content under the semantic Key
Findings section. These tolerant evaluators, not historical regex
presentation, SHALL own the blocking result.

#### Scenario: Inspect and gate share reference evaluation

- **WHEN** Wave1 inspect and the formal Wave1 gate evaluate identical bundle
  bytes for a current Topic
- **THEN** both SHALL report the same parent/materialization/index/existing-work
  /true-deficit/satisfied convergence class and repair coordinates
- **AND** only the formal gate wrapper MAY perform accepted durable gate side
  effects

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
- **THEN** the CLI SHALL parse the rule target from the active bundle
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

#### Scenario: Question-list order is not blocking authority

- **WHEN** all four required question-list semantic sections are present and
  non-empty in an equivalent order or harmless heading presentation
- **THEN** the shared evaluator SHALL accept the structure
- **AND** historical ordered-regex presentation SHALL NOT fail Wave1

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

The materialization root SHALL carry the stable ordered list of exact canonical
target/backing coordinates returned by the shared submitted-backing reader. It
is one bounded Phase closeout action, not a queue selector or an instruction to
search; the Phase Agent may author only those consumer projections from their
authenticated submitted backing, then reruns the same convergence checkpoint.

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
direct_contract ID. Its interface SHALL accept the active bundle root, one
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
