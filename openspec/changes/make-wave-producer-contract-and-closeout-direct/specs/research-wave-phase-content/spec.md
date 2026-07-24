## MODIFIED Requirements

### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, run existing dry-submit on returned candidate work before formal submit, submit passing results by `work_id`, perform submitted-backed Phase-owned shared-reference/index closeout, and run the gate after phase drain.

For a sanctioned rerun, Wave0 queue filling SHALL classify current topics from the canonical registry, seed rerun direction and direct queue/work-unit/submitted-ledger facts. A rerun `action:add` topic without current queued, delegated-in-flight or submitted Wave0 coverage SHALL receive the same `source_intake_fan_in` / `wave0_source_intake` delegated demand used by first-run Wave0. An existing topic with valid current-or-previous-layout submitted Wave0 coverage and no supplement intent SHALL NOT be redundantly re-enqueued. An orphan `source.yaml`, a rich file, or a cache path without submitted coverage SHALL NOT count as completed work.

Before delegated claim, the Phase Agent SHALL read the queue-front role, perform one bounded current native probe for that exact role, and invoke `operate-work-unit claim` with the complete actor observation and execution actor choice. The phase SHALL explicitly forbid `operate-queue claim` and `operate-queue complete` for delegated source-intake demand and SHALL route no-claim feedback back to the same work-unit claim checkpoint.

For returned work, phase guidance SHALL direct the Agent to consume the existing dry-submit disposition before formal submit: `repair_same_candidate` permits only its authorized mechanical candidate repair and a same-check rerun; `return_to_actor` preserves actor-owned semantic work; `fail_and_replace` uses the existing terminal/replacement path; and `inspect_contract` remains at the Engine owner or missing-contract boundary. It SHALL not scan the filesystem to declare or amend backing, and formal submit remains the only transition that unlocks reference materialization.

#### Scenario: Wave0 source intake uses the full work-unit loop

- **WHEN** Wave0 source intake has delegated queue demand and returned candidate work
- **THEN** the phase doc SHALL instruct `operate-work-unit claim`, dry-submit, and formal submit in that order
- **AND** it SHALL place shared reference/index materialization only after a successful formal submit

#### Scenario: Wave0 authoring distinguishes reference roots

- **WHEN** Wave0 guidance asks the Agent to create a shared rich reference
- **THEN** it SHALL expose the canonical `00-shared-<slug>.md` path, parser-aligned rich Markdown contract, and submitted backing as separate facts
- **AND** it SHALL not present bare YAML or fenced YAML as an alternate rich-reference contract

#### Scenario: Rerun added topic enters normal Wave0 work-unit path

- **WHEN** a sanctioned rerun adds a topic that has no Wave0 queue, in-flight or submitted coverage
- **THEN** the Wave0 phase doc SHALL instruct the Agent to enqueue one standard delegated source-intake demand for that topic
- **AND** the Agent SHALL perform role-bound probe, `operate-work-unit claim`, real actor execution and the dry-submit/formal-submit loop before gate evaluation

#### Scenario: Delegated no-claim feedback stays at one checkpoint

- **WHEN** a delegated Wave0 demand is at the active queue front but actor observation is missing or the non-delegated queue claim command is used
- **THEN** phase guidance SHALL tell the Agent to read the returned root cause
- **AND** the only nearest repair SHALL be to perform the required role probe and rerun `operate-work-unit claim`

### Requirement: Wave1 phase body completeness with subagent boundary

Wave1 phase body SHALL keep topic deepening in the normal `wave1_topic_deepening` work-unit path and SHALL load `shared/shared-reference-template` through its actual `requires` chain before the Phase Agent materializes consumer references. Merely mentioning the template filename in prose or asking the Agent to discover it indirectly SHALL NOT satisfy this producer contract.

