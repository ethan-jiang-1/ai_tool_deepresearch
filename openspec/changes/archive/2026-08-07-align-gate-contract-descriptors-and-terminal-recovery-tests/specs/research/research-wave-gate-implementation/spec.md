> req: RWG-005

## MODIFIED Requirements

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
novelty floor, new-source comparison, `per_topic_ref_md_count_floor`, depth
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
- **THEN** both SHALL report the same parent/materialization/index/existing-work/
  true-deficit/satisfied convergence class and repair coordinates
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
