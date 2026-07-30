> req: DEW-014, DEW-016, DEW-021

## MODIFIED Requirements

### Requirement: Timeout terminalization SHALL be guarded by progress-aware preflight

The work-unit CLI SHALL provide a timeout preflight for claimed work units. Timeout preflight SHALL determine whether it is safe to terminalize a claimed work-unit attempt as `timed_out` by evaluating Engine-observed progress, candidate result state, dry-submit-equivalent diagnostics, queue binding, and effective idle lease state.

Timeout preflight SHALL accept an explicit active bundle path, `work_id`, and optional candidate `result` path. When no candidate result path is supplied, preflight SHALL inspect the assigned result path from the work-unit record. When a candidate result path is supplied, preflight SHALL evaluate it under submit/dry-submit-equivalent candidate path rules. A supplied candidate result path outside the assigned work-unit directory SHALL be a validation input only: its mtime SHALL NOT extend the work-unit idle lease by itself, though dry-submit-equivalent validation MAY still recommend `submit` or `repair`. It SHALL fail closed for missing or invalid work-unit index records, non-claimed attempts, missing manifests, missing queue in-flight binding, or binding drift. It SHALL return structured JSON for both timeout-eligible and timeout-ineligible cases. The output SHALL include the checked `work_id`, `queue_item_id`, current status, `timeout_eligible`, `check`, `recommended_action`, nullable `candidate_projection`, progress summary, `initial_deadline_at`, `lease_anchor_at`, `idle_timeout_ms`, `effective_timeout_at`, `inspect[]`, and repair-oriented `advice[]`.

`recommended_action` SHALL be a closed value: `submit`, `repair`, `wait`, `timeout`, `inspect`, or `block`. Timeout-preflight CLI exit status SHALL follow `timeout_eligible`: exit success only when timeout is currently safe, and exit non-zero when timeout is unsafe or the work-unit state is invalid. When the work-unit context can be loaded, non-zero preflight outcomes SHALL still emit structured JSON for Agent feedback.

Timeout-preflight output SHALL be validated by an Engine-owned schema before it is emitted. The schema SHALL make `timeout_eligible` and `check` consistent, SHALL constrain `recommended_action` to the closed action set, SHALL reuse the shared candidate-projection schema when `candidate_projection` is non-null, and SHALL keep progress details structured enough for tests and Phase Agent guidance to distinguish result, receipt, output/cache, idle lease, and binding diagnostics. Candidate projection SHALL be null when no candidate was evaluated; preflight SHALL NOT synthesize a candidate action or primary root code from timeout state alone.

The timeout-preflight helper/API SHALL accept an injectable clock for tests, while CLI invocations SHALL use the real current time. Tests SHALL NOT depend on sleeping to cross timeout boundaries. Filesystem mtime comparisons SHALL be made against the injected or real current time and the work-unit `claimed_at`. File mtimes in the future relative to the chosen current time SHALL be diagnosed as suspicious and SHALL NOT extend the effective lease beyond the chosen current time plus the idle timeout window.

Timeout eligibility SHALL be progress-aware. The existing `deadline_at` SHALL remain an initial lease hint, but terminal timeout eligibility SHALL use an effective idle lease derived from `lease_anchor_at + idle_timeout_ms`. `latest_engine_observed_progress_at` SHALL mean actual Engine-observed progress and SHALL NOT be populated from `claimed_at` merely to support timeout arithmetic. `lease_anchor_at` SHALL be the latest Engine-observed progress time when progress exists, or `claimed_at` when no progress exists. The default idle timeout window SHALL be the work-unit `timeout_ms` unless an accepted explicit runtime/profile surface provides a narrower value. If there is no observed progress after claim, effective timeout eligibility SHALL fall back to `claimed_at + idle_timeout_ms`, which matches the existing `claimed_at + timeout_ms` behavior when the default idle timeout is used.

