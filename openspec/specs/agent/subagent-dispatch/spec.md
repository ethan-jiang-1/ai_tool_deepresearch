# Subagent Dispatch

> req: SUD-001, SUD-002, SUD-003, SUD-004, SUD-005, SUD-006, SUD-007, SUD-008

## Purpose

Define sub-agent dispatch as Engine work-unit claim and prompt handoff. `operate-work-unit claim` allocates `work_id`, writes the work-unit envelope, moves delegated queue demand into `delegated_in_flight`, and returns bounded prompts the Main Agent may hand to sub-agent actors.
## Requirements
### Requirement: Dispatch manifest is schema-validated

The work-unit dispatch manifest and related envelope files SHALL be validated at write time. Invalid manifests SHALL be rejected before any sub-agent prompt is treated as dispatchable.

#### Scenario: invalid work-unit manifest blocks dispatch

- **WHEN** a claimed work unit has a manifest that fails schema validation
- **THEN** its prompt SHALL NOT be treated as dispatchable

### Requirement: Dispatch SHALL originate from Engine work-unit claim

Sub-agent dispatch SHALL originate from `operate-work-unit claim`. Claim SHALL allocate `work_id`, create the work-unit directory envelope, write manifest/task/schema/beacon/receipt placeholders, move the queue demand into `delegated_in_flight`, and return the prompt that the Main Agent may hand to the sub-agent.

Current dispatch guidance SHALL define dispatch as work-unit claim and prompt handoff. It SHALL NOT describe gate pass as declaring retired delegated transport surfaces, old task files, or old result schemas as production dispatch authority.

#### Scenario: claim returns dispatchable prompt

- **WHEN** a delegated queue item is claimed
- **THEN** the Engine SHALL return a prompt bound to `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** the prompt SHALL reference the work-unit directory and beacon

#### Scenario: dispatch wording is work-unit based

- **WHEN** active main specs are synced after this change
- **THEN** the dispatch capability SHALL describe Engine work-unit claim as the dispatch origin
- **AND** it SHALL NOT describe bounded retired transport positions as the production dispatch model

### Requirement: Work-unit dispatch SHALL support batched fan-out

`operate-work-unit claim --count N` SHALL create up to N in-flight work units from the contiguous eligible queue-front prefix. The Main Agent MAY fan out the returned prompts, but sub-agents SHALL NOT allocate IDs or mutate queue/index state.

Batched fan-out SHALL be expressed as multiple Engine-allocated work units, not as a position array or retired dispatch manifest.

#### Scenario: batch claim creates multiple in-flight attempts

- **WHEN** the queue front contains three eligible delegated items
- **AND** the Main Agent runs `claim --count 3`
- **THEN** the Engine SHALL allocate three distinct `work_id` values
- **AND** all three queue demands SHALL be recorded in `delegated_in_flight`

#### Scenario: fan-out creates work-unit prompts

- **WHEN** a current experiment proves delegated fan-out
- **THEN** it SHALL use claimed work-unit prompts as the fan-out surface
- **AND** its verdict SHALL not depend on retired transport manifests

### Requirement: Work-unit dispatch SHALL enforce delegated fan-out concurrency cap

V1 dispatch concurrency SHALL be enforced by the Phase Agent's choice of `claim --count N` and the effective `delegated_concurrency_cap` from the `ProfileSchema`-parsed run profile. An explicit `rb_profile.yaml#/delegated_concurrency_cap` is the persisted override; `ProfileSchema` SHALL supply `12` when it is omitted and reject values outside the integer range `1..20`. No CLI option or environment variable SHALL create a competing cap source.

The cap SHALL limit how many work-unit prompts the Phase Agent may request and fan out at once. It SHALL NOT create multiple schedulers, host-capacity/liveness authority, physical-concurrency proof, or any sub-agent authority to allocate IDs. The Engine SHALL continue to allocate all work-unit IDs in its existing transaction and retain actor preflight, queue, admission, and fallback authority.

The cap SHALL be described in work-unit terms. Current production guidance SHALL NOT express it as a retired transport-position count or as a claim that a native host physically executed the same number of actors concurrently.

#### Scenario: cap limits fan-out, not allocation authority

- **WHEN** a parsed profile cap allows seven delegated workers and seven independent eligible demands are available
- **THEN** the Phase Agent MAY request `claim --count 7`
- **AND** all IDs SHALL still be allocated by the Engine in one transaction

#### Scenario: profile value is the only cap input

- **WHEN** a run profile declares `delegated_concurrency_cap: 3` and a CLI or environment setting proposes another cap
- **THEN** guidance SHALL use the parsed profile value of three
- **AND** no additional cap source SHALL alter the normal fan-out choice

#### Scenario: cap wording avoids slot and host authority

- **WHEN** a current doc or spec explains delegated concurrency
- **THEN** it SHALL describe the number of work-unit prompts the Phase Agent may fan out
- **AND** it SHALL NOT describe slot allocation, host capacity, actor liveness, or physical concurrency as production authority

### Requirement: Work-unit claim stdout is one machine-parseable JSON document (SUD-008)

`operate-work-unit claim` SHALL write exactly one JSON document to stdout: every machine consumer (JSON parsers, executors, wrappers) MUST be able to `JSON.parse` the full stdout without preprocessing. Any prompt, guidance, or long-form text embedded in the claim response SHALL be JSON-escaped string content (as produced by standard JSON serialization) and SHALL NOT be emitted as raw text with unescaped control characters or raw newlines inside a string value.

The claim response SHALL remain a bounded dispatch surface: per claimed work unit it carries machine-readable coordinates (`work_id`, `queue_item_id`, bundle-relative refs, result path) and a bounded `spawn_prompt`; it SHALL NOT embed the full generated `task.md` document content as a replacement for the on-disk `task_ref`/`task_path` coordinates. The stdout contract SHALL be regression-locked: a claim on an eligible queue item SHALL produce stdout that parses as a single JSON value.

#### Scenario: Machine consumer parses claim stdout

- **WHEN** a delegated queue item is claimed through the CLI
- **THEN** the complete stdout SHALL parse as a single JSON value without preprocessing
- **AND** the parsed object SHALL contain `claimed_work_ids[]` and `prompt_refs[]` with the claimed work-unit coordinates

#### Scenario: Embedded prompt text is escaped string content

- **WHEN** the claim response embeds a `spawn_prompt` or other long-form text field
- **THEN** the field SHALL be a JSON-escaped string value
- **AND** the full `task.md` document SHALL NOT be embedded as claim stdout content; the response SHALL point to the on-disk `task_ref`/`task_path` instead
