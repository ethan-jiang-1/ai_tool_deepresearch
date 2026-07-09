# Subagent Node Contract

> req: SNC-001, SNC-002, SNC-003, SNC-004, SNC-005, SNC-006, SNC-007, SNC-008

## Purpose

Define the sub-agent task/result/lifecycle contract for Engine-claimed work units. Generated work-unit tasks and spawn prompts bind `work_id`, `queue_item_id`, kind, `receipt_nonce`, work-unit directory, result schema, beacon, runtime receipt, and submit expectations.
## Requirements
### Requirement: Sub-agent role specs SHALL mandate lifecycle logging

Sub-agent role specs SHALL mandate lifecycle logging through work-unit receipt/logging instructions. Lifecycle events SHALL be associated with the work-unit receipt nonce rather than a non-work-unit beacon nonce.

Current node, role, and prompt guidance SHALL NOT tell the Phase Agent to drive delegated work through retired drivers or old task generators. It SHALL bind lifecycle logging to work-unit task, beacon, receipt, and submit surfaces.

#### Scenario: lifecycle event binds work unit

- **WHEN** a sub-agent logs `work_done`
- **THEN** the event SHALL carry the work-unit `receipt_nonce`
- **AND** the event SHALL be checkable against the work-unit manifest and beacon

#### Scenario: role guidance uses work-unit logging path

- **WHEN** generated sub-agent guidance describes lifecycle logging
- **THEN** it SHALL identify the assigned work unit and work-unit beacon
- **AND** it SHALL NOT require a retired delegated driver as the production logging path

### Requirement: Sub-agent task contract SHALL bind work-unit identity

Generated sub-agent task Markdown and spawn prompts SHALL bind `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, work-unit directory, result schema, output contract, lease deadline, and receipt/logging instructions.

The task contract SHALL refer to generated work-unit task Markdown, not old delegated task generation.

#### Scenario: task contains nonce and deadline

- **WHEN** `operate-work-unit claim` generates `task.md`
- **THEN** the task SHALL include the work-unit receipt nonce and deadline
- **AND** the sub-agent SHALL be instructed to preserve those fields in receipts and result

#### Scenario: task contract excludes old delegated task wording

- **WHEN** current specs or playbooks describe a generated delegated task
- **THEN** they SHALL describe a work-unit task bound to `work_id`
- **AND** they SHALL NOT describe a retired delegated task as production authority

### Requirement: Sub-agent result contract SHALL bind receipt nonce

Sub-agent result files and runtime receipt events SHALL include `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. Submit SHALL reject mismatches across result, receipt, beacon, manifest, index, and ledger row.

The result contract SHALL be validated by `operate-work-unit submit`. A result that only matches an old delegated result shape SHALL NOT be accepted as delegated completion.

#### Scenario: nonce mismatch rejects submit

- **WHEN** a result uses a different `receipt_nonce` than the beacon
- **THEN** submit SHALL reject the result as non-terminal

#### Scenario: old result shape is not delegated completion

- **WHEN** a delegated result is not bound to a submitted work unit
- **THEN** it SHALL NOT complete queue demand
- **AND** it SHALL NOT append delegated ledger coverage

### Requirement: Work-unit task Markdown SHALL include lifecycle logging directive

Generated work-unit task Markdown SHALL include lifecycle logging directives, result schema location, beacon pointer, and submit expectations for the assigned work-unit directory.

The directive SHALL route completion back through work-unit submit and SHALL NOT instruct the sub-agent or Phase Agent to use retired relay/slot completion commands.

#### Scenario: generated task names work-unit surfaces

- **WHEN** a task is generated for a claimed work unit
- **THEN** the task SHALL identify the work-unit directory, beacon, result schema, and lifecycle logging expectations

#### Scenario: generated task names submit return contract

- **WHEN** a generated task describes how work returns to the main run
- **THEN** it SHALL identify the submit contract for the assigned work unit
- **AND** it SHALL NOT name a retired relay commit or merge path as production completion

### Requirement: Sub-agent role specs SHALL require beacon-first absolute path resolution and file existence verification before return

