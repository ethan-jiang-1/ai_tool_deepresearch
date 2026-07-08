## MODIFIED Requirements

> req: RWG-002, RWG-003, RWG-005, RWG-006

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