Engine-observed progress SHALL come from deterministic bundle-root surfaces such as assigned candidate result files, runtime receipt/log content and mtime tied to the same identity, declared output/cache files under active bundle root, assigned work-unit refs, and Engine trace/log events tied to the same `work_id`. Undeclared random files, path-escape refs, and identity-mismatched surfaces SHALL NOT extend the idle lease. Agent-authored receipt timestamps SHALL NOT be the sole authority for progress freshness. Progress diagnostics SHALL identify the source type, observed timestamp when available, path or event ref when available, whether work-unit identity was verified, whether the source extended the idle lease, and whether a suspicious timestamp was detected.

Timeout preflight SHALL be read-only by default. It SHALL NOT update work-unit index records, queue state, work-unit status files, submitted ledger rows, terminal history, retry demand, transaction directories, trace/log files, candidate result files, runtime receipts, cache aliases, or gate-consumable outputs. Any future persisted observation surface such as `last_observed_at` SHALL require explicit design/spec update and no-authority side-effect proof before implementation relies on it.

If a candidate result exists, timeout preflight SHALL run dry-submit-equivalent validation before recommending timeout. If dry-submit would pass, preflight SHALL recommend formal `submit` and SHALL return `timeout_eligible: false`. If dry-submit fails with repair diagnostics for the same claimed `work_id`, preflight SHALL recommend repair and SHALL return `timeout_eligible: false`. Wrong identity, missing binding, terminal status, and ambiguous authority diagnostics SHALL route to `inspect` or `block`, not same-attempt repair. If recent progress exists but no candidate result is ready, preflight SHALL recommend wait or inspect and SHALL return `timeout_eligible: false` while the effective idle lease has not expired.

`operate-work-unit timeout` SHALL run the same preflight guard by default. Default timeout SHALL refuse progress-positive, submit-ready, repairable, or not-yet-idle attempts without changing work-unit status, queue state, ledger rows, terminal history, retry demand, trace/log terminalization records, transaction directories, or gate coverage. Timeout SHALL proceed by default only when preflight returns timeout-eligible.

Any Engine-owned timeout terminalization path SHALL run the same preflight guard by default, including exported lifecycle/API helpers used by the CLI or tests. The implementation SHALL NOT leave an unguarded exported path that can set a claimed attempt to `timed_out`. `failed` and `abandoned` terminalization are not governed by timeout-preflight unless a separate accepted change says otherwise.

The timeout command and Engine/API timeout path SHALL expose explicit force terminalization. Forced timeout SHALL still run preflight for audit, but MAY bypass a false timeout eligibility check. Forced timeout SHALL require a reason and SHALL produce durable diagnostics that include `forced_timeout: true`, the reason, `preflight_timeout_eligible`, `preflight_recommended_action`, nullable `preflight_candidate_projection`, `default_timeout_would_refuse`, `effective_timeout_at`, `latest_engine_observed_progress_at`, `lease_anchor_at`, and structured `progress_sources[]`. Each `progress_sources[]` item SHALL include source type, observed timestamp when available, path or event ref when available, identity verification, lease-extension status, and suspicious timestamp flag. A non-null preflight_candidate_projection SHALL validate through the shared candidate schema and preserve the exact evaluated action/root code; null SHALL mean no candidate projection was available. The preferred trace event name for a forced bypass is `work_unit_forced_timeout`; if implementation extends the existing timeout event instead, it SHALL include the same required fields. Forced timeout SHALL still be terminal fail-closed: it SHALL NOT append a submitted ledger row, SHALL NOT count as delegated gate coverage, and normal late submit against the terminal attempt SHALL remain rejected.

