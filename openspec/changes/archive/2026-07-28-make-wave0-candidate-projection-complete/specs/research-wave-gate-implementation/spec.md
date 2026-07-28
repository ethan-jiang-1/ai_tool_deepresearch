> req: RWG-018

## MODIFIED Requirements

### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard

Each blocking deterministic Wave gate/output contract SHALL use a closed and
minimal executable chain:

- one direct runtime authority surface identified by the rule descriptor or
  detecting helper;
- one checker path that consumes that authority and returns a structured finding
  with root-specific blocking basis and repair;
- one shared projection that exposes the smallest actionable root cause and
  repair coordinates; and
- focused checker-class or changed-contract coverage that catches future drift.

Agent producer guidance SHALL describe changed Agent-owned output contracts at
the owning phase/controller surface. It SHALL NOT be copied into a permanent
rule-id audit mapping. Engine-operation, user-decision, external-action, and
missing-contract roots SHALL use their real operation or boundary without a
per-rule non-Agent-produced exemption row.

A Wave rule with one stable declarative root contract MAY use definition-owned
blocking-basis/repair metadata. A specialized rule that can fail for multiple
direct reasons, including provenance, reference/index, depth, cache, or
finding-contract checks, SHALL use checker-owned findings and SHALL return the
blocking basis and repair-kind/write coordinate on each concrete root. The
definition SHALL NOT flatten those distinct roots into one static basis/repair.
If a checker-owned blocking result lacks either part of the root contract, the
standard projection SHALL fail as configuration integrity rather than inferring
it from rule metadata or prose.

For in-scope Wave artifact/provenance rules, formal gate and inspect SHALL reuse
the same pure evaluator result and rule id. Their primary root object SHALL also
share the same `repair_kind`, `missing_fact`, and `write_to`; each command SHALL
project its own exact checkpoint in `rerun`. Formal lifecycle checks remain
formal-only and SHALL NOT be duplicated in inspect. A missing or unparseable
prerequisite authority SHALL be the primary root and mask dependent symptoms;
the implementation SHALL use local guards rather than a generalized dependency
engine.

Blocking rules SHALL protect required structure, deterministic authority,
provenance, consumer navigation, or explicit accepted floors. Presentation /
maintenance preferences SHALL use tolerant parsing or advisory feedback unless
they are necessary to locate or parse a direct authority surface.

The Wave0 source-metadata array fact, Wave1 Key Findings availability fact, and
Wave1 four-question-section availability fact SHALL be owned by one neutral
target-level direct-output module selected only by a closed `direct_contract`
ID. Its interface SHALL accept the active bundle root, one Engine-resolved
concrete bundle-relative target, and that ID; it SHALL own bounded open/read,
fatal UTF-8 plus single-BOM handling, tolerant parsing, and contract-local
structured roots without reading queue, manifest, result, receipt, ledger,
profile, phase state, or gate definition. Neutral roots SHALL use only
`root_class: semantic_content|contract_integrity`: target missing and
parse/schema/required-section failure SHALL be semantic_content, while
unsafe/non-regular/escaping target, bounded-read/oversize failure and invalid
UTF-8 SHALL be contract_integrity. Submit-specific mechanical classification,
repair_scope and recommended_action belong to the candidate adapter.

The interface SHALL return only bounded snapshot metadata and roots, not
raw/decoded bytes or parsed entries that an adapter could independently
reinterpret. For `wave0.source-metadata-array.v1` only, after a top-level YAML
array and every element successfully pass `ReferenceMetadataArraySchema`, the
successful `snapshot_meta` SHALL also expose
`validated_array_length: <non-negative integer>`. No failed result SHALL expose
a usable validated length. This scalar describes the current evaluation of the
resolved target; it neither hashes nor freezes target bytes, and it does not
make the direct-output module select a target or work unit. Reader/decoder/
parser helpers MAY exist only as private implementation seams and SHALL NOT
become a second interface composed independently by adapters.
The module SHALL not select targets/contracts or mutate runtime state.

