> req: DEW-004, DEW-005, DEW-009, DEW-013, DEW-014, DEW-015

## MODIFIED Requirements

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL include the manifest, task, result schema, beacon, runtime receipt path, status, result surfaces, and optional runtime refs needed to validate submit and diagnose execution. The Engine SHALL generate an opaque `receipt_nonce` and require the nonce to agree across index, manifest, beacon, task, runtime receipt, result, and ledger.

The generated `task.md` SHALL also include one copy-ready Result JSON Starter and one concise pre-submit checklist derived from the same manifest, output contract and cache policy that generate `result.schema.json`. The starter SHALL project the exact result schema version, work-unit identity, receipt nonce, actor contract version and execution actor class when present, plus the allowed result fields for that kind. For a source-claim-capable kind, the same output contract SHALL expose any `source_claims.prior_submitted_output_roles[]`; Wave1 default guidance SHALL identify prior `evidence_summary` as allowed and SHALL NOT imply that prior `question_list`, `reference`, or `other` outputs are compatible. The starter SHALL NOT include `actor_execution` or other fields that the result schema rejects.

The checklist SHALL identify the assigned immutable envelope files, required actor-bound receipt fields, allowed output roles and required path-role pairs, cache leaf directory shape, and any required URL binding between declared outputs/source claims and `meta.json`. It SHALL direct the actor to write the assigned result and direct the Phase Agent to run dry-submit before formal submit or after repairing a rejected candidate. The starter and checklist SHALL be read-only guidance projections; they SHALL NOT pre-create `result.json`, count as actor output, satisfy a receipt, append provenance, or weaken submit validation.

Generated task, spawn prompt, shared protocol and role guidance SHALL distinguish two surfaces explicitly: lifecycle evidence is appended as JSONL to the assigned `runtime-receipt.jsonl`; `log-event.mjs` emits optional diagnostic log/trace events and SHALL NOT satisfy or replace runtime receipt evidence. Guidance SHALL NOT require the user to run dry-submit, submit, receipt repair, or other ordinary pipeline commands.


For every new claim, the Engine SHALL resolve one closed assignment contract before mutation. The resolver input SHALL be the registered work-unit kind, the canonical Topic UID plus recorded current slug in the queue-item snapshot when the kind is topic-scoped, the snapshot-bound closed `payload.assignment_mode` when required by that producer, and canonical file: entries in snapshot-bound required_receipts. `assignment_mode` SHALL express only `primary|supplementary` assignment intent and SHALL NOT select roles or direct-contract IDs. writes_to SHALL remain an allowed write surface and SHALL NOT make optional, pattern, or prior-submitted outputs required. Existing queue/payload kind-contract customization MAY retain strictly valid result-field, allowed-role, source-claim and cache-policy semantics. Queue items SHALL reject the closed reserved keys `required_outputs`, `direct_contract`, `direct_contract_id`, `assignment_contract_version`, `resolver_version`, and `contract_id` at the root or recursively under payload/output_contract. The resolver SHALL ignore all other unknown payload keys rather than interpreting naming or prose as a selector; Markdown and actors SHALL NOT supply contract selection.

The current resolver/assignment literal SHALL be `assignment_contract_version: "work-unit.assignment.v1"`, recorded on the Engine-owned work-unit index record and copied into manifest and beacon binding surfaces. It SHALL be the only resolver-semantics version marker; no separate resolver_version field SHALL be created. The index SHALL NOT copy the resolved contract. The manifest and beacon output_contract SHALL carry one strict required_outputs array whose entries contain one concrete bundle-relative path, one canonical role, and one closed direct_contract identity. Claim SHALL reject unknown versions or IDs, unsafe or duplicate normalized paths, conflicting roles, unsupported required-receipt sets, unresolved Topic bindings, and queue-authored direct selectors before work-ID allocation, queue mutation, or envelope writes.

The v1 resolver SHALL support these direct-output bindings:

- wave0_source_intake with the exact canonical source.yaml file receipt resolves role source_yaml and direct contract wave0.source-metadata-array.v1;
- wave1_topic_deepening with the exact paired evidence-summary and question-list receipts resolves roles evidence_summary and question_list with direct contracts wave1.evidence-summary.v1 and wave1.question-list.v1;
- explicit `assignment_mode: supplementary` wave1_topic_deepening with an empty required-receipt set resolves no current required direct output and continues to use contract-authorized prior submitted evidence lineage;
- wave2_targeted_evidence with its existing empty required-receipt shape resolves no direct content blocker in v1.

A primary mode without the exact pair, a supplementary mode with non-empty receipts, a missing mode, a partial paired set, a receipt for a different recorded Topic coordinate, or any other unsupported set SHALL fail closed rather than be inferred from receipt shape, prose, queue ID suffixes, actor roles, or writes_to. A mode-absent unclaimed card SHALL return to AGQ-013 explicit assignment-mode repair and pass current admission before claim; only an already-claimed attempt's genuinely absent index marker may select legacy submit compatibility. The queue-item snapshot hash SHALL bind every resolver input except the closed resolver version, which is bound by assignment_contract_version. Submit-side readers SHALL first recheck that hash and version, rebuild the expected output contract from the recorded snapshot coordinates, and require exact equality with manifest and beacon. Current mutable plan presentation or current framework defaults SHALL NOT silently remap the attempt's recorded output paths.

The existing default or snapshot-bound customized kind result/cache/source contract and the resolved required_outputs SHALL be merged into one strict Zod-validated output_contract. Cross-field refinements SHALL require unique path-role-contract tuples, closed compatible IDs, and required roles compatible with allowed roles. Submit reconstruction SHALL reuse the same validated base customization from the hash-bound snapshot; generated task, starter, checklist and result schema SHALL be projections from this validated merged contract, not additional acceptance voters.

Claim SHALL preflight the resolver and merged contract for every item in the planned contiguous batch before creating the first work-unit record or entering claim mutation. If any candidate has missing/mismatched assignment mode, invalid Topic/receipt binding, direct selector, or invalid merged kind contract, the entire planned batch SHALL reject with zero work-ID, batch, queue, index, envelope, trace-success, or delegated-in-flight mutation.

#### Scenario: nonce mismatch blocks submit

- **WHEN** a result or runtime receipt carries a nonce that differs from the work-unit beacon
- **THEN** submit SHALL reject the result as non-terminal
- **AND** no ledger row SHALL be written

#### Scenario: Actor-aware envelope provides exact result starter

- **WHEN** a new actor-aware work unit is claimed
- **THEN** generated `task.md` SHALL contain a result starter with the exact schema version, work ID, queue item ID, kind, receipt nonce, actor contract version and execution actor class
- **AND** the starter SHALL expose only fields accepted by the generated result schema

#### Scenario: Envelope explains submit-sensitive output and cache bindings

