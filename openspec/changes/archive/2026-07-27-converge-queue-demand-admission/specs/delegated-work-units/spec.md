> req: DEW-003

## MODIFIED Requirements

### Requirement: Work-unit claim SHALL bind queue demand and lease

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move queue demand into `delegated_in_flight`, write effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but Sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

Before allocating a work ID, opening or incrementing a batch, moving queue demand, creating an envelope, or emitting claim success, claim SHALL invoke the shared current delegated queue-demand admission evaluator for every candidate in its planned contiguous prefix. A candidate SHALL declare one supported work-unit kind and claim SHALL NOT supply a kind from its requested phase. It SHALL use the evaluator's current canonical binding and resolved assignment facts rather than a prior enqueue/check verdict or caller-supplied binding. Any rejected candidate SHALL reject the entire planned batch without queue, index, batch-counter, envelope, delegated-in-flight or success-trace mutation.

Successful claim stdout SHALL include a static Agent-facing top-level `continuation` object for the immediate post-claim decision point with `next_action: inspect_and_poll_claimed_work`. Because claim validates queue/work-unit phase demand but does not read or establish the current lifecycle node's `stop` authority, its continuation SHALL omit `interaction` rather than hardcode a second interaction-placement truth. The already-loaded lifecycle phase/header/cue continues to control whether the framework may initiate user-facing output.

The cue SHALL include `work_ids` equal to the already returned `claimed_work_ids`, SHALL NOT be nested inside queue/index authority objects, SHALL NOT infer readiness, SHALL NOT complete work, and SHALL NOT add persistent work-unit, interaction, message, or pause state. Empty or failed claims SHALL NOT emit a successful continuation cue.

#### Scenario: claim creates in-flight attempt

- **WHEN** an eligible delegated queue demand item is claimed
- **THEN** the Engine SHALL create the work-unit envelope
- **AND** the queue demand SHALL be present in `delegated_in_flight` with the allocated `work_id`

#### Scenario: claim output directs immediate polling

- **WHEN** claim succeeds for one or more work units
- **THEN** stdout SHALL identify the claimed work ids
- **AND** continuation SHALL direct the Phase Agent to inspect/poll the claimed work without waiting for user input, acknowledgement, or task notification
- **AND** continuation SHALL omit `interaction` and SHALL NOT create chat-interception or interaction authority

#### Scenario: empty claim does not emit successful continuation

- **WHEN** claim returns `claimed_count: 0`
- **THEN** stdout SHALL NOT include a continuation cue that says claimed work should be inspected or polled
- **AND** queue/index authority SHALL remain the source of truth for why no work was claimed

#### Scenario: claim rechecks an admitted card against current authority

- **WHEN** a delegated card was previously enqueued but its current canonical Topic/finding binding, explicit kind, or assignment contract no longer admits it
- **THEN** claim SHALL reject it before any allocation or queue mutation
- **AND** it SHALL not treat the prior enqueue success as authority

#### Scenario: one rejected candidate preserves batch atomicity

- **WHEN** a later candidate in a planned contiguous claim batch is rejected by shared admission
- **THEN** claim SHALL allocate zero work IDs and leave every candidate unclaimed
- **AND** it SHALL report the rejected queue item and direct admission reason
