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

Sub-agent role specs, shared sub-agent protocol, generated work-unit task Markdown, and Phase Agent spawn prompts SHALL require the sub-agent to read the assigned `_beacon.json` before writing runtime files, extract `bundle_dir`, and resolve all runtime output paths against that current run bundle root. Spawn prompts SHALL also inline the exact identity block (`work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `bundle_dir`, key refs) so the sub-agent does not invent identity fields or rely on ambiguous relative paths.

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

- **WHEN** a sub-agent writes `_work_units/...`, `artifacts/...`, or `_cache/...` relative to repo root instead of current run bundle root
- **THEN** submit or inspection SHALL reject or diagnose the output as a bundle-root violation
- **AND** the leaked repo-root files SHALL NOT count as work-unit completion

#### Scenario: File existence verification is part of successful return

- **WHEN** a work-unit task declares output files and cache trails
- **THEN** the sub-agent SHALL verify those files under current run bundle root before returning success
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

Generated work-unit `result.schema.json` SHALL be an Agent-facing projection of the same result contract enforced by submit and the assigned kind output contract. Manifest, task, spawn prompt, beacon, result schema and submit validation SHALL agree on identity, required fields, source-claim capability, output roles and cache expectations.

For a source-claim-capable work unit, `source_claims[]` SHALL retain the strict item shape `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`. The schema/task SHALL explain that `source_ref` is a submitted evidence reference, not necessarily a file newly written by the current attempt.

The kind output contract SHALL explicitly declare `source_claims.prior_submitted_output_roles[]`. Values SHALL be unique non-empty role strings and a subset of the same contract's `output_files.allowed_roles[]`; if `source_claims.allowed` is not true, the prior-role list SHALL be absent or empty. For `wave1_topic_deepening`, the default SHALL be exactly `['evidence_summary']`; absence or an empty list SHALL mean that prior submitted outputs are not accepted for that kind. This field SHALL be projected consistently into manifest, generated task/checklist, result-schema guidance, dry-submit and formal submit validation.

An accepted claim's `source_ref` SHALL be valid when it is either:

1. declared in the current result's `output_files[]`; or
2. declared by a hash-valid previously submitted work-unit row whose canonical topic UID, wave and kind equal the current attempt, and whose exact output role is listed in the current kind contract's `source_claims.prior_submitted_output_roles[]`.

The validator SHALL resolve prior submitted outputs through one in-memory submitted-output index derived from the existing hash-valid bundle ledger row, its bound work-unit index/manifest/queue-item topic payload, and the canonical topic resolver. The Engine SHALL expose the current-or-prior authorization conclusion through one pure source-ref resolver. Dry-submit, formal submit, Wave1 reviewed submitted-backing/depth review, and any later consumer that permits or rejects an accepted source claim SHALL consume that conclusion rather than recreate a current-output-only predicate. The resolver SHALL return the relevant safe/current/prior/ambiguous/invalid authority outcome without persisting a new authority. It SHALL NOT infer Topic identity from output filename or queue-id text. It SHALL NOT accept filesystem presence alone, an unresolved/ambiguous topic binding, a different topic's output, a different wave/kind, an output role absent from `prior_submitted_output_roles[]`, an unsubmitted/invalid row, or free-text path similarity. Current-attempt cache/degraded refs SHALL still be declared and validated through the current result unless the active contract explicitly allows a prior submitted cache ref.

Generated task/checklist guidance SHALL expose both legal source-ref forms and the exact current/prior submitted paths available for the claimed topic where bounded. It SHALL not instruct supplementary work to redeclare or overwrite an existing evidence file merely to satisfy a single-attempt assumption.

Submit/dry-submit diagnostics for a source-ref failure SHALL return a stable code, the candidate `source_ref`, whether it was searched in current outputs and prior submitted outputs, any conflicting declaring `work_id`/topic, and contract-lineage repair coordinates: `repair_kind: agent_action`, `missing_fact`, `write_to` naming the exact `result.json#/source_claims/<index>/source_ref`, and `rerun` naming the same dry-submit command. When the prior path is valid, submit SHALL accept it without requiring duplicate `output_files[]` declaration. A downstream review consumer SHALL preserve the same authorization decision while continuing to validate the reviewed row's own accepted URL and current cache/degraded bindings.

For a current-version claim, `assignment_contract_version` SHALL be the top-level Engine-owned literal `work-unit.assignment.v3` on index, manifest and beacon, while the assigned output contract SHALL be one strict Zod-validated object containing `required_outputs[]` in addition to existing result/cache/source-claim rules. Each required output SHALL contain one concrete bundle-relative path, one canonical role, and one closed direct_contract identity. Cross-field validation SHALL reject unknown IDs, duplicate normalized paths, conflicting roles, unsafe or pattern paths, kind-incompatible direct contracts, and any queue/payload direct selector before generation. Existing strictly valid non-selector kind customization MAY remain as the base contract and SHALL be reconstructed from the hash-bound queue snapshot. Marked v1/v2 attempts SHALL retain their recorded version-selected output-contract interpretation rather than acquire v3 supplementary behavior.

Manifest and beacon SHALL carry the same top-level marker and validated output contract. Generated task/checklist SHALL show the marker plus each required path, absolute path, role and contract ID. For every current required output, generated `result.schema.json` SHALL add an `output_files` `contains` constraint with the exact path and canonical role and `minContains: 1`, `maxContains: 1`; it SHALL also constrain any item declaring that required path to the canonical role. Thus omission, duplication, or `other`/wrong-role declaration for a required path SHALL not be advertised as schema-valid. Optional contract-authorized outputs MAY still be declared under the existing item schema. The `output_files` schema default and generated Result JSON Starter SHALL contain each exact required path/role pair once for a current non-empty contract, so structural projection tests and the candidate-result Zod shape accept those declarations before the actor adds submit-required receipt/cache/source facts; an empty required_outputs contract SHALL default/start with `[]`. The starter SHALL NOT be described as submit-ready until those actor-owned facts pass dry-submit. The schema MAY carry non-fillable annotations for assignment context, but SHALL NOT add assignment_contract_version or direct_contract as actor result properties. Formal dry-submit/submit SHALL remain the authoritative normalized-path exact-set validator and SHALL reject duplicate/conflicting declarations even if a consumer ignores unsupported JSON Schema keywords. The projection SHALL not expose a contract selector to the actor.

A v3 supplementary Wave1 contract with snapshot-bound `payload.assignment_mode: supplementary` and empty required_outputs SHALL continue to expose eligible prior submitted evidence_summary lineage and SHALL not require current declarations for the paired artifacts. Empty required_outputs alone SHALL NOT select supplementary behavior. Wave2 targeted evidence remains on its existing result/cache/source contract with no v3 direct content blocker when required_outputs is empty.

Generated guidance SHALL require the actor to author and verify assigned outputs before work_done and SHALL tell the Phase Agent to run dry-submit after return. V1 SHALL not require native actors to execute the Engine CLI. Guidance SHALL consume the Engine-derived recommended_action rather than infer from prose: repair_same_candidate changes only an unambiguous envelope-derived candidate declaration or required path/role after the assigned target passes; return_to_actor preserves pre-work_done actor ownership for receipt/source/cache/output meaning; fail_and_replace preserves assignment mode/receipts after work_done; inspect_contract stays at the Engine-owned surface. It SHALL not direct Phase Agent receipt/source/cache fabrication, semantic authorship, weakened supplementary work, abandon as a competing normal route, or a user-operated pipeline.

#### Scenario: Current output remains a valid source ref

- **WHEN** an accepted source claim names a path declared by the current result
- **THEN** submit and reviewed Wave1 backing SHALL validate it through the same current-output authorization branch

#### Scenario: Supplementary work can cite prior submitted evidence

- **WHEN** a supplementary Wave1 work unit claims a new source/cache trail for topic A
- **AND** its `source_ref` names a hash-valid `evidence_summary` output submitted earlier by `wave1_topic_deepening` for the same canonical topic A
- **THEN** submit SHALL accept the prior submitted source ref
- **AND** the supplementary result SHALL NOT be required to redeclare or overwrite that evidence-summary file

#### Scenario: Depth review preserves valid prior submitted source authorization

- **WHEN** a reviewed supplementary Wave1 submitted row contains an accepted claim whose `source_ref` is the exact authorized prior `evidence_summary` for its canonical Topic, wave, and kind
- **THEN** Wave1 reviewed submitted-backing/depth review SHALL accept that source-ref authorization without requiring it in the current row's `output_files[]`
- **AND** it SHALL continue to reject a missing or invalid current cache/degraded binding for that claim

#### Scenario: Filesystem-only source ref remains invalid

- **WHEN** `source_ref` exists on disk but is absent from current outputs and valid prior submitted outputs
- **THEN** submit and reviewed Wave1 backing SHALL fail closed
- **AND** the diagnostic SHALL identify the missing submitted declaration rather than merely saying the path is not in current `output_files[]`

#### Scenario: Cross-topic prior source ref fails clearly

- **WHEN** a supplementary work unit for topic A names an output submitted for topic B
- **THEN** submit SHALL reject the binding
- **AND** diagnostics SHALL name the declaring work ID/topic mismatch and the exact source-claim repair target

#### Scenario: Wrong prior kind or role remains invalid

- **WHEN** the exact path was previously submitted for the same Topic but under another wave/kind or with role `question_list`, `reference`, or `other`
- **THEN** a default `wave1_topic_deepening` supplementary attempt SHALL reject it because only prior `evidence_summary` is contract-authorized
- **AND** diagnostics SHALL name the observed wave/kind/role and the current contract's allowed prior roles

#### Scenario: Prior role list must be part of the kind contract

- **WHEN** a kind contract declares a duplicate prior role, a role absent from `output_files.allowed_roles[]`, or prior roles while source claims are disabled
- **THEN** kind-contract validation SHALL reject the contract before claim guidance or submit validation diverge

#### Scenario: Topic identity is not inferred from output path

- **WHEN** a prior submitted path looks like the current Topic slug but its bound manifest/queue-item topic payload is missing, ambiguous, or resolves to another UID
- **THEN** the prior path SHALL not enter the submitted-output candidate index
- **AND** diagnostics SHALL report the unresolved/mismatched binding rather than accepting filename similarity

#### Scenario: Missing source ref gives one repair coordinate

- **WHEN** a source ref is neither current output nor an exact contract-authorized prior submitted output
- **THEN** `missing_fact` SHALL state that the claim needs either a genuinely current assigned output or an exact same-topic/wave/kind prior path with an allowed role
- **AND** `repair_kind` SHALL be `agent_action`
- **AND** `write_to` SHALL identify the one source-claim JSON pointer to edit
- **AND** `rerun` SHALL identify the same dry-submit command

#### Scenario: Generated envelope surfaces agree

- **WHEN** a source-claim-capable work unit is claimed
- **THEN** task, result schema and submit validation SHALL expose the same source-ref lineage semantics
- **AND** no hidden current-output-only rule SHALL remain solely in a verdict consumer

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

#### Scenario: result schema projects exact required path-role pairs

- **WHEN** a current primary Wave1 envelope is generated
- **THEN** manifest, beacon, task and checklist SHALL expose the same top-level assignment version and two required path-role-direct-contract entries, while result schema requires each exact path-role pair once through `contains` plus path-to-role constraints and may annotate the read-only version
- **AND** `output_files.default` and the Result JSON Starter SHALL prepopulate those two exact path-role pairs once
- **AND** the result schema SHALL not advertise omission, duplication, or role other for either required path

#### Scenario: generated projections cannot select contracts

- **WHEN** an actor reads task.md or result.schema.json
- **THEN** it MAY fill only candidate result/output fields allowed by the resolved contract
- **AND** it SHALL not receive a field or CLI argument that chooses assignment version or direct contract ID

#### Scenario: supplementary result schema preserves prior lineage

- **WHEN** a supplementary Wave1 attempt has assignment_mode supplementary, empty required_outputs, and an eligible prior submitted evidence_summary
- **THEN** generated task/result guidance SHALL allow source_claims[].source_ref to name that exact prior path
- **AND** output_files[] SHALL not be required to redeclare the prior paired artifacts
- **AND** its empty required-output schema default and Result JSON Starter SHALL use `output_files: []`

#### Scenario: empty Wave2 direct-output set adds no content blocker

- **WHEN** a wave2_targeted_evidence assignment uses its existing empty required-receipt shape
- **THEN** generated output_contract.required_outputs SHALL be empty
- **AND** existing result, output, cache, source and provenance validation SHALL remain in force without a new Wave2 artifact-content rule

#### Scenario: actor verifies but Phase Agent invokes dry-submit

- **WHEN** a native actor completes a current direct-output assignment
- **THEN** its guidance SHALL require exact write verification before work_done
- **AND** Phase Agent guidance SHALL invoke dry-submit after return rather than requiring the native actor to own the CLI

#### Scenario: semantic rejection does not transfer authorship

- **WHEN** Phase Agent dry-submit observes repair_scope semantic_content after work_done
- **THEN** recommended_action SHALL be fail_and_replace and generated/shared guidance SHALL direct fail plus a same-obligation replacement under a fresh queue ID and new work ID
- **AND** it SHALL not tell the Phase Agent or user to fill missing research meaning under the original actor provenance

### Requirement: Sub-agent fetch guidance SHALL distinguish per-URL fallback, multi-URL batching, and JS/Node-first fetch tiers

Wave0, Wave1 and external-evidence Wave2 Sub-agent role guidance SHALL describe page fetching through one canonical shared Agent-facing guidance surface, delivered to registered work-unit actors through Engine-derived ephemeral role/shared guidance refs. The shared fetch file SHALL be an explicit direct role dependency with closed identity `id: shared-page-fetch-guidance`, `shared_scope: subagent-fetch`, `authority: guidance-only` and `actor_delivery: required`; unrelated direct dependencies SHALL not be projected. It SHALL not be a workflow-manifest always-loaded shared node or persisted work-unit field. Role files SHALL retain role-specific search goals and evidence/cache obligations but SHALL NOT restate an independent fallback chain. Active auxiliary claim-verifier/source-diagnostic role docs MAY reference the same shared owner without becoming registered kind roles.

The shared guidance SHALL distinguish two layers:

- for one candidate URL, try the allowed fallback chain in order until page content is fetched or every allowed tier fails;
- across different candidate URLs, use small-batch fetching, or bounded parallel fetching only when the native tool/runtime already supports it and site politeness permits.

Multi-URL batching SHALL be a performance strategy only. It SHALL NOT reduce evidence coverage, cache trail requirements, source claim requirements, accepted URL requirements, or lifecycle receipt requirements. Search snippets SHALL NOT replace fetched page content. A Sub-agent SHALL record an access failure for a URL only after every independently permitted JS/Node-first tier and the bounded CLI fallback for that URL fails.

The canonical guidance SHALL use JS/Node-first page-fetching tiers: available built-in page-fetching surface first, browser fetch when actually available, Node.js `fetch`, then one bounded standalone `curl` fallback for the same URL when independently configured host permission allows it. It SHALL impose finite timeout/redirect/protocol bounds, reject shell composition and unsafe URL interpolation, and SHALL NOT interpret native policy failure as shell permission. It SHALL NOT instruct Python fallback, Python one-liners, Python scripts, `wget`, another fallback tier, repeated automatic retry, policy widening or user command handoff.

Fetched page content, cache leaves, source claims, accepted URLs and receipts remain actor-owned runtime facts. Shared guidance and generated task projections do not fetch on the actor's behalf and do not create evidence, receipt or submit authority. If every legal tier fails or a new host permission/external environment action is required, the actor SHALL record the bounded failure and return that smallest boundary to the Phase Agent; the user SHALL not become the work-unit pipeline co-runner.

For each completed fetch tier, guidance SHALL require an actor-written existing runtime-receipt event named `fetch_attempt_done`. Its structured `detail` SHALL record the exact URL, tier (`native`, `browser`, `node_fetch` or `curl`), truthful runtime surface, outcome and bounded reason code. These optional diagnostic details SHALL support conditional fallback observation only; they SHALL NOT become new receipt identity/lifecycle requirements, cache/source truth, submit acceptance, or a persisted fetch state machine. Missing details SHALL leave fallback behavior unobserved rather than fail an otherwise valid work-unit submit.

#### Scenario: fallback chain applies to one URL

- **WHEN** a Sub-agent tries to fetch `https://example.com/a`
- **THEN** it SHALL try the independently permitted bounded tiers for that same URL before recording access failure
- **AND** failure for that URL SHALL NOT imply other candidate URLs must wait for the full chain serially

#### Scenario: multiple URLs may be fetched in small batches

- **WHEN** a work-unit task has several candidate URLs to evaluate
- **THEN** Sub-agent guidance SHALL permit fetching them in small batches within tool/runtime/site limits
- **AND** it MAY permit bounded parallel fetching when the available tool natively supports parallel URL work
- **AND** each accepted source SHALL still write required cache trail files and structured result declarations

#### Scenario: JS/Node-first fallback replaces Python fallback

- **WHEN** active Sub-agent role/shared docs list page-fetching fallback tools
- **THEN** they SHALL list the canonical built-in/browser/Node.js tiers and bounded same-URL `curl` fallback
- **AND** they SHALL NOT list Python, `wget` or an unbounded alternative tier
- **AND** hygiene or tests SHALL fail if Python fallback, a Python fetch workaround or a role-local duplicate chain reappears in active Wave0/Wave1/Wave2 search roles

#### Scenario: native failure does not create shell permission

- **WHEN** the native surface is blocked or unavailable for one URL
- **THEN** the actor SHALL use the canonical `curl` fallback only when current host shell/network permission independently permits it
- **AND** its existing runtime receipt SHALL record same-URL `fetch_attempt_done` facts for native and every actually available predecessor tier before curl
- **AND** a delegated fallback witness SHALL not pass when an available browser/Node tier was skipped, the URL changed, curl lacked independent permission, or curl returned no real content
- **AND** it SHALL not widen policy, ask the user to run an already authorized command or treat command exit without real content as accepted evidence

#### Scenario: fetch attempt details remain diagnostic

- **WHEN** a work unit otherwise satisfies its existing result, output, cache, source and lifecycle receipt contract but lacks structured per-tier fetch detail
- **THEN** formal submit SHALL not reject solely for that missing diagnostic detail
- **AND** delegated native-to-curl behavior SHALL remain `UNOBSERVED` rather than be inferred from cache presence, prose or tool naming

#### Scenario: batching does not allow snippet evidence

- **WHEN** a batched fetch attempt cannot retrieve page content for a candidate URL
- **THEN** the Sub-agent SHALL NOT treat search snippets as fetched content for that URL
- **AND** accepted source coverage SHALL require fetched cache content or explicit degraded-capture records as defined by existing contracts

### Requirement: Sub-agent slow work SHALL emit observable progress before timeout risk

Sub-agent role guidance and generated work-unit task guidance SHALL instruct Sub-agents performing slow search, fetch, extraction, output, or cache work to emit concise lifecycle progress around bounded batches. Progress events SHALL preserve the assigned `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`, and SHALL write to the assigned work-unit runtime receipt or logging surface under the current run bundle root.

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