- **WHEN** a work-unit kind requires specific output roles, cache leaf files or source URL mappings
- **THEN** the generated pre-submit checklist SHALL name those requirements from the active output contract and cache policy
- **AND** it SHALL tell the actor not to overwrite manifest, beacon, result schema or status authority files

#### Scenario: Result starter is not completion authority

- **WHEN** the Engine generates a copy-ready result starter in task guidance
- **THEN** no assigned result, runtime receipt, output file, cache trail, ledger row or queue completion SHALL be created by that projection
- **AND** formal submit SHALL still require real actor-produced surfaces

#### Scenario: Receipt and diagnostic log are not interchangeable

- **WHEN** a work-unit actor records lifecycle progress
- **THEN** Agent-facing guidance SHALL require JSONL receipt events at the assigned runtime receipt path
- **AND** any `log-event.mjs` call SHALL be described as optional diagnostic mirroring only
- **AND** diagnostic logs without runtime receipt evidence SHALL NOT pass dry-submit or formal submit

#### Scenario: Phase Agent owns ordinary submit repair execution

- **WHEN** dry-submit returns an authorized candidate or receipt repair coordinate
- **THEN** the Phase Agent SHALL perform or direct the same-candidate mechanical repair and rerun dry-submit
- **AND** it SHALL NOT ask the user to operate the pipeline unless a separate semantic, permission, or external-action boundary exists

#### Scenario: claim resolves Wave0 direct output before mutation

- **WHEN** a UID-bound wave0_source_intake queue snapshot contains the canonical source.yaml file receipt for its recorded Topic slug
- **THEN** claim SHALL resolve one source_yaml required output with direct contract wave0.source-metadata-array.v1
- **AND** index, manifest and beacon SHALL bind work-unit.assignment.v1 before the actor receives the envelope

#### Scenario: claim resolves paired Wave1 direct outputs

- **WHEN** a primary wave1_topic_deepening snapshot contains assignment_mode primary plus the exact evidence-summary and question-list file receipts for one canonical Topic
- **THEN** the resolved contract SHALL contain exactly those two concrete path-role-direct-contract entries
- **AND** Phase-owned reference materialization and any explicitly authorized extra output SHALL not enter required_outputs

#### Scenario: supplementary Wave1 has no forced paired rewrite

- **WHEN** a supplementary wave1_topic_deepening snapshot has assignment_mode supplementary, no required file receipt, and the existing kind contract authorizes prior submitted evidence_summary lineage
- **THEN** required_outputs SHALL be empty for that attempt
- **AND** generated guidance and submit validation SHALL not require the candidate to redeclare or overwrite the prior evidence-summary or question-list

#### Scenario: unsupported assignment fails before claim mutation

- **WHEN** required receipts are partial, duplicated, unsafe, cross-Topic, or unsupported for the registered kind
- **THEN** claim SHALL reject before allocating a work ID, opening a batch, moving queue demand, or writing an envelope
- **AND** diagnostics SHALL name the invalid assignment fact rather than infer a contract from writes_to or prose

#### Scenario: queue-authored direct selector is rejected

- **WHEN** a new queue item contains any closed reserved selector key at its root or recursively under payload/output_contract
- **THEN** claim SHALL reject the selector before mutation
- **AND** the Engine-owned closed resolver SHALL remain the only contract selector

#### Scenario: existing kind customization is merged deterministically

- **WHEN** a hash-bound queue snapshot contains a strictly valid non-selector kind output contract customization
- **THEN** claim SHALL merge it with Engine-resolved required_outputs and validate the combined contract
- **AND** submit SHALL reconstruct that same merged value rather than discard the customization or trust manifest alone

#### Scenario: assignment mode and receipt shape must agree

- **WHEN** primary mode lacks the exact pair, supplementary mode carries any receipt, or a current Wave1 card lacks mode
- **THEN** claim SHALL reject before allocation or envelope writes
- **AND** a mode-absent unclaimed card SHALL return to AGQ-013 explicit assignment-mode repair rather than receive compatibility inference

#### Scenario: resolver preflights the complete batch

- **WHEN** one later candidate in a planned claim batch has an invalid assignment or merged output contract
- **THEN** claim SHALL reject before allocating the first candidate
- **AND** diagnostics SHALL identify the invalid queue item without leaving a partially claimed batch

#### Scenario: expected contract binds manifest and beacon

- **WHEN** dry-submit or submit loads a current-version attempt
- **THEN** it SHALL verify the embedded queue snapshot hash, rebuild expected output_contract with the index-bound assignment version, and compare manifest and beacon exactly
- **AND** missing, unknown, or drifting contract surfaces SHALL fail closed without falling back to path guessing

### Requirement: Submit SHALL be the only successful delegated completion transition

Normal `submit` and the existing audited `late-submit` SHALL remain the only operations that convert an eligible delegated attempt into successful completion, complete queue demand, and create submitted coverage. The narrow `recover-declaration` operation introduced for an already-submitted attempt SHALL NOT be a completion transition: it SHALL accept no new result, perform no research, allocate no work unit, change no queue outcome, and create no new actor provenance. It SHALL only restore a missing bundle declaration row after proving that the work unit was already successfully submitted.


For a current-version claimed attempt, normal first submit and eligible first late-submit SHALL evaluate every resolved required output through the shared direct-output evaluator before any successful queue, index, status, result, receipt, cache, transaction, or ledger mutation. Each acceptance invocation SHALL obtain its own fresh bounded byte snapshot; a previous dry-submit PASS, prior bytes, mtime, or cached evaluator result SHALL NOT authorize formal acceptance. Formal submit remains the only normal first-acceptance authority.

The submit owner SHALL verify the index-bound assignment_contract_version, hash-bound queue snapshot, canonical recorded Topic coordinates, and exact reconstructed manifest/beacon output contract before reading candidate output content. Missing or unknown current contract facts SHALL fail closed. An attempt with no assignment_contract_version SHALL use only the explicitly defined legacy submit semantics and SHALL NOT be upgraded by current framework or bundle version inference.

Same-content duplicate normal submit, audited late-submit replay, and recover-declaration are historical postcondition operations rather than new candidate acceptance. They SHALL validate their existing result_hash, ledger_record_hash, submitted index/status/queue postconditions, and original reconstruction facts without making historical success depend on current mutable artifact bytes. Recover-declaration SHALL not invoke the live direct-output evaluator or create a new content acceptance. Wave inspect/Gate SHALL continue to evaluate current post-submit artifact content.

The direct-output evaluation proves only that the one snapshot read by the authoritative first-acceptance invocation satisfied its contract. Existing result_hash and ledger_record_hash do not bind artifact bytes. This requirement SHALL NOT add an artifact hash, immutable-content claim, ledger field, or atomic byte-commit guarantee.

