> req: DEW-016, DEW-017, DEW-018

## ADDED Requirements

### Requirement: Work-unit claim SHALL evaluate one explicit actor observation before allocation

When eligible delegated demand exists, every new work-unit claim SHALL build a read-only candidate plan before mutation and SHALL receive an explicit decision-point actor observation bound to that plan's delegated `role_key`. The observation SHALL contain `outcome: available|unavailable|unknown`, `source: native_probe|not_observed`, the exact role key, and a normalized reason code. The role key itself is the actor surface identifier; this contract SHALL NOT add a second arbitrary actor-surface string or an undefined host-report authority. A normal delegated candidate plan SHALL contain only the contiguous eligible queue-front prefix, up to the requested count, whose delegated role key and kind actor policy are valid. A fallback candidate plan SHALL contain only the single eligible queue-front item because fallback effective count is one. Claim SHALL evaluate the plan and observation before allocating a work ID, opening or incrementing a batch, moving queue demand into delegated in-flight state, or creating a work-unit directory.

The accepted source/outcome/reason combinations SHALL be closed:

- `available + native_probe + probe_succeeded`;
- `unavailable + native_probe + probe_access_denied|probe_model_unavailable|probe_host_policy_blocked|probe_capacity_unavailable`;
- `unknown + not_observed + observation_required`;
- `unknown + native_probe + probe_inconclusive`.

An inconclusive tool error SHALL NOT be normalized to unavailable or authorize fallback. `unknown` SHALL produce no claim with one recommended action to perform or repeat one bounded native actor probe for the planned role and rerun the same claim checkpoint. A missing observation for eligible demand SHALL normalize to `unknown/not_observed/observation_required`, not to available. `available` with requested `phase_agent_fallback` SHALL be rejected as an unnecessary fallback. The Engine SHALL NOT infer actor availability from prior failures, timeout, chat history, account balance text, filesystem mtime, or earlier trace events.

The existing Engine-owned work-unit kind contract SHALL declare an actor policy for each supported kind. The accepted mappings SHALL be `wave0_source_intake → dpt-source-intake`, `wave1_topic_deepening → dpt-evidence-extractor`, and `wave2_targeted_evidence → dpt-topic-scout`; all three SHALL allow single-attempt `phase_agent_fallback`. Candidate kind/role mismatch SHALL fail before mutation. Missing/unknown kind policy SHALL fail closed. If delegated execution is unavailable and the queue-front candidate permits fallback, a delegated no-claim verdict SHALL recommend one explicit fallback claim. If the queue-front policy prohibits fallback, the one recommended action SHALL be to resolve the external actor blocker and rerun normal claim.

Actor preflight SHALL reuse the existing work-unit claim trace/log event family rather than create a new actor-preflight event family. Successful claim events SHALL include the normalized role key, outcome, source, reason code, actor class, and policy decision. A valid no-claim SHALL use the existing claim-rejected event with the same normalized fields and verdict. Invalid CLI/schema input SHALL fail before trace mutation. These diagnostic fields SHALL NOT become a reusable availability token, lifecycle mode, or future claim authority.

#### Scenario: Available delegated actor permits normal claim

- **WHEN** claim plans eligible demand for role `dpt-source-intake`, receives a matching current `available/native_probe/probe_succeeded` observation, and requests `delegated_subagent`
- **THEN** the Engine SHALL allocate eligible work units through the existing claim transaction
- **AND** each allocated record SHALL bind the normalized observation and `execution_actor_class: delegated_subagent`

#### Scenario: Unknown actor availability creates no doomed attempt

- **WHEN** eligible delegated demand exists and claim receives no observation or `outcome: unknown`
- **THEN** it SHALL allocate no work ID and SHALL leave queue demand and work-unit index allocation unchanged
- **AND** it SHALL return one action to perform one bounded native actor probe and rerun claim

#### Scenario: Inconclusive probe does not authorize fallback

- **WHEN** the native probe fails without a normalized access, model, policy, or capacity-unavailable fact
- **THEN** the observation SHALL be `unknown/native_probe/probe_inconclusive`
- **AND** claim SHALL allocate neither normal nor fallback work

#### Scenario: Unavailable delegated actor creates no doomed batch

- **WHEN** claim receives a matching `outcome: unavailable` observation and requests `delegated_subagent`
- **THEN** it SHALL allocate zero work units before any native spawn is attempted
- **AND** when the queue-front candidate kind permits fallback it SHALL return one action to rerun the same claim with `phase_agent_fallback`

