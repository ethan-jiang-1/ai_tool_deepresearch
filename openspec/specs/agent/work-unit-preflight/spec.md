# work-unit-preflight Specification

> req: WUP-001, WUP-002, WUP-003, WUP-004, WUP-005, WUP-006

## Purpose

Side-effect-free prediction before delegated work is committed: dry-submit structured preflight mirroring submit semantics, strict provenance projection, timeout preflight recommendation, and candidate projection diagnostics. Split from `agent/delegated-work-units` (2026-09 capability identity migration); engine modules do not move.


## Requirements

### Requirement: Dry-submit SHALL be a read-only structured preflight mirroring submit semantics

> req: WUP-001

The work-unit CLI SHALL provide a dry-submit preflight for claimed work units. Dry-submit SHALL read a candidate result and evaluate the same deterministic submit contract used by formal `operate-work-unit submit` wherever possible, including work-unit identity, queue binding, manifest/index consistency, result schema, runtime receipt, nonce, output files, source claims, cache trails, and kind output contract constraints.

Dry-submit and formal submit SHALL obtain `output_files` requiredness from the immutable current assignment output contract, together with its `required_outputs[]`, rather than retain an independent generic non-empty-output rule. A snapshot-bound `work-unit.assignment.v3` supplementary `wave1_topic_deepening` assignment with empty required_outputs SHALL accept `output_files: []`; it SHALL still validate all applicable result schema, identity, receipt, source-claim, accepted-URL, cache/degraded-capture, queue and provenance facts. A v3 assignment with one or more required outputs SHALL continue to require and validate those exact path/role declarations. Empty required_outputs alone SHALL not select supplementary semantics or weaken another kind's existing output contract. An attempt with v1/v2 assignment, a missing marker, markerless submission, or missing actor binding SHALL return `unsupported_current_contract` before dry-submit derives an output contract, validates a candidate, or reports a repair action.

Dry-submit SHALL be read-only. It SHALL NOT append `rb_output_declarations.jsonl`, complete queue demand, mutate `rb_queue.json`, change work-unit terminal/claimed status, write canonical result/receipt/cache files, record `last_submit_rejection`, create `_work_units/_transactions/` entries, write submit trace/log side effects, or emit success authority that gates may consume. Formal submit remains the only successful delegated completion transition.