#### Scenario: Declaration recovery is not delegated completion

- **WHEN** `recover-declaration` restores a row for an already-submitted work ID
- **THEN** the original submitted attempt and terminal queue history SHALL remain unchanged
- **AND** the recovery SHALL not count as a new submit, actor execution, queue completion, or work-unit success path

#### Scenario: Unsubmitted attempt cannot use declaration recovery

- **WHEN** a claimed, timed-out, failed, abandoned, or unknown work ID has no submitted declaration row
- **THEN** `recover-declaration` SHALL reject before ledger mutation
- **AND** `write_to` SHALL name the existing legal submit/late-submit/new-attempt boundary rather than a declaration file

#### Scenario: successful submit completes one queue demand

- **WHEN** a valid result is submitted for a claimed work unit
- **THEN** the Engine SHALL complete the bound `queue_item_id`
- **AND** append exactly one work-unit ledger row for that `work_id`

#### Scenario: normal submit still rejects timed-out attempts

- **WHEN** a work unit is `timed_out`
- **AND** a caller invokes normal `operate-work-unit submit`
- **THEN** submit SHALL reject
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: normal first submit rereads after dry-submit

- **WHEN** dry-submit passes and an assigned required output changes before normal formal submit
- **THEN** formal submit SHALL acquire a fresh snapshot and decide acceptance from that snapshot
- **AND** the earlier dry-submit PASS SHALL not authorize queue completion or ledger append

#### Scenario: current contract drift blocks first acceptance

- **WHEN** the index marker, manifest contract, beacon contract, or hash-bound queue snapshot cannot reconstruct one identical expected contract
- **THEN** normal submit SHALL reject before success mutation
- **AND** it SHALL not fall back to the legacy role normalizer or actor-declared contract data

#### Scenario: duplicate normal submit does not depend on live artifact bytes

- **WHEN** a normally submitted work unit receives a same-result duplicate submit after an output file has changed
- **THEN** duplicate handling SHALL decide idempotency from recorded result and ledger bindings plus durable postconditions
- **AND** current artifact content SHALL remain the Wave inspect/Gate responsibility

#### Scenario: declaration recovery does not reaccept candidate content

- **WHEN** recover-declaration restores a missing row for an already-submitted work ID
- **THEN** it SHALL reconstruct the original hash-identical row without rereading live required-output content for a new verdict
- **AND** recovery SHALL not advertise a new direct-contract acceptance time

#### Scenario: direct evaluation does not create artifact hash authority

- **WHEN** first submit accepts a required-output snapshot
- **THEN** the verdict SHALL state only that the evaluated snapshot passed at that invocation
- **AND** no ledger or index field SHALL imply that later bytes are hash-bound by this change

### Requirement: Audited late-submit SHALL recover eligible timed-out work units

The work-unit CLI SHALL provide:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>
```

`late-submit` SHALL require a non-empty reason. It SHALL mutate authority surfaces only for the command-targeted work-unit record whose current status is `timed_out`. It SHALL validate the candidate result through the normal submit authority for that targeted record's identity, runtime receipt, output files, cache trails, source claims, hashes, manifest, beacon, status file, queue binding evidence, and nonce.

If the target work unit is already `submitted`, `late-submit` MAY return idempotent success only when the existing submitted ledger row is valid, has `late_accept: true`, the candidate result hash matches the existing submitted result hash, and durable late-submit postconditions still hold. Normal submitted rows SHALL reject explicit `late-submit`.

Accepted late-submit SHALL preserve the targeted record's `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. It SHALL NOT rewrite old output into a retry work-unit identity.

Before success, late-submit SHALL reject if another work unit for the same `queue_item_id` is already submitted or already has a submitted ledger row. If retry demand for the same queue item is still queued, late-submit SHALL remove it. If a retry attempt for the same queue item is claimed but not submitted, late-submit SHALL mark that retry work unit `abandoned` with `terminal_reason: "superseded_by_late_accept"` and clear `delegated_in_flight`. If the retry/queue state cannot be understood safely, late-submit SHALL reject without authority mutation. Rejected late-submit validation SHALL NOT rewrite result, receipt, cache, queue, index, status, or ledger authority; diagnostic trace/log entries MAY be written.

Accepted late-submit SHALL mark the targeted work unit `submitted`, append exactly one Engine-written submitted ledger row for the targeted `work_id`, and write exactly one queue terminal-history `done` row for the targeted `queue_item_id` / `work_id`. The ledger row SHALL include `late_accept: true`, `late_accept_reason`, `terminal_status_before_accept: "timed_out"`, and `superseded_retry_work_ids`; these fields SHALL be part of the ledger hash. Normal rows SHALL NOT carry half-audit metadata. Late-accept audit fields SHALL require a trimmed non-empty reason, prior terminal status `timed_out`, and unique non-self `superseded_retry_work_ids`.


An eligible first late-submit for a timed-out attempt carrying the current assignment_contract_version SHALL rebuild the attempt-owned expected output contract and acquire fresh bounded snapshots through the same target-level operation used by normal first submit. A dry-submit or timeout-preflight verdict from an earlier invocation SHALL not authorize late acceptance.

A timed-out attempt that genuinely predates assignment_contract_version SHALL remain on the bounded legacy submit contract recorded by marker absence. It SHALL NOT acquire the current direct-content blocker or exact-role semantics merely because the framework was upgraded. Unknown, conflicting, or partially removed markers SHALL fail closed and SHALL not select legacy compatibility.

A repeated audited late-submit that is already idempotently submitted SHALL remain a replay. It SHALL validate recorded hashes and durable late-submit postconditions without rereading live artifact content for a new acceptance verdict. Current file drift remains visible to Wave inspect/Gate.

#### Scenario: eligible timed-out targeted work unit is accepted

- **WHEN** a work unit is `timed_out`
- **AND** the candidate result validates against the targeted identity and submit surfaces
- **AND** no submitted replacement exists for the same `queue_item_id`
- **THEN** `late-submit` SHALL mark the targeted work unit `submitted`
- **AND** append one audited submitted ledger row for the targeted work unit
- **AND** complete the queue item through durable queue postconditions

#### Scenario: submitted replacement blocks late-submit

- **WHEN** a different work unit for the same `queue_item_id` is already submitted or has a submitted ledger row
- **THEN** `late-submit` SHALL reject
- **AND** no second submitted row SHALL be created for that queue item

#### Scenario: retry is cleaned up by late-submit

- **WHEN** an eligible timed-out targeted work unit has retry demand still queued or claimed
- **AND** no retry/replacement has submitted
- **THEN** accepted `late-submit` SHALL remove queued retry demand or abandon the claimed retry
- **AND** the queue SHALL contain one completed terminal-history row for the targeted work unit

#### Scenario: repeated audited late-submit is idempotent