#### Scenario: Observation role mismatch blocks before allocation

- **WHEN** queue-front candidate demand delegates to `dpt-evidence-extractor` but the observation is bound to `dpt-source-intake`
- **THEN** claim SHALL reject before trace, queue, index, batch, or work-unit mutation

#### Scenario: Unknown kind policy fails closed

- **WHEN** a candidate item resolves to a work-unit kind with no Engine-owned actor policy
- **AND** delegated execution is unavailable
- **THEN** claim SHALL allocate no fallback work unit
- **AND** it SHALL return one action to resolve the external actor blocker and rerun normal claim

#### Scenario: Historical claim trace does not authorize a later claim

- **WHEN** a prior successful claim trace says the actor was available but the current claim supplies no current explicit observation
- **THEN** the current claim SHALL fail closed without using the historical trace as authority

#### Scenario: Zero-progress spawn unavailability uses one recovery path

- **WHEN** a normally claimed delegated attempt fails to spawn with a classified unavailable reason before any work-started receipt or Engine-observed output/cache progress
- **THEN** the Agent-facing contract SHALL direct `operate-work-unit fail` with normalized reason `actor_spawn_unavailable:<reason_code>`
- **AND** the next action SHALL be a fresh native probe followed by a new legal claim

#### Scenario: Progress-positive attempt does not use spawn-failure shortcut

- **WHEN** a claimed attempt has a work-started receipt or Engine-observed output/cache progress
- **THEN** later actor/runtime trouble SHALL remain under existing inspect, repair, and timeout-preflight contracts
- **AND** it SHALL NOT be automatically failed or converted to fallback

### Requirement: Phase Agent fallback SHALL remain inside the work-unit transaction

`phase_agent_fallback` SHALL be an accepted work-unit execution actor class only when the same claim receives a matching normalized `unavailable` delegated actor observation and the single queue-front candidate kind explicitly permits fallback. The fallback effective claim count SHALL be exactly one even when a larger count is requested, because one Phase Agent actor cannot execute a delegated parallel batch. The fallback SHALL receive the same Engine-allocated work ID, manifest, task, beacon, result schema, receipt nonce, assigned output/cache paths, timeout contract, dry-submit validation, formal submit transaction, and ledger coverage as a normal delegated subagent attempt.

The queue demand SHALL keep its existing intended target `targets.delegates.to: sub-agent` and role key; fallback SHALL NOT rewrite the queue task into a main-agent task. The work-unit attempt SHALL record the actual execution actor class and `fallback_from: delegated_subagent`, so inspect and ledger can distinguish intended delegated demand from the accepted actual fallback actor.

The Phase Agent SHALL perform the assigned bounded work as the work-unit actor and SHALL NOT directly complete queue demand, append a submitted ledger row, fabricate a delegated-subagent runtime reference, or bypass result/receipt validation. Fallback SHALL be one explicit branch, not an automatic chain through multiple roles/models/actors.

#### Scenario: Unavailable observation permits explicit Phase Agent fallback

- **WHEN** claim receives `outcome: unavailable` and requests `phase_agent_fallback`
- **AND** the queue-front candidate kind explicitly permits fallback
- **THEN** the Engine SHALL allocate exactly one eligible work unit with `execution_actor_class: phase_agent_fallback`
- **AND** generated Agent-facing output SHALL instruct the Phase Agent to execute the exact work-unit task and return through formal submit

#### Scenario: Available actor rejects unnecessary fallback

- **WHEN** claim receives `outcome: available` and requests `phase_agent_fallback`
- **THEN** claim SHALL reject before queue/index/work-unit mutation
- **AND** the nearest action SHALL be normal `delegated_subagent` claim

#### Scenario: Fallback-prohibited kind remains unclaimed

- **WHEN** delegated execution is unavailable and the candidate kind actor policy prohibits Phase Agent fallback
- **THEN** claim SHALL allocate no work unit and SHALL preserve the queue demand
- **AND** it SHALL return one action to resolve the external actor blocker and rerun normal claim

#### Scenario: Fallback preserves queue intent and records actual actor

- **WHEN** a delegated queue item is claimed through accepted Phase Agent fallback
- **THEN** its queue item snapshot SHALL retain `targets.delegates.to: sub-agent` and the original role key
- **AND** the work-unit actor authority SHALL record `execution_actor_class: phase_agent_fallback` and `fallback_from: delegated_subagent`

