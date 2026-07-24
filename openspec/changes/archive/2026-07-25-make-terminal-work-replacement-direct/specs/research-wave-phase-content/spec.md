## MODIFIED Requirements

### Requirement: Wave phase bodies SHALL teach batch-poll-submit loops and Phase-owned reference materialization

Wave0, Wave1, and Wave2 phase Markdown SHALL describe delegated work as a continuous Phase Agent loop: fill queue demand, reconstruct current in-flight work from bundle truth, claim eligible independent work units as bounded top-up batches where applicable, spawn bounded Sub-agents, actively poll runtime work-unit readiness, submit ready attempts, repair or terminalize rejected/expired attempts, materialize Phase-owned projections where the phase owns consumer presentation after successful submit, and run the phase gate only after queue demand and delegated in-flight work are drained.

After the existing `fail_and_replace` disposition reaches its authorized terminal boundary, phase Markdown SHALL instruct the Agent to terminalize the current attempt through the existing terminal operation and invoke `operate-work-unit replace` for that terminal `work_id`. For a newly created or queued successor, it SHALL then perform the existing exact-role native probe and `operate-work-unit claim`; for an already in-flight idempotent successor, it SHALL reconstruct and poll the disclosed existing work ID without a second claim. It SHALL not hand-author an allegedly equivalent replacement task card, infer a successor queue ID, discover a work ID from the filesystem, rewrite terminal status, or bypass ordinary claim.

Wave0 and Wave1 phase bodies SHALL NOT present `claim --count 1` as the normal strategy for independent topics. Wave1 phase body SHALL state that topic references are Phase-owned consumer projections materialized after successful work-unit submit from submitted source/cache/degraded-capture/ledger backing. Wave2 phase body SHALL state that consumer-facing accepted pure-synthesis findings with concrete existing Wave0/Wave1 submitted backing SHALL be materialized as `reference/00-cross-*.md` or carry an explicit non-consumer/deferred/limitation reason, while new external evidence must use `wave2_targeted_evidence`.

#### Scenario: Wave0 and Wave1 phase docs teach batched delegated claim

- **WHEN** the Phase Agent reads Wave0 or Wave1 delegated drain guidance
- **THEN** it SHALL see instructions to compute a bounded batch count for independent eligible work
- **AND** it SHALL not see serial `--count 1` presented as the default drain loop

#### Scenario: phase docs teach active polling after spawn

- **WHEN** a phase doc instructs the Phase Agent to spawn background Sub-agents
- **THEN** it SHALL also instruct the Phase Agent to poll work-unit files or inspect output for readiness
- **AND** ready attempts SHALL be submitted through `operate-work-unit submit` without waiting for user or notification triggers

#### Scenario: phase docs reconstruct in-flight work before claiming

- **WHEN** the Phase Agent resumes a wave phase after background work has been spawned
- **THEN** phase guidance SHALL instruct it to reconstruct delegated in-flight attempts from bundle truth before claiming additional work
- **AND** it SHALL only claim a bounded top-up batch when reconstructed in-flight count is below cap

#### Scenario: phase gate waits for queue and in-flight drain

- **WHEN** a phase has unclaimed delegated queue demand or reconstructed delegated attempts still in flight
- **THEN** phase guidance SHALL instruct the Phase Agent to keep polling, submitting, repairing, terminalizing, or claiming bounded top-ups as appropriate
- **AND** it SHALL NOT run the phase gate as if delegated work were complete

#### Scenario: terminal replacement returns to the location-correct existing boundary

- **WHEN** dry-submit reports `fail_and_replace` for completed actor-owned semantic work
- **THEN** phase guidance SHALL terminalize that work ID, invoke the Engine-owned replacement operation, and use a new or queued successor only through an exact-role probe and normal claim
- **AND** it SHALL reconstruct and poll a disclosed already-in-flight successor rather than claim again
- **AND** it SHALL not reconstruct a replacement task card, inspect `_work_units` for a successor, or change the parent's terminal status

#### Scenario: Wave1 materializes references after submit

- **WHEN** a Wave1 work unit submits evidence summary, question list, and accepted source/cache/degraded-capture backing successfully
- **THEN** the Wave1 phase body SHALL instruct the Phase Agent to materialize topic reference files from that submitted backing before gate
- **AND** the phase SHALL NOT require Sub-agents to be the canonical producer of those consumer reference files

#### Scenario: Wave2 pure synthesis materializes existing-backed cross references

- **WHEN** Wave2 pure synthesis identifies a cross-topic finding with concrete existing Wave0/Wave1 submitted backing
- **THEN** the Wave2 phase body SHALL instruct the Phase Agent to materialize `reference/00-cross-*.md` as a source-backed projection when the finding is accepted and consumer-facing
- **AND** the phase SHALL still route new public evidence gaps through `wave2_targeted_evidence`
