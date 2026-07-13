> req: DEW-004, DEW-005, DEW-009, DEW-010, DEW-011, DEW-013, DEW-017

## MODIFIED Requirements

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL include the manifest, task, result schema, beacon, runtime receipt path, status, result surfaces, and optional runtime refs needed to validate submit and diagnose execution. The Engine SHALL generate an opaque `receipt_nonce` and require the nonce to agree across index, manifest, beacon, task, runtime receipt, result, and ledger.

The generated `task.md` SHALL also include one copy-ready Result JSON Starter and one concise pre-submit checklist derived from the same manifest, output contract and cache policy that generate `result.schema.json`. The starter SHALL project the exact result schema version, work-unit identity, receipt nonce, actor contract version and execution actor class when present, plus the allowed result fields for that kind. For a source-claim-capable kind, the same output contract SHALL expose any `source_claims.prior_submitted_output_roles[]`; Wave1 default guidance SHALL identify prior `evidence_summary` as allowed and SHALL NOT imply that prior `question_list`, `reference`, or `other` outputs are compatible. The starter SHALL NOT include `actor_execution` or other fields that the result schema rejects.

The checklist SHALL identify the assigned immutable envelope files, required actor-bound receipt fields, allowed output roles and required path-role pairs, cache leaf directory shape, and any required URL binding between declared outputs/source claims and `meta.json`. It SHALL direct the actor to write the assigned result and run dry-submit before formal submit when the Phase Agent is the actor or repairs a rejected candidate. The starter and checklist SHALL be read-only guidance projections; they SHALL NOT pre-create `result.json`, count as actor output, satisfy a receipt, append provenance, or weaken submit validation.

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


### Requirement: Work-unit tasks SHALL expose bundle-root absolute paths and write-before-return verification

Generated work-unit task Markdown and any Agent-facing claim/spawn output SHALL include the active bundle root normalized by the Engine as one canonical absolute `bundle_dir`, the exact work-unit identity fields, bundle-relative canonical refs, and absolute paths for files the sub-agent must read or write. The immutable Engine-owned `_beacon.json`, generated task, spawn/claim output, and generated work-unit CLI examples SHALL agree on that same absolute root. `bundle_dir` SHALL NOT be repo-relative, current-working-directory-relative, or only the bundle basename.

The task SHALL instruct the actor to use supplied absolute paths directly and to resolve each bundle-relative runtime ref under canonical `bundle_dir` exactly once. The actor SHALL NOT prefix a ref with the bundle basename before resolution, reinterpret an absolute path as bundle-relative, or treat a nested `<bundle>/<bundle>/...` path as a compatible runtime root. Every generated work-unit CLI command SHALL pass the canonical absolute root rather than depend on the actor's current working directory.

The beacon SHALL remain a read-only binding surface for the actor. The actor SHALL NOT overwrite, supplement, or manually repair it. Inspect, dry-submit, and formal submit SHALL reuse one beacon-binding evaluator that compares `bundle_dir` with the current Engine-resolved bundle root and compares the remaining beacon content with the index, manifest, and contract-derived expected binding. Relative `bundle_dir`, root mismatch, or other beacon drift SHALL fail closed before ledger, queue, assigned result, receipt, cache, trace, log, or transaction success writes.

Existing-authority reads SHALL validate their prerequisite before creating work-unit directories. A work-unit index load with `createIfMissing: false`, and inspect/dry-submit/submit or rejection handling built on that read, SHALL NOT create `_work_units`, `_work_units/_transactions`, a lock, trace, log, or other runtime surface when the resolved bundle root has no existing work-unit authority. Explicit create/claim paths MAY initialize work-unit directories only after the active bundle root itself has been validated.

The required verification SHALL cover declared `writes_to` outputs, `result.json`, `runtime-receipt.jsonl`, cache leaf files required by the work-unit cache policy, unchanged beacon binding, and absence of a same-name nested bundle root created by the actor. A sub-agent that cannot write or verify the files SHALL report work-unit failure rather than returning only research text.

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


### Requirement: Work-unit dry-submit SHALL preflight submit validation without side effects

