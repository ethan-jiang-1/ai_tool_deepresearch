> req: RWP-015

## ADDED Requirements

### Requirement: Wave phase bodies SHALL teach batch-poll-submit loops and Phase-owned reference materialization

Wave0, Wave1, and Wave2 phase Markdown SHALL describe delegated work as a continuous Phase Agent loop: fill queue demand, claim eligible independent work units in bounded batches where applicable, spawn bounded Sub-agents, actively poll runtime work-unit readiness, submit ready attempts, repair or terminalize rejected/expired attempts, materialize Phase-owned projections after successful submit, and run the phase gate only after queue demand and delegated in-flight work are drained.

Wave0 and Wave1 phase bodies SHALL NOT present `claim --count 1` as the normal strategy for independent topics. Wave1 phase body SHALL state that topic references are Phase-owned consumer projections materialized after successful work-unit submit from submitted source claims/cache/ledger rows. Wave2 phase body SHALL state that pure synthesis may materialize `reference/00-cross-*.md` only from concrete existing Wave0/Wave1 submitted backing, while new external evidence must use `wave2_targeted_evidence`.

#### Scenario: Wave0 and Wave1 phase docs teach batched delegated claim

- **WHEN** the Phase Agent reads Wave0 or Wave1 delegated drain guidance
- **THEN** it SHALL see instructions to compute a bounded batch count for independent eligible work
- **AND** it SHALL not see serial `--count 1` presented as the default drain loop

#### Scenario: phase docs teach active polling after spawn

- **WHEN** a phase doc instructs the Phase Agent to spawn background Sub-agents
- **THEN** it SHALL also instruct the Phase Agent to poll work-unit files or inspect output for readiness
- **AND** ready attempts SHALL be submitted through `operate-work-unit submit` without waiting for user or notification triggers

#### Scenario: Wave1 materializes references after submit

- **WHEN** a Wave1 work unit submits source claims, evidence summary, question list, and cache trails successfully
- **THEN** the Wave1 phase body SHALL instruct the Phase Agent to materialize topic reference files from that submitted backing before gate
- **AND** the phase SHALL NOT require Sub-agents to be the canonical producer of those consumer reference files

#### Scenario: Wave2 pure synthesis materializes existing-backed cross references

- **WHEN** Wave2 pure synthesis identifies a cross-topic finding with concrete existing Wave0/Wave1 submitted backing
- **THEN** the Wave2 phase body SHALL instruct the Phase Agent to materialize `reference/00-cross-*.md` as a source-backed projection when useful for the consumer path
- **AND** the phase SHALL still route new public evidence gaps through `wave2_targeted_evidence`
