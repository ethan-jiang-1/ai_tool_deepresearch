> req: DEW-004, DEW-012, DEW-013

## MODIFIED Requirements

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL include the manifest, task, result schema, beacon, runtime receipt path, status, result surfaces, and optional runtime refs needed to validate submit and diagnose execution. The Engine SHALL generate an opaque `receipt_nonce` and require the nonce to agree across index, manifest, beacon, task, runtime receipt, result, and ledger.

The generated `task.md` SHALL also include one copy-ready Result JSON Starter and one concise pre-submit checklist derived from the same manifest, output contract and cache policy that generate `result.schema.json`. The starter SHALL project the exact result schema version, work-unit identity, receipt nonce, actor contract version and execution actor class when present, plus the allowed result fields for that kind. For a source-claim-capable kind, the same output contract SHALL expose any `source_claims.prior_submitted_output_roles[]`; Wave1 default guidance SHALL identify prior `evidence_summary` as allowed and SHALL NOT imply that prior `question_list`, `reference`, or `other` outputs are compatible. The starter SHALL NOT include `actor_execution` or other fields that the result schema rejects.

The checklist SHALL identify the assigned immutable envelope files, required actor-bound receipt fields, allowed output roles and required path-role pairs, cache leaf directory shape, and any required URL binding between declared outputs/source claims and `meta.json`. It SHALL direct the actor to write the assigned result and direct the Phase Agent to run dry-submit before formal submit or after repairing a rejected candidate. The starter and checklist SHALL be read-only guidance projections; they SHALL NOT pre-create `result.json`, count as actor output, satisfy a receipt, append provenance, or weaken submit validation.

Generated task, spawn prompt, shared protocol and role guidance SHALL distinguish two surfaces explicitly: lifecycle evidence is appended as JSONL to the assigned `runtime-receipt.jsonl`; `log-event.mjs` emits optional diagnostic log/trace events and SHALL NOT satisfy or replace runtime receipt evidence. Guidance SHALL NOT require the user to run dry-submit, submit, receipt repair, or other ordinary pipeline commands.

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

### Requirement: Work-unit submit SHALL canonicalize only bounded LLM-shaped submit drift before strict validation

`operate-work-unit submit` SHALL run a narrow canonicalization step before strict result, receipt, output, cache, nonce, queue, hash, and ledger validation. Canonicalization SHALL be limited to predictable LLM-shaped drift that can be safely tied back to the claimed work-unit record. It SHALL NOT create new authority, bypass work-unit identity, accept path escapes, or relax downstream ledger/gate coverage.

Allowed canonicalization is limited to:

- unwrapping a submitted JSON object whose only top-level key is `result`;
- filling missing receipt schema version with the current receipt-event schema literal, and filling missing receipt binding identity fields from the claimed work-unit record when the receipt event is otherwise valid JSON and has no conflicting identity values;
- materializing `page-content.md` as canonical `page.md` inside the same declared cache leaf when the canonical page file is missing, or accepting an identical non-authority sidecar when both files exist;
- replacing a stale result/receipt `receipt_nonce` with the Engine record nonce only when `work_id`, `queue_item_id`, and `kind` all match the claimed record and the submitted result path resolves inside that work unit's assigned directory.

Runtime receipt `detail` is optional diagnostic presentation, not identity or completion authority. The receipt schema SHALL accept either a keyed JSON object or a human-readable string at `detail` without creating a normalization event or rewriting one form into the other. Array, number, boolean, null, malformed JSONL, conflicting identity, and conflicting schema values SHALL remain invalid. Timeout-preflight, submit, inspect and Gate consumers SHALL NOT derive progress/coverage authority from the contents or shape of `detail`.

Accepted submit transactions SHALL persist canonical authority surfaces before reporting success: assigned `result.json` SHALL contain the canonical flat result, assigned `runtime-receipt.jsonl` SHALL contain canonical receipt events, declared cache leaves SHALL contain canonical `page.md`, and ledger rows SHALL be built from canonical data. Any normalization SHALL be visible through structured diagnostics in submit output, trace, log, or an equivalent Engine diagnostic surface. Invalid submit SHALL remain non-terminal and SHALL NOT append a ledger row or complete queue demand.

This requirement SHALL NOT remove the existing ability to submit a candidate `resultPath` from a temporary or caller-provided location when all identity fields already match. The stricter assigned-directory containment check applies only to nonce correction. In every successful case, the Engine SHALL still persist the accepted canonical result to the assigned work-unit `result_ref`.

#### Scenario: single result wrapper is unwrapped

- **WHEN** a claimed work unit submits `result.json` whose top-level object is exactly `{ "result": { ... } }`
- **AND** the inner object satisfies the normal work-unit result contract after canonicalization
- **THEN** submit SHALL validate the inner object as the canonical result
- **AND** the submitted ledger row SHALL store the flat canonical result binding, not the wrapper
- **AND** diagnostics SHALL record that a result wrapper was unwrapped

#### Scenario: result wrapper with siblings is rejected