- **WHEN** the targeted work unit was already accepted through `late-submit`
- **AND** the candidate result hash matches the existing audited submitted row
- **AND** durable late-submit postconditions still hold
- **THEN** the command MAY return idempotent success
- **AND** it SHALL NOT append another ledger row or queue terminal-history row

#### Scenario: normal submitted work rejects explicit late-submit

- **WHEN** a work unit is already `submitted` through normal submit
- **AND** a caller invokes `late-submit`
- **THEN** the command SHALL reject
- **AND** normal submit duplicate handling SHALL remain the only idempotent path for normal submitted work

#### Scenario: first late-submit reads a fresh direct-output snapshot

- **WHEN** a current-version timed-out attempt is otherwise eligible for audited late acceptance
- **THEN** late-submit SHALL rebuild its expected contract and evaluate fresh required-output snapshots before authority mutation
- **AND** an earlier dry-submit or timeout-preflight PASS SHALL not be reused

#### Scenario: pre-contract timed-out attempt stays legacy

- **WHEN** a timed-out attempt was claimed before assignment_contract_version existed and all other legacy late-submit facts are valid
- **THEN** first late-submit SHALL use that attempt's bounded legacy candidate semantics
- **AND** it SHALL not infer the current contract from framework version, bundle metadata, or path shape

#### Scenario: repeated late-submit does not reread current output content

- **WHEN** an audited late-submit is replayed after its original successful acceptance
- **THEN** replay SHALL validate recorded result/ledger hashes and durable late-accept postconditions
- **AND** current required-output bytes SHALL not retroactively change historical acceptance

### Requirement: Work-unit tasks SHALL expose bundle-root absolute paths and write-before-return verification

Generated work-unit task Markdown and any Agent-facing claim/spawn output SHALL include the active bundle root normalized by the Engine as one canonical absolute `bundle_dir`, the exact work-unit identity fields, bundle-relative canonical refs, and absolute paths for files the sub-agent must read or write. The immutable Engine-owned `_beacon.json`, generated task, spawn/claim output, and generated work-unit CLI examples SHALL agree on that same absolute root. `bundle_dir` SHALL NOT be repo-relative, current-working-directory-relative, or only the bundle basename.

The task SHALL instruct the actor to use supplied absolute paths directly and to resolve each bundle-relative runtime ref under canonical `bundle_dir` exactly once. The actor SHALL NOT prefix a ref with the bundle basename before resolution, reinterpret an absolute path as bundle-relative, or treat a nested `<bundle>/<bundle>/...` path as a compatible runtime root. Every generated work-unit CLI command SHALL pass the canonical absolute root rather than depend on the actor's current working directory.

The beacon SHALL remain a read-only binding surface for the actor. The actor SHALL NOT overwrite, supplement, or manually repair it. Inspect, dry-submit, and formal submit SHALL reuse one beacon-binding evaluator that compares `bundle_dir` with the current Engine-resolved bundle root and compares the remaining beacon content with the index, manifest, and contract-derived expected binding. Relative `bundle_dir`, root mismatch, or other beacon drift SHALL fail closed before ledger, queue, assigned result, receipt, cache, trace, log, or transaction success writes.

Existing-authority reads SHALL validate their prerequisite before creating work-unit directories. A work-unit index load with `createIfMissing: false`, and inspect/dry-submit/submit or rejection handling built on that read, SHALL NOT create `_work_units`, `_work_units/_transactions`, a lock, trace, log, or other runtime surface when the resolved bundle root has no existing work-unit authority. Explicit create/claim paths MAY initialize work-unit directories only after the active bundle root itself has been validated.

The required verification SHALL cover declared `writes_to` outputs, `result.json`, `runtime-receipt.jsonl`, cache leaf files required by the work-unit cache policy, unchanged beacon binding, and absence of a same-name nested bundle root created by the actor. A sub-agent that cannot write or verify the files SHALL report work-unit failure rather than returning only research text.


For a current-version work unit, index, manifest and beacon SHALL carry top-level assignment_contract_version. Generated task, spawn prompt and checklist SHALL display that marker plus every resolved required output's exact absolute and bundle-relative path, canonical role, and closed direct_contract identity. Generated result schema SHALL constrain required output declarations and MAY describe the marker as read-only annotation, but SHALL NOT add assignment_contract_version or direct_contract as actor-fillable result fields. All projections SHALL be generated from the validated manifest contract and SHALL not maintain a second artifact-field or heading inventory. Existing role guidance remains the Agent-facing explanation of how to author the artifact; the shared evaluator remains verdict authority.

