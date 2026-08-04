> req: REF-007, REF-009

## MODIFIED Requirements

### Requirement: Agent-facing source.yaml and reference metadata formats SHALL be parser-aligned and complete

Agent-facing phase docs, shared schema docs, work-unit tasks, and repair diagnostics SHALL describe `artifacts/waveN/{topic}/source.yaml` in the exact shape parsed by the Engine: a top-level YAML array where each entry includes at least `url`, `title`, `retrieved_date`, and `topic_tag`. Guidance SHALL warn that wrapping entries under `sources:`, `wave:`, or `topic:` produces an object and is invalid for this parser.

Reference Markdown metadata guidance SHALL present opening YAML frontmatter as the canonical new-output form parsed by the shared reference metadata reader. Guidance SHALL describe the eight common required fields plus one topic-binding form, explain that `related_topic_uid` and legacy `related_topic` feed the same canonical resolver, and state that conflicting dual declarations fail. It SHALL explicitly state that legacy bullet metadata remains read-compatible but is not the form a new producer should choose. A malformed YAML mapping SHALL receive a parser-aligned metadata-block repair; a valid mapping missing one required field SHALL receive the existing field-specific repair. Normal first-run guidance SHALL not require a rerun-specific metadata branch, and rerun/history guidance SHALL not require mass rewriting of already covered legacy references merely to change presentation.

At the Wave0 source-intake authoring decision point, the delegated actor guidance SHALL expose only the assigned source YAML, cache, receipt, and result facts from its current work-unit contract. It SHALL NOT load `shared/shared-reference-template` as a delegated completion route, declare `reference/00-shared-<slug>.md` in current `output_files[]`, or imply that an actor-authored reference satisfies the current Wave0 shared-reference floor. After formal submit, the Phase-side materialization guidance MAY load the shared template to render a consumer reference from exact submitted backing; that later projection SHALL not retrofit a rich-reference obligation into the actor contract. A bare YAML document without Markdown sections, filesystem presence, a noncanonical filename, an index row, or an otherwise parseable reference with no formal submitted backing SHALL NOT substitute for the source or projection contract. This requirement SHALL NOT create a byte-exact formatting rule, a second parser, a generic Markdown linter, or a new reference metadata authority.

Guidance SHALL keep `reference/_INDEX.md` separate from topic identity authority: it is the accepted eight-column navigation table and must be updated by the normal Wave materialization step. Repair diagnostics SHALL distinguish an invalid/missing table parent from missing rows and SHALL give one nearest same-inspect action without asking the user to run ordinary repair commands.

#### Scenario: source.yaml top-level array is documented

- **WHEN** an Agent reads wave source output instructions
- **THEN** it SHALL see that `source.yaml` starts with YAML list entries at the top level
- **AND** it SHALL see that `{ sources: [...] }`, `wave:`, or `topic:` wrappers are invalid for the current parser

#### Scenario: source.yaml required fields are documented

- **WHEN** an Agent writes a `source.yaml` entry
- **THEN** guidance SHALL require `url`, `title`, `retrieved_date`, and `topic_tag`
- **AND** guidance SHALL state that `retrieved_date` is a string date and `topic_tag` is a string tag usable by gate diagnostics

#### Scenario: YAML serialization guidance avoids common parse failures

- **WHEN** an Agent writes field values containing colons, semicolons, arrows, brackets, or long prose
- **THEN** guidance SHALL instruct it to quote or block-string those values using YAML-safe syntax
- **AND** diagnostics SHALL prefer parser-aligned repair language over generic "cannot parse YAML array"

#### Scenario: Reference metadata uses canonical YAML frontmatter

- **WHEN** an Agent writes `reference/*.md`
- **THEN** guidance SHALL show an opening YAML frontmatter mapping as the accepted metadata form parsed by the shared reference metadata reader
- **AND** it SHALL distinguish legacy bullet compatibility from the canonical new-output form

