> req: DEW-003

## MODIFIED Requirements

### Requirement: Work-unit claim SHALL bind queue demand and lease

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move queue demand into `delegated_in_flight`, write effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but Sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

Successful claim stdout SHALL include a static Agent-facing continuation cue for the immediate post-claim decision point: `interaction: prohibited` and `next_action: inspect_and_poll_claimed_work`. The cue SHALL list or bind to the claimed `work_id` values already returned by claim, SHALL NOT infer readiness, and SHALL NOT add persistent work-unit state.

#### Scenario: claim creates in-flight attempt

- **WHEN** an eligible delegated queue demand item is claimed
- **THEN** the Engine SHALL create the work-unit envelope
- **AND** the queue demand SHALL be present in `delegated_in_flight` with the allocated `work_id`

#### Scenario: claim output directs immediate polling

- **WHEN** claim succeeds for one or more work units
- **THEN** stdout SHALL identify the claimed work ids
- **AND** continuation SHALL direct the Phase Agent to inspect/poll them without waiting for user input or task notification