The generated task SHALL require the actor to write and verify every assigned required output before returning work_done. The Phase Agent SHALL run the predictive dry-submit after the actor returns and before formal submit. It MAY repair only a mechanical parseable-candidate declaration: an absent/defaultable identity/schema field with one unambiguous value from the verified envelope, or an omitted/misdeclared required path/role when the exact assigned target passes its direct contract. It SHALL NOT overwrite a conflicting supplied identity or edit artifact, receipt, source or cache facts under that scope. A missing/unparseable candidate, missing target, YAML parse/top-level/schema failure, missing receipt/source/cache/finding/question/enum/semantic fact, or any repair requiring actor-owned fact changes SHALL be semantic_content. Before work_done, the selected actor owns semantic repair. After work_done, the Phase Agent SHALL run `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicitly enqueue replacement demand under a fresh queue ID preserving the same canonical Topic and assignment_mode/receipt obligation, and obtain a replacement work ID for real actor execution. The reason SHALL NOT use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. The Phase Agent SHALL NOT weaken a failed primary pair into supplementary mode or offer abandon as a competing normal semantic-replacement route.

Generated guidance SHALL distinguish a current supplementary attempt with no required_outputs from a primary paired assignment. It SHALL expose contract-authorized prior submitted paths without instructing the actor to overwrite them. The user SHALL not be asked to run ordinary dry-submit, fail/replacement, claim, or submit commands.

#### Scenario: Claimed task contains one canonical absolute runtime root

- **WHEN** `operate-work-unit claim` creates a work unit for active bundle `/repo/dpt_rb_aidlc-investigation`
- **THEN** the generated beacon, task, spawn/claim output, and CLI examples SHALL use `bundle_dir: /repo/dpt_rb_aidlc-investigation`
- **AND** the task SHALL include absolute paths for `_beacon.json`, `result.json`, `runtime-receipt.jsonl`, declared output files, and required cache leaf directories
- **AND** bundle-relative paths SHALL remain clearly labeled as refs relative to `bundle_dir`

#### Scenario: Bundle-relative refs are resolved exactly once

- **WHEN** a task declares canonical ref `_work_units/wave0/wu-w0-b001-src-i0001/result.json`
- **THEN** the actor-facing absolute path SHALL be `/repo/dpt_rb_aidlc-investigation/_work_units/wave0/wu-w0-b001-src-i0001/result.json`
- **AND** no guidance or Engine normalization SHALL produce `/repo/dpt_rb_aidlc-investigation/dpt_rb_aidlc-investigation/...`

#### Scenario: Beacon root drift blocks submit

- **WHEN** an actor overwrites the assigned beacon so `bundle_dir` is relative or differs from the current Engine-resolved active bundle root
- **THEN** inspect, dry-submit, and formal submit SHALL report beacon binding failure from the shared evaluator
- **AND** no ledger row, queue completion, assigned result normalization, transaction success, or provenance SHALL be written
- **AND** guidance SHALL NOT tell the actor to hand-write a replacement beacon

#### Scenario: Wrong nested bundle invocation has no filesystem side effect

- **WHEN** an Agent is already inside `/repo/dpt_rb_aidlc-investigation` and invokes an existing-authority work-unit command with relative bundle argument `dpt_rb_aidlc-investigation`
- **AND** that argument resolves to nonexistent `/repo/dpt_rb_aidlc-investigation/dpt_rb_aidlc-investigation`
- **THEN** the command SHALL fail on the missing existing bundle/work-unit authority
- **AND** it SHALL NOT create the nested bundle directory, `_work_units`, `_work_units/_transactions`, a lock, trace, log, or rejection state
- **AND** the nearest action SHALL be to rerun with the canonical absolute `bundle_dir` from the generated task/beacon

#### Scenario: Sub-agent must verify writes before returning

- **WHEN** a sub-agent completes a work-unit task
- **THEN** the task contract SHALL require it to verify every declared output file exists under the exact active bundle root
- **AND** it SHALL require `result.json` and `runtime-receipt.jsonl` to contain the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** it SHALL require cache trail leaves to contain required files before the sub-agent returns success
- **AND** it SHALL verify that beacon binding is unchanged and no same-name nested bundle root was created

#### Scenario: Chat-only completion is not successful delegated completion

- **WHEN** a sub-agent returns research findings in conversation text but does not write the required result, receipt, output, and cache files
- **THEN** the work unit SHALL remain unsubmitted or submit SHALL reject it
- **AND** the Phase Agent SHALL treat the return as work-unit failure or repair input, not delegated completion

#### Scenario: Claimed task contains absolute runtime paths

- **WHEN** `operate-work-unit claim` creates a work unit for active bundle `/repo/dpt_rb_aidlc-investigation`
- **THEN** the generated task SHALL include `bundle_dir: /repo/dpt_rb_aidlc-investigation`
- **AND** it SHALL include absolute paths for `_beacon.json`, `result.json`, `runtime-receipt.jsonl`, declared output files, and required cache leaf directories
- **AND** bundle-relative paths SHALL remain clearly labeled as refs relative to `bundle_dir`

#### Scenario: task projects exact required output bindings

- **WHEN** claim creates a current primary Wave1 work unit
- **THEN** generated task SHALL name the top-level assignment version plus exact evidence-summary and question-list paths, canonical roles and direct contract IDs, while result-schema guidance constrains the exact path-role declarations without an actor-fillable contract field
- **AND** no generated projection SHALL let the actor choose another contract ID

#### Scenario: supplementary task projects no paired rewrite

- **WHEN** a current supplementary Wave1 assignment has no required_outputs and one eligible prior submitted evidence_summary
- **THEN** generated guidance SHALL expose that prior path as source-ref lineage
- **AND** it SHALL not list the prior evidence-summary or question-list as current required writes

#### Scenario: Phase Agent repairs mechanical candidate drift

- **WHEN** post-return dry-submit proves the exact assigned target passes its direct contract but reports only an omitted/wrong result declaration path or role
- **THEN** recommended_action SHALL be repair_same_candidate and the Phase Agent MAY repair result.json without changing artifact bytes, then rerun the same dry-submit
- **AND** it SHALL preserve the recorded actor provenance and avoid user pipeline work

#### Scenario: semantic failure requires replacement execution

- **WHEN** post-return dry-submit finds missing real source facts, Key Findings content, or required question semantics after the actor recorded work_done
- **THEN** the Phase Agent SHALL not write the missing research content under that actor's provenance
- **AND** recommended_action SHALL be fail_and_replace, followed by `operate-work-unit fail` reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicit same-obligation enqueue under a fresh `queue_item_id` absent from every durable queue location, and a replacement attempt with a new work ID for real actor execution

#### Scenario: task projection is not an acceptance voter

- **WHEN** generated Markdown or result-schema guidance drifts from the reconstructed manifest/beacon contract
- **THEN** claim parity tests or submit contract checks SHALL fail
- **AND** runtime acceptance SHALL not use the projection to outvote the Engine-resolved contract

### Requirement: Work-unit dry-submit SHALL preflight submit validation without side effects

The work-unit CLI SHALL provide a dry-submit preflight for claimed work units. Dry-submit SHALL read a candidate result and evaluate the same deterministic submit contract used by formal `operate-work-unit submit` wherever possible, including work-unit identity, queue binding, manifest/index consistency, result schema, runtime receipt, nonce, output files, source claims, cache trails, and kind output contract constraints.

Dry-submit SHALL be read-only. It SHALL NOT append `rb_output_declarations.jsonl`, complete queue demand, mutate `rb_queue.json`, change work-unit terminal/claimed status, write canonical result/receipt/cache files, record `last_submit_rejection`, create `_work_units/_transactions/` entries, write submit trace/log side effects, or emit success authority that gates may consume. Formal submit remains the only successful delegated completion transition.

Dry-submit output SHALL be structured enough for Agent repair. It SHALL report whether formal submit is expected to pass, the checked `work_id`, reason codes or violation codes, repair-targeted diagnostics, and any narrow normalizations formal submit would perform. Every primary independently evaluable violation SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun`; dependent checks blocked by an earlier prerequisite SHALL be masked or marked dependent instead of being presented as additional repair tasks. Failed dry-submit SHALL still return structured preflight JSON rather than only throwing a stderr error. Normalization reporting SHALL NOT persist those normalizations during dry-submit.

Dry-submit SHALL mirror formal submit candidate path semantics. A candidate result path MAY be temporary or caller-provided when formal submit would allow it. The assigned work-unit directory containment rule SHALL remain limited to nonce normalization eligibility and SHALL NOT become a new dry-submit-only path restriction.

Dry-submit SHALL avoid validation branches that write as part of canonicalization. When formal submit would canonicalize cache `page-content.md` into `page.md`, canonical receipt JSONL, or assigned result JSON, dry-submit SHALL report the planned normalization without writing those files. Dry-submit SHALL validate the in-memory virtual canonical view that formal submit would validate, so read-only preflight does not reject a candidate solely because the canonical file has not been persisted yet.