#### Scenario: Source intake does not receive a current rich-reference completion contract

- **WHEN** a Wave0 source-intake actor receives a newly generated task
- **THEN** its role guidance SHALL describe only its assigned source/cache/result/receipt obligations
- **AND** it SHALL not receive a shared-reference template or an actor-owned `reference` output declaration as a current completion route

#### Scenario: Wave0 Phase materialization uses submitted backing

- **WHEN** Wave0 convergence identifies a materializable submitted source identity
- **THEN** Phase guidance SHALL use the shared reference template only after formal submit and bind the rendered reference to that exact backing
- **AND** it SHALL rerun the same inspect rather than claim that the template or index row is evidence authority

#### Scenario: Wave1 rerun repair uses normal materialization contract

- **WHEN** Wave1 rerun inspect reports UID binding or index-table drift for historical references
- **THEN** the Phase Agent SHALL repair the named reference projection or index table and rerun the same inspect
- **AND** it SHALL NOT enqueue research solely to change metadata spelling, mass-rewrite already covered historical references, or ask the user to execute the mechanical repair

## ADDED Requirements

### Requirement: Wave0 Phase-owned shared references SHALL preserve exact submitted source backing

A current Wave0 `reference/00-shared-*.md` may be a Phase-owned consumer projection only after formal submit. Its normal metadata `source_url` and scannable body backing SHALL together bind to one exact retained submitted Wave0 source identity, `<work_id>/<ordinal>`, and to the authenticated source YAML, source URL, cache, result, and work-unit coordinates returned by the existing submitted-backing reader. For one current direct source array with retained prefix contributions, that reader SHALL preserve ledger-ordered accepted source-contribution ownership across prior and current rerun submissions; generic current-round work-unit eligibility SHALL NOT make a later append re-own an earlier ordinal. The body SHALL carry that exact coordinate with the returned backing refs; `source_url` alone is not a source selector. A compatible historical delegated reference continues to use its own submitted output declaration and need not be rewritten as a Phase-owned projection.

The reference file and `_INDEX.md` row SHALL remain reader navigation surfaces. They SHALL not become submitted authority, hide a source-identity collision, or authorize a projection from a URL-only, cache-only, unsubmitted, ambiguous, superseded, filesystem-only, or hand-edited backing claim. This requirement SHALL reuse the existing reference metadata/index format and artifact-persistence boundary; it SHALL not add a new metadata key, index column, source catalog, or reference authority.

#### Scenario: Phase-owned Wave0 reference is backed by one submitted identity

- **WHEN** the Phase Agent materializes a Wave0 shared reference from one authenticated `work-a/7` source identity
- **THEN** the reference metadata and body SHALL identify the submitted source URL and scannable source/cache/work-unit backing for `work-a/7`
- **AND** the reference may be synchronized into `_INDEX.md` without the index row becoming evidence authority

#### Scenario: URL equality alone cannot materialize a projection

- **WHEN** two submitted source contributions contain the same URL or an unsubmitted source YAML contains a matching URL
- **THEN** Phase-owned materialization SHALL require one exact authenticated source identity rather than URL equality alone
- **AND** ambiguous or unsubmitted backing SHALL not create a countable reference

#### Scenario: a later rerun append preserves its prior submitted source identity

- **WHEN** an accepted Wave0 contribution owns source identities `work-a/1` through `work-a/19` and a later rerun submits the retained array plus one new source
- **THEN** the submitted-backing reader SHALL continue to resolve the prior retained identities through `work-a`
- **AND** it SHALL resolve only ordinal `20` through the later work unit rather than re-owning `work-a/1` through the later submission

#### Scenario: legacy delegated reference remains readable

- **WHEN** a historical Wave0 shared reference is declared by a successfully submitted legacy work-unit row
- **THEN** it SHALL remain valid through the recorded delegated-output provenance path
- **AND** Phase materialization SHALL not require a rewrite or duplicate projection