The work-unit CLI SHALL provide a dry-submit preflight for claimed work units. Dry-submit SHALL read a candidate result and evaluate the same deterministic submit contract used by formal `operate-work-unit submit` wherever possible, including work-unit identity, queue binding, manifest/index consistency, result schema, runtime receipt, nonce, output files, source claims, cache trails, and kind output contract constraints.

Dry-submit SHALL be read-only. It SHALL NOT append `rb_output_declarations.jsonl`, complete queue demand, mutate `rb_queue.json`, change work-unit terminal/claimed status, write canonical result/receipt/cache files, record `last_submit_rejection`, create `_work_units/_transactions/` entries, write submit trace/log side effects, or emit success authority that gates may consume. Formal submit remains the only successful delegated completion transition.

Dry-submit output SHALL be structured enough for Agent repair. It SHALL report whether formal submit is expected to pass, the checked `work_id`, reason codes or violation codes, repair-targeted diagnostics, and any narrow normalizations formal submit would perform. Every primary independently evaluable violation SHALL include `missing_fact`, `write_to`, and `rerun`; dependent checks blocked by an earlier prerequisite SHALL be masked or marked dependent instead of being presented as additional repair tasks. Failed dry-submit SHALL still return structured preflight JSON rather than only throwing a stderr error. Normalization reporting SHALL NOT persist those normalizations during dry-submit.

Dry-submit SHALL mirror formal submit candidate path semantics. A candidate result path MAY be temporary or caller-provided when formal submit would allow it. The assigned work-unit directory containment rule SHALL remain limited to nonce normalization eligibility and SHALL NOT become a new dry-submit-only path restriction.

Dry-submit SHALL avoid validation branches that write as part of canonicalization. When formal submit would canonicalize cache `page-content.md` into `page.md`, canonical receipt JSONL, or assigned result JSON, dry-submit SHALL report the planned normalization without writing those files. Dry-submit SHALL validate the in-memory virtual canonical view that formal submit would validate, so read-only preflight does not reject a candidate solely because the canonical file has not been persisted yet.

Dry-submit SHALL accumulate independently evaluable violations so the Agent can repair multiple issues in one pass. If one failed check prevents dependent checks from running, dry-submit SHALL report that dependency rather than inventing validation results.

Agent-facing fallback and submit-repair guidance SHALL place dry-submit immediately before formal submit for Phase Agent-authored candidates. It SHALL instruct the Agent to use the generated result starter, read all returned `violations[]` and `repair_target` values, repair the same assigned result/receipt/output/cache surfaces, and rerun the same dry-submit checkpoint. A repairable formal-submit rejection SHALL recommend dry-submit for the same candidate rather than inviting repeated formal-submit guessing.

Dry-submit SHALL keep provenance strict. It SHALL NOT authorize a result or receipt written after the fact to claim work that was performed outside the claimed envelope, and it SHALL NOT treat a filesystem-only artifact as actor-produced merely because a later candidate names it.

#### Scenario: valid dry-submit has no ledger side effect

- **WHEN** a claimed work unit has a candidate result that formal submit would accept
- **AND** the Agent runs `operate-work-unit dry-submit`
- **THEN** dry-submit SHALL return `ok: true` or equivalent pass status
- **AND** `rb_output_declarations.jsonl`, `rb_queue.json`, work-unit status, assigned `result.json`, runtime receipt files, `_work_units/_transactions/`, trace/log files, and existing cache leaf files SHALL remain unchanged

#### Scenario: dry-submit reports multiple repairable violations

- **WHEN** a candidate result has an invalid output role and a missing cache trail file
- **THEN** dry-submit SHALL report both violations when both can be evaluated independently
- **AND** the diagnostic SHALL identify the output role problem and the cache trail repair target
- **AND** each violation SHALL carry its own `missing_fact`, exact `write_to` JSON/file surface, and the same dry-submit command in `rerun`
- **AND** no ledger row or queue completion SHALL occur

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

#### Scenario: Formal rejection points back to dry-submit

- **WHEN** formal submit rejects a claimed candidate for a repairable result, receipt, output, cache or source-claim validation issue
- **THEN** the nearest action SHALL be to run dry-submit for the same work ID and candidate path
- **AND** the rejection SHALL include `missing_fact`, `write_to`, and `rerun` rather than only opaque mismatch prose
- **AND** the response SHALL NOT present multiple competing recovery routes