Sub-agent role specs, shared sub-agent protocol, generated work-unit task Markdown, and Phase Agent spawn prompts SHALL require the sub-agent to read the assigned `_beacon.json` before writing runtime files, extract `bundle_dir`, and resolve all runtime output paths against that active bundle root. Spawn prompts SHALL also inline the exact identity block (`work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `bundle_dir`, key refs) so the sub-agent does not invent identity fields or rely on ambiguous relative paths.

Before returning success, the sub-agent SHALL verify required output files exist and are non-empty where applicable. Failure to write or verify files SHALL be reported as work-unit failure.

Sub-agent role definitions that are assigned write-producing work units SHALL explicitly expose or declare filesystem write capability. A role that cannot write files SHALL NOT be assigned work units whose done condition requires writing `result.json`, runtime receipts, reference files, source YAML, or cache trails.

Current work-unit sub-agent roles SHALL NOT produce terminal `final/` report artifacts. If a future accepted spec introduces final-producing delegated work, it SHALL define that authority explicitly; until then, final delivery remains governed by the Final phase and content-delivery contracts.

#### Scenario: Sub-agent consumes beacon before writing

- **WHEN** a sub-agent starts a work-unit task
- **THEN** the role contract SHALL require it to read the assigned `_beacon.json`
- **AND** all assigned writes to `_work_units/`, `artifacts/`, `_cache/`, or `reference/` SHALL be resolved under `beacon.bundle_dir`

#### Scenario: Spawn prompt inlines exact identity fields

- **WHEN** the Phase Agent spawns a sub-agent for a work unit
- **THEN** the spawn prompt SHALL include exact values for `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, and `bundle_dir`
- **AND** it SHALL instruct the sub-agent to copy those values exactly into every runtime receipt event and `result.json`
- **AND** it SHALL NOT ask the sub-agent to generate a new nonce

#### Scenario: Repo-root writes are invalid sub-agent output

- **WHEN** a sub-agent writes `_work_units/...`, `artifacts/...`, or `_cache/...` relative to repo root instead of active bundle root
- **THEN** submit or inspection SHALL reject or diagnose the output as a bundle-root violation
- **AND** the leaked repo-root files SHALL NOT count as work-unit completion

#### Scenario: File existence verification is part of successful return

- **WHEN** a work-unit task declares output files and cache trails
- **THEN** the sub-agent SHALL verify those files under active bundle root before returning success
- **AND** if verification fails it SHALL return a failure summary rather than only content findings

#### Scenario: Write-producing role declares filesystem write capability

- **WHEN** a sub-agent role is eligible for work units that require writing result, receipt, output, or cache files
- **THEN** the role spec SHALL declare filesystem write capability or required write tools
- **AND** workflow validation or role review SHALL reject assigning write-producing work units to a role that cannot write files

#### Scenario: Sub-agent role does not own final delivery

- **WHEN** a current work-unit sub-agent task is generated for wave evidence or synthesis support
- **THEN** the task SHALL NOT assign terminal `final/` report delivery to the sub-agent
- **AND** any final report file written outside the legal Final phase SHALL remain subject to content-delivery phase-boundary diagnostics

### Requirement: Sub-agent role contracts SHALL return source backing instead of owning consumer reference presentation

Sub-agent role contracts for Wave1 topic deepening and Wave2 targeted evidence SHALL focus on bounded high-I/O source work: search, fetch, extraction, evidence summaries or bounded evidence payloads, structured source claims, accepted source URLs when available, cache trails, runtime receipts, and result JSON. They SHALL NOT be the canonical owner of consumer-facing reference presentation unless a specific accepted work-unit task explicitly assigns a reference output.

For Wave1 `dpt-evidence-extractor`, canonical topic reference Markdown files SHALL be Phase-owned post-submit materializations. For Wave2 `dpt-topic-scout`, the Sub-agent SHALL return source evidence and cache trails for the assigned finding; the Phase Agent SHALL update `finding-index.yaml`, `cross-topic-ledger.md`, seed-topic backfill, and any `reference/00-cross-*.md` projection after submit.

When a Sub-agent is explicitly assigned a fetched-source reference output, normal work-unit submit rules still apply: the output path must be declared, cache trails must be verified, and the reference must not gain authority without submitted ledger backing.

#### Scenario: Wave1 evidence extractor returns source substrate

- **WHEN** a `dpt-evidence-extractor` work unit completes
- **THEN** its result SHALL expose source claims, accepted source URLs when available, output files for evidence-summary/question-list, and cache trails
- **AND** canonical topic reference Markdown SHALL be materialized by the Phase Agent after successful submit and before Wave1 gate for accepted submitted sources suitable for consumer navigation

#### Scenario: Wave2 topic scout does not update synthesis authority files

- **WHEN** a `dpt-topic-scout` work unit completes
- **THEN** it SHALL return bounded evidence, source URLs, confidence/fills-gap payload, and cache trails
- **AND** it SHALL NOT decide final finding status or update `finding-index.yaml`, `cross-topic-ledger.md`, `synthesis.md`, or seed-topic backfill authority

#### Scenario: explicitly assigned reference output remains ledger-bound

- **WHEN** a work-unit task explicitly assigns a Sub-agent to write a reference Markdown file
- **THEN** that file SHALL be declared in `output_files[]` and backed by verified cache trails where fetched-source evidence is claimed
- **AND** `operate-work-unit submit` SHALL remain the only delegated success boundary

### Requirement: Generated result schema and submit enforcement SHALL match kind contract

Generated work-unit `result.schema.json` SHALL be an Agent-facing projection of the same work-unit result contract enforced by submit-time validation and the assigned kind output contract. Submit-time validation SHALL enforce any kind-level output constraint that the generated schema advertises before submitted-ledger append.

The generated work-unit envelope (`manifest.json`, `task.md`, spawn prompt, `_beacon.json`, and `result.schema.json`) SHALL expose one coherent projection of the assigned manifest/output/cache contract. These surfaces SHALL NOT disagree about identity fields, required result fields, source-claim capability, accepted URL capability, output file item shape, output role set, or cache trail expectations.

The generated schema SHALL const-bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` for the assigned work unit. It SHALL expose `output_files[]` items with required `path` and `role`, optional `source_url`, and optional `source_slug`, with `additionalProperties: false`; `role` SHALL be constrained to the assigned work unit output contract's `output_files.allowed_roles`. Submit-time validation SHALL enforce the same allowed role set before ledger append. This requirement does not define gate-specific path-to-role coverage policy unless that policy is already encoded in the assigned kind output contract.

When the assigned output contract does not allow source claims, the generated schema SHALL omit `source_claims` and `accepted_source_urls`. When the assigned output contract allows source claims, the generated schema SHALL expose `source_claims[]` items with exactly `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`, with `additionalProperties: false`; it SHALL also expose `accepted_source_urls[]`.

For every field listed by `output_contract.required_result_fields`, the generated schema and submit validator SHALL express the same semantics. A field SHALL NOT be advertised as required in the output contract while generated schema or submit validation silently treats it as defaulted or optional, unless the output contract is corrected to stop listing it as required.

#### Scenario: wave0 schema omits unsupported source claim fields

- **WHEN** the Engine generates a `result.schema.json` for a `wave0_source_intake` work unit whose output contract does not allow source claims
- **THEN** the schema SHALL NOT include `source_claims`
- **AND** it SHALL NOT include `accepted_source_urls`
- **AND** submit-time validation SHALL reject a non-empty `source_claims[]` or `accepted_source_urls[]` result for that same work unit contract

#### Scenario: wave1 schema exposes strict source claim items

- **WHEN** the Engine generates a `result.schema.json` for a `wave1_topic_deepening` work unit whose output contract allows source claims
- **THEN** the schema SHALL include `source_claims[]`
- **AND** each `source_claims[]` item SHALL allow only `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`
- **AND** submit-time validation SHALL reject an extra key in a `source_claims[]` item for that same work unit contract

#### Scenario: output file role enum follows output contract

- **WHEN** the Engine generates a `result.schema.json` for any registered work-unit kind
- **THEN** `output_files[].role` SHALL be constrained to that kind's `output_contract.output_files.allowed_roles`
- **AND** a role absent from that allowed role list SHALL NOT be advertised as schema-valid

#### Scenario: submit rejects role outside output contract

- **WHEN** a work-unit result declares an `output_files[].role` absent from the assigned kind's `output_contract.output_files.allowed_roles`
- **THEN** `operate-work-unit submit` SHALL reject the result before ledger append
- **AND** the rejection diagnostic SHALL identify the invalid output role or allowed role contract

#### Scenario: identity fields are const-bound

- **WHEN** the Engine generates a `result.schema.json` for a claimed work unit
- **THEN** `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` SHALL be const-bound to the manifest values
- **AND** an Agent reading only the generated task and result schema SHALL have the exact identity values needed for a submit-ready result

#### Scenario: generated envelope surfaces agree

- **WHEN** `operate-work-unit claim` generates a work-unit envelope
- **THEN** `manifest.json`, `task.md`, spawn prompt, `_beacon.json`, and `result.schema.json` SHALL expose the same `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** they SHALL expose source-claim, output-file, cache, and required-result expectations that do not contradict the assigned output/cache contract or submit validator

#### Scenario: required result fields have one entrance meaning

- **WHEN** a registered work-unit kind declares `output_contract.required_result_fields`
- **THEN** each declared field SHALL be required by both generated `result.schema.json` and submit validation
- **OR** the kind output contract SHALL remove that field from `required_result_fields` when submit intentionally supplies a default
- **AND** tests SHALL prove the generated schema, output contract, and submit validator agree for that field

### Requirement: Sub-agent fetch guidance SHALL distinguish per-URL fallback, multi-URL batching, and JS/Node-first fetch tiers

Wave0 and Wave1 Sub-agent role guidance SHALL describe page fetching as two separate layers:

- for one candidate URL, try the allowed fallback chain in order until page content is fetched or every allowed tier fails;
- across different candidate URLs, use small-batch fetching, or bounded parallel fetching only when the native tool/runtime already supports it and site politeness permits.

Multi-URL batching SHALL be a performance strategy only. It SHALL NOT reduce evidence coverage, cache trail requirements, source claim requirements, accepted URL requirements, or lifecycle receipt requirements. Search snippets SHALL NOT replace fetched page content. A Sub-agent SHALL record an access failure for a URL only after all allowed JS/Node-first tiers and existing CLI fallback tiers for that URL fail.

Active Sub-agent role guidance SHALL use JS/Node-first page-fetching fallback tiers. Preferred tiers SHALL be built-in page-fetching tools, browser fetch, or Node.js `fetch` where available. Existing CLI `curl` MAY remain a fallback tier. Active guidance SHALL NOT instruct Python fallback, Python one-liners, or Python scripts for page fetching.

#### Scenario: fallback chain applies to one URL

- **WHEN** a Sub-agent tries to fetch `https://example.com/a`
- **THEN** it SHALL try the allowed fallback tiers for that URL before recording access failure
- **AND** failure for that URL SHALL NOT imply other candidate URLs must wait for the full chain serially

#### Scenario: multiple URLs may be fetched in small batches

- **WHEN** a work-unit task has several candidate URLs to evaluate
- **THEN** Sub-agent guidance SHALL permit fetching them in small batches within tool/runtime/site limits
- **AND** it MAY permit bounded parallel fetching when the available tool natively supports parallel URL work
- **AND** each accepted source SHALL still write required cache trail files and structured result declarations

#### Scenario: JS/Node-first fallback replaces Python fallback

- **WHEN** active Sub-agent role docs list page-fetching fallback tools
- **THEN** they SHALL list JavaScript/Node-compatible fetch tiers such as built-in page-fetching tools, browser fetch, or Node.js `fetch`
- **AND** they SHALL NOT list Python as an allowed fallback
- **AND** hygiene or tests SHALL fail if Python fallback or a Python fetch workaround reappears in active Wave0/Wave1 Sub-agent fetch sections

#### Scenario: batching does not allow snippet evidence

- **WHEN** a batched fetch attempt cannot retrieve page content for a candidate URL
- **THEN** the Sub-agent SHALL NOT treat search snippets as fetched content for that URL
- **AND** accepted source coverage SHALL require fetched cache content or explicit degraded-capture records as defined by existing contracts

### Requirement: Sub-agent slow work SHALL emit observable progress before timeout risk

Sub-agent role guidance and generated work-unit task guidance SHALL instruct Sub-agents performing slow search, fetch, extraction, output, or cache work to emit concise lifecycle progress around bounded batches. Progress events SHALL preserve the assigned `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`, and SHALL write to the assigned work-unit runtime receipt or logging surface under the active bundle root.

Progress guidance SHALL be batch-level rather than noisy per-token or private-reasoning output. Suitable progress points include work start, search batch start/done, fetch batch start/done, cache write, result draft write, output verification, and work done. If a Sub-agent cannot write a progress receipt/log before a long operation, guidance SHALL instruct it to keep the long operation bounded and to write progress as soon as the bundle-root write surface is available.

Progress receipt/log entries SHALL be diagnostic inputs for timeout preflight only. They SHALL NOT satisfy formal submit, delegated ledger coverage, gate coverage, source claim validation, cache trail validation, or final report authority without successful `operate-work-unit submit`.

Active Sub-agent guidance SHALL keep the repo technology constraints: JS/Node-first fetch guidance only, no Python fallback, no Python one-liners, no `.py` scripts, no Engine-owned fetch orchestration, and no alternate delegated completion path.

#### Scenario: slow fetch batch writes progress

- **WHEN** a Sub-agent begins a slow fetch batch for a claimed work unit
- **THEN** active guidance SHALL instruct it to write a progress event tied to the work-unit identity before or at the start of the batch
- **AND** it SHALL write another progress event after the batch or cache write completes

#### Scenario: progress receipts do not satisfy submit

- **WHEN** a work unit has progress receipt events but no successful formal submit
- **THEN** the progress events MAY block premature timeout while fresh
- **AND** they SHALL NOT append a ledger row, complete queue demand, or satisfy wave gate delegated coverage

#### Scenario: progress guidance keeps JS technology stack

- **WHEN** active Sub-agent guidance explains long fetch/search/cache progress
- **THEN** it SHALL NOT instruct Python fallback, Python one-liners, `.py` scripts, or Engine-owned fetch orchestration
- **AND** it SHALL preserve the work-unit submit path as the only successful delegated completion boundary