The returned-work path SHALL run existing dry-submit before formal submit and consume its one Engine-derived disposition: authorized mechanical candidate repair returns to the same dry-submit for the same `work_id`; actor-owned semantic content returns to the actor before `work_done` or uses the existing fail-and-replace path after `work_done`; contract integrity or missing-contract results remain with the named Engine owner/terminal boundary. The Phase Agent SHALL not fabricate Sub-agent output semantics, cache declarations, receipts, submitted rows, or provenance. Only a passed formal submit unlocks the topic's Phase-owned closeout.

After successful submit, the Phase Agent SHALL write `depth-review.yaml` from facts that are not already owned by submitted authority, materialize consumer references/index from the same submitted backing, and replace the applicable seed return-map tokens with evidence meaning and concrete navigation refs before running Wave inspect. The blocking review shape SHALL contain `version`, canonical topic binding, `reviewed_work_unit_refs[]`, depth-dimension judgments, profile-check judgments, `decision`, and `supplementary_queue_item_ids[]`. It SHALL NOT require the Agent to copy submitted `source_claims[]`, accepted URLs, cache refs, Wave0 URL arrays, new-source URL arrays, or derived floors into a second blocking authority. The Engine SHALL derive those facts from the reviewed submitted rows, Wave0 source authority, and profile.

At each affected inspect/gate/submit failure, phase guidance SHALL consume the Engine-provided direct repair coordinates: `repair_kind`, `missing_fact`, `write_to`, and `rerun`. When `repair_kind` is `agent_action|engine_operation`, `write_to` is an already authorized mutable surface or legal operation, and no new semantic/risk decision is needed, the Agent SHALL perform the mechanical repair and rerun the named checkpoint without asking the user to execute ordinary commands. `user_decision|external_action|missing_contract` SHALL identify only the smallest Agent-facing boundary. Because Wave1 is `stop: no`, those classifications SHALL NOT by themselves authorize the Phase Agent to initiate user-facing interaction or wait for acknowledgement. Guidance SHALL NOT infer repair kind from a path or invite hand-written ledger, receipt, trace, hash, or provenance repair.

#### Scenario: Wave1 uses dry-submit before formal submit

- **WHEN** a Wave1 Sub-agent returns candidate result, receipt, output and cache surfaces
- **THEN** the Phase Agent SHALL run dry-submit before formal submit
- **AND** a dry-submit failure SHALL not create submitted coverage, reference materialization, depth review, or seed backfill

#### Scenario: Wave1 materializes closeout after submitted backing

- **WHEN** a Wave1 work unit formally submits `evidence-summary.md`, `question-list.md`, and accepted backing
- **THEN** the Phase Agent SHALL materialize the topic reference/index, depth review and seed return-map closeout before Wave inspect
- **AND** the phase SHALL not require the Sub-agent to write any of those Phase-owned projections

#### Scenario: Depth review records judgment instead of ledger copies

- **WHEN** the Phase Agent reviews submitted Wave1 work units
- **THEN** `depth-review.yaml` SHALL identify the reviewed work-unit refs and record non-derivable depth/profile/decision judgments
- **AND** it SHALL NOT be required to reproduce submitted source/cache arrays or profile-derived numeric facts

#### Scenario: Agent performs authorized same-check repair

- **WHEN** an affected checkpoint returns `repair_kind: agent_action|engine_operation`, `missing_fact`, the corresponding authorized `write_to` coordinate, and `rerun`
- **THEN** the Phase Agent SHALL perform that action and rerun the named checkpoint
- **AND** it SHALL treat `user_decision`, `external_action`, or `missing_contract` only as the smallest Agent-facing boundary and obey the current node interaction contract rather than automatically escalating

#### Scenario: Shallow Wave1 output routes to supplementary work unit

- **WHEN** Wave1 depth review finds too few genuinely new source URLs, missing depth dimensions, or unmet profile-required checks
- **THEN** the phase doc SHALL instruct the Agent to enqueue a supplementary `wave1_topic_deepening` queue item with explicit `payload.topic_slug`
- **AND** the Agent SHALL drain that supplementary item through `operate-work-unit claim`, dry-submit, and `operate-work-unit submit`
