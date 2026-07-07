## REMOVED Requirements

### Requirement: Slot lifecycle with four states

**Reason**: Delegated attempt lifecycle is replaced by work-unit attempt statuses and terminal transitions.

**Migration**: Use delegated-work-units and framework-engine requirements for `claimed`, `submitted`, `failed`, `timed_out`, and `abandoned` attempt state.

#### Scenario: lifecycle is work-unit based

- **WHEN** delegated attempt status is evaluated
- **THEN** the Engine SHALL read the work-unit index and transaction state

### Requirement: Slot paths include task, schema, result, status, and agent metadata

**Reason**: Production delegated runtime surfaces are work-unit envelopes, not slot path derivations.

**Migration**: Use work-unit directory and envelope requirements for task, schema, result, status, agent metadata, beacon, and manifest files.

#### Scenario: runtime surfaces are work-unit based

- **WHEN** delegated runtime files are located
- **THEN** the Engine SHALL resolve them from the work-unit manifest and index

### Requirement: Agent metadata records native runtime usage

**Reason**: Native runtime metadata is now optional work-unit `runtime_refs` diagnostic data.

**Migration**: Store platform-specific runtime IDs, thread IDs, sessions, spawn IDs, and cancel handles as optional work-unit runtime refs.

#### Scenario: runtime metadata is diagnostic

- **WHEN** native runtime metadata is available
- **THEN** it SHALL be recorded as work-unit diagnostic context without becoming gate authority
