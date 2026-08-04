> req: RWP-001

## MODIFIED Requirements

### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, run existing dry-submit on returned candidate work before formal submit, submit passing results by `work_id`, and run inspect/gate after phase drain. The current source-intake actor contract SHALL cover its assigned `artifacts/wave0/{topic.slug}/source.yaml`, cache, result, and receipt facts only; the phase SHALL NOT ask that actor to author `reference/00-shared-*.md` as a delegated completion or shared-reference-floor route.

After formal submit, the Phase Agent SHALL consume the Wave0 submitted-reference convergence result. When it identifies exact materializable submitted backing, the Phase Agent MAY load the existing shared reference template and create one Phase-owned consumer projection through the existing artifact-persistence and index-synchronization boundary. The projection SHALL cite exact submitted source/cache/work-unit backing, then rerun the same inspect. When the Phase Agent elects an allowed deferred outcome, it SHALL use the existing topic-state packet path and its contribution-scoped deferred form; it SHALL not hand-edit a seed, reference index, submitted ledger, source YAML, or cache. No gate or inspect result authorizes a Phase Agent to invent evidence, choose source relevance, or write a reference before submit.

For a sanctioned rerun, Wave0 queue filling SHALL classify current topics from the canonical registry, seed rerun direction and direct queue/work-unit/submitted-ledger facts. A rerun `action:add` topic without current queued, delegated-in-flight or submitted Wave0 coverage SHALL receive the same `source_intake_fan_in` / `wave0_source_intake` delegated demand used by first-run Wave0. An existing topic with valid current-or-previous-layout submitted Wave0 coverage and no supplement intent SHALL NOT be redundantly re-enqueued. An orphan `source.yaml` without submitted coverage SHALL NOT count as completed work.

Before delegated claim, the Phase Agent SHALL read the queue-front role, perform one bounded current native probe for that exact role, and invoke `operate-work-unit claim` with the complete actor observation and execution actor choice. The phase SHALL explicitly forbid `operate-queue claim` and `operate-queue complete` for delegated source-intake demand and SHALL route no-claim feedback back to the same work-unit claim checkpoint.

For returned work, phase guidance SHALL direct the Agent to consume the existing dry-submit disposition before formal submit: `repair_same_candidate` permits only its authorized mechanical candidate repair and a same-check rerun; `return_to_actor` preserves actor-owned semantic work; `fail_and_replace` uses the existing terminal/replacement path; and `inspect_contract` remains at the Engine owner or missing-contract boundary. It SHALL not scan the filesystem to declare or amend backing, and formal submit remains the only transition that unlocks reference materialization.

After a successful Wave0 submit, the Phase Agent SHALL obtain each Seed Projection Packet coordinate from the existing contribution-aware Wave0 inspection/preflight result. `<work_id>/N` means the global ordinal that the submitted work unit's accepted source contribution owns in the current valid source array. A later legal append has a different work ID and owns only its appended ordinal interval. The Phase Agent SHALL not recalculate every historical work unit against the mutable full array, assign a suffix to an earlier work ID, hand-edit a seed, or treat `result_hash` as a source-byte snapshot. A contribution-prefix or missing-boundary feedback root is an Engine-owned condition to inspect and rerun through the existing legal path, not a prompt to fabricate provenance.

#### Scenario: Wave0 closeout uses submitted contribution coordinates

- **WHEN** one accepted Wave0 contribution owns source ordinals `1..19` and a legal later contribution owns ordinal `20`
- **THEN** phase guidance SHALL direct the Agent to use the first work ID only for `/1..19` and the later work ID only for `/20`
- **AND** it SHALL not tell the Agent to reconstruct those identities from current file length or result prose

#### Scenario: Wave0 source intake uses work-unit commands

- **WHEN** Wave0 source intake has delegated queue demand
- **THEN** the phase doc SHALL instruct `operate-work-unit claim`, dry-submit, and formal submit in that order
- **AND** it SHALL keep rich shared-reference authoring outside the current actor completion contract

#### Scenario: shared-floor repair uses submitted-backing materialization

- **WHEN** Wave0 inspect identifies a materializable submitted source identity while shared-reference floor coverage is incomplete
- **THEN** the phase doc SHALL direct the Phase Agent to use the exact submitted-backing materialization path and rerun the same inspect
- **AND** it SHALL not direct a new `wave0_source_intake` actor to create a rich-reference output solely to repair the floor

#### Scenario: Wave0 authoring distinguishes reference roots

- **WHEN** Wave0 guidance asks the Phase Agent to create a shared rich reference
- **THEN** it SHALL expose the canonical `00-shared-<slug>.md` path, parser-aligned rich Markdown contract, and exact submitted backing as separate facts
- **AND** it SHALL not present the file, index row, or bare YAML as evidence authority

#### Scenario: Rerun added topic enters normal Wave0 work-unit path

- **WHEN** a sanctioned rerun adds a topic that has no Wave0 queue, in-flight or submitted coverage
- **THEN** the Wave0 phase doc SHALL instruct the Agent to enqueue one standard delegated source-intake demand for that topic
- **AND** the Agent SHALL perform role-bound probe, `operate-work-unit claim`, real actor execution and the dry-submit/formal-submit loop before gate evaluation

#### Scenario: Rerun keeps valid historical topic coverage

- **WHEN** a current topic resolves to valid historical submitted Wave0 coverage and has no supplement direction
- **THEN** Wave0 rerun guidance SHALL retain that coverage without creating duplicate demand
- **AND** the Wave0 gate SHALL remain the unchanged deterministic verdict owner

#### Scenario: Delegated no-claim feedback stays at one checkpoint

- **WHEN** a delegated Wave0 demand is at the active queue front but actor observation is missing or the non-delegated queue claim command is used
- **THEN** phase guidance SHALL tell the Agent to read the returned root cause
- **AND** the only nearest repair SHALL be to perform the required role probe and rerun `operate-work-unit claim`