When timeout-preflight evaluates a present candidate for a current-version attempt, it SHALL reconstruct the same assignment contract and acquire its own fresh bounded required-output snapshots through dry-submit-equivalent validation. It SHALL not reuse an earlier dry-submit verdict or byte snapshot. It SHALL return that invocation's exact recommended_action/primary_root_code pair in candidate_projection and map candidate recommended_action into its existing coarser action set: submit -> submit; repair_same_candidate -> repair; return_to_actor -> repair with actor-owned advice; fail_and_replace -> block with the explicit fail/replacement boundary and `semantic_contract:<primary_root_code>` guidance; inspect_contract -> inspect. An independent timeout prerequisite/integrity root MAY make the outer timeout action block without changing the candidate projection or this mapping. It SHALL not label post-work_done semantic content as Phase Agent same-candidate repair or treat a candidate action alone as timeout eligibility. Observed output/receipt progress continues to prevent default timeout until the normal progress-aware lease or explicit legal fail action permits closure.

Unsafe reader roots, contract drift, unknown assignment version, wrong identity, and ambiguous authority SHALL remain inspect/block rather than timeout eligibility. Timeout-preflight SHALL remain read-only and SHALL not cache the direct-output verdict, persist repair_scope, rewrite the artifact, or create replacement demand.

Every emitted timeout preflight result SHALL also include a bounded
`recommendation_basis` projection for its already selected
`recommended_action`. The projection SHALL identify one existing direct branch
source (`candidate`, `progress`, `lease`, or `integrity`) and the small set of
direct observed facts that caused that branch to win, such as a dry-submit
candidate root, most recent identity-bound progress, effective lease time, or
binding/contract blocker. It SHALL be derived from the same preflight result;
it SHALL not run a second candidate evaluator, create a new timeout rule,
extend a lease, authorize a forced timeout, or turn diagnostic detail into
attempt authority. A caller can therefore distinguish why `submit`, `repair`,
`wait`, `timeout`, `inspect`, or `block` was selected without inferring policy
from a long array of unrelated diagnostics.

#### Scenario: no-progress claimed attempt is timeout eligible

- **WHEN** a claimed work unit has no candidate result, an empty or missing runtime receipt, no observed output/cache progress, and its effective idle lease has expired
- **THEN** `operate-work-unit timeout-preflight` SHALL return `timeout_eligible: true`
- **AND** `recommended_action` SHALL be `timeout`
- **AND** default `operate-work-unit timeout`, when invoked for that eligible attempt, SHALL be allowed to terminalize the attempt through the existing timeout retry path

#### Scenario: timeout preflight is read-only

- **WHEN** `operate-work-unit timeout-preflight` is run for a claimed work unit
- **THEN** it SHALL NOT mutate work-unit index, queue, status, ledger, transaction, trace/log, receipt, result, cache, or gate-consumable output surfaces
- **AND** any later formal submit or terminal command SHALL see the same authority state that existed before preflight

#### Scenario: injected clock makes timeout deterministic

- **WHEN** timeout-preflight is called through the helper/API with an injected current time
- **THEN** effective timeout calculations SHALL use that injected time
- **AND** tests SHALL be able to prove eligible and non-eligible outcomes without sleeping or relying on wall-clock delays

#### Scenario: no-progress lease anchor is not reported as observed progress

- **WHEN** a claimed work unit has no Engine-observed progress after claim
- **THEN** timeout-preflight SHALL compute `lease_anchor_at` from `claimed_at`
- **AND** it SHALL NOT report `claimed_at` as `latest_engine_observed_progress_at`
- **AND** diagnostics SHALL still expose the effective timeout calculation anchor

#### Scenario: future mtime does not overextend lease

- **WHEN** a progress source has filesystem mtime later than the chosen current time
- **THEN** timeout-preflight SHALL diagnose the timestamp as suspicious
- **AND** it SHALL NOT extend the effective lease beyond the chosen current time plus the idle timeout window

#### Scenario: external candidate result does not extend lease by mtime alone

- **WHEN** timeout-preflight is called with `--result <candidate>` outside the assigned work-unit directory
- **THEN** the candidate SHALL be evaluated for submit or repair advice under dry-submit-equivalent rules
- **AND** the candidate file mtime alone SHALL NOT extend the work-unit idle lease

#### Scenario: recent receipt progress blocks default timeout

