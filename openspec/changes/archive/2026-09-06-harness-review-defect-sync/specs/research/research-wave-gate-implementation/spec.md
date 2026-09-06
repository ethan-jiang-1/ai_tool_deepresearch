# research-wave-gate-implementation Specification (delta)

> req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-008, RWG-009, RWG-010, RWG-011, RWG-012, RWG-013, RWG-014, RWG-016, RWG-017, RWG-018, RWG-019, RWG-020, RWG-021, RWG-022, RWG-023

## MODIFIED Requirements

### Requirement: Wave1 complete gate rule set SHALL validate provenance, depth contracts, and reference format

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
`reference/*{topic}*.md` SHALL not act as a second success predicate: the gate
definition still declares it as the `count_floor` target, and
the convergence evaluator preempts that raw count whenever a
materialization/backing root exists. A legacy `NN-wave1-*` row/file remains
readable/indexable but SHALL not count; nor shall an arbitrary filename
containing a full slug. A current canonical path counts only after the
existing submitted-backing, reference-format, parseable-URL, and numeric
eligibility checks pass.

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
