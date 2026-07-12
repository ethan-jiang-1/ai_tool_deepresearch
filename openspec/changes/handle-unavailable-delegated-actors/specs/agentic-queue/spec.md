> req: AGQ-024

## ADDED Requirements

### Requirement: Delegated queue demand SHALL remain unclaimed until actor preflight permits allocation

Wave0, Wave1, and Wave2 delegated loops SHALL submit one current role-bound actor observation and execution actor choice to the existing work-unit claim checkpoint before queue demand is moved into delegated in-flight state. Claim SHALL first preview a homogeneous contiguous queue-front candidate prefix for the observed delegated role. An actor-preflight no-claim verdict SHALL leave `active_window`, `refill_pool`, `delegated_in_flight`, terminal history, batch counters, and pending demand semantics unchanged except for existing diagnostic trace/log behavior.

The effective claim count for an allowed normal delegated branch SHALL continue to obey existing independent-demand and delegated-capacity limits. An allowed `phase_agent_fallback` branch SHALL claim exactly one queue-front item and leave remaining eligible demand unclaimed. Actor availability SHALL NOT add another queue, scheduler, retry pool, priority class, or persistent availability field to `rb_queue.json`.

Fallback SHALL be attempt-level execution metadata, not a queue-demand rewrite. `targets.controller`, `targets.delegates`, kind, producer rule, payload, lineage, and queue item identity SHALL remain unchanged when a fallback attempt is claimed.

#### Scenario: Unavailable actor preserves eligible queue demand

- **WHEN** five eligible delegated queue items exist and actor preflight returns no-claim for unavailable delegated execution
- **THEN** all five items SHALL remain eligible and unclaimed
- **AND** no delegated in-flight binding or failed work-unit attempt SHALL be created

#### Scenario: Fallback claim is single-attempt degradation

- **WHEN** actor preflight permits `phase_agent_fallback`, requested count is five, and free delegated capacity is five
- **THEN** claim SHALL allocate exactly one existing queue demand
- **AND** it SHALL leave the other four demands unclaimed without introducing a fallback queue

#### Scenario: Mixed delegated roles are not covered by one observation

- **WHEN** requested queue-front demand contains a `dpt-source-intake` prefix followed by a different delegated role
- **THEN** one source-intake observation SHALL authorize only the homogeneous source-intake prefix
- **AND** the later role SHALL require its own current observation at a later claim decision

#### Scenario: Availability recovery resumes through the same queue demand

- **WHEN** a prior unavailable preflight allocated no work and a later current observation reports the delegated actor available
- **THEN** the Agent MAY rerun normal claim against the same queue demand without hand-editing queue/index/ledger state
- **AND** work IDs SHALL be allocated only by that later successful claim
