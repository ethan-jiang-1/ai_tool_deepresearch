> req: WTS-009

## MODIFIED Requirements

### Requirement: Cross-topic scan matrix as process evidence surface

The cross-topic scan matrix remains process evidence for synthesis. It SHALL NOT substitute for work-unit ledger coverage when new delegated targeted evidence search was performed.

The scan matrix SHALL also be the deterministic process surface that shows pure synthesis was not skipped. It SHALL cover expected topic pairs or the explicitly documented reduced coverage allowed by `rb_profile.yaml`, list checked dimensions, and connect rows to finding IDs or `none`.

For deterministic Gate evaluation, checked pair identity SHALL be projected into `finding-index.yaml#/synthesis_eligibility/scan_topic_pair_coverage`. `cross-topic-ledger.md` remains the Agent-readable reasoning/process surface, but Gate code SHALL NOT infer blocking pair facts from Markdown prose, topic-slug substring presence, or pair-row formatting.

The accepted pair coverage container MAY remain an array or object. Array entries SHALL use `{ pair: [topicA, topicB], refs?: [...] }`. The only accepted object form SHALL be `{ pairs: [<same entries>] }`. Single-entry objects, arbitrary object maps, object-key pair encodings, and free-text pair encodings SHALL be invalid. One normalizer SHALL map both accepted container forms to canonical unordered topic keys through accepted topic-layout facts: UID when present, otherwise an evaluator-local stable legacy key derived from canonical id/current slug. Current or previous layout tokens SHALL resolve to the same topic key, and diagnostics SHALL use current slugs.

For every run, malformed entries, self-pairs, unknown topics, and duplicate unordered pairs SHALL fail the structured pair contract. `scan.topic_count` SHALL equal the canonical topic registry count. `scan.pair_count_expected` SHALL equal `C(topic_count,2)`. `scan.pair_count_checked` SHALL be an integer between zero and `pair_count_expected` and equal the observed unique normalized pair count. When topic count is greater than one, the observed set SHALL contain at least one pair to prove scan was not wholly skipped. These parent/identity/count/process-presence failures protect required structured authority or binding and SHALL NOT be degradation-eligible.

These general structural rules SHALL NOT impose universal full-pair coverage on an ordinary first-run or `action:supplement`. `wave2_cross_topic_depth: 0` means no material cross-topic connection is required, not that a multi-topic scan may be empty. The profile's remaining reduced-coverage quality semantics stay with the accepted Agent self-check unless a separate deterministic checked-dimension contract is introduced. When the existing shared direction resolver activates rerun `action:add`, the same normalized fact result SHALL instead be compared with the complete canonical pair universe as required by the full re-synthesis contract.

#### Scenario: scan matrix cannot cover delegated search

- **WHEN** delegated targeted evidence search produced a file
- **THEN** the scan matrix SHALL NOT make that file gate-authoritative without submitted work-unit coverage

#### Scenario: missing scan matrix blocks pure synthesis pass

- **WHEN** `synthesis.md` exists but `cross-topic-ledger.md` lacks a scan matrix or `finding-index.yaml` lacks scan coverage
- **THEN** Wave2 SHALL fail deterministic structure/preflight checks
- **AND** diagnostics SHALL instruct the Agent to complete scan matrix and triage before synthesis

#### Scenario: accepted container forms share one pair grammar

- **WHEN** equivalent `{pairs: [...]}` object-wrapper and direct array coverage contain the same structured pair entries
- **THEN** the normalizer SHALL produce the same canonical unordered pair set and count
- **AND** object keys or Markdown prose SHALL NOT create additional pair facts

#### Scenario: unsupported object maps fail closed

- **WHEN** pair coverage uses a single-entry object, arbitrary object map, or key-encoded pair instead of `{pairs: [...]}`
- **THEN** the normalizer SHALL report one container/entry-shape root
- **AND** it SHALL NOT guess pair identity from object keys

#### Scenario: legacy topic registry has an in-memory pair identity

- **WHEN** a supported legacy topic registry lacks topic UIDs
- **THEN** current or previous layout tokens SHALL normalize through an evaluator-local stable legacy topic key
- **AND** the Engine SHALL NOT require a new persistent UID field merely to evaluate pair structure

#### Scenario: profile-reduced coverage remains a distinct policy

- **WHEN** ordinary Wave2 checked coverage is non-empty but intentionally smaller than `pair_count_expected` under accepted reduced-profile semantics
- **AND** `pair_count_checked` matches the observed unique structured entries
- **THEN** the general pair-fact contract SHALL pass its structural slice
- **AND** it SHALL NOT report full-pair coverage or deterministic profile-depth proof
