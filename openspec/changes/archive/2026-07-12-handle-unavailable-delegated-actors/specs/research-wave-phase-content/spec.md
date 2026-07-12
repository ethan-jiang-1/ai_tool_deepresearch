> req: RWP-019

## ADDED Requirements

### Requirement: Wave delegated execution SHALL use one visible actor decision loop

Wave0, Wave1, and Wave2 phase guidance and the shared work-unit protocol SHALL instruct the Phase Agent to use this order at each delegated claim decision: inspect the queue-front planned delegated role, make one small real host/native observation for that exact role, invoke the existing claim checkpoint with the normalized observation and chosen execution actor class, then either spawn a normal delegated batch, execute one explicitly allowed `phase_agent_fallback`, or stop on the returned no-claim blocker. Guidance SHALL NOT tell the Agent to claim a batch first and discover availability by spawning every attempt, and SHALL NOT reuse one role observation for different delegated roles.

When fallback is accepted by claim, the Phase Agent SHALL execute the single claimed work unit itself without asking the user to run work-unit commands, then submit or terminalize it before claiming another fallback. When the kind policy prohibits fallback or the blocker is an external account, host policy, or permission that the Agent cannot change, guidance SHALL escalate only that smallest external action to the user and resume the same claim checkpoint afterward. `human-directed` SHALL NOT be presented as availability evidence, actor-policy override, or fallback permission.

#### Scenario: Wave0 probes before bounded source-intake claim

- **WHEN** Wave0 has independent source-intake demand and no current actor observation
- **THEN** phase guidance SHALL direct one bounded native observation before `operate-work-unit claim`
- **AND** it SHALL not create multiple claimed attempts merely to test availability

#### Scenario: Wave2 targeted evidence uses the same role-bound decision loop

- **WHEN** Wave2 has `wave2_targeted_evidence` demand
- **THEN** phase guidance SHALL observe the planned `dpt-topic-scout` actor before claim
- **AND** any accepted fallback SHALL remain a single work-unit attempt under the kind actor policy

#### Scenario: Phase Agent executes accepted fallback mechanically

- **WHEN** claim returns work units bound to `phase_agent_fallback`
- **THEN** the Phase Agent SHALL read each generated task/beacon, perform the bounded work, emit actor-bound receipts, and run dry-submit/formal submit
- **AND** it SHALL submit or terminalize that attempt before claiming another fallback
- **AND** it SHALL not ask the user to execute those ordinary commands

#### Scenario: External host blocker escalates minimally

- **WHEN** the delegated actor is unavailable, fallback is not selected, and resolution requires a non-delegable host/account action
- **THEN** guidance SHALL ask the user only for that external action or decision
- **AND** after resolution the Agent SHALL rerun the same claim checkpoint itself