Dry-submit output SHALL be structured enough for Agent repair. It SHALL report whether formal submit is expected to pass, the checked `work_id`, reason codes or violation codes, repair-targeted diagnostics, and any narrow normalizations formal submit would perform. Every primary independently evaluable violation SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun`; dependent checks blocked by an earlier prerequisite SHALL be masked or marked dependent instead of being presented as additional repair tasks. Failed dry-submit SHALL still return structured preflight JSON rather than only throwing a stderr error. Normalization reporting SHALL NOT persist those normalizations during dry-submit.

Dry-submit SHALL mirror formal submit candidate path semantics. A candidate result path MAY be temporary or caller-provided when formal submit would allow it. The assigned work-unit directory containment rule SHALL remain limited to nonce normalization eligibility and SHALL NOT become a new dry-submit-only path restriction.

Dry-submit SHALL avoid validation branches that write as part of canonicalization. When formal submit would canonicalize cache `page-content.md` into `page.md`, canonical receipt JSONL, or assigned result JSON, dry-submit SHALL report the planned normalization without writing those files. Dry-submit SHALL validate the in-memory virtual canonical view that formal submit would validate, so read-only preflight does not reject a candidate solely because the canonical file has not been persisted yet.

Dry-submit SHALL accumulate independently evaluable violations so the Agent can repair multiple issues in one pass. If one failed check prevents dependent checks from running, dry-submit SHALL report that dependency rather than inventing validation results.

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

### Requirement: Dry-submit SHALL keep provenance strict through one neutral target module

> req: WUP-002

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

### Requirement: Timeout preflight SHALL be a progress-aware read-only recommendation

> req: WUP-003

The work-unit CLI SHALL provide a timeout preflight for claimed work units. Timeout preflight SHALL determine whether it is safe to terminalize a claimed work-unit attempt as `timed_out` by evaluating Engine-observed progress, candidate result state, dry-submit-equivalent diagnostics, queue binding, and effective idle lease state.

Timeout preflight SHALL accept an explicit current run bundle path, `work_id`, and optional candidate `result` path. When no candidate result path is supplied, preflight SHALL inspect the assigned result path from the work-unit record. When a candidate result path is supplied, preflight SHALL evaluate it under submit/dry-submit-equivalent candidate path rules. A supplied candidate result path outside the assigned work-unit directory SHALL be a validation input only: its mtime SHALL NOT extend the work-unit idle lease by itself, though dry-submit-equivalent validation MAY still recommend `submit` or `repair`. It SHALL fail closed for missing or invalid work-unit index records, non-claimed attempts, missing manifests, missing queue in-flight binding, or binding drift. It SHALL return structured JSON for both timeout-eligible and timeout-ineligible cases. The output SHALL include the checked `work_id`, `queue_item_id`, current status, `timeout_eligible`, `check`, `recommended_action`, nullable `candidate_projection`, progress summary, `initial_deadline_at`, `lease_anchor_at`, `idle_timeout_ms`, `effective_timeout_at`, `inspect[]`, and repair-oriented `advice[]`.

`recommended_action` SHALL be a closed value: `submit`, `repair`, `wait`, `timeout`, `inspect`, or `block`. Timeout-preflight CLI exit status SHALL follow `timeout_eligible`: exit success only when timeout is currently safe, and exit non-zero when timeout is unsafe or the work-unit state is invalid. When the work-unit context can be loaded, non-zero preflight outcomes SHALL still emit structured JSON for Agent feedback.

Timeout-preflight output SHALL be validated by an Engine-owned schema before it is emitted. The schema SHALL make `timeout_eligible` and `check` consistent, SHALL constrain `recommended_action` to the closed action set, SHALL reuse the shared candidate-projection schema when `candidate_projection` is non-null, and SHALL keep progress details structured enough for tests and Phase Agent guidance to distinguish result, receipt, output/cache, idle lease, and binding diagnostics. Candidate projection SHALL be null when no candidate was evaluated; preflight SHALL NOT synthesize a candidate action or primary root code from timeout state alone.

The timeout-preflight helper/API SHALL accept an injectable clock for tests, while CLI invocations SHALL use the real current time. Tests SHALL NOT depend on sleeping to cross timeout boundaries. Filesystem mtime comparisons SHALL be made against the injected or real current time and the work-unit `claimed_at`. File mtimes in the future relative to the chosen current time SHALL be diagnosed as suspicious and SHALL NOT extend the effective lease beyond the chosen current time plus the idle timeout window.

Timeout eligibility SHALL be progress-aware. The existing `deadline_at` SHALL remain an initial lease hint, but terminal timeout eligibility SHALL use an effective idle lease derived from `lease_anchor_at + idle_timeout_ms`. `latest_engine_observed_progress_at` SHALL mean actual Engine-observed progress and SHALL NOT be populated from `claimed_at` merely to support timeout arithmetic. `lease_anchor_at` SHALL be the latest Engine-observed progress time when progress exists, or `claimed_at` when no progress exists. The default idle timeout window SHALL be the work-unit `timeout_ms` unless an accepted explicit runtime/profile surface provides a narrower value. If there is no observed progress after claim, effective timeout eligibility SHALL fall back to `claimed_at + idle_timeout_ms`, which matches the existing `claimed_at + timeout_ms` behavior when the default idle timeout is used.

Engine-observed progress SHALL come from deterministic bundle-root surfaces such as assigned candidate result files, runtime receipt/log content and mtime tied to the same identity, declared output/cache files under current run bundle root, assigned work-unit refs, and Engine trace/log events tied to the same `work_id`. Undeclared random files, path-escape refs, and identity-mismatched surfaces SHALL NOT extend the idle lease. Agent-authored receipt timestamps SHALL NOT be the sole authority for progress freshness. Progress diagnostics SHALL identify the source type, observed timestamp when available, path or event ref when available, whether work-unit identity was verified, whether the source extended the idle lease, and whether a suspicious timestamp was detected.

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

### Requirement: Dry-submit cache-URL mismatch diagnostics SHALL carry the recorded leaf urls

> req: WUP-004

When dry-submit rejects an accepted source claim because its cache trail leaf records different urls than the claim url (`accepted source claim cache trail maps to a different URL`), or rejects an `accepted_source_urls[]` entry with no matching claim, the diagnostic SHALL carry, in addition to the claim-side url and the cache trail path, the actual normalized urls recorded in the leaf `meta.json` (the `url`/`source_url`/`final_url`/`fetched_url` values through the existing cache-leaf normalization) so the Agent can repair in one step without reading `meta.json`. The verdict and rejection semantics SHALL NOT change.

#### Scenario: Cache trail leaf records a url that differs from the claim url

- **WHEN** dry-submit compares an accepted source claim url (e.g. `https://finance.sina.com.cn/a`) against its declared cache trail leaf whose `meta.json` records `url: https://finance.sina.com.cn/a?cref=cj`
- **THEN** dry-submit SHALL reject with the existing mismatch reason
- **AND** the diagnostic SHALL include the claim-side url, the cache trail path, and the recorded leaf urls (including the `?cref=cj` variant) so the Agent can repair without reading `meta.json`

