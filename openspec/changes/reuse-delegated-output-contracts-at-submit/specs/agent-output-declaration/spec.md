> req: AGO-007

## MODIFIED Requirements

### Requirement: Wave1 submitted ledger SHALL canonicalize required output roles

For `wave1_topic_deepening` submitted work units, the submitted ledger row SHALL use canonical roles for required Wave1 output paths before gate consumption:

- `artifacts/wave1/{topic}/evidence-summary.md` SHALL be represented as role `evidence_summary`.
- `artifacts/wave1/{topic}/question-list.md` SHALL be represented as role `question_list`.

For a new attempt carrying the current closed `assignment_contract_version`, the Engine-resolved exact output contract SHALL require each assigned direct output to be declared exactly once with its canonical role. A candidate that declares an assigned evidence-summary or question-list as role `other`, omits it, duplicates its normalized path, or assigns a conflicting role SHALL fail dry-submit/formal submit before ledger append. New attempts SHALL NOT normalize `other` into a canonical required role.

The existing `other -> canonical role` normalization SHALL remain only for a legacy attempt whose index record genuinely lacks `assignment_contract_version` because it was claimed before this contract existed. Legacy selection SHALL use that attempt-owned marker absence and its hash-bound manifest/index facts; it SHALL NOT infer compatibility from current framework version, bundle creation version, queue ID, path shape alone, or caller choice. The legacy submit transaction SHALL continue to emit a visible normalization diagnostic naming output path, submitted role, normalized canonical role, and reason.

The compatibility branch SHALL be narrow: it applies only to the two required Wave1 paths for the assigned legacy Topic. `other` SHALL remain valid for genuinely extra non-blocking outputs. This requirement SHALL NOT create a submitted-ledger amendment mechanism, artifact-byte authority, or a way to reinterpret a new attempt as legacy. Already-submitted rows with wrong roles remain immutable unless repaired by a future accepted amend path or by legal replacement/supplementary work-unit coverage.

#### Scenario: new evidence summary requires exact canonical role

- **WHEN** a current-version `wave1_topic_deepening` candidate declares its assigned evidence-summary with role `other`
- **THEN** dry-submit and formal submit SHALL reject before ledger append
- **AND** the diagnostic SHALL name the exact path, expected role `evidence_summary`, result role field, and same dry-submit rerun

#### Scenario: new question list requires exact canonical role

- **WHEN** a current-version `wave1_topic_deepening` candidate declares its assigned question-list with role `other`
- **THEN** submit SHALL NOT silently normalize the role
- **AND** no submitted row or queue completion SHALL be written until the candidate declares `question_list`

#### Scenario: legacy evidence summary role is normalized before ledger append

- **WHEN** a genuinely pre-contract `wave1_topic_deepening` attempt declares its assigned evidence-summary with role `other`
- **THEN** successful legacy submit SHALL append a ledger row whose declaration uses role `evidence_summary`
- **AND** submit diagnostics SHALL report the path, original role `other`, normalized role, and legacy compatibility reason

#### Scenario: legacy question list role is normalized before ledger append

- **WHEN** a genuinely pre-contract `wave1_topic_deepening` attempt declares its assigned question-list with role `other`
- **THEN** successful legacy submit SHALL append a ledger row whose declaration uses role `question_list`
- **AND** submit diagnostics SHALL report the path, original role `other`, normalized role, and legacy compatibility reason

#### Scenario: extra outputs may remain other

- **WHEN** a Wave1 result declares an additional non-required file with role `other`
- **THEN** submit SHALL NOT rewrite that extra output solely because required-path compatibility exists
- **AND** gate coverage SHALL NOT count the extra `other` output as required evidence-summary or question-list coverage

#### Scenario: unknown or removed marker cannot request legacy normalization

- **WHEN** an attempt has an unknown `assignment_contract_version`, a current marker with a missing contract, or a current marker removed from one envelope surface
- **THEN** submit SHALL fail closed as contract/envelope drift
- **AND** it SHALL NOT fall back to legacy role normalization

#### Scenario: historical submitted rows are not amended

- **WHEN** an existing ledger row already contains a required Wave1 path with role `other`
- **THEN** this change SHALL NOT require in-place ledger mutation
- **AND** repair SHALL use replacement/supplementary work-unit submit or a future accepted amend mechanism
