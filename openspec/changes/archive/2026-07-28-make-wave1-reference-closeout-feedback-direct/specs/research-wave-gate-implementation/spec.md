## MODIFIED Requirements

> req: RWG-017, RWG-021

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