- **WHEN** a claimed work unit has a non-empty runtime receipt tied to the same work-unit identity
- **AND** Engine-observed receipt progress is within the effective idle lease
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** default timeout SHALL refuse terminalization
- **AND** no retry demand or terminal history row SHALL be created by the refused timeout

#### Scenario: output or cache progress blocks default timeout

- **WHEN** a claimed work unit has observed output or cache files under the assigned work-unit contract
- **AND** the latest Engine-observed progress is within the effective idle lease
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** advice SHALL direct the Agent to wait, inspect, repair, or submit rather than timeout

#### Scenario: submit-ready result is recommended for submit

- **WHEN** a claimed work unit has a candidate result that dry-submit would accept
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** `recommended_action` SHALL be `submit`
- **AND** advice SHALL instruct formal `operate-work-unit submit` for the same `work_id`
- **AND** no timeout retry SHALL be created by default timeout

#### Scenario: repairable result is recommended for same-attempt repair

- **WHEN** a claimed work unit has a candidate result whose candidate action is repair_same_candidate
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** `recommended_action` SHALL be `repair`
- **AND** advice SHALL target repair of the same claimed `work_id`
- **AND** the attempt SHALL remain claimed unless the Agent later explicitly terminalizes it

#### Scenario: pre-work_done semantics return to actor through timeout advice

- **WHEN** a claimed work unit has candidate action return_to_actor
- **THEN** timeout preflight SHALL return timeout_eligible false and recommended_action repair
- **AND** advice SHALL direct the selected actor to complete the assigned semantics rather than authorize Phase Agent artifact editing

#### Scenario: invalid candidate identity is not treated as same-attempt repair

- **WHEN** a claimed work unit has a candidate result whose dry-submit diagnostics show wrong `work_id`, missing queue binding, terminal status, or ambiguous authority rather than same-attempt repair
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** `recommended_action` SHALL be `inspect` or `block`
- **AND** default timeout SHALL NOT terminalize the attempt

#### Scenario: stale progress may become timeout eligible

- **WHEN** a claimed work unit has prior observed progress
- **AND** no candidate result is submit-ready or repairable
- **AND** the effective idle lease from the latest Engine-observed progress has expired
- **THEN** timeout preflight SHALL return `timeout_eligible: true` unless another fail-closed invalid-binding or ambiguous-state diagnostic applies
- **AND** diagnostics SHALL include the latest observed progress time and effective timeout time

#### Scenario: default timeout refusal has no terminal side effect

- **WHEN** default `operate-work-unit timeout` is invoked for a progress-positive timeout-ineligible work unit
- **THEN** the command SHALL return structured failure
- **AND** work-unit index/status, queue delegated in-flight binding, queue terminal history, retry demand, submitted ledger rows, transaction directory entries, trace/log terminalization records, and gate coverage SHALL remain unchanged

#### Scenario: exported timeout API uses the same guard

- **WHEN** an Engine caller invokes an exported lifecycle/API timeout path for a progress-positive timeout-ineligible work unit
- **THEN** the same preflight guard SHALL refuse terminalization
- **AND** there SHALL be no unguarded exported helper that can set the attempt to `timed_out`
- **AND** `failed` and `abandoned` terminalization behavior SHALL remain unchanged

#### Scenario: timeout bypass audit covers Engine-owned terminalization paths

- **WHEN** implementation exposes or retains any Engine-owned helper that can terminalize a work unit as `timed_out`
- **THEN** regression or hygiene coverage SHALL prove that helper routes through guarded timeout or explicit forced timeout
- **AND** direct `timed_out` mutation paths SHALL NOT remain available as exported lifecycle/API shortcuts

#### Scenario: forced timeout is auditable

- **WHEN** `operate-work-unit timeout --force` terminalizes a progress-positive claimed work unit
- **THEN** the command SHALL require a reason
- **AND** durable trace/log or equivalent diagnostics SHALL record `forced_timeout: true`, the reason, `preflight_timeout_eligible`, `preflight_recommended_action`, nullable `preflight_candidate_projection`, `default_timeout_would_refuse`, `effective_timeout_at`, `latest_engine_observed_progress_at`, `lease_anchor_at`, and structured `progress_sources[]`
- **AND** a forced bypass SHOULD be visible as `work_unit_forced_timeout` or an equivalent existing timeout event carrying the same required fields
- **AND** the resulting terminal attempt SHALL still reject normal late submit

