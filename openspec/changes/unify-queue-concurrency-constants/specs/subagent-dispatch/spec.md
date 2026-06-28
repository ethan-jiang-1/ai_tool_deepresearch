> req: SUD-002

## MODIFIED Requirements

### Requirement: V1 dispatch enforces MAX_CONCURRENT_SUBAGENTS concurrency cap

The Relay concurrency cap SHALL be defined by `MAX_CONCURRENT_SUBAGENTS` in `DPT_FRAMEWORK/engine/subagent-relay.mjs` as the single source of truth. Documentation SHALL reference this definition rather than hardcoding stale values. Queue active-window length SHALL NOT be used as the Relay concurrency cap or work pool.

#### Scenario: Slots within cap are accepted

- **WHEN** the number of requested Relay slots is within `MAX_CONCURRENT_SUBAGENTS`
- **THEN** dispatch SHALL proceed without error

#### Scenario: Slots exceeding cap are rejected

- **WHEN** the number of requested Relay slots exceeds `MAX_CONCURRENT_SUBAGENTS`
- **THEN** dispatch SHALL throw an error with a message indicating the cap

### Requirement: Queue-driven Relay dispatch uses the current Queue task payload

For Queue-driven dynamic Sub-agent dispatch, the Phase Agent SHALL claim the current Queue task and map that task's delegated or batch payload to Relay `SlotConfig` entries. Pending Queue slots SHALL remain Queue preview/depth only; they SHALL NOT be read as a Relay work pool.

#### Scenario: Batch payload mapped to Relay SlotConfig

- **WHEN** the current Queue task contains N batch items that require Sub-agent work
- **THEN** the Phase Agent SHALL map those batch items to Relay `SlotConfig` entries
- **AND** stage Relay slots for execution within `MAX_CONCURRENT_SUBAGENTS`
- **AND** leave pending Queue slots unclaimed and unexecuted

#### Scenario: Collect completes the current Queue task

- **WHEN** Relay slot results for the current delegated or batch Queue task have been committed and verified
- **THEN** the Phase Agent SHALL complete the current Queue task through the normal Queue `complete()` contract
- **AND** SHALL NOT call `complete()` for pending Queue slots out of order
