> req: DEW-004, DEW-013

## MODIFIED Requirements

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL continue to carry its manifest, task, result
schema, beacon, runtime receipt, status, result surface, and every binding
needed for deterministic submit. The Engine SHALL continue to bind an opaque
`receipt_nonce` across index, manifest, beacon, task, receipt, result, and
ledger. Generated task, starter, checklist, result schema, manifest, and beacon
remain read-only projections of the one immutable output contract; none can
select a contract or provide submit authority.

For every new claim, the Engine SHALL resolve one closed assignment contract
before mutation from the registered kind, hash-bound queue snapshot, canonical
Topic binding where applicable, closed `assignment_mode` where applicable, and
canonical `file:` required receipts. Queue payload, `writes_to`, task prose,
and actors SHALL NOT select required outputs, direct-contract IDs, resolver
versions, or declaration requiredness. Existing strict kind customization for
result fields, roles, source claims, and cache policy MAY remain the base
contract, but required outputs and declaration requiredness remain Engine
resolved.

New claims SHALL record `assignment_contract_version:
"work-unit.assignment.v3"` on the Engine-owned index, manifest, and beacon.
That marker is the only resolver-semantics version marker. A marked v1 or v2
attempt SHALL retain its recorded version-selected output-contract
interpretation; a markerless historical envelope SHALL retain its existing
compatibility interpretation. Neither is inferred from a path, filename, or
current default, and none is rewritten merely because new claims use v3.

The v3 resolver SHALL preserve existing Wave0 and primary Wave1 direct-output
bindings. A v3 supplementary `wave1_topic_deepening` assignment with explicit
`assignment_mode: supplementary` and an empty exact required-receipt set SHALL
resolve `required_outputs: []` and `output_files.required: false`. It SHALL
retain current source/cache/receipt/result obligations and authorized prior
submitted evidence lineage. Empty `required_outputs[]` alone SHALL NOT select
supplementary behavior: `wave2_targeted_evidence` retains its existing empty
direct-content set and its existing base output-declaration behavior.

Submit-side readers SHALL verify the embedded snapshot hash and assignment
marker, reconstruct the expected output contract for that marker, and require
exact manifest/beacon parity. v1/v2 reconstruction SHALL retain the bound
contract they were assigned and SHALL NOT receive the v3 supplementary
exception. A v2 supplementary attempt therefore keeps its old contract until it
follows an existing terminal/replacement path; no migration or new repair
operation is introduced.

#### Scenario: new Wave1 supplementary claim receives the v3 exception

- **WHEN** the Engine claims a valid v3 supplementary
  `wave1_topic_deepening` queue snapshot with no required receipts
- **THEN** manifest, beacon, task, result starter, dry-submit, and formal
  submit SHALL agree that `output_files: []` is allowed
- **AND** source claims, accepted URLs, cache/degraded capture, receipt, queue,
  and provenance validation SHALL remain required

#### Scenario: existing v1 or v2 assignment is not reinterpreted

- **WHEN** dry-submit or formal submit reads an already-claimed v1 or v2
  attempt with a hash-valid manifest and beacon output contract
- **THEN** it SHALL preserve that version's declaration-requiredness result
- **AND** it SHALL not apply v3 behavior or rewrite Engine-owned authority

#### Scenario: Wave2 does not inherit supplementary semantics

- **WHEN** a current `wave2_targeted_evidence` assignment has empty
  `required_outputs[]` and a base contract requiring an output declaration
- **THEN** its resolved contract SHALL retain that requirement
- **AND** it SHALL not treat the empty set as a supplementary Wave1 signal

#### Scenario: versioned reconstruction protects immutable bindings

- **WHEN** the index marker, manifest contract, beacon contract, or hash-bound
  queue snapshot cannot reconstruct one identical version-selected contract
- **THEN** dry-submit and formal submit SHALL fail closed before success mutation
- **AND** they SHALL not fall back to path guessing or current default behavior

### Requirement: Work-unit dry-submit SHALL preflight submit validation without side effects

The work-unit CLI SHALL provide a dry-submit preflight for claimed work units. Dry-submit SHALL read a candidate result and evaluate the same deterministic submit contract used by formal `operate-work-unit submit` wherever possible, including work-unit identity, queue binding, manifest/index consistency, result schema, runtime receipt, nonce, output files, source claims, cache trails, and kind output contract constraints.