#### Scenario: invalid binding fails closed

- **WHEN** timeout preflight finds missing manifest, missing queue in-flight binding, mismatched `queue_item_id`, or non-claimed status
- **THEN** it SHALL return `timeout_eligible: false`
- **AND** advice SHALL direct inspection or Engine repair
- **AND** default timeout SHALL NOT terminalize the attempt

#### Scenario: timeout preflight rereads changed candidate content

- **WHEN** an earlier dry-submit passed but required-output bytes change before timeout-preflight
- **THEN** timeout-preflight SHALL evaluate a fresh bounded snapshot
- **AND** recommended_action SHALL reflect the current direct-output result rather than the earlier PASS

#### Scenario: semantic failure after work_done is not Phase Agent repair

- **WHEN** timeout-preflight observes work_done and a current candidate missing required semantic content
- **THEN** it SHALL return block with the fail-and-replacement owner
- **AND** it SHALL not recommend that the Phase Agent add the missing findings/questions to the same actor provenance

#### Scenario: mechanical direct failure remains repairable

- **WHEN** timeout-preflight finds candidate action repair_same_candidate because the target content passes and only result path/role declaration is wrong
- **THEN** it SHALL recommend repair for the same work ID and same dry-submit checkpoint
- **AND** default timeout SHALL not terminalize the progress-positive attempt

#### Scenario: contract or reader integrity failure blocks timeout

- **WHEN** timeout-preflight finds unknown assignment version, manifest/beacon contract drift, unsafe required path, or unreadable bounded snapshot
- **THEN** recommended_action SHALL be inspect or block
- **AND** default timeout SHALL not use the failure as evidence that the attempt is safely idle

#### Scenario: Recommendation basis distinguishes otherwise similar stalled attempts

- **WHEN** two claimed work units are both past their initial deadline but one
  has a dry-submit-ready candidate and the other has recent identity-bound
  receipt progress
- **THEN** their timeout preflight results SHALL expose different direct
  `recommendation_basis` branches for `submit` and `wait`
- **AND** neither result SHALL alter timeout eligibility, lease state, or the
  legal terminalization path merely to explain the recommendation

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

For a supplied actor observation that is incomplete, enum-invalid, or
contradictory, public claim output SHALL project the existing validation result
at the top level as `actor_observation_feedback`. It SHALL contain the planned
role key, one primary field conflict, bounded field-level conflicts, the full
closed vocabulary of legal `{ outcome, source, reason_code }` tuples for that
role, and the one same-claim rerun coordinate. Existing nested `input_issues`
MAY remain as durable diagnostic detail, but callers SHALL not need to search it
to discover the conflicting field or legal tuple. This projection SHALL reuse
the existing actor policy/validator and SHALL not relax role proof, infer
availability, allocate a work unit, or write claim/queue/index/batch/envelope
state.

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

#### Scenario: Claim exposes invalid actor vocabulary at the decision point

- **WHEN** a claim supplies an unsupported `actor_reason` or a contradictory
  actor observation for the planned role
- **THEN** top-level `actor_observation_feedback` SHALL name the primary field
  conflict and the complete legal tuple vocabulary for that role
- **AND** the command SHALL retain the existing no-mutation, same-claim repair
  boundary without turning historical actor observations into proof

### Requirement: Delegated work contract entry SHALL be constructible from one generated projection

For eligible delegated demand, the Engine SHALL expose the same closed contract lineage at each Agent decision point without creating a second acceptance authority.

