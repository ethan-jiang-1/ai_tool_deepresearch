## MODIFIED Requirements

### Requirement: Work-unit claim SHALL bind queue demand and lease

> req: DEW-003

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move queue demand into `delegated_in_flight`, write effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but Sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

Before allocating a work ID, opening or incrementing a batch, moving queue demand, creating an envelope, or emitting claim success, claim SHALL invoke the shared current delegated queue-demand admission evaluator for every candidate in its planned contiguous prefix. Each candidate SHALL declare one supported work-unit kind; claim SHALL NOT infer it from requested phase. Claim SHALL use the evaluator's current canonical binding and resolved assignment facts. A rejected candidate SHALL reject the complete planned batch with no queue, index, batch-counter, envelope, delegated-in-flight, or success-trace mutation.

For a planned Wave0 prefix, claim SHALL also supply the shared evaluator with fresh non-terminal target facts from existing queued demand, delegated in-flight work, and earlier candidates in that same planned prefix. Unclaimed targets SHALL come from current canonical assignment resolution; an in-flight owner's target SHALL come from its validated current-profile queue/index binding and immutable manifest output contract. If two candidates resolve through their canonical assignment contracts to the same exact `source_yaml` target, or a candidate resolves to a target already owned by delegated in-flight work, the complete requested batch SHALL be rejected before mutation. The response SHALL identify the candidate queue ID, exact target, queue-order-earliest or in-flight owner identity, `reason_code: wave0_source_target_conflict`, the existing admission `repair_kind: agent_action`, and a same-claim rerun after the Agent claims a conflict-free prefix or completes the disclosed in-flight owner's existing submit/repair/terminalization loop. It SHALL NOT reuse the attempt-recovery `wait` enum or advise changing a queue ID, task prose, cache trail, URL, ledger row, or source array to manufacture independence.

An older queue that already contains multiple same-target Wave0 demands SHALL remain drainable without migration: a claim whose planned prefix contains only the queue-order-earliest currently unowned target MAY proceed; later same-target demand remains queued and becomes eligible only after fresh admission observes no earlier queued owner and no in-flight owner. No persistent target lock, scheduler state, or queue rewrite SHALL be introduced.

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

#### Scenario: claim rechecks current delegated authority

- **WHEN** a previously enqueued delegated card no longer admits under current canonical binding, explicit kind, assignment contract, or Wave0 target exclusivity
- **THEN** claim SHALL reject it before allocation or queue mutation

#### Scenario: one rejected candidate preserves batch atomicity

- **WHEN** a later candidate in a planned contiguous claim batch is rejected by shared admission, including a same-target Wave0 candidate
- **THEN** claim SHALL allocate zero work IDs and leave every candidate unclaimed

#### Scenario: distinct Wave0 targets remain batchable

- **WHEN** every Wave0 candidate in a planned prefix resolves to a distinct exact source target and none is owned by delegated in-flight work
- **THEN** target exclusivity SHALL not reduce the otherwise legal requested batch
- **AND** existing actor, admission, capacity, and transaction checks SHALL retain their authority

#### Scenario: legacy duplicate target queue drains serially

- **WHEN** an existing queue contains two Wave0 demands for the same target and no attempt currently owns that target
- **THEN** a conflict-free claim of the queue-order-earliest demand MAY succeed
- **AND** the later demand SHALL remain unclaimed until the earlier attempt terminalizes and fresh claim admission passes