The work-unit candidate adapter, Wave evaluator adapter, and Wave0 submitted
candidate projection reader SHALL be the concrete consumers at this seam.
Candidate validation SHALL map neutral roots to submit violations and
repair_scope. Wave0/Wave1 inspect and formal Gate SHALL map the same neutral
roots to their existing rule IDs, findings, hints, and checkpoint-specific rerun
values. The Wave0 candidate projection reader SHALL authenticate the current
submitted declaration, exact required output tuple, and hash-bound result before
calling the neutral operation; after success it may consume only
`validated_array_length`, never parser output. Existing Wave rule IDs including
`per_topic_reference_schema_valid`, `key_findings_non_empty`, and
`question_list_has_four_sections` SHALL remain stable. Source URL presence
SHALL remain a separate Wave-only rule and SHALL not enter the neutral candidate
contract.

All adapters SHALL call the same target-level operation. Evaluations of
identical target bytes under the same direct contract SHALL agree on pass/fail,
missing semantic sections, schema issues, BOM treatment, invalid-UTF-8/read
prerequisites, and for successful Wave0 arrays, `validated_array_length`. The
Wave adapter MAY then add direct authorities that are outside the neutral
contract, including file existence expansion, count floors, source URL
presentation, submitted provenance, profile/depth, reference/index/backing,
cross-artifact, return-map, phase completeness and formal lifecycle checks.

For each admitted Wave target, a missing, unsafe, or unreadable target root
SHALL project through the existing earliest file-existence/authority rule ID and
mask the dependent schema/semantic rule. After a successful read, parse/schema/
semantic roots SHALL project through the existing direct rule ID. The Wave
adapter SHALL NOT perform a second independent existence/read path that emits a
duplicate root or rereads the same target for the admitted direct fact. Its Wave0
count-floor route SHALL consume the same successful direct-result
`validated_array_length`; it SHALL NOT call a separate YAML reader or retain a
second parsed source-array map.

Implementation SHALL remove the inlined Wave-only copies of
`ReferenceMetadataArraySchema` evaluation, Key Findings parsing, question-list
section parsing, and the Wave0 count-floor YAML read after the adapters use the
target-level operation. It SHALL not retain a submit-specific clone, add a
generic linter CLI, introduce a plugin registry, or dispatch from user-authored
IDs or path regexes.

A parent snapshot/read/parse failure SHALL produce one neutral prerequisite root
and mask dependent direct facts. Candidate, Wave, and candidate-projection
projections SHALL preserve the same missing_fact and mutable surface; each
adapter SHALL provide its own exact rerun checkpoint. Formal Gate durability /
routing remains formal-only and candidate validation remains non-routing.

#### Scenario: Wave0 direct output exposes bounded cardinality only after validation

- **WHEN** `wave0.source-metadata-array.v1` reads a schema-valid YAML array
  containing two entries
- **THEN** its successful result SHALL expose `validated_array_length: 2`
- **AND** it SHALL expose neither parsed entries nor raw/decoded target bytes

#### Scenario: Wave0 count floor consumes the successful direct result

- **WHEN** the Wave0 schema route has a successful direct result for a topic's
  declared source output
- **THEN** the corresponding count-floor route SHALL use that result's
  `validated_array_length`
- **AND** it SHALL not independently parse or reread the YAML file

#### Scenario: Candidate projection does not reinterpret direct output

- **WHEN** an authenticated current Wave0 submitted declaration reaches its
  declared `source_yaml` output
- **THEN** the candidate projection reader SHALL derive only ordinals from a
  passed `validated_array_length`
- **AND** it SHALL not receive or reconstruct source array entries or decoded
  YAML content

#### Scenario: blocking rule has a closed contract chain

- **WHEN** an active gate rule contributes to pass/fail
- **THEN** its parsed descriptor, declared finding source, and actual checker
  finding SHALL identify the direct authority, root-specific blocking basis /
  authorized repair, and diagnostic projection without a second inventory row
