> req: DEW-003, DEW-013

## MODIFIED Requirements

### Requirement: Work-unit claim SHALL bind queue demand and lease

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move queue demand into `delegated_in_flight`, write effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but Sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

Successful claim stdout SHALL include a static Agent-facing top-level `continuation` object for the immediate post-claim decision point with `next_action: inspect_and_poll_claimed_work`. Because claim validates queue/work-unit phase demand but does not read or establish the current lifecycle node's `stop` authority, its continuation SHALL omit `interaction` rather than hardcode a second interaction-placement truth. The already-loaded lifecycle phase/header/cue continues to control whether the framework may initiate user-facing output.

The cue SHALL include `work_ids` equal to the already returned `claimed_work_ids`, SHALL NOT be nested inside queue/index authority objects, SHALL NOT infer readiness, SHALL NOT complete work, and SHALL NOT add persistent work-unit, interaction, message, or pause state. Empty or failed claims SHALL NOT emit a successful continuation cue.

#### Scenario: claim creates in-flight attempt

- **WHEN** an eligible delegated queue demand item is claimed
- **THEN** the Engine SHALL create the work-unit envelope
- **AND** the queue demand SHALL be present in `delegated_in_flight` with the allocated `work_id`

#### Scenario: claim output directs immediate polling

- **WHEN** claim succeeds for one or more work units
- **THEN** stdout SHALL identify the claimed work ids
- **AND** continuation SHALL direct the Phase Agent to inspect/poll the claimed work without waiting for user input, acknowledgement, or task notification
- **AND** continuation SHALL omit `interaction` and SHALL NOT create chat-interception or interaction authority

#### Scenario: empty claim does not emit successful continuation

- **WHEN** claim returns `claimed_count: 0`
- **THEN** stdout SHALL NOT include a continuation cue that says claimed work should be inspected or polled
- **AND** queue/index authority SHALL remain the source of truth for why no work was claimed

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
