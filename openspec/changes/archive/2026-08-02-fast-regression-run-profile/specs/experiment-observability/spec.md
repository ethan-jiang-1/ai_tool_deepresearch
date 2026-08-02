> req: EXO-007

## MODIFIED Requirements

### Requirement: Retained reports bind selection observations to an execution surface

Every newly written Autorun per-case audit event and retained batch report SHALL include a versioned execution-surface identity and the selection observation that caused the case to be selected. The identity SHALL bind the current selected source playbook, injected instruction, manifest entry, and the named framework/host helper bytes that participate in preparation, launch, completion validation, health, audit, and report production. The selection observation SHALL identify exact selector or run profile, prediction basis, and selection reason without inventing a result.

For this change, the existing outer `agent-experiment-batch-report/v2` and v2 audit-event contracts remain the durable result envelopes. Newly written selection observations SHALL use a versioned v2 form that records `regression_intent` as `normal` or `qualification` only when `profile` is `regression`, and as null otherwise. Readers SHALL continue to accept v1 selection observations and all retained v1/v2 report envelopes; a historical v1 report remains a historical observation with unknown execution-surface relation, not a regression membership claim.

Outcome, lifecycle, Agent process, health, cleanup, duration, and cost SHALL remain orthogonal report facts. In particular, a regression selection observation or later admission comparison SHALL NOT turn PASS plus ISSUES into FAIL, turn FAIL into diagnostic-only success, suppress a native/lifecycle result, or itself authorize cleanup.

#### Scenario: Qualification intent remains auditable without becoming an outcome

- **WHEN** an explicitly qualified regression case writes a v2 audit event or retained report
- **THEN** its selection observation identifies `profile: regression` and `regression_intent: qualification`
- **AND** native outcome, health, duration, and cost remain separate runtime facts

#### Scenario: Earlier selection observations remain readable

- **WHEN** a retained v2 report carries the pre-existing v1 selection observation form
- **THEN** the reader accepts it as a valid retained observation
- **AND** it does not manufacture regression intent for that historical result

#### Scenario: A regression health breach remains an observation, not a rewritten verdict

- **WHEN** a regression-selected case records native PASS and health ISSUES
- **THEN** the retained report preserves PASS and ISSUES as separate facts
- **AND** a later regression projection reports the health breach as `ineligible` rather than manufacturing native FAIL
