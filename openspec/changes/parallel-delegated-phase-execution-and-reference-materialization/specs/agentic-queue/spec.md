> req: AGQ-022

## ADDED Requirements

### Requirement: Wave delegated queue loops SHALL prefer bounded batched claims for independent demand

Wave0 and Wave1 queue-loop guidance SHALL instruct the Phase Agent to claim independent eligible delegated demand in bounded batches rather than treating `--count 1` as the normal drain strategy. The Phase Agent SHALL compute an explicit claim count from an accepted profile/runtime cap when available, otherwise from the currently available independent delegated demand, capped by a conservative documented default no higher than 5.

The Engine SHALL remain the sole allocator of work-unit IDs. Batched execution SHALL still use `operate-work-unit claim --count <N>`, one Engine-created work unit per delegated queue demand, and successful completion through `operate-work-unit submit`. The queue active window, refill pool, and delegated in-flight bindings remain the authority; batching SHALL NOT introduce another scheduler or let Sub-agents allocate IDs.

`--count 1` MAY be used when only one eligible item remains, when dependency/queue-front ordering blocks a larger batch, when an accepted cap is 1, or for a narrow repair attempt. Phase guidance SHALL NOT present serial `--count 1` as the default strategy for independent topic source intake or topic deepening.

#### Scenario: Wave0 claims independent source-intake work in a batch

- **WHEN** Wave0 has multiple independent `wave0_source_intake` queue items eligible at the queue front
- **THEN** phase guidance SHALL instruct the Phase Agent to compute a bounded cap and call `operate-work-unit claim --count <cap>`
- **AND** the returned prompts SHALL be fanned out as distinct Engine-allocated work units

#### Scenario: Wave1 claims independent topic-deepening work in a batch

- **WHEN** Wave1 has multiple independent `wave1_topic_deepening` queue items eligible at the queue front
- **THEN** phase guidance SHALL instruct the Phase Agent to claim a bounded batch before waiting for the first topic to submit
- **AND** out-of-order submit SHALL remain valid because each attempt is bound by `work_id`

#### Scenario: batching does not change CLI default authority

- **WHEN** `operate-work-unit claim` is invoked without an explicit `--count`
- **THEN** this change SHALL NOT require the CLI to infer active-window length or change its default behavior
- **AND** Phase Agent guidance SHALL be responsible for passing an explicit count when independent batching is desired

#### Scenario: dependent or single-item work can remain serial

- **WHEN** only one eligible delegated queue demand remains or the queue front is blocked by a non-independent item
- **THEN** using `--count 1` SHALL remain legal
- **AND** the phase SHALL still proceed through submit, repair, terminalization, inspect, and gate feedback rather than bypassing queue authority