Before allocation, after eligible queue-front demand identifies a planned delegated `role_key`, claim SHALL expose an output-only `actor_observation_contract`. It SHALL contain that role and every exact legal `{ outcome, source, reason_code }` tuple with its semantic continuation category: four case shapes expanding to seven tuples. A supplied observation object that is incomplete, enum-invalid, or contradictory SHALL return structured claim feedback naming its supplied field/value conflict, the planned role, this vocabulary, and one same-check action; it SHALL allocate no work ID and write no claim trace, queue, index, batch, or envelope state. At the CLI boundary, an observation is supplied when any `--actor-outcome`, `--actor-source`, `--actor-role-key`, or `--actor-reason` option is present, including an empty string value; it is omitted only when all four options are absent. An omitted observation argument SHALL retain the existing `unknown/not_observed/observation_required` no-claim normalization and its existing audit behavior. The projection SHALL NOT treat generic HITL1 research access, historical trace, chat context, or an unobserved capability as a role-bound native observation, and SHALL NOT choose a probe outcome for the Agent.

After a claim succeeds, the Engine SHALL render one `## Completion Contract` section as the first authoring entry of the existing generated `task.md`; spawn prompt SHALL direct the actor to that same task entry rather than a second contract file or a duplicate attempt-bound instruction set. The section SHALL be regenerated only from the existing attempt authority: manifest/beacon identity and paths, generated result-schema constraints, resolved required outputs and the same direct-output evaluator definitions that validate them, the resolved cache policy and same cache-leaf evaluator definition that validates it, current source policy/lineage, and runtime-receipt event contract. It SHALL state the exact result/receipt bindings, required output path-role-contract tuples, complete validator-owned authoring facts for each required direct output and cache leaf, and the existing dry-submit rerun command. `task.md` and spawn prompt SHALL not retain independently normative-looking duplicate completion fragments for those same facts.

The Completion Contract section is Agent-facing guidance only. It SHALL NOT be a manifest/beacon/result/receipt/ledger field, an acceptance voter, a validator, a recovery operation, a new file/path, or a new persistent state authority. Generation SHALL NOT pre-create `result.json`, runtime receipt event lines, cache leaves, source claims, output content, evidence, or a ledger row. Existing claimed envelopes remain governed by the generated surfaces already bound to their attempt; no backfill or migration is required.

Claimed normal dry-submit and normal formal-submit rejection SHALL use the existing shared candidate root selection. When a candidate has a primary root, the selection SHALL expose one selected member of normalized `violations[]`; every public primary detail on those two candidate checkpoints (`primary_root_code`, `repair_kind`, `missing_fact`, `write_to`, `rerun`, and recommended action) SHALL derive from that same selected root, rather than an unrelated earliest array entry. Timeout-preflight SHALL retain its existing minimal candidate projection from that same selection (`recommended_action` and `primary_root_code`) for timeout advice, SHALL NOT independently select a violation or copy candidate repair detail, and SHALL preserve its own lease/terminal authority. Late-submit SHALL retain its separate historical acceptance semantics. The Engine SHALL evaluate prerequisites before dependent checks and suppress only derived symptoms; independently evaluable roots remain available as structured diagnostic detail with their own repair coordinates. The selected candidate result SHALL expose one nearest legal action and the same dry-submit checkpoint for legal repair, or the existing owner/terminal/missing-contract boundary when no caller repair exists.

This requirement SHALL reuse the existing actor decision, envelope renderer, direct-output evaluator, submit validation, candidate projection, timeout, and formal submit paths. It SHALL NOT add a generic controller, retry branch, actor selector, mutable provenance, ledger amendment, queue recovery operation, Gate/degradation rule, or a general HITL1-to-role proof conversion.

The generated Completion Contract and public claim feedback SHALL consume the
same validator-owned actor-observation vocabulary. Timeout preflight's
`recommendation_basis` SHALL consume the already selected candidate/progress/
lease/integrity branch rather than copy a task-only candidate validator. These
are reader projections of existing contracts, not a second task protocol,
cache-trail mapping, role proof, or recovery path.

#### Scenario: Invalid observation is discoverable without weakening role proof