#### Scenario: Fallback cannot directly declare success

- **WHEN** a Phase Agent fallback writes assigned output files but does not produce a valid result and actor-bound runtime receipt
- **THEN** formal submit SHALL reject and SHALL append no submitted ledger row

### Requirement: Work-unit provenance SHALL bind execution actor class

New claims SHALL use one explicit discriminated actor sub-contract `actor_contract_version: "work-unit.actor.v1"`. The actor-aware manifest and index record SHALL be the transaction-bound direct authority for one full `actor_execution` object, and beacon SHALL project that object for the assigned actor. Generated result and runtime receipt event schemas SHALL require only the actor contract version and exact `execution_actor_class` identity binding; they SHALL NOT duplicate the availability observation. The submitted ledger row SHALL retain the full actor execution snapshot for audit. Inspect output and submit diagnostics SHALL derive from these direct surfaces and SHALL agree on actor class. `_agent.json` and runtime refs SHALL remain diagnostic-only, SHALL NOT be actor authority, and SHALL NOT make submit pass or fail. Secrets, raw account balance text, credentials, opaque host error bodies, and a duplicate free-form actor surface SHALL NOT be persisted.

Formal submit SHALL derive the authoritative ledger actor class from the claimed Engine record, SHALL reject conflicting result or receipt actor class, and SHALL never allow `_agent.json` or runtime refs to substitute for, override, or invalidate actor class.

Legacy work units/index records and submitted ledger rows created before this contract MAY remain readable through explicit legacy/actor-aware schema unions and the projection `execution_actor_class: legacy_unrecorded`, `source: legacy_claim`, `outcome: unknown`. A pre-v0.25 claimed attempt MAY submit under its legacy receipt/result contract, but the new ledger row SHALL truthfully carry `actor_contract_version: "work-unit.actor.v1"` with `legacy_unrecorded`; the Engine SHALL NOT infer native delegated execution from work-unit existence, runtime refs, `_agent.json`, or historical guidance. Inspect and no-claim SHALL NOT rewrite legacy bytes, and no bundle-wide/index-version migration SHALL be introduced. `legacy_unrecorded` SHALL be read/submit compatibility only and SHALL NOT be accepted for new claims or fallback.

#### Scenario: Normal submit records delegated actor provenance

- **WHEN** a `delegated_subagent` work unit submits successfully
- **THEN** the normalized result and submitted ledger row SHALL record `execution_actor_class: delegated_subagent`
- **AND** the actor observation SHALL match the claimed Engine record

#### Scenario: Fallback submit is distinguishable in audit

- **WHEN** a `phase_agent_fallback` work unit submits successfully
- **THEN** its result, receipt validation, inspect projection, and ledger row SHALL identify `phase_agent_fallback`
- **AND** no surface SHALL describe it as a native delegated subagent execution

#### Scenario: Diagnostic runtime refs do not decide actor class

- **WHEN** `_agent.json` or runtime refs are empty, present, stale, or oddly shaped while manifest/index/result/receipt actor binding is exact
- **THEN** actor validation SHALL use the actor authority and SHALL NOT fail or reclassify submit from diagnostic metadata alone

#### Scenario: Conflicting actor class is rejected

- **WHEN** result or runtime receipt claims an execution actor class different from the claimed work-unit record
- **THEN** dry-submit and formal submit SHALL reject without queue completion, ledger append, or work-unit terminal mutation

#### Scenario: Historical ledger does not fabricate actor provenance

- **WHEN** a pre-v0.25 submitted ledger row has no actor field
- **THEN** readers and inspect SHALL project `execution_actor_class: legacy_unrecorded`
- **AND** they SHALL NOT label it `delegated_subagent` based only on its work-unit identity or runtime refs

#### Scenario: New claim writes the actor sub-contract

- **WHEN** a new normal or fallback claim succeeds
- **THEN** its index record, manifest, and beacon SHALL carry the full `work-unit.actor.v1` actor execution object
- **AND** generated result/receipt contracts SHALL require the same actor contract version and exact actor class without duplicating the observation

#### Scenario: No-claim does not rewrite legacy index

- **WHEN** a bundle has legacy index records and actor preflight returns no-claim
- **THEN** the index bytes SHALL remain unchanged