- **WHEN** a submitted result object contains top-level `result` plus any sibling key
- **THEN** submit SHALL reject the result before ledger append
- **AND** diagnostics SHALL identify the unsafe wrapper shape

#### Scenario: missing receipt schema or binding identity is canonicalized

- **WHEN** `runtime-receipt.jsonl` contains parseable JSON events that omit the current receipt-event `schema_version` or one or more binding identity fields: `work_id`, `queue_item_id`, `kind`, or `receipt_nonce`
- **AND** the missing binding identity fields can be filled from the claimed work-unit record
- **AND** no present identity field conflicts with that record
- **THEN** submit SHALL validate the canonical receipt events with the filled schema version and binding identity fields
- **AND** the assigned `runtime-receipt.jsonl` SHALL be persisted in canonical JSONL form before submit reports success
- **AND** diagnostics SHALL identify the receipt line numbers and autofilled schema or identity fields

#### Scenario: diagnostic receipt detail accepts object or string

- **WHEN** a receipt event has valid required identity/schema/event fields
- **AND** optional `detail` is either a JSON object or string
- **THEN** dry-submit and formal submit SHALL accept the diagnostic shape without rewriting it
- **AND** object/string choice SHALL NOT change progress, coverage, or Gate authority

#### Scenario: non-message receipt detail shapes remain invalid

- **WHEN** optional receipt `detail` is an array, number, boolean, or null
- **THEN** dry-submit SHALL reject the exact receipt line through the existing receipt repair boundary
- **AND** the Agent SHALL repair the same receipt and rerun dry-submit without a user decision

#### Scenario: conflicting receipt schema version is rejected

- **WHEN** a receipt event contains a `schema_version` that is not the current receipt-event schema literal
- **THEN** submit SHALL reject the receipt through normal schema validation
- **AND** schema version autofill SHALL NOT be used to rewrite a conflicting version

#### Scenario: conflicting receipt binding identity is rejected

- **WHEN** a receipt event contains a `work_id`, `queue_item_id`, `kind`, or `receipt_nonce` that conflicts with the claimed work-unit record
- **THEN** submit SHALL reject the receipt
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: invalid or empty receipt remains invalid

- **WHEN** `runtime-receipt.jsonl` is empty or contains invalid JSONL
- **THEN** submit SHALL reject the receipt
- **AND** receipt canonicalization SHALL NOT be used to synthesize missing events or repair malformed JSON

#### Scenario: page-content cache leaf is canonicalized

- **WHEN** a declared cache leaf contains `websearch.json`, `meta.json`, and `page-content.md`
- **AND** `page.md` is absent in that same leaf directory
- **THEN** submit SHALL materialize canonical `page.md` with the `page-content.md` content before cache validation reports success
- **AND** cache validation SHALL continue against `page.md`
- **AND** diagnostics SHALL identify the cache leaf canonicalization

#### Scenario: identical page sidecar is accepted as non-authority

- **WHEN** a declared cache leaf contains both `page.md` and `page-content.md`
- **AND** their content is identical
- **THEN** submit SHALL validate `page.md` as the canonical authority file
- **AND** `page-content.md` SHALL NOT be treated as an additional fetched-source authority surface

#### Scenario: divergent page files are rejected

- **WHEN** a declared cache leaf contains both `page.md` and `page-content.md`
- **AND** their content differs
- **THEN** submit SHALL reject the cache trail
- **AND** diagnostics SHALL identify the divergent files

#### Scenario: cache authority files remain required

- **WHEN** a declared cache leaf is missing `websearch.json`, missing `meta.json`, or has neither `page.md` nor canonicalizable `page-content.md`
- **THEN** submit SHALL reject the cache trail
- **AND** no fetched-source output SHALL gain ledger coverage from that leaf

#### Scenario: nonce is normalized only under complete binding

- **WHEN** a result or receipt carries a stale `receipt_nonce`
- **AND** `work_id`, `queue_item_id`, and `kind` match the claimed work-unit record
- **AND** the submitted result path resolves inside that work unit's assigned directory
- **THEN** submit MAY normalize the nonce to the Engine record nonce before strict validation
- **AND** assigned `result.json` and `runtime-receipt.jsonl` SHALL persist the canonical record nonce before submit reports success
- **AND** diagnostics SHALL record the nonce normalization

#### Scenario: nonce mismatch with unsafe binding is rejected

- **WHEN** a result or receipt nonce differs from the claimed record
- **AND** any other identity field differs or the result path resolves outside the assigned work-unit directory
- **THEN** submit SHALL reject the submission
- **AND** no ledger row SHALL be written

#### Scenario: exact-identity candidate result may come from temporary path

- **WHEN** a submitted candidate result path is outside the assigned work-unit directory
- **AND** `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` already match the claimed work-unit record
- **AND** all other result, receipt, output, cache, queue, hash, and ledger validations pass
- **THEN** submit MAY accept the candidate result using the existing submit path semantics
- **AND** the Engine SHALL persist the canonical accepted result to the assigned work-unit `result_ref`

### Requirement: Work-unit dry-submit SHALL preflight submit validation without side effects