Dry-submit and formal submit SHALL obtain `output_files` requiredness from the immutable version-selected assignment output contract, together with its `required_outputs[]`, rather than retain an independent generic non-empty-output rule. A snapshot-bound `work-unit.assignment.v3` supplementary `wave1_topic_deepening` assignment with empty required_outputs SHALL accept `output_files: []`; it SHALL still validate all applicable result schema, identity, receipt, source-claim, accepted-URL, cache/degraded-capture, queue and provenance facts. A v3 assignment with one or more required outputs SHALL continue to require and validate those exact path/role declarations. Empty required_outputs alone SHALL not select supplementary semantics or weaken another kind's existing output contract, and v1/v2 attempts SHALL retain their recorded contract interpretation.

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

Dry-submit SHALL combine the complete independent root set with the Engine-validated runtime-receipt lifecycle and emit exactly one non-persistent `recommended_action` from the closed set `submit|repair_same_candidate|return_to_actor|fail_and_replace|inspect_contract` plus `primary_root_code`. One work-unit contract schema SHALL define and validate this candidate projection, and one pure Engine helper SHALL own derivation plus timeout mapping; formal-submit rejection and timeout SHALL import those owners rather than maintain independent string sets. Dry-submit SHALL select `submit` only with no roots and set primary_root_code null. Otherwise precedence SHALL be contract_integrity -> semantic_content -> mechanical. Violation order SHALL be deterministic by a closed validation-phase ordinal, then required-output manifest order for direct targets or normalized JSON pointer/coordinate within a phase, then local issue order; primary_root_code SHALL be the first code in the winning scope under that order. Semantic content SHALL map to `fail_and_replace` when work_done is observed and `return_to_actor` otherwise. Mechanical-only roots SHALL map to `repair_same_candidate`. The projection SHALL NOT mutate state, persist a decision including inside `last_submit_rejection`, infer actor availability, or authorize a different acceptance path. Formal submit rejection SHALL use the same derivation and preserve dry-submit as the candidate re-evaluation checkpoint where applicable.

Generated actor guidance SHALL expose the exact direct contract and require the actor to verify assigned writes before recording work_done, but v1 SHALL NOT require native work-unit actors to invoke the Engine CLI. The Phase Agent SHALL run predictive dry-submit after actor return and execute the Engine-derived recommended_action: only repair_same_candidate permits result declaration repair; return_to_actor preserves selected-actor ownership; fail_and_replace uses the explicit same-obligation path; inspect_contract stays at the Engine/maintenance owner. This command-ownership choice SHALL not authorize Phase Agent semantic authorship or prevent a future separately accepted actor-side checkpoint.

#### Scenario: valid dry-submit has no ledger side effect

- **WHEN** a claimed work unit has a candidate result that formal submit would accept
- **AND** the Agent runs `operate-work-unit dry-submit`
- **THEN** dry-submit SHALL return `ok: true` or equivalent pass status
- **AND** `rb_output_declarations.jsonl`, `rb_queue.json`, work-unit status, assigned `result.json`, runtime receipt files, `_work_units/_transactions/`, trace/log files, and existing cache leaf files SHALL remain unchanged

#### Scenario: supplementary empty-output preflight matches its assignment

- **WHEN** a snapshot-bound supplementary `wave1_topic_deepening` attempt has empty required_outputs and a result with `output_files: []` plus valid required source/cache/receipt facts
- **THEN** dry-submit and formal submit SHALL not return `output_files[] is required`
- **AND** its generated task/result starter and submit verdict SHALL expose the same empty-output obligation

#### Scenario: primary direct-output obligation remains required

- **WHEN** a primary Wave1 assignment has its canonical required evidence-summary and question-list outputs but the candidate omits their declarations
- **THEN** dry-submit SHALL reject the omitted required path/role declarations
- **AND** it SHALL not reinterpret the primary assignment as supplementary

#### Scenario: empty direct outputs do not relax a different kind

- **WHEN** a current `wave2_targeted_evidence` assignment has its established
  empty required-output set but its bound base output contract requires an
  `output_files` declaration
- **THEN** dry-submit and formal submit SHALL preserve that existing
  declaration requirement
- **AND** they SHALL not infer supplementary Wave1 behavior from the empty set

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
- **AND** it SHALL emit null primary_root_code for submit or the first root code in the winning scope under the shared phase/coordinate ordering for rejection
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