Dry-submit SHALL accumulate independently evaluable violations so the Agent can repair multiple issues in one pass. If one failed check prevents dependent checks from running, dry-submit SHALL report that dependency rather than inventing validation results.

For the changed submit contract, independent-root coverage SHALL include candidate JSON/schema issues; candidate-side work ID, queue item, kind, nonce and actor binding; immutable manifest/beacon/index binding; runtime-receipt schema, lifecycle, nonce and actor fields; output-role/path requirements; cache-trail path and leaf schema; `meta.json` source URL mapping; current-attempt source-claim/cache/accepted-URL relations; and queue snapshot/in-flight binding. Schema validation that yields multiple independent issues SHALL project each issue with its exact JSON pointer rather than collapse the whole Zod error into one opaque violation. A candidate-side mismatch SHALL point to the assigned candidate/receipt/output/cache surface the Agent may repair. A conflict among Engine-owned index, manifest, beacon, status, queue, receipt hash or submitted authority SHALL point to an existing Engine operation or `missing_contract`, never to hand-editing immutable authority. This is a focused regression matrix for the changed contract, not a second runtime field catalog or validator.

Prerequisite short-circuiting SHALL be local. An unreadable candidate SHALL mask actor/output/cache/source implications that require parsed candidate data; an invalid manifest/index envelope SHALL mask contract checks that require that envelope; and an invalid cache leaf SHALL mask URL/source-claim implications that require that leaf. Independently readable surfaces, such as a runtime-receipt root and a separately resolvable output/cache root, MAY still be returned together. Prior-submitted-output eligibility for supplementary source claims SHALL remain the source-lineage contract and SHALL NOT be guessed by this core preflight slice.

Agent-facing fallback and submit-repair guidance SHALL place dry-submit immediately before formal submit for Phase Agent-authored candidates. It SHALL instruct the Agent to use the generated result starter, read all returned `violations[]` and `repair_target` values, repair the same assigned result/receipt/output/cache surfaces, and rerun the same dry-submit checkpoint. A repairable formal-submit rejection SHALL recommend dry-submit for the same candidate rather than inviting repeated formal-submit guessing. These ordinary authorized repairs SHALL remain Agent execution. New semantic/risk/permission decisions, external non-delegable actions, and missing accepted contracts SHALL be identified only as the smallest Agent-facing boundary; user-facing initiation SHALL obey the current lifecycle interaction contract and SHALL NOT be inferred from the dry-submit classification itself.

Generated `task.md` guidance SHALL use the same placement-neutral boundary wording. It SHALL NOT tell the Phase Agent or work-unit actor to "involve the user" merely because a dry-submit finding is `user_decision`, `external_action`, or `missing_contract`; the current lifecycle owner decides whether a request may be initiated, and `missing_contract` is stated rather than requested. This wording change SHALL NOT give a Sub-agent lifecycle or user-interaction authority.

Dry-submit SHALL keep provenance strict. It SHALL NOT authorize a result or receipt written after the fact to claim work that was performed outside the claimed envelope, and it SHALL NOT treat a filesystem-only artifact as actor-produced merely because a later candidate names it.


For a current assignment_contract_version, dry-submit SHALL reconstruct the expected output contract from the hash-bound queue snapshot and recorded Topic coordinates, require exact manifest/beacon parity, and evaluate only current result declarations matching required_outputs. The neutral target-level module SHALL own the same tolerant direct facts consumed by the Wave adapters:

- wave0.source-metadata-array.v1 requires parseable YAML whose top-level value is an array and whose entries pass ReferenceMetadataArraySchema; it SHALL NOT enforce a count floor;
- wave1.evidence-summary.v1 requires a non-empty Key Findings semantic section;
- wave1.question-list.v1 requires non-empty Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision semantic sections.

Heading level, case, surrounding whitespace, order, and list presentation SHALL remain tolerated exactly as in the shared Wave evaluator. source_url_present SHALL remain outside candidate blocking because structured source_claims[] and accepted_source_urls[] are the more direct submit authority. Count floors, submitted provenance, reference backing/index, cross-artifact links, depth review, return maps, queue drain, phase completeness, and completion events SHALL remain Wave inspect/Gate facts.

Each dry-submit invocation SHALL acquire a fresh single byte snapshot for every required output. Before per-target calls, reconstructed-contract validation SHALL reject duplicate normalized required-output paths. The target-level module SHALL accept only one Engine-resolved concrete bundle-relative path per call and reject absolute, empty, dot, traversal, backslash or non-canonical paths, glob/placeholder paths, stable symlinks, realpath escape, directories and non-regular files, read errors, and raw content larger than 4 MiB. It SHALL open the target, use fstat and a `4 MiB + 1 byte` bounded read on that same handle, accept a shorter EOF snapshot if the opened file shrinks, reject initial or observed growth beyond the cap, decode UTF-8 with fatal invalid-byte rejection, tolerate and strip one leading UTF-8 BOM for parsing, and evaluate all direct facts internally from that one decoded snapshot. Each missing, unsafe, unreadable, oversized, or invalidly encoded target SHALL yield one prerequisite root that masks its dependent direct facts.

The reader contract protects the trusted local actor model against stable path escape, stable symlink/special-file substitution, and unbounded reads. It SHALL NOT claim to eliminate hardlink aliasing or every same-host malicious concurrent replacement race. Those remain explicit residual risks; any stronger threat model requires a separate security change rather than an unsupported race-free claim.

The neutral target module SHALL return only semantic_content or contract_integrity root_class and SHALL not inspect result declarations or receipts. It SHALL classify target missing plus YAML parse/top-level/schema and required semantic-field/section failures as semantic_content, while unsafe/non-regular/escaping target, bounded-read/oversize failure and invalid UTF-8 are contract_integrity. The candidate adapter SHALL combine those roots with every independently evaluated candidate/result, runtime-receipt, output, source/cache and Engine-binding root, retain the existing repair_kind/missing_fact/write_to/rerun coordinates, and add a non-authoritative closed repair_scope projection: mechanical, semantic_content, or contract_integrity.

Mechanical SHALL apply only to a parseable candidate's absent/defaultable immutable-envelope projection with one unambiguous expected value, or an omitted/misdeclared required path/role after the exact target passes its direct contract. A conflicting supplied work/queue/kind/nonce/actor identity, unknown marker/contract, manifest/beacon/snapshot/index/queue/ledger/hash disagreement, unsafe target, bounded-read/invalid-UTF8 failure or ambiguous prior authority SHALL be contract_integrity. Missing/unparseable candidate or receipt, absent lifecycle fact, and any invalid/missing actor-owned output, source claim, accepted URL, cache trail/content/meta or research semantic SHALL be semantic_content. The Phase Agent SHALL NOT manufacture or edit receipt/source/cache facts under mechanical scope. This projection assigns legal repair ownership; it does not create a lifecycle state, permission, automatic repair, or acceptance override.

