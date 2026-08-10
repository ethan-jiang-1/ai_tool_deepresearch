## MODIFIED Requirements

### Requirement: Wave delegated queue loops SHALL prefer bounded batched claims for independent demand

> req: AGQ-022

Wave0, Wave1, and Wave2 queue-loop guidance SHALL instruct the Phase Agent to claim independent eligible delegated demand in bounded batches rather than treating `--count 1` as the normal drain strategy. The `ProfileSchema`-parsed run profile SHALL be the direct Source of Record for this policy. An explicit `rb_profile.yaml#/delegated_concurrency_cap` SHALL be its persisted override; `ProfileSchema` SHALL accept only an integer from `1` through `20`, and SHALL supply `12` as the effective value when the field is omitted. No CLI option or environment variable SHALL override that parsed profile value.

The Phase Agent SHALL compute `claim_count = min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)`. The explicit claim count SHALL top up available parallel capacity rather than blindly claim all remaining demand. If reconstructed normal delegated in-flight work already reaches the effective cap, phase guidance SHALL poll, submit, repair, or terminalize existing attempts before claiming more.

The Engine SHALL remain the sole allocator of work-unit IDs. Batched execution SHALL still use `operate-work-unit claim --count <N>`, one Engine-created work unit per delegated queue demand, and successful completion through `operate-work-unit submit`. The queue active window, refill pool, delegated in-flight bindings, actor preflight, admission, and transaction checks remain the authority. Batching SHALL NOT introduce another scheduler, host-capacity probe, queue state, or sub-agent ID allocation path.

`phase_agent_fallback` SHALL retain its existing claim count of exactly one regardless of the profile cap. `--count 1` MAY be used when only one eligible item remains, when dependency or queue-front ordering blocks a larger batch, when the accepted cap is `1`, or for a narrow repair attempt. Phase guidance SHALL NOT present serial `--count 1` as the default strategy for independent topic source intake, topic deepening, or targeted evidence demand.

The cap SHALL limit only the number of Engine-created work-unit prompts the Phase Agent may request in one normal delegated top-up. A claim count, prompt handoff, or deterministic test SHALL NOT be presented as proof that a host started, kept live, or physically ran that many native sub-agents concurrently.

#### Scenario: Wave0 claims independent source-intake work in a batch

- **WHEN** Wave0 has multiple independent `wave0_source_intake` queue items eligible at the queue front
- **THEN** phase guidance SHALL compute the bounded effective claim count and call `operate-work-unit claim --count <claim-count>`
- **AND** the returned prompts SHALL be fanned out as distinct Engine-allocated work units

#### Scenario: Wave1 claims independent topic-deepening work in a batch

- **WHEN** Wave1 has multiple independent `wave1_topic_deepening` queue items eligible at the queue front
- **THEN** phase guidance SHALL claim the profile-bounded batch before waiting for the first topic to submit
- **AND** out-of-order submit SHALL remain valid because each attempt is bound by `work_id`

#### Scenario: Wave2 uses the shared profile cap for targeted evidence

- **WHEN** Wave2 has multiple independent delegated targeted-evidence queue items eligible at the queue front
- **THEN** its phase guidance and the shared sub-agent protocol SHALL use the same effective profile cap and top-up formula
- **AND** Wave2 SHALL retain its existing role, topic/finding admission, and actor-preflight constraints

#### Scenario: profile default supports seven independent claims

- **WHEN** a parsed run profile omits `delegated_concurrency_cap`, seven independent eligible demands are available, and no normal delegated attempts are in flight
- **THEN** the effective cap SHALL be `12` and phase guidance SHALL permit a proposed `claim --count 7`
- **AND** the proposal SHALL remain subject to the existing Engine admission and actor-preflight result

#### Scenario: claim count tops up available capacity

- **WHEN** a phase has an effective cap of `12`, already has three normal delegated attempts in flight, and more independent eligible demand remains
- **THEN** phase guidance SHALL instruct the Phase Agent to claim at most nine additional work units before polling, submitting, repairing, or terminalizing again
- **AND** it SHALL NOT claim a full cap-sized batch while in-flight work is already occupying capacity

#### Scenario: fallback remains one work unit

- **WHEN** actor preflight permits `phase_agent_fallback`, the profile cap is `12`, and seven eligible delegated demands are available
- **THEN** `operate-work-unit claim` SHALL retain its existing one-work-unit fallback result
- **AND** the other eligible demand SHALL remain unclaimed under existing queue authority

#### Scenario: batching does not change CLI default authority

- **WHEN** `operate-work-unit claim` is invoked without an explicit `--count`
- **THEN** this change SHALL NOT require the CLI to infer active-window length or change its default behavior
- **AND** Phase Agent guidance SHALL be responsible for passing an explicit count when independent batching is desired

#### Scenario: dependent or single-item work can remain serial

- **WHEN** only one eligible delegated queue demand remains or the queue front is blocked by a non-independent item
- **THEN** using `--count 1` SHALL remain legal
- **AND** the phase SHALL still proceed through submit, repair, terminalization, inspect, and gate feedback rather than bypassing queue authority