#### Scenario: accepted_source_urls entry has no matching claim

- **WHEN** an `accepted_source_urls[]` entry has no matching accepted `source_claims[]` entry
- **THEN** dry-submit SHALL reject with the existing reason
- **AND** the diagnostic SHALL include the mismatching url and the accepted claim urls already declared, so the Agent can identify the exact repair coordinate

### Requirement: Dry-submit runtime-receipt schema diagnostics SHALL carry the raw value, all affected lines, and the expected format

> req: WUP-005

When dry-submit rejects a runtime receipt because a receipt event fails its schema (e.g. an invalid ISO datetime in `ts`), the diagnostic SHALL include (a) the failing field's raw string value (e.g. `Invalid datetime: "2026-08-26T01:25:25.3NZ"`), (b) every affected line number rather than only the first failing line, and (c) the legal format expectation (e.g. ISO 8601 UTC like `2026-08-26T01:25:25.300Z`), so the Agent can repair all offending lines in one step. The schema verdict and rejection semantics SHALL NOT change.

#### Scenario: Receipt contains an invalid datetime across multiple lines

- **WHEN** every line of a runtime receipt carries `ts: "2026-08-26T01:25:25.3NZ"` (non-standard millisecond suffix) and dry-submit validates the receipt
- **THEN** dry-submit SHALL reject with the receipt schema failure
- **AND** the diagnostic SHALL include the raw invalid value (`2026-08-26T01:25:25.3NZ`), every affected line number (not only line 1), and the legal ISO 8601 UTC format expectation

#### Scenario: Receipt line with a missing required field

- **WHEN** a receipt event is missing a required field (e.g. `kind`) and dry-submit validates the receipt
- **THEN** dry-submit SHALL reject with the receipt schema failure
- **AND** the diagnostic SHALL name the missing field path and the affected line number

### Requirement: Dry-submit invalid-result SHALL report duplicate accepted claim URLs and their count

> req: WUP-006

When dry-submit / submit validation already rejects a source-claims result for an accepted claim or
accepted-URL root (for example an `accepted_source_urls[]` entry with no matching accepted claim, or a cache
trail mismatch), and the result also declares more than one accepted claim entry for the same normalized
claim URL, the structured `invalid_result` SHALL additionally report each repeated URL, the number of
accepted claims carrying that URL, and the JSON-pointer range of those claims (first..last index within
`source_claims[]`) so the Agent can collapse duplicates in one deterministic edit. URL normalization SHALL
reuse the existing source-cache URL normalization used by claim/cache matching.

This diagnostic SHALL be purely enrichment of an already-failing result: it SHALL NOT by itself turn a
passing result into a failing one, SHALL NOT introduce a new standalone pass/fail root, and SHALL NOT relax
or strengthen the existing accepted-URL membership and cache/degraded ref checks. A result whose only
anomaly is repeated claim URLs (with every other source-claim/URL/cache check passing) SHALL keep its
existing verdict.

#### Scenario: duplicate accepted claim URLs are counted inside an invalid result

- **WHEN** a result declares 16 accepted `source_claims[]` entries across only 4 distinct claim URLs
- **AND** dry-submit rejects the result for an existing accepted-URL or cache-trail root
- **THEN** dry-submit SHALL report, per repeated URL, the number of accepted claims sharing it and the
  JSON-pointer range of those claims
- **AND** the diagnostic SHALL NOT depend on the Agent hand-counting the result

#### Scenario: duplicates alone do not change a passing verdict

- **WHEN** a result's accepted claims repeat a URL but every existing source-claim, accepted-URL, and
  cache/degraded check passes
- **THEN** the duplicate-claim enrichment SHALL NOT turn that result into a failure
- **AND** the result verdict SHALL be unchanged by this diagnostic