Dry-submit SHALL combine the complete independent root set with the Engine-validated runtime-receipt lifecycle and emit exactly one non-persistent `recommended_action` from the closed set `submit|repair_same_candidate|return_to_actor|fail_and_replace|inspect_contract` plus `primary_root_code`. One Engine-owned schema SHALL define and validate this candidate projection; formal-submit rejection and timeout mapping SHALL reuse it rather than maintain independent string sets. Dry-submit SHALL select `submit` only with no roots and set primary_root_code null. Otherwise precedence SHALL be contract_integrity -> semantic_content -> mechanical, and primary_root_code SHALL be the stable code of the first collected violation in the winning scope. Semantic content SHALL map to `fail_and_replace` when work_done is observed and `return_to_actor` otherwise. Mechanical-only roots SHALL map to `repair_same_candidate`. The projection SHALL NOT mutate state, persist a decision, infer actor availability, or authorize a different acceptance path. Formal submit rejection SHALL use the same derivation and preserve dry-submit as the candidate re-evaluation checkpoint where applicable.

Generated actor guidance SHALL expose the exact direct contract and require the actor to verify assigned writes before recording work_done, but v1 SHALL NOT require native work-unit actors to invoke the Engine CLI. The Phase Agent SHALL run predictive dry-submit after actor return and execute the Engine-derived recommended_action: only repair_same_candidate permits result declaration repair; return_to_actor preserves selected-actor ownership; fail_and_replace uses the explicit same-obligation path; inspect_contract stays at the Engine/maintenance owner. This command-ownership choice SHALL not authorize Phase Agent semantic authorship or prevent a future separately accepted actor-side checkpoint.

#### Scenario: valid dry-submit has no ledger side effect

- **WHEN** a claimed work unit has a candidate result that formal submit would accept
- **AND** the Agent runs `operate-work-unit dry-submit`
- **THEN** dry-submit SHALL return `ok: true` or equivalent pass status
- **AND** `rb_output_declarations.jsonl`, `rb_queue.json`, work-unit status, assigned `result.json`, runtime receipt files, `_work_units/_transactions/`, trace/log files, and existing cache leaf files SHALL remain unchanged

#### Scenario: dry-submit reports multiple repairable violations

- **WHEN** a candidate result has an invalid output role and a missing cache trail file
- **THEN** dry-submit SHALL report both violations when both can be evaluated independently
- **AND** the diagnostic SHALL identify the output role problem and the cache trail repair target
- **AND** each violation SHALL carry its own `repair_kind`, `missing_fact`, exact `write_to` JSON/file surface, and the same dry-submit command in `rerun`
- **AND** no ledger row or queue completion SHALL occur

#### Scenario: candidate schema issues expose exact repair coordinates

- **WHEN** one candidate uses the wrong result `schema_version`, omits `actor_contract_version`, has a conflicting `execution_actor_class`, and includes rejected field `actor_execution`
- **THEN** dry-submit SHALL return each independently repairable schema/binding issue in the same preflight result
- **AND** each issue SHALL name the exact candidate JSON pointer and expected value or removal action
- **AND** the Agent SHALL not need to discover those fields through repeated formal-submit attempts

#### Scenario: Engine-owned binding drift is not presented as an Agent file edit

- **WHEN** candidate identity is valid but index, manifest, immutable beacon, or queue binding conflicts
- **THEN** dry-submit SHALL identify the earliest authority-side root and mask only checks that depend on that root
- **AND** its nearest action SHALL be an existing Engine operation or `missing_contract`, not direct editing of index, manifest, beacon, status, queue, ledger, receipt hash, or provenance

#### Scenario: dry-submit reports normalizations without persisting them

- **WHEN** a candidate result uses a shape that formal submit would narrow-canonicalize
- **THEN** dry-submit MAY report the planned normalization
- **AND** it SHALL NOT write the canonicalized result, receipt, trace/log record, or cache surface
- **AND** formal submit SHALL still be required to persist any accepted canonical authority surface

#### Scenario: dry-submit does not materialize cache page aliases

- **WHEN** a cache trail has `page-content.md` that formal submit would canonicalize to `page.md`
- **AND** the Agent runs `operate-work-unit dry-submit`
- **THEN** dry-submit SHALL report the planned cache normalization when relevant
- **AND** it SHALL validate the virtual `page.md` content that formal submit would materialize
- **AND** it SHALL NOT create or overwrite `page.md`
- **AND** a later formal submit SHALL still be required to persist the canonical cache leaf

#### Scenario: failed dry-submit does not mark submit rejection

- **WHEN** dry-submit finds a candidate result invalid
- **THEN** the work-unit attempt SHALL remain repairable without a submit rejection state change caused by dry-submit
- **AND** a later corrected dry-submit or formal submit MAY be attempted for the same claimed `work_id`

#### Scenario: dry-submit cannot satisfy gate coverage

- **WHEN** a work unit has only a successful dry-submit and no formal submit ledger row
- **THEN** wave gates SHALL NOT count that work unit as delegated coverage
- **AND** diagnostics MAY mention that formal submit is still required

#### Scenario: dry-submit accepts caller-provided candidate path under submit-equivalent rules

- **WHEN** a candidate result path is outside the assigned work-unit directory
- **AND** all identity fields already match the claimed work-unit record
- **THEN** dry-submit SHALL evaluate it under the same path semantics as formal submit
- **AND** it SHALL NOT require the candidate to be copied into the assigned work-unit directory before preflight

#### Scenario: Phase Agent candidate repairs through one dry-submit loop

- **WHEN** a Phase Agent fallback candidate has independently evaluable receipt actor-field, output-role and cache metadata violations
- **THEN** dry-submit SHALL return all violations that can be evaluated without the failed prerequisite
- **AND** guidance SHALL direct repair of the same assigned surfaces followed by the same dry-submit command
- **AND** formal submit SHALL run only after dry-submit predicts pass
- **AND** the Agent SHALL execute the repair without asking the user to run ordinary pipeline commands

#### Scenario: dry-submit derives one closed nearest action

- **WHEN** dry-submit has collected its complete independent root set and validated lifecycle receipt state
- **THEN** it SHALL emit exactly one recommended_action using integrity-over-semantic-over-mechanical precedence
- **AND** it SHALL emit null primary_root_code for submit or the first stable root code in the winning scope for rejection
- **AND** the field SHALL remain a non-persistent projection that performs no repair, fail, enqueue, claim, or submit mutation

#### Scenario: every dry-submit root receives one provenance-based scope