- **AND** in-scope Wave artifact/provenance rules SHALL use the shared evaluator
  route consumed by formal and inspect
- **AND** active-definition execution, unknown-check fail-closed coverage, or
  focused changed-rule regression SHALL fail when the executable path is missing

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
- **THEN** the command SHALL accept tolerant equivalent parsing or emit advisory
  feedback
- **AND** it SHALL NOT create an independent blocking rule for the preference

#### Scenario: authority conflict is resolved by truth type

- **WHEN** producer docs, submitted ledger rows, return-map refs, helper checks,
  or inspect wording disagree about the same deterministic fact
- **THEN** implementation SHALL resolve the conflict using the judgment-layer
  Source of Record for that truth type
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
- **THEN** primary feedback SHALL name its `repair_kind`, the fact in
  `missing_fact`, its exact mutable or Engine-owned repair surface in `write_to`,
  and the same checkpoint in `rerun`
- **AND** it SHALL NOT provide competing repair branches or require the Agent to
  infer contract lineage from opaque prose

#### Scenario: Wave root projection feeds the standard Gate hint

- **WHEN** a shared Wave blocking root reaches a formal Gate wrapper
- **THEN** the standard top-level `hints[]` entry SHALL be projected from that
  root rather than reconstructed from inspect/advice prose
- **AND** the matching inspect command SHALL expose the same direct fact and
  authorized repair surface without formal routing side effects

#### Scenario: delegated bypass scan has one side-effect owner

- **WHEN** inspect and formal gate evaluate delegated-bypass provenance for the
  same bundle
- **THEN** both SHALL consume the same pure scan result
- **AND** only the formal wrapper MAY emit durable bypass trace/log evidence
- **AND** one formal invocation SHALL emit that diagnostic at most once

#### Scenario: Invalid index table masks row cascade

- **WHEN** the reference index parent cannot be parsed as the accepted table
- **THEN** the shared evaluator SHALL return one `reference_index_table_invalid`
  or equivalent root and the index path as the nearest repair target
- **AND** it SHALL NOT return one primary `missing_index_row` failure for every
  reference file in the same evaluation

#### Scenario: candidate and Wave adapters agree on Wave0 schema fact

- **WHEN** both adapters evaluate identical source.yaml bytes through
  `wave0.source-metadata-array.v1`
- **THEN** they SHALL agree on top-level-array and
  `ReferenceMetadataArraySchema` pass/fail plus the earliest issue
- **AND** only the Wave adapter SHALL add count-floor or phase-wide findings

#### Scenario: candidate and Wave adapters agree on tolerant Wave1 sections

- **WHEN** both adapters evaluate identical evidence-summary or question-list
  bytes with tolerated heading case, level, spacing, order or list presentation
- **THEN** they SHALL return the same neutral direct result
- **AND** the Wave adapter SHALL preserve its existing Gate rule ID while
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
- **THEN** it SHALL emit one prerequisite root: `semantic_content` for a missing
  target, or `contract_integrity` for unsafe/unreadable/oversized/invalid-UTF8
  input
- **AND** it SHALL not additionally claim missing YAML entries, Key Findings, or
  question sections from unavailable bytes

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

- **WHEN** apply completes the work-unit candidate, Wave, and Wave0 candidate
  projection consumers
- **THEN** one neutral target-level module SHALL own the three admitted direct
  contracts
- **AND** focused static or behavioral coverage SHALL fail if a consumer retains
  an independent equivalent parser/checker

#### Scenario: adapter reruns preserve checkpoint ownership

- **WHEN** one neutral root appears during dry-submit, Wave inspect, and formal
  Gate
- **THEN** `missing_fact` and `write_to` SHALL describe the same direct fact and
  artifact
- **AND** each projection SHALL name its own exact dry-submit, inspect, or Gate
  rerun without creating a competing acceptance authority
