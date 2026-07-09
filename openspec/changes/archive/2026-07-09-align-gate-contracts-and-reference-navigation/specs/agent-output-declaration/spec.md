> req: AGO-007

## ADDED Requirements

### Requirement: Wave1 submitted ledger SHALL canonicalize required output roles

For `wave1_topic_deepening` submitted work units, the submitted ledger row SHALL use canonical roles for required Wave1 output paths before gate consumption:

- `artifacts/wave1/{topic}/evidence-summary.md` SHALL be represented as role `evidence_summary`.
- `artifacts/wave1/{topic}/question-list.md` SHALL be represented as role `question_list`.

If the submitted result declares either required path as role `other`, `operate-work-unit submit` SHALL deterministically normalize that ledger declaration before appending `rb_output_declarations.jsonl`. The submit transaction SHALL emit a visible normalization diagnostic in structured output, trace/log, or an equivalent Engine diagnostic surface. The diagnostic SHALL name the output path, submitted role, normalized canonical role, and reason. The normalization SHALL be narrow: it applies only to these required Wave1 paths for the assigned Wave1 topic. `other` SHALL remain valid for genuinely extra non-blocking outputs.

This requirement SHALL NOT create a general submitted-ledger amendment mechanism for historical bad rows. Already-submitted rows with wrong roles remain outside this change's migration scope unless repaired by a future accepted amend path or replacement/supplementary work-unit submit.

#### Scenario: evidence summary role is normalized before ledger append

- **WHEN** a `wave1_topic_deepening` result declares `artifacts/wave1/01_topic/evidence-summary.md` with role `other`
- **THEN** successful submit SHALL append a ledger row whose declaration for that path uses role `evidence_summary`
- **AND** submit diagnostics SHALL report the path, original role `other`, and normalized role `evidence_summary`

#### Scenario: question list role is normalized before ledger append

- **WHEN** a `wave1_topic_deepening` result declares `artifacts/wave1/01_topic/question-list.md` with role `other`
- **THEN** successful submit SHALL append a ledger row whose declaration for that path uses role `question_list`
- **AND** submit diagnostics SHALL report the path, original role `other`, and normalized role `question_list`

#### Scenario: extra outputs may remain other

- **WHEN** a `wave1_topic_deepening` result declares an additional non-required file with role `other`
- **THEN** submit SHALL NOT rewrite that extra output solely because required path normalization exists
- **AND** gate coverage SHALL NOT count the extra `other` output as required evidence-summary or question-list coverage

#### Scenario: historical submitted rows are not amended

- **WHEN** an existing ledger row already contains a required Wave1 path with role `other`
- **THEN** this change SHALL NOT require in-place ledger mutation
- **AND** repair SHALL use replacement/supplementary work-unit submit or a future accepted amend mechanism