- **WHEN** dry-submit collects candidate schema/identity, receipt lifecycle, output, source/cache and Engine-binding roots in one invocation
- **THEN** each root SHALL receive exactly one mechanical, semantic_content or contract_integrity repair_scope from the shared ownership matrix
- **AND** a missing envelope-const candidate field MAY be mechanical, a conflicting identity SHALL be integrity, and missing actor receipt/source/cache facts SHALL be semantic rather than Phase-Agent fabrication

#### Scenario: Dry-submit boundary obeys lifecycle interaction contract

- **WHEN** dry-submit returns `repair_kind: user_decision`, `external_action`, or `missing_contract` during a non-terminal `stop: no` phase
- **THEN** guidance SHALL retain the smallest Agent-facing boundary without initiating a user question, status output, approval request, or acknowledgement wait from that classification alone
- **AND** the same candidate identity and current lifecycle checkpoint SHALL remain unchanged

#### Scenario: Generated task does not create a user-escalation rule

- **WHEN** the Engine generates `task.md` dry-submit guidance for a normal delegated or Phase Agent fallback work unit
- **THEN** the guidance SHALL assign ordinary repair to the Agent and describe non-mechanical findings as placement-neutral boundaries
- **AND** it SHALL NOT instruct the actor or Controller to involve the user from classification alone

#### Scenario: Formal rejection points back to dry-submit

- **WHEN** formal submit rejects a claimed candidate for a repairable result, receipt, output, cache or source-claim validation issue
- **THEN** the nearest action SHALL be to run dry-submit for the same work ID and candidate path
- **AND** the rejection SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun` rather than only opaque mismatch prose
- **AND** the response SHALL NOT present multiple competing recovery routes

#### Scenario: Dry-submit cannot retroactively create provenance

- **WHEN** an artifact was produced outside a claimed work-unit envelope and a later hand-written candidate merely names that file
- **THEN** dry-submit or formal submit SHALL NOT treat that fact alone as valid actor execution or submitted provenance
- **AND** the Agent SHALL execute new real work through a legal claimed attempt or report the missing contract

#### Scenario: malformed Wave0 source YAML fails at candidate checkpoint

- **WHEN** a current assigned source.yaml is declared with role source_yaml but its snapshot is unparseable, not a top-level array, or violates ReferenceMetadataArraySchema
- **THEN** dry-submit SHALL reject with the shared direct root and same dry-submit rerun
- **AND** it SHALL not append ledger coverage or additionally report the Wave0 count floor

#### Scenario: empty Wave0 source array is not rejected by the direct-shape contract alone

- **WHEN** source.yaml is a parseable top-level empty array accepted by ReferenceMetadataArraySchema
- **THEN** the candidate direct-shape evaluator SHALL pass that contract
- **AND** Wave0 count-floor and source-sufficiency checks SHALL remain at Wave inspect/Gate

#### Scenario: missing Key Findings is a semantic content root

- **WHEN** a current assigned evidence-summary snapshot lacks a non-empty Key Findings semantic section
- **THEN** dry-submit SHALL reject with repair_scope semantic_content, the exact output path, and recommended_action return_to_actor or fail_and_replace according to work_done receipt state
- **AND** it SHALL not add source_url_present as a second candidate blocker

#### Scenario: tolerant Key Findings presentation passes both adapters

- **WHEN** an evidence summary contains a non-empty semantically equivalent Key Findings heading with a tolerated heading level, case, spacing, order, or list form
- **THEN** candidate evaluation SHALL accept it
- **AND** Wave inspect/Gate SHALL consume the same neutral fact rather than a stricter parser

#### Scenario: question list reports missing semantic sections once

- **WHEN** a required question-list snapshot lacks one or more of the four non-empty semantic sections
- **THEN** dry-submit SHALL return one root naming the missing sections, exact path, repair_scope semantic_content, lifecycle-derived recommended_action, and same rerun
- **AND** it SHALL not expand the prerequisite into phase-wide or return-map failures

#### Scenario: every candidate checkpoint reads fresh bytes

- **WHEN** one dry-submit invocation passes and the required output changes before a second dry-submit invocation
- **THEN** the second invocation SHALL open and evaluate a new bounded snapshot
- **AND** it SHALL not reuse the first PASS, bytes, mtime, or parsed result

#### Scenario: reader rejects unsafe or unbounded target

- **WHEN** a resolved required target is a stable symlink, escapes by realpath, is a directory or special file, exceeds 4 MiB, fails bounded read, or contains invalid UTF-8
- **THEN** dry-submit SHALL fail closed with one authority-integrity prerequisite root
- **AND** dependent YAML or semantic-section failures SHALL be masked

#### Scenario: UTF-8 BOM is presentation tolerance

- **WHEN** a required output contains one leading UTF-8 BOM followed by otherwise valid contract content
- **THEN** the target-level module SHALL strip the BOM for parsing and return the same direct verdict as the BOM-free bytes
- **AND** it SHALL not rewrite the file during dry-submit

#### Scenario: actor sees direct contract without owning the CLI

- **WHEN** a native actor receives a current generated task
- **THEN** it SHALL see and self-verify the assigned direct output contract before recording work_done
- **AND** v1 SHALL leave dry-submit command execution with the Phase Agent after actor return

#### Scenario: Phase Agent cannot inherit semantic authorship

- **WHEN** post-return dry-submit reports repair_scope semantic_content and the receipt records work_done
- **THEN** recommended_action and Phase Agent guidance SHALL direct `operate-work-unit fail` with reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicit same-obligation enqueue under a fresh queue ID, and a replacement work-unit claim with a new work ID
- **AND** it SHALL not direct the Phase Agent to author the missing research content under the returned actor provenance

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


When timeout-preflight evaluates a present candidate for a current-version attempt, it SHALL reconstruct the same assignment contract and acquire its own fresh bounded required-output snapshots through dry-submit-equivalent validation. It SHALL not reuse an earlier dry-submit verdict or byte snapshot. It SHALL return that invocation's exact recommended_action/primary_root_code pair in candidate_projection and map candidate recommended_action into its existing coarser action set: submit -> submit; repair_same_candidate -> repair; return_to_actor -> repair with actor-owned advice; fail_and_replace -> block with the explicit fail/replacement boundary and `semantic_contract:<primary_root_code>` guidance; inspect_contract -> inspect or block. It SHALL not label post-work_done semantic content as Phase Agent same-candidate repair or treat a candidate action alone as timeout eligibility. Observed output/receipt progress continues to prevent default timeout until the normal progress-aware lease or explicit legal fail action permits closure.

Unsafe reader roots, contract drift, unknown assignment version, wrong identity, and ambiguous authority SHALL remain inspect/block rather than timeout eligibility. Timeout-preflight SHALL remain read-only and SHALL not cache the direct-output verdict, persist repair_scope, rewrite the artifact, or create replacement demand.

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
