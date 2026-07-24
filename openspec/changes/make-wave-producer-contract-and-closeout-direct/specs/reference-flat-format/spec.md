## MODIFIED Requirements

### Requirement: Agent-facing source.yaml and reference metadata formats SHALL be parser-aligned and complete

Agent-facing phase docs, shared schema docs, work-unit tasks, and repair diagnostics SHALL describe `artifacts/waveN/{topic}/source.yaml` in the exact shape parsed by the Engine: a top-level YAML array where each entry includes at least `url`, `title`, `retrieved_date`, and `topic_tag`. Guidance SHALL warn that wrapping entries under `sources:`, `wave:`, or `topic:` produces an object and is invalid for this parser.

Reference Markdown metadata SHALL be documented as bullet or colon-separated metadata in the accepted project format, not YAML frontmatter. Guidance SHALL describe the eight common required fields plus one topic-binding form, explain that `related_topic_uid` and legacy `related_topic` feed the same canonical resolver, and state that conflicting dual declarations fail. Normal first-run guidance MAY retain its current legacy producer form; rerun/history guidance SHALL NOT require mass rewriting of already covered references merely to change identity spelling.

At the Wave0 source-intake authoring decision point, the actual delegated actor guidance SHALL load `shared/shared-reference-template` through its `requires` chain. The template SHALL expose the canonical `reference/00-shared-<slug>.md` filename, parser-aligned rich Markdown metadata/semantic sections, and the required `output_files[]` `reference` declaration with `source_url`. A Phase document merely mentioning the template, indirect discovery by the actor, a bare YAML document, a YAML fence, filesystem presence, a noncanonical filename, or an otherwise parseable reference with no formal submitted backing SHALL NOT substitute for that producer contract. This requirement SHALL NOT create a byte-exact formatting rule, a second parser, a generic Markdown linter, a new reference metadata authority, or Phase-owned Wave0 reference creation.

Guidance SHALL keep `reference/_INDEX.md` separate from topic identity authority: it is the accepted eight-column navigation table and must be updated by the normal Wave materialization step. Repair diagnostics SHALL distinguish an invalid/missing table parent from missing rows and SHALL give one nearest same-inspect action without asking the user to run ordinary repair commands.

#### Scenario: source.yaml top-level array is documented

- **WHEN** an Agent reads wave source output instructions
- **THEN** it SHALL see that `source.yaml` starts with YAML list entries at the top level
- **AND** it SHALL see that `{ sources: [...] }`, `wave:`, or `topic:` wrappers are invalid for the current parser

#### Scenario: Reference metadata is not YAML frontmatter

- **WHEN** an Agent writes `reference/*.md`
- **THEN** guidance SHALL identify the accepted metadata format parsed by `parseReferenceMetadata()`
- **AND** it SHALL warn that YAML frontmatter fences are not the current reference metadata contract

#### Scenario: Source intake receives the reference template it must use

- **WHEN** a Wave0 source-intake actor receives a generated task
- **THEN** its role guidance SHALL load the existing shared-reference template through the actual delivery chain
- **AND** it SHALL author any shared reference as its declared `reference` output rather than ask the Phase Agent to create an alternate projection

#### Scenario: Wave1 rerun repair uses normal materialization contract

- **WHEN** Wave1 rerun inspect reports UID binding or index-table drift for historical references
- **THEN** the Phase Agent SHALL repair the named reference projection or index table and rerun the same inspect
- **AND** it SHALL NOT enqueue research solely to change metadata spelling, mass-rewrite already covered historical references, or ask the user to execute the mechanical repair

### Requirement: Phase-owned reference materializations SHALL preserve submitted source backing

Phase-owned reference files SHALL be consumer-facing projections, not alternate delegated evidence authority. A Phase-owned reference SHALL identify concrete backing from submitted source claims, accepted source URLs, cache trails, explicit degraded-capture records, work-unit refs, prior-wave artifacts that themselves bind to submitted/prior accepted backing, or Wave2 ledger/index findings. It SHALL NOT introduce accepted fetched-source evidence that lacks submitted work-unit or prior accepted backing.

For Wave1 topic references, backing SHALL come from submitted `wave1_topic_deepening` rows and their source/cache/degraded-capture claims. For Wave2 existing-backed cross references, backing SHALL ultimately bind to already submitted Wave0/Wave1 source/cache/degraded-capture/work-unit evidence plus Wave2 `W2F-xxx` ledger/index process evidence. For Wave2 new external evidence, backing SHALL come from submitted `wave2_targeted_evidence` rows.

Phase-owned materialization SHALL occur only after formal submit succeeds. A Phase Agent SHALL use submitted rows and their declared backing to materialize a consumer projection; it SHALL NOT repair or fabricate actor-owned result semantics, cache declarations, receipts, ledger rows, or provenance in order to make a reference count. A rejected, claimed, filesystem-only, or dry-submit-only attempt SHALL not unlock reference or index materialization.

This change SHALL NOT require a new required reference metadata key or a new required `_INDEX.md` column to classify Phase-owned projections. Classification SHALL use the existing reference metadata block, `_INDEX.md` rows and `source_layer`, submitted source claims, accepted source URL surfaces, cache/degraded-capture/work-unit ledgers, output declarations, and Wave2 `W2F-xxx` ledger/index refs. `source_layer` is a navigation label and SHALL NOT be sufficient authority by itself.

#### Scenario: Wave1 topic reference cites submitted backing

- **WHEN** the Phase Agent writes `reference/{topic_slug}-<source-slug>.md`
- **THEN** the reference SHALL cite submitted Wave1 source claims, accepted source URL surfaces, cache trails, explicit degraded-capture records, or work-unit refs for its `source_url`
- **AND** those backing refs SHALL appear as bundle-relative refs or Markdown links in the reference body where gates or inspectors can scan them
- **AND** `_INDEX.md` SHALL include a row for the reference

#### Scenario: rejected work cannot unlock materialization

- **WHEN** a Wave1 candidate only fails or has not yet passed formal submit
- **THEN** the Phase Agent SHALL not materialize its consumer reference or index row as submitted-backed evidence
- **AND** it SHALL return to the existing dry-submit, actor-return, fail-and-replace, or contract-owner boundary

#### Scenario: unbacked reference is diagnostic, not authority

- **WHEN** a reference file exists with a source URL or claim that cannot be tied to submitted or prior accepted backing
- **THEN** gates or inspectors SHALL report it as unbacked drift or repair input
- **AND** it SHALL NOT count as delegated fetched-source coverage
