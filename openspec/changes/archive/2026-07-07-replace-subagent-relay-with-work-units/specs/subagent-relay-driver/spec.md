## REMOVED Requirements

### Requirement: A driver CLI SHALL orchestrate the relay slot lifecycle end-to-end

**Reason**: Relay slot lifecycle is replaced by work-unit lifecycle.

**Migration**: Use `operate-work-unit` lifecycle commands.

#### Scenario: old driver command is not accepted in production docs

- **WHEN** active production docs describe delegated lifecycle
- **THEN** they SHALL describe work-unit lifecycle commands

### Requirement: Driver SHALL not perform search, evidence judgment, or routing

**Reason**: The relay driver is removed as a production entrypoint. The boundary principle remains: Engine commands do not perform research judgment.

**Migration**: `operate-work-unit` SHALL remain deterministic and SHALL NOT perform search, evidence judgment, synthesis, or routing decisions.

#### Scenario: work-unit CLI is deterministic only

- **WHEN** `operate-work-unit submit` validates a result
- **THEN** it SHALL validate deterministic contracts
- **AND** it SHALL NOT judge the research conclusion

### Requirement: Driver SHALL not bypass engine validation

**Reason**: The old driver is replaced; the validation boundary moves to `operate-work-unit`.

**Migration**: `operate-work-unit submit` SHALL pass result through Engine validation unchanged.

#### Scenario: submit does not hand-author result

- **WHEN** a result is submitted
- **THEN** the Engine SHALL validate the result file provided
- **AND** it SHALL NOT synthesize a passing result on behalf of the Agent

### Requirement: Driver invocation SHALL produce engine-side trace that hand-faking cannot

**Reason**: Trace proof is now produced by work-unit claim/submit/fail/timeout/abandon events and receipt nonce binding.

**Migration**: Use work-unit trace/log events and submit-written ledger fingerprints.

#### Scenario: work-unit lifecycle emits trace

- **WHEN** a work unit is claimed and submitted
- **THEN** engine-side trace/log events SHALL bind `work_id`, `queue_item_id`, and `receipt_nonce`