#### Scenario: Dry-submit cannot retroactively create provenance

- **WHEN** an artifact was produced outside a claimed work-unit envelope and a later hand-written candidate merely names that file
- **THEN** dry-submit or formal submit SHALL NOT treat that fact alone as valid actor execution or submitted provenance
- **AND** the Agent SHALL execute new real work through a legal claimed attempt or report the missing contract


### Requirement: Phase Agent fallback SHALL remain inside the work-unit transaction

`phase_agent_fallback` SHALL be an accepted work-unit execution actor class only when the same claim receives a matching normalized `unavailable` delegated actor observation and the single queue-front candidate kind explicitly permits fallback. The fallback effective claim count SHALL be exactly one even when a larger count is requested, because one Phase Agent actor cannot execute a delegated parallel batch. The fallback SHALL receive the same Engine-allocated work ID, manifest, task, beacon, result schema, receipt nonce, assigned output/cache paths, timeout contract, dry-submit validation, formal submit transaction, and ledger coverage as a normal delegated subagent attempt.

The queue demand SHALL keep its existing intended target `targets.delegates.to: sub-agent` and role key; fallback SHALL NOT rewrite the queue task into a main-agent task. The work-unit attempt SHALL record the actual execution actor class and `fallback_from: delegated_subagent`, so inspect and ledger can distinguish intended delegated demand from the accepted actual fallback actor.

The Phase Agent SHALL perform the assigned bounded work as the work-unit actor and SHALL NOT directly complete queue demand, append a submitted ledger row, fabricate a delegated-subagent runtime reference, or bypass result/receipt validation. Fallback SHALL be one explicit branch, not an automatic chain through multiple roles/models/actors.

The generated fallback task SHALL make the mechanical submit path self-contained: the Phase Agent SHALL read the beacon and result schema, start from the generated exact-binding result starter, preserve immutable envelope files, write actor-bound runtime receipt events and contract-valid output/cache surfaces, run dry-submit, repair the same candidate until preflight passes, and then run formal submit before another fallback claim.

Fallback SHALL begin before the bounded evidence work it claims. It SHALL NOT be used after direct Phase-Agent research to manufacture result, receipt or ledger provenance for pre-existing orphan artifacts. Repeating Engine-known binding fields in the result remains a deliberate cross-check; the helper improvement is generated guidance and preflight, not removal of actor/provenance binding.

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

#### Scenario: Fallback task is mechanically submit-ready

- **WHEN** an accepted `phase_agent_fallback` work unit is generated
- **THEN** its task SHALL include the exact result starter and pre-submit checklist for that claimed attempt
- **AND** the Phase Agent SHALL be able to fill semantic/output fields without guessing schema version, actor binding, receipt nonce or allowed result keys

#### Scenario: Fallback uses dry-submit before formal submit

- **WHEN** the Phase Agent finishes the assigned fallback output, cache, receipt and result files
- **THEN** it SHALL run dry-submit and repair the same attempt until preflight passes
- **AND** it SHALL run formal submit before claiming another fallback demand

#### Scenario: Post-hoc fallback provenance is prohibited

- **WHEN** direct research or an orphan artifact predates the fallback claim
- **THEN** the Phase Agent SHALL NOT write retrospective receipt/result data and describe that old work as the claimed attempt
- **AND** no submitted ledger row SHALL be created without new real execution inside the claimed envelope


### Requirement: Submit SHALL be the only successful delegated completion transition

Normal `submit` and the existing audited `late-submit` SHALL remain the only operations that convert an eligible delegated attempt into successful completion, complete queue demand, and create submitted coverage. The narrow `recover-declaration` operation introduced for an already-submitted attempt SHALL NOT be a completion transition: it SHALL accept no new result, perform no research, allocate no work unit, change no queue outcome, and create no new actor provenance. It SHALL only restore a missing bundle declaration row after proving that the work unit was already successfully submitted.

#### Scenario: Declaration recovery is not delegated completion