The work-unit CLI SHALL provide a dry-submit preflight for claimed work units. Dry-submit SHALL read a candidate result and evaluate the same deterministic submit contract used by formal `operate-work-unit submit` wherever possible, including work-unit identity, queue binding, manifest/index consistency, result schema, runtime receipt, nonce, output files, source claims, cache trails, and kind output contract constraints.

Dry-submit SHALL be read-only. It SHALL NOT append `rb_output_declarations.jsonl`, complete queue demand, mutate `rb_queue.json`, change work-unit terminal/claimed status, write canonical result/receipt/cache files, record `last_submit_rejection`, create `_work_units/_transactions/` entries, write submit trace/log side effects, or emit success authority that gates may consume. Formal submit remains the only successful delegated completion transition.

Dry-submit output SHALL be structured enough for Agent repair. It SHALL report whether formal submit is expected to pass, the checked `work_id`, reason codes or violation codes, repair-targeted diagnostics, and any narrow normalizations formal submit would perform. Every primary independently evaluable violation SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun`; dependent checks blocked by an earlier prerequisite SHALL be masked or marked dependent instead of being presented as additional repair tasks. Failed dry-submit SHALL still return structured preflight JSON rather than only throwing a stderr error. Normalization reporting SHALL NOT persist those normalizations during dry-submit.

Dry-submit SHALL mirror formal submit candidate path semantics. A candidate result path MAY be temporary or caller-provided when formal submit would allow it. The assigned work-unit directory containment rule SHALL remain limited to nonce normalization eligibility and SHALL NOT become a new dry-submit-only path restriction.

Dry-submit SHALL avoid validation branches that write as part of canonicalization. When formal submit would canonicalize cache `page-content.md` into `page.md`, canonical receipt JSONL, or assigned result JSON, dry-submit SHALL report the planned normalization without writing those files. Dry-submit SHALL validate the in-memory virtual canonical view that formal submit would validate, so read-only preflight does not reject a candidate solely because the canonical file has not been persisted yet.

Dry-submit SHALL accumulate independently evaluable violations so the Agent can repair multiple issues in one pass. If one failed check prevents dependent checks from running, dry-submit SHALL report that dependency rather than inventing validation results.

For the changed submit contract, independent-root coverage SHALL include candidate JSON/schema issues; candidate-side work ID, queue item, kind, nonce and actor binding; immutable manifest/beacon/index binding; runtime-receipt schema, lifecycle, nonce and actor fields; output-role/path requirements; cache-trail path and leaf schema; `meta.json` source URL mapping; current-attempt source-claim/cache/accepted-URL relations; and queue snapshot/in-flight binding. Schema validation that yields multiple independent issues SHALL project each issue with its exact JSON pointer rather than collapse the whole Zod error into one opaque violation. A candidate-side mismatch SHALL point to the assigned candidate/receipt/output/cache surface the Agent may repair. A conflict among Engine-owned index, manifest, beacon, status, queue, receipt hash or submitted authority SHALL point to an existing Engine operation or `missing_contract`, never to hand-editing immutable authority. This is a focused regression matrix for the changed contract, not a second runtime field catalog or validator.

Prerequisite short-circuiting SHALL be local. An unreadable candidate SHALL mask actor/output/cache/source implications that require parsed candidate data; an invalid manifest/index envelope SHALL mask contract checks that require that envelope; and an invalid cache leaf SHALL mask URL/source-claim implications that require that leaf. Independently readable surfaces, such as a runtime-receipt root and a separately resolvable output/cache root, MAY still be returned together. Prior-submitted-output eligibility for supplementary source claims SHALL remain the source-lineage contract and SHALL NOT be guessed by this core preflight slice.

Agent-facing fallback and submit-repair guidance SHALL place dry-submit immediately before formal submit for Phase Agent-authored candidates. It SHALL instruct the Agent to use the generated result starter, read all returned `violations[]` and `repair_target` values, repair the same assigned result/receipt/output/cache surfaces, and rerun the same dry-submit checkpoint. A repairable formal-submit rejection SHALL recommend dry-submit for the same candidate rather than inviting repeated formal-submit guessing. These ordinary authorized repairs SHALL remain Agent execution; guidance SHALL escalate to the user only for a new semantic/risk/permission decision, an external non-delegable action, or a missing accepted contract.

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

#### Scenario: Formal rejection points back to dry-submit

- **WHEN** formal submit rejects a claimed candidate for a repairable result, receipt, output, cache or source-claim validation issue
- **THEN** the nearest action SHALL be to run dry-submit for the same work ID and candidate path
- **AND** the rejection SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun` rather than only opaque mismatch prose
- **AND** the response SHALL NOT present multiple competing recovery routes

#### Scenario: Dry-submit cannot retroactively create provenance

- **WHEN** an artifact was produced outside a claimed work-unit envelope and a later hand-written candidate merely names that file
- **THEN** dry-submit or formal submit SHALL NOT treat that fact alone as valid actor execution or submitted provenance
- **AND** the Agent SHALL execute new real work through a legal claimed attempt or report the missing contract