- **WHEN** an eligible Wave0 claim for `dpt-source-intake` supplies `available/not_observed/probe_succeeded`
- **THEN** claim SHALL return a structured no-mutation rejection that names the conflicting supplied fields and the complete closed actor-observation vocabulary for `dpt-source-intake`
- **AND** its one next action SHALL be the existing role-bound native-probe claim boundary, not use generic HITL1 access or silently normalize the tuple to available

#### Scenario: Omitted observation remains a truthful no-claim fact

- **WHEN** eligible delegated demand is claimed without an observation argument
- **THEN** claim SHALL retain its existing `unknown/not_observed/observation_required` no-claim normalization and existing audit behavior
- **AND** a supplied partial or malformed observation object SHALL instead take the structured pre-trace rejection path without pretending it is that normalized observation

#### Scenario: Empty CLI observation value is not an omission

- **WHEN** an eligible delegated claim supplies `--actor-outcome=` and no other actor-observation option
- **THEN** it SHALL take the structured pre-trace malformed-input rejection path with no allocation, claim trace, queue, index, batch, or envelope mutation
- **AND** it SHALL NOT normalize to `unknown/not_observed/observation_required` or write that omitted-observation audit event

#### Scenario: Claimed actor receives one constructible completion entry

- **WHEN** a current Wave0 or primary Wave1 delegated work unit is claimed
- **THEN** its generated task SHALL present `## Completion Contract` as the first authoring entry and spawn prompt SHALL direct the actor to that same task
- **AND** that section SHALL agree with the existing manifest, beacon, result schema, required output validator-owned authoring facts, cache-leaf validator-owned authoring facts, source policy, and receipt contract without creating result content, receipt event, cache leaf, output, or ledger authority bytes

#### Scenario: Completion entry exposes Wave0 direct-output and cache construction facts

- **WHEN** a current Wave0 source-intake work unit is claimed
- **THEN** its Completion Contract SHALL expose the validator-owned top-level array and required/optional metadata-field facts for the assigned `source.yaml`, plus the resolved cache leaves, non-placeholder/degraded page rule, and allowed `meta.json` source-mapping fields
- **AND** those facts SHALL be rendered from the same definitions used by direct-output and cache-leaf validation, not a second task-only validator or hand-maintained field list

#### Scenario: Primary feedback matches the recommended action root

- **WHEN** dry-submit can independently observe a mechanical result declaration issue and an actor-owned semantic direct-output issue
- **THEN** the returned recommended action and all public primary repair details SHALL name the same selected primary root
- **AND** the mechanical issue SHALL remain available only as a structured independent diagnostic with its own same-check coordinate

#### Scenario: A failed prerequisite does not manufacture dependent repairs

- **WHEN** a claimed candidate lacks a parseable result or an authoritative manifest/beacon prerequisite
- **THEN** dry-submit SHALL report that direct prerequisite root and SHALL not report output declaration, cache, source-claim, or direct-output symptoms whose evaluation requires the missing prerequisite
- **AND** it SHALL retain any separately evaluable receipt, queue, or identity root without calling it a consequence of the missing candidate surface

#### Scenario: Historical attempt does not need a Completion Contract migration

- **WHEN** an already-claimed work unit predates this generated Completion Contract task section
- **THEN** dry-submit, formal submit, timeout-preflight, terminal handling, and historical ledger reading SHALL continue through their existing attempt-bound contract surfaces
- **AND** no claim, index, manifest, beacon, result, receipt, cache, queue, or ledger byte SHALL be rewritten to retrofit the projection

#### Scenario: Generated and public feedback stay on one contract lineage

- **WHEN** a planned claim is rejected for an invalid actor observation or a
  claimed attempt receives timeout preflight advice
- **THEN** its visible tuple vocabulary or recommendation basis SHALL derive
  from the same existing actor or preflight contract used by the corresponding
  checkpoint
- **AND** task guidance SHALL not add a duplicate cache-trail, actor-proof, or
  timeout validator to explain that result