- **WHEN** `recover-declaration` restores a row for an already-submitted work ID
- **THEN** the original submitted attempt and terminal queue history SHALL remain unchanged
- **AND** the recovery SHALL not count as a new submit, actor execution, queue completion, or work-unit success path

#### Scenario: Unsubmitted attempt cannot use declaration recovery

- **WHEN** a claimed, timed-out, failed, abandoned, or unknown work ID has no submitted declaration row
- **THEN** `recover-declaration` SHALL reject before ledger mutation
- **AND** `write_to` SHALL name the existing legal submit/late-submit/new-attempt boundary rather than a declaration file


### Requirement: Submitted result and ledger hashes SHALL detect post-submit drift before gate pass

Submitted result and ledger hashes SHALL remain fail-closed binding authority. Normal and late submit SHALL create one Engine submission timestamp inside the commit transaction, build the final ledger row/hash from it, and use it consistently across ledger `declared_at`, index `terminal_at`, status `updated_at`, and queue `completed_at`. Pre-transaction validation and dry-submit SHALL return only side-effect-free candidate validation facts, SHALL NOT produce a final ledger row/hash, SHALL NOT pass a precomputed declaration hash into commit, and SHALL NOT write queue-load trace/log, normalized result/receipt, canonical cache pages, transaction artifacts or authority state. The final rejection recorder MAY retain its existing diagnostic trace/log ownership. The locked transaction SHALL reload/revalidate mutable index, queue, replacement and terminal facts, then apply canonicalization writes before final row construction. Normal rows SHALL require no additional recovery state. Late-submit SHALL preserve only irreducible late-accept context on the existing index record: reason, prior terminal status, and superseded retry IDs. Gates SHALL never count reconstructable index/result/queue facts directly. A recovery evaluator SHALL rebuild from current canonical result hash, index/status, manifest, beacon, runtime receipt, output/source/cache declarations, terminal queue facts and bounded late-accept context before any append.

For legacy pre-unified-timestamp/pre-context attempts, reconstruction MAY occur only when the complete remaining submitted surfaces plus original submit/transaction evidence reproduce one unique row whose hash equals the already recorded index/status hash. Recovery audit SHALL live in transaction/trace/log evidence outside the restored row. Missing or conflicting facts SHALL fail closed with `missing_fact`, `write_to`, and `rerun`; diagnostics SHALL never instruct hand-written hash/ledger edits or rebind index/status to a newly invented row.

#### Scenario: Reconstructable facts restore the same hash-valid row

- **WHEN** an already-submitted work unit loses only its bundle ledger row and retains all required direct reconstruction facts
- **THEN** Engine recovery SHALL restore the hash-identical row without changing result, receipt, output/cache, actor, queue, or original hashes
- **AND** the next gate SHALL consume it through the normal ledger path

#### Scenario: Reconstruction cannot hide drift

- **WHEN** current result, receipt, beacon, output/cache, index/status, queue history, or late-accept context conflicts
- **THEN** recovery SHALL fail before ledger mutation
- **AND** primary feedback SHALL identify the earliest conflicting fact and one legal next checkpoint


### Requirement: Successful work-unit submit SHALL verify durable queue postconditions

Before normal or late submit reports success, its durable postcondition SHALL prove the submitted index/status binding, shared submission timestamp, terminal queue history, bundle ledger row, and any required late-accept context agree. These writes SHALL participate in the existing submit transaction and rollback/suspect-state handling. This adds no new completion authority: the bundle ledger remains the only delegated coverage source.

#### Scenario: Submit success includes durable reconstruction facts

- **WHEN** a work-unit submit reports success
- **THEN** the bundle ledger row, shared timestamp, direct owner facts, and any minimal late-accept context SHALL be durable and reproduce the submitted index/status hashes
- **AND** durable queue postconditions SHALL still bind the same `queue_item_id` and `work_id`

#### Scenario: Reconstruction-context persistence failure cannot overclaim success

- **WHEN** submit cannot persist or verify the shared timestamp or required late-accept context
- **THEN** it SHALL fail or roll back through the existing transaction durability contract
- **AND** it SHALL not report successful delegated completion with an unrecoverable declaration
