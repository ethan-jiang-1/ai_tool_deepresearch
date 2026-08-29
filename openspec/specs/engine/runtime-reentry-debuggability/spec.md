# Runtime Reentry Debuggability

> req: RRD-001, RRD-002, RRD-003, RRD-004, RRD-005, RRD-006, RRD-007, RRD-008, RRD-009, RRD-010, RRD-011, RRD-012

## Purpose

Define reentry checkpoint manifests, reentry checking, queue-state/lifecycle consistency validation, gate diagnostic preservation, and reentry coordinate tooling. Reentry tooling derives all facts from bundle files and deterministic helpers; it does not rely on chat memory.
## Requirements
### Requirement: Phase boundary SHALL record a reentry checkpoint manifest

After each ordinary gate attempt, the Engine SHALL write a lightweight checkpoint manifest under `_checkpoints/<iso>-<gate>.json`. For setup-ready only, RRD-011's staged route mode writes one route-pending checkpoint before its routable passed trace; that manifest is not a passed `gate_attempt` or handoff authority until the later bound trace exists.

Every ordinary checkpoint manifest SHALL include:
- `schema_version`
- `created_at`
- `bundle`
- `trigger`: `gate_attempt`
- `gate_result_ref`: enough fields to identify the triggering gate result (`gate`, `passed`, `currentNodeRef`, `next`)
- `status_snapshot`: current `rb_status.json` gate fields at checkpoint write time
- `normalized_target` when available
- topic registry summary
- queue summary
- artifact inventory for `seed_topics/`, `reference/`, `artifacts/`, and `final/`
- `cursors`: line counts for `rb_output_declarations.jsonl`, `rb_trace.jsonl`, and `_logs/run.log`
- `hashes`: size, mtime, and sha256 for control files and phase-owned artifacts

An RRD-011 setup-ready pending checkpoint SHALL instead use `trigger: setup_route_pending`, omit `gate_result_ref`, and include `gate_attempt_id`, `content_evaluation_ref` (`gate`, `passed`, `currentNodeRef`, `candidate_next`), `route_state: pending`, and its actual final `rb_plan.md` hash. The later routable trace SHALL bind that same identifier, checkpoint reference, and hash. The manifest SHALL NOT copy artifact contents.

An ordinary checkpoint SHALL represent runtime state at its gate-attempt audit time. A setup-ready pending checkpoint SHALL truthfully represent content evaluation and route-pending state, not a later route/status transition. It SHALL NOT pretend to describe a later `advance-status` transition unless that transition has already occurred and is visible in bundle files.

When multiple checkpoint manifests exist, reentry tooling SHALL select the latest non-pending checkpoint whose `gate_result_ref.gate` or `normalized_target.status_gate` matches the requested target. Any route-pending setup-ready checkpoint remains inspectable diagnostic evidence but SHALL NOT qualify as a passed handoff checkpoint or global fallback baseline, even when a later bound route trace exists. If no matching non-pending checkpoint exists, tooling MAY fall back to the latest non-pending checkpoint for global drift context, but SHALL report the absence of a target-matching checkpoint as inspect/advice.

#### Scenario: Gate attempt records checkpoint
- **WHEN** an ordinary gate CLI writes a `gate_attempt`
- **THEN** `_checkpoints/` SHALL contain a new manifest for that gate
- **AND** the manifest SHALL include status, queue summary, artifact inventory, ledger/trace/log cursors, schema version, trigger, gate result reference, and hashes

#### Scenario: setup route-pending checkpoint becomes bound handoff evidence
- **WHEN** setup-ready content evaluation passes and the staged route mode writes its checkpoint before its route trace
- **THEN** the checkpoint SHALL identify `trigger: setup_route_pending`, `route_state: pending`, its `gate_attempt_id`, `content_evaluation_ref`, and actual plan hash
- **AND** only a later matching route trace makes that checkpoint usable for the setup handoff

#### Scenario: Reentry selects latest matching checkpoint
- **WHEN** `_checkpoints/` contains multiple checkpoint manifests
- **AND** `check-reentry --at wave1_complete` is executed
- **THEN** reentry tooling SHALL select the newest checkpoint matching `wave1_complete` / `wave1-complete`
- **AND** it SHALL report when only a global fallback checkpoint was available

### Requirement: Reentry check SHALL validate runtime consistency for a target node

The system SHALL provide `DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle <path> --at <target>`.

The `--at` target vocabulary SHALL be closed and deterministic. Target normalization SHALL be derived from `DEEP_RESEARCH_HARNESS/workflows/manifest.json` whenever possible, using each phase entry's `key`, `node`, and `gate`. Implementations SHALL NOT maintain a second hand-written phase/gate mapping that can drift from the manifest.

The checker SHALL normalize targets into one of:
- `kind: "gate"`: a gate or lifecycle checkpoint value comparable to `rb_status.json#/current_gate`, such as `wave1_complete` or `hitl2_recorded`
- `kind: "phase"`: a known phase node alias or node ref, such as `phase-wave1` or `phases/phase-wave1.md`, mapped from the workflow manifest to the gate/checkpoint and required artifact set for reentry

The normalized target object SHALL include:
- `input`
- `kind`
- `status_gate`: underscore lifecycle value used by `rb_status.json#/current_gate`
- `gate_key`: hyphen gate definition key when applicable, such as `wave1-complete`
- `node_ref`: canonical workflow node ref when applicable, such as `phases/phase-wave1.md`
- `phase_key`: phase key when applicable, such as `wave1`

Unknown targets SHALL fail as a configuration error with inspect/advice listing accepted target examples. The checker SHALL include the normalized target in its JSON output when normalization succeeds.

After arguments and a known target are established, but before checkpoint selection, status/queue/artifact diagnosis, file observability, or recovery projection, the checker SHALL evaluate the selected root through the shared current-entry predicate. The predicate passes only when `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` both exist at that root. A failed predicate SHALL return the existing structured JSON envelope with `check.passed: false`, one blocking `unsupported_current_entry_contract` finding, and exit code `1`. It SHALL not call the shape `invalid_input`, `missing_contract`, or a caller/configuration failure, and it SHALL not read or project historical runtime data from the rejected directory.

The CLI SHALL emit JSON with at least:
- `schema_version`
- `check`: `{ passed, target, exit_code }`
- `normalized_target` when available
- `blockers`: array of blocker findings
- `warnings`: array of warning findings
- `drift`: array of checkpoint drift findings
- `findings`: array of file observability findings
- `inspect`
- `advice`

Exit codes SHALL be:
- `0`: no blockers; reentry is clean enough to continue, though warnings MAY be present
- `1`: one or more blockers prevent reliable reentry
- `2`: configuration or invocation error, such as unknown target, missing bundle, or unreadable required control file

The CLI SHALL return check/inspect/advice JSON and SHALL validate:
- `rb_status.json` matches the normalized target gate/checkpoint when target kind is `gate`
- phase target aliases map to a known reentry checkpoint and required artifact set
- queue state is compatible with current lifecycle status
- required artifacts for phases up to the target exist
- each participating reference has the same accepted authority classification used by the normal Wave evaluator: either a submitted delegated reference output or a valid Phase-owned projection backed by the accepted submitted source/cache/work-unit facts; a direct declaration alone is not a second stricter reentry authority
- latest checkpoint manifest is present when available and reports drift against current files
- unresolved blocking unplanned files are reported

The reentry reference audit SHALL reuse the existing pure reference-authority classifier rather than maintain a direct-ledger-only scan. A valid Phase-owned projection SHALL not be instructed to gain a synthetic delegated reference declaration. A genuinely unbacked, unsafe, or delegated-bypass reference SHALL remain blocking and SHALL report the classifier's direct missing backing fact and existing legal repair or missing-contract boundary.

When a valid newer `post_final_reentry` event, its exact current after-profile, route-bound rerun load and exceptional `phase_transition` explain the immediate legal profile/current-node/status-window evolution after an older HITL2 checkpoint, the checker SHALL use the event's bound before/after profile facts plus the event/load/phase-transition/current rerun window as the current baseline for those control changes. It SHALL preserve the older checkpoint as historical context but SHALL NOT report its superseded profile/status hashes as unexplained blocker drift. Before initial topic-state authorization, a current profile that no longer matches the event-bound after-profile SHALL remain blocker drift.

After sanctioned topic-state preparation, the checker SHALL consume the same ReopenResearchPass ownership/stage evaluation used by post-final inspection rather than maintain a count-only profile comparator. A later profile MAY remain in the same rerun lineage when `research_profile` and every unrelated field remain event-bound and either: the event-bound current count is paired with unchanged event-bound style params or the exact `computeResearchStyleParams` projection for event-bound style plus current committed canonical registry; or the event-bound next count is paired with either of those two style shapes under the same active rule digest. Current count plus an exact projection that differs from event-bound params SHALL retain `synchronized_initial_profile` and expose the existing phase-rerun count owner; an equal projection retains the idempotent topic-state/phase owner because values alone do not prove execution; next count SHALL expose the formal Gate. A style value matching neither allowed shape, changed profile name, partial parameter object or unrelated profile delta SHALL remain blocking.

After rerun-ready passes, the checker SHALL suppress superseded ReopenResearchPass control hashes only when the ReopenResearchPass ownership/stage evaluator proves the exact normal descendant stage currently present: non-superseded attempt plus unchanged source window before load, matching route-bound load plus target node before status synchronization, or matching transition/resulting status/current node afterward. A later passed `gate_attempt` from the wrong source/target SHALL NOT prove descendant ownership, and an observed load/transition/status mismatch SHALL remain blocker drift rather than falling through to fresh Final eligibility or an unspecified current owner.

Immediately after legal ReopenResearchPass entry, `check-reentry --at hitl2_recorded` SHALL validate the incoming source-gate checkpoint. `--at phase-rerun` / `rerun_ready` SHALL continue to mean the rerun phase has passed; ReopenResearchPass SHALL NOT change target normalization to hide this distinction.

The CLI SHALL NOT mutate runtime files.

#### Scenario: Reentry pass at wave1_complete

- **WHEN** a current-pair bundle has `rb_status.json#/current_gate = wave1_complete`
- **AND** required wave1 artifacts and ledger-covered references exist
- **THEN** `check-reentry --at wave1_complete` SHALL return `check.passed: true`
- **AND** process exit code SHALL be `0`
- **AND** output SHALL include `normalized_target.status_gate = "wave1_complete"`
- **AND** output SHALL include `normalized_target.gate_key = "wave1-complete"`

#### Scenario: Incomplete current entry blocks reentry before runtime diagnosis

- **WHEN** a supplied bundle lacks `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`, including an only-`RUN_BUNDLE.md`, only-`START_FROM_HERE.md`, or map-only directory
- **THEN** `check-reentry` SHALL return one `unsupported_current_entry_contract` blocker with exit code `1`
- **AND** it SHALL not emit historical status, queue, checkpoint, file-observability, drift, or recovery data
- **AND** it SHALL not report `invalid_input` or `missing_contract`

#### Scenario: Phase-owned reference has the normal authority interpretation

- **WHEN** a Wave1 reference is not a direct delegated reference output but has valid Phase-owned submitted source/cache/work-unit backing
- **THEN** normal Wave evaluation and `check-reentry` SHALL both classify it as a valid Phase-owned projection
- **AND** reentry SHALL not emit a `ledger_coverage` blocker or direct the Agent to mutate `rb_output_declarations.jsonl`

#### Scenario: Unbacked reference remains blocking

- **WHEN** a reference is neither a submitted delegated output nor a valid Phase-owned projection
- **THEN** `check-reentry` SHALL return a blocking reference-authority finding
- **AND** it SHALL expose the classifier's missing fact rather than report a generic declaration-only requirement

#### Scenario: Phase alias normalizes to canonical node

- **WHEN** `check-reentry --at phase-wave1` is executed for a current-pair bundle
- **THEN** output SHALL include `normalized_target.kind = "phase"`
- **AND** output SHALL include `normalized_target.node_ref = "phases/phase-wave1.md"`
- **AND** output SHALL include the mapped reentry gate/checkpoint for wave1
- **AND** the mapping SHALL be derived from `DEEP_RESEARCH_HARNESS/workflows/manifest.json`

#### Scenario: Unknown target fails closed

- **WHEN** `check-reentry --at arbitrary-chat-node` is executed
- **THEN** the checker SHALL return a configuration failure
- **AND** process exit code SHALL be `2`
- **AND** inspect/advice SHALL list accepted gate/checkpoint and phase target examples

#### Scenario: Reentry detects drift

- **WHEN** a checkpoint manifest records a file hash
- **AND** that file later changes without an accepted newer mutation contract explaining it
- **THEN** `check-reentry` SHALL return inspect/advice describing checkpoint drift

Drift severity SHALL be deterministic:
- `info`: append-only cursor advance in `_logs/run.log` or `rb_trace.jsonl` with no control/artifact hash conflict
- `warning`: non-authority artifact or diagnostic file drift that does not affect target pass conditions
- `blocker`: unexplained drift in control files, ledger declarations, queue state, status state, or authority artifacts that participate in target pass conditions

#### Scenario: Trace cursor advance is informational

- **WHEN** a checkpoint recorded `rb_trace.jsonl` line count
- **AND** later trace contains additional well-formed append-only diagnostic or accepted recovery events
- **THEN** drift SHALL be classified as `info` unless an event binding itself is invalid

#### Scenario: Authority artifact drift blocks reentry

- **WHEN** a checkpoint recorded a reference file hash
- **AND** that reference participates in target gate pass conditions
- **AND** the file hash later changes
- **THEN** drift SHALL be classified as `blocker`

#### Scenario: Accepted post-final mutation supersedes old control hashes

- **WHEN** an older HITL2 checkpoint has prior profile/status hashes
- **AND** a valid newer ReopenResearchPass event plus route-bound rerun load and exceptional phase transition explains the exact profile/current-node/status evolution
- **THEN** `check-reentry --at hitl2_recorded` SHALL use the accepted event/load/current window as the control baseline
- **AND** SHALL NOT report the older profile/status hashes as unexplained blockers

#### Scenario: Exact rerun style projection remains in lineage

- **WHEN** sanctioned topic add or safe removal changes the committed canonical registry length and the existing style CLI writes the exact shared projection before or with rerun count advancing to the event-bound next count
- **THEN** ReopenResearchPass and reentry SHALL recognize that profile as the same accepted rerun lineage
- **AND** at the event-bound current count a projection differing from event-bound params SHALL expose the existing phase-rerun count owner, while an equal projection SHALL conservatively retain the idempotent topic-state/phase owner
- **AND** reentry SHALL NOT restore the older checkpoint hash or require a new user decision

#### Scenario: Wrong projection or unrelated profile change remains drift

- **WHEN** current style parameters equal neither unchanged event-bound params nor the event-bound style projected over the current canonical registry, `research_profile` changes, or any unrelated profile field changes
- **THEN** reentry SHALL report blocker drift
- **AND** SHALL NOT normalize, rewrite or silently accept the profile

#### Scenario: Descendant pass suppresses only explained control evolution

- **WHEN** the exact rerun-ready attempt passes and the source window, optional matching load, optional matching transition/status and current node agree with the normal stage reached so far
- **THEN** reentry MAY suppress only the ReopenResearchPass control hashes explained by that stage and expose its existing next owner
- **AND** a wrong-source attempt or any observed conflicting load/transition/status/current node SHALL keep the ReopenResearchPass lineage discontinuity as a blocker

#### Scenario: Post-final entry does not redefine phase target semantics

- **WHEN** ReopenResearchPass has entered rerun but the rerun-ready gate has not passed
- **THEN** `check-reentry --at hitl2_recorded` MAY pass when other facts are clean
- **AND** `check-reentry --at phase-rerun` SHALL continue to require the `rerun_ready` checkpoint

### Requirement: Queue state SHALL NOT conflict with lifecycle status after phase pass

When the lifecycle status has advanced beyond a queued phase, executable queue items from prior phases SHALL either be absent, `done`, `failed`, `blocked`, or explicitly marked with a reentry disposition reason.

If the existing queue item schema has no such field, implementation SHALL add an optional machine-readable field such as `reentry_disposition` with a non-empty `reason`. Adding this field SHALL NOT make ignored work executable and SHALL NOT replace normal queue completion receipts.

Reentry check SHALL report a conflict when lifecycle status is, for example, `hitl2_recorded` but `rb_queue.json` still contains executable `wave0-*` or `wave1-*` work without a disposition reason.

Conflict severity SHALL be deterministic:
- `blocker`: prior-phase work has status `queued` or `running` and the target assumes that phase has passed, or the work can write files participating in the target gate's pass conditions
- `warning`: the work has status `done`, `failed`, or `blocked`, has a `reentry_disposition.reason`, or belongs to a future phase relative to the requested target

Every conflict inspect item SHALL include severity, work id, phase, current queue state, and the reason for the classification.

#### Scenario: Stale wave0 task after HITL2 is reported

- **WHEN** `rb_status.json#/current_gate = hitl2_recorded`
- **AND** `rb_queue.json` contains queued `wave0-source-*` work
- **THEN** `check-reentry` SHALL report a `blocker`
- **AND** inspect SHALL name the stale work id and explain that HITL2 assumes wave0 has passed

#### Scenario: Ignored stale task is a warning

- **WHEN** `rb_status.json#/current_gate = hitl2_recorded`
- **AND** `rb_queue.json` contains a prior-phase work item with status `blocked` and `reentry_disposition.reason`
- **THEN** `check-reentry` SHALL report a warning rather than a blocker

### Requirement: Gate diagnostics SHALL preserve full post-mortem detail

When a gate attempt fails, Engine SHALL preserve full gate diagnostics outside `run.log`.

The diagnostic artifact SHALL include:
- `schema_version`
- `kind`: `gate_failure_detail`
- `created_at`
- `bundle`
- `source_event_ref`
- `gate`
- `currentNodeRef`
- full `check`, `routing`, `inspect`, and `advice` objects

The trace SHALL remain compact but SHALL contain a non-verdict diagnostic event pointing to the diagnostic artifact path.

#### Scenario: Failed gate stores diagnostic artifact

- **WHEN** a gate returns `check.passed: false`
- **THEN** `_diagnostics/gates/` SHALL contain a JSON artifact with full inspect/advice
- **AND** `rb_trace.jsonl` SHALL contain `event: "diagnostic"` with `kind: "gate_failure_detail"`
- **AND** the trace event SHALL include the diagnostic artifact path

### Requirement: Reentry tooling SHALL not rely on chat memory

Reentry tooling SHALL derive all facts from bundle files, framework specs, and deterministic helpers. It SHALL NOT require terminal scrollback, previous chat messages, or free-text run summaries. The shared current-entry predicate is the first root-shape fact for a supplied bundle; it reads only same-root `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` existence and does not infer currentness from legacy Markdown, process memory, or chat.

#### Scenario: Reentry checker uses bundle truth

- **WHEN** `check-reentry` is run in a fresh process for a bundle with the current pair
- **THEN** it SHALL decide pass/fail from the pair, `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, ledger, checkpoints, and artifacts only

#### Scenario: Reentry checker does not reconstruct a legacy entry route

- **WHEN** `check-reentry` is run in a fresh process for a directory without the current pair
- **THEN** it SHALL report the unsupported-current-entry-contract blocker from direct root facts
- **AND** it SHALL not consult chat, terminal history, `RUN_BUNDLE.md`, or `START_FROM_HERE.md` to continue diagnosis

### Requirement: Reentry CLI exit-code semantics align with convention

Runtime reentry checking SHALL be documented as a non-gate CLI class that aligns with the framework CLI exit-code convention.

For `check-reentry.mjs`, structured stdout SHALL be the primary decision surface. Numeric exit code SHALL be interpreted as:

- `0` when the requested reentry target is consistent and passes;
- `1` when the target is known but the bundle fails the current-entry contract, runtime state, or artifacts fail the reentry check; and
- `2` when the target, arguments, configuration, or caller request is invalid.

The command's code `2` semantics SHALL be documented as caller/configuration error, not gate-rule failure and not morale signal. A known bundle missing `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md` is a deterministic current-entry validation failure and SHALL use code `1`, not `2`, `invalid_input`, or `missing_contract`. Any drift between header docs and emitted codes SHALL be recorded in the CLI exception/drift inventory rather than hidden.

#### Scenario: Unknown reentry target is caller/config error

- **WHEN** `check-reentry.mjs --at <unknown>` is called
- **THEN** it SHALL return structured inspect/advice naming valid target examples
- **AND** numeric code `2` SHALL be documented as caller/config error

#### Scenario: Incomplete current entry is a known-bundle blocker

- **WHEN** `check-reentry.mjs` receives a known target and a selected directory that lacks the current pair
- **THEN** structured stdout SHALL name `unsupported_current_entry_contract`
- **AND** numeric code SHALL be `1`

#### Scenario: Reentry drift remains structured detail

- **WHEN** a known current-pair target fails because runtime files drifted
- **THEN** stdout SHALL describe the drift severity and repair direction
- **AND** the numeric exit code SHALL remain a coarse branch signal only

### Requirement: Reentry diagnostics SHALL use current_node as the current phase coordinate

Runtime reentry and diagnostic tooling SHALL treat
`rb_status.json#/current_node`, when present, as the current loaded lifecycle
phase coordinate. This coordinate explains where an Agent resumes Markdown;
existing Gate/checkpoint validation remains responsible for runtime
consistency.

When `current_node` is `phases/phase-final.md`, that coordinate SHALL represent a
route-bound Final load. For loads created under the current contract, prospective
admission required an empty first primary inventory or the exact retired ReopenResearchPass prior
inventory; an already-entered load predating that admission remains readable
through explicit compatibility. The coordinate SHALL remain current after the
first and every revised report because Final has no outgoing transition. Reentry
SHALL combine this coordinate with the current Gate window, canonical primary Final
inventory and accepted lineage facts: a loaded but unsynchronized Final projects
the exact existing Readiness status-sync owner; a synchronized admitted empty
inventory projects the bundle's first delivery; a newer legally loaded and
synchronized Final handoff whose retired ReopenResearchPass prior-inventory digest matches with
zero appended canonical versions projects immediate current-lineage delivery; a
report proven as an immutable append for that lineage projects latest-report
refinement; an accepted publication
workspace projects exact artifact sweep/recovery; and an already accepted,
still-active ReopenResearchPass workspace or lineage projects its existing recovery owner. A
clean Final SHALL always project the Final owner, but SHALL distinguish delivery
pending from refinement using direct lineage/inventory facts. Reentry SHALL not
read or classify the current user turn or infer satisfaction, pending feedback,
or rerun intent from chat history or file mtime; the Agent owns semantic request
classification outside this deterministic projection.

For a current-pair bundle with absent/null `current_node`, tooling SHALL report
that no current phase coordinate is populated and use existing trace/checkpoint
inference where available. Advice SHALL point to `BUNDLE_MAP.md`, trace, and
reentry diagnostics. A directory missing the current entry pair fails earlier;
reentry SHALL not use `START_FROM_HERE.md` as compatibility fallback.

#### Scenario: Reentry reports current loaded phase

- **WHEN** status contains `current_node: phases/phase-hitl2.md`
- **THEN** diagnostics SHALL report that current phase coordinate and distinguish it from `current_gate` and `next_gate`

#### Scenario: Reentry reports Final as still current

- **WHEN** status contains `current_node: phases/phase-final.md` after one or more committed primary reports
- **THEN** diagnostics SHALL continue to report Final as the current phase
- **AND** it SHALL not require a self-transition, new load event, or satisfaction state

#### Scenario: Legacy or initial bundle without populated current node remains readable

- **WHEN** a current-pair bundle has absent/null `current_node`
- **THEN** reentry SHALL not fail solely for that absence
- **AND** it SHALL advise that the next successful `enter-phase` populates the coordinate and point to current bundle maps/trace

#### Scenario: Legacy START_FROM_HERE fallback is deprecated

> **@deprecated scenario name** — Retained solely as the established anchor.

- **WHEN** tooling finds `START_FROM_HERE.md` but no same-root `BUNDLE_ENTRY.md` plus `BUNDLE_MAP.md`
- **THEN** it SHALL return the unsupported-current-entry-contract blocker
- **AND** it SHALL not preserve or recommend the deprecated fallback

### Requirement: Reentry diagnostics SHALL summarize incident-shaped recovery truth

`check-reentry` SHALL compose existing status, queue, artifact, ledger,
checkpoint, file-observability, primary Final inventory, and post-final recovery
inspections into an additive structured recovery summary. It SHALL identify
canonical root findings and supporting counts. Each independent root SHALL name
whether its nearest sanctioned path is `reachable`, `missing_contract`, or
`not_applicable` and carry at most one structured action.

The Engine-owned schema SHALL require an action only for `reachable`, forbid one
for `missing_contract`, and include every blocking canonical primary finding.
The Engine SHALL not select one global strategy across independent roots.
Existing output fields, schema version, and exit-code behavior SHALL remain
compatible unless an implementation task explicitly proves a schema-version
bump is necessary; no new action kind SHALL be added merely to represent normal
Final refinement.

Blocking canonical findings SHALL keep `check.passed: false` and exit `1`;
warning/info findings remain non-blocking. The projection SHALL reuse canonical
inventory, backing, lifecycle, or post-final eligibility results rather than
recompute them. It SHALL read current bundle files only and SHALL not mutate
runtime authority or rely on chat memory.

Across a Final-boundary handoff and current terminal Final, owner precedence
SHALL be:

1. already accepted, still-active ReopenResearchPass workspace or lineage -> its exact existing
   recovery owner;
2. accepted artifact-publication/persistence workspace -> exact existing
   quiescent `sweep` or blocked-workspace repair;
3. invalid or ambiguous canonical primary inventory -> its direct inventory
   blocker, never post-final rerun;
4. newer legal Final handoff after retired ReopenResearchPass but no route-bound Final load ->
   exact existing `enter-phase` action, whose admission must reproduce the
   event-bound prior inventory before mutation;
5. route-bound Final load before the Readiness source Gate is synchronized ->
   exact existing `advance-status --to readiness_passed` action;
6. admitted and synchronized newer Final load -> current Final owner, using the event-bound prior
   inventory digest to distinguish zero-append immediate delivery from one-or-
   more-append latest refinement; and
7. otherwise -> current Final owner, using admitted empty inventory for the bundle's first
   delivery or the latest committed primary report for refinement.


A post-final inspection whose verdict is `blocked` SHALL project that root as blocked and SHALL NOT fall
through to a `blocker: null` reachable current-owner action; a blocked root is never `reachable`. The
summary SHALL also distinguish delivery-pending from refinement in its projected Final action:
zero-append (admitted empty inventory or a newer lineage with no appended canonical version) SHALL project
as immediate delivery, while a proven-append (latest committed report bound to the current lineage) SHALL
project as latest-report refinement; the two SHALL NOT be byte-identical projections.
This ordering SHALL follow `research/post-final-recovery` (POF-001), which owns
accepted ReopenResearchPass workspace/lineage precedence over artifact-persistence ownership;
this list mirrors that Source of Record and SHALL NOT re-decide the precedence
or add an owner.

Final refinement MAY be projected as the existing `current_owner` action kind
targeted at `phases/phase-final.md`; it SHALL not add a recovery controller,
infer a user request, publish a report, or claim user satisfaction. A clean
Final SHALL not project ReopenResearchPass as the default root, even if side-effect-free ReopenResearchPass
inspect would report that rerun is mechanically available.

Once post-final rerun is accepted, the existing ReopenResearchPass stage/owner mapping SHALL
remain intact: accepted ReopenResearchPass workspace -> exact recover; committed handoff before
entry -> exact `enter-phase`; entered but unsynchronized -> exact
`advance-status`; topic/style/count/rerun-ready descendants -> their existing
owner; proven later normal handoff -> current lifecycle owner; exhausted rerun
-> new-bundle user decision; stale/ambiguous/conflicting state -> one blocker.
Immediately after legal post-final entry/status operations, existing
postconditions SHALL continue to check the actual current source-gate window.

#### Scenario: Incident-shaped bundle produces one canonical recovery root

- **WHEN** one registry-external durable Topic causes dependent missing surfaces
- **THEN** diagnostics SHALL retain detail but project the unregistered Topic as one blocking root
- **AND** dependent symptoms SHALL not create competing actions

#### Scenario: Missing sanctioned path is explicit

- **WHEN** no accepted path reaches the suggested owner
- **THEN** the root SHALL report `missing_contract` and omit an unreachable command

#### Scenario: Eligible terminal Final exposes one recovery action

> **@deprecated behavior** — The historical scenario title is retained as an
> archive anchor. Before ReopenResearchPass has accepted a request, the one reachable action is
> now the current Final owner rather than ReopenResearchPass preparation.

- **WHEN** the latest lineage is clean terminal Final, inventory is valid, and no publication or accepted ReopenResearchPass workspace exists
- **THEN** recovery summary SHALL expose the current Final owner as reachable
- **AND** it SHALL not emit post-final recovery preparation as the default action

#### Scenario: Newer Final lineage with zero append resumes immediate delivery

- **WHEN** accepted ReopenResearchPass descendants reach a newer legal Final handoff, exact prior-inventory admission creates its route-bound Final load, Readiness status synchronization completes, and inventory has no appended canonical version
- **THEN** recovery summary SHALL expose `phases/phase-final.md` as the current owner for immediate delivery
- **AND** it SHALL not present the prior report as current-lineage delivery or expose fresh ReopenResearchPass preparation

#### Scenario: Post-ReopenResearchPass Final entry drift keeps the exact entry owner

- **WHEN** accepted ReopenResearchPass descendants reach a newer legal Final handoff but current safe Final inventory differs from the retired event-bound prior digest before its Final load
- **THEN** recovery SHALL expose the existing Final `enter-phase` boundary or its direct blocker rather than a loaded Final refinement owner
- **AND** it SHALL not treat drifted files as current-lineage delivery or infer a fresh ReopenResearchPass request

#### Scenario: Loaded newer Final keeps status synchronization ahead of delivery

- **WHEN** the newer route-bound Final load exists but the Readiness source Gate has not been synchronized
- **THEN** recovery summary SHALL expose only the existing `advance-status --to readiness_passed` action for that lifecycle root
- **AND** it SHALL not project Final publication, refinement, or fresh ReopenResearchPass eligibility

#### Scenario: Newer Final lineage with proven append resumes refinement

- **WHEN** current valid inventory uniquely preserves the retired event-bound prior inventory and appends one or more highest canonical versions
- **THEN** recovery summary SHALL expose the latest appended report under the current Final refinement owner
- **AND** it SHALL preserve every earlier report and ReopenResearchPass event as historical truth

#### Scenario: Accepted post-final request exposes post-final recovery

- **WHEN** an Agent-classified evidence-expanding request has established an accepted ReopenResearchPass workspace or lineage
- **THEN** summary SHALL expose its exact post-final recovery owner action
- **AND** it SHALL not also expose Final presentation refinement as a competing root

#### Scenario: Prepared post-final operation masks downstream symptoms

- **WHEN** an accepted ReopenResearchPass workspace exists before full event commit or after event commit with cleanup incomplete
- **THEN** that workspace SHALL be the primary lifecycle root with exact recover action
- **AND** downstream profile/topic symptoms SHALL not compete

#### Scenario: Pending artifact persistence precedes ReopenResearchPass

> **@deprecated scenario name** — The title is retained as the historical
> anchor. With no accepted ReopenResearchPass workspace, an accepted artifact-persistence
> workspace takes precedence; an accepted ReopenResearchPass owner takes precedence over it
> per POF-001.

- **WHEN** terminal Final contains an accepted artifact-persistence workspace and no accepted ReopenResearchPass workspace or lineage exists
- **THEN** summary SHALL expose only the existing quiescent sweep/recovery action for that root
- **AND** it SHALL not publish, refine, or offer ReopenResearchPass while inventory is unstable

#### Scenario: Ambiguous primary inventory blocks before rerun

- **WHEN** terminal Final primary inventory cannot classify a unique modern or legacy base
- **THEN** summary SHALL expose that direct blocker
- **AND** it SHALL not choose a report, version, Final rewrite, or ReopenResearchPass action

#### Scenario: Style-before-count summary uses the shared current owner

- **WHEN** the shared ReopenResearchPass evaluator proves the existing style-before-count crash window
- **THEN** summary SHALL retain the existing phase-rerun count-increment owner
- **AND** it SHALL not return to Final refinement

#### Scenario: Equal projection keeps the idempotent phase owner

- **WHEN** ReopenResearchPass style values cannot prove style execution because current and event-bound projections are equal
- **THEN** summary SHALL preserve the shared topic-state/phase owner
- **AND** it SHALL not infer another owner

#### Scenario: Exhausted rerun limit does not expose an impossible path

- **WHEN** the active rule makes the requested rerun unavailable
- **THEN** summary SHALL omit ReopenResearchPass apply and expose only the existing new-bundle decision boundary

#### Scenario: Existing reentry output remains compatible

- **WHEN** an existing clean non-Final reentry case runs
- **THEN** existing output fields, schema version, and exit codes SHALL preserve accepted semantics

#### Scenario: Invocation error may omit recovery context

- **WHEN** invocation cannot load a bundle or normalize target and exits `2`
- **THEN** it MAY omit recovery while preserving structured invocation feedback


#### Scenario: blocked inspection is not projected as reachable

- **WHEN** a post-final inspection returns `verdict: blocked` for a root
- **THEN** the summary SHALL project that root as blocked
- **AND** it SHALL NOT project a `reachable` current-owner action with `blocker: null`

#### Scenario: zero-append and proven-append projections are distinguishable

- **WHEN** a newer Final lineage has no appended canonical version (delivery-pending)
- **THEN** the summary SHALL project immediate delivery as the Final action
- **AND** when the current lineage has a latest committed report bound by a proven append, the summary SHALL
  project latest-report refinement instead
- **AND** the two projections SHALL NOT be byte-identical

#### Scenario: Recovery summary is read-only
#### Scenario: Recovery summary is read-only

- **WHEN** `check-reentry` produces a summary
- **THEN** recursive before/after inspection SHALL show no mutation to runtime authority or content


### Requirement: Reentry SHALL consume canonical topic-state inspection without mutation

Reentry diagnostics SHALL consume the side-effect-free topic-state read model
and group registry, seed, queue/work-unit and artifact symptoms for one
canonical UID into one root finding with at most one reachable nearest action.
An accepted topic-state workspace SHALL be a direct blocker whose reachable
action is the exact topic-state recover command. Reentry SHALL NOT execute
apply/recover, persist progress or create identity.

A plan that fails the current canonical plan contract SHALL produce the shared
canonical-topic-state blocker without reentry mutation, migration, adoption,
upgrade, conversion, or a ReopenResearchPass route for making the historical plan current. Its
historical bytes remain human-readable outside the current Engine. ReopenResearchPass continues
to govern canonical post-final topic repair only: before its valid complete
handoff, reentry SHALL not present fresh canonical topic-state apply; after its
route-bound rerun witness, it MAY expose only the existing canonical
add/update/direction/layout operations subject to their normal checks. An
accepted prepared topic-state workspace remains recoverable after lifecycle
drift because recovery finishes previously authorized bytes; this SHALL NOT
make fresh apply reachable outside an accepted rerun witness.

#### Scenario: One UID drift becomes one root
- **WHEN** a topic has registry/seed binding failure plus derivative queue/artifact symptoms
- **THEN** reentry SHALL emit one topic-state root and mask derivative symptoms

#### Scenario: Clean topic state remains read-only
- **WHEN** identity/materialization/direct facts are consistent and no accepted workspace remains
- **THEN** integration SHALL add no blocker and mutate no bundle file

#### Scenario: Post-final legacy incident points to ReopenResearchPass first
- **WHEN** reentry inspects terminal Final with a schema-valid canonical topic state that needs post-final repair and no accepted post-final or topic-state workspace
- **THEN** it SHALL expose the exact ReopenResearchPass eligibility/apply action or direct ReopenResearchPass blocker
- **AND** it SHALL not use that ReopenResearchPass action to make a historical mutable plan current

#### Scenario: Post-final legacy incident points to missing ReopenResearchPass
- **WHEN** reentry inspects terminal Final with a schema-valid canonical topic state but the post-final recovery evaluator cannot establish an eligible or accepted ReopenResearchPass path
- **THEN** it SHALL report the direct missing/blocked ReopenResearchPass boundary
- **AND** it SHALL not recommend historical-plan migration, adoption, upgrade, or conversion

#### Scenario: Historical mutable plan stops at the current topic-state boundary
- **WHEN** reentry reads an `rb_plan.md` that fails the current canonical plan contract
- **THEN** it SHALL return the shared canonical-topic-state blocker without changing bundle bytes
- **AND** it SHALL not advertise migration, adoption, upgrade, conversion, or ReopenResearchPass as a route to make that plan current

#### Scenario: Post-final accepted workspace exposes exact recovery only
- **WHEN** terminal lifecycle state contains an accepted prepared post-final recovery or topic-state workspace, including a ReopenResearchPass workspace whose event is committed but cleanup is incomplete
- **THEN** reentry SHALL expose the exact owning recover operation id
- **AND** SHALL NOT expose fresh apply or new semantic input

#### Scenario: Route-bound post-final rerun exposes existing topic repair
- **WHEN** a valid post-final recovery event and exact after-profile have been consumed by completed route-bound `enter-phase`, the exact bound exceptional `phase_transition` exists, and current node/status are the existing rerun window
- **THEN** reentry MAY expose existing canonical `operate-topic-state` add/update/direction/layout actions subject to TopicTreeEvolution checks
- **AND** SHALL NOT create a ReopenResearchPass-specific topic mutation action or a historical-plan migration route

#### Scenario: Legal current-node update preserves recovery lineage

- **WHEN** the recovery event has a completed route-bound rerun load/current-node update but existing status sync has not completed
- **THEN** reentry SHALL expose only `advance-status --to hitl2_recorded`
- **AND** SHALL NOT report the legal current-node update as manual drift or expose topic mutation early

#### Scenario: Post-entry check uses the incoming source checkpoint

- **WHEN** current node is rerun and current gate remains `hitl2_recorded`
- **THEN** guidance SHALL use `check-reentry --at hitl2_recorded`
- **AND** SHALL NOT claim `phase-rerun` / `rerun_ready` has already passed

### Requirement: Reentry SHALL consume canonical topic layout recovery facts

Reentry diagnostics SHALL consume topic-state layout inspection and the shared resolver without mutation. An accepted layout workspace SHALL be one primary blocker with exact recover action and SHALL short-circuit derived registry/seed drift. Without a workspace, one UID's current/previous layout collision or unresolved structured legacy binding SHALL be grouped into one root with at most one nearest repair action. Historical artifact/reference paths that resolve through previous layout SHALL not be reported as mutation drift.

Post-final fresh layout requests SHALL consult the accepted ReopenResearchPass path. Before a valid route-bound recovery→rerun witness exists, reentry SHALL expose the ReopenResearchPass action/boundary rather than presenting `mutate_layout` as reachable. After that witness exists, the existing TopicTreeEvolution layout action MAY be presented under the normal rerun authorization and quiescence rules.

#### Scenario: Partial layout commit has one recovery action
- **WHEN** reentry sees an accepted operation after new seed replacement and before registry replacement or old-seed cleanup
- **THEN** it SHALL return only the exact topic-state recover command as primary action

#### Scenario: Terminal Final requires ReopenResearchPass before layout mutation
- **WHEN** a terminal bundle has no accepted recovery workspace/event and a human requests rename or renumber
- **THEN** reentry SHALL expose the exact ReopenResearchPass eligibility/apply action or direct ReopenResearchPass blocker
- **AND** SHALL NOT treat the request source as direct topic mutation permission

#### Scenario: Terminal final does not gain mutation authority

- **WHEN** a terminal bundle has no accepted ReopenResearchPass event plus route-bound rerun load and a human requests rename or renumber
- **THEN** reentry SHALL require the ReopenResearchPass path or report its direct blocker
- **AND** SHALL NOT treat terminal position or request source as topic mutation permission

#### Scenario: Post-final rerun reuses TopicTreeEvolution layout owner
- **WHEN** ReopenResearchPass recovery has been route-bound into the existing rerun node and layout mutation is otherwise eligible
- **THEN** reentry SHALL recommend the existing topic-state `mutate_layout` path
- **AND** SHALL NOT introduce a post-final layout mover, history rewrite or second workspace

### Requirement: Route-pending checkpoint is not a reentry baseline

`check-reentry` SHALL exclude any checkpoint with `route_state: pending` from both target-matching checkpoint selection and global checkpoint fallback. It MAY expose such a checkpoint as diagnostic evidence, including its `gate_attempt_id`, content-evaluation status, and plan hash, and MAY separately report a matching bound `gate_attempt` trace as the setup-ready handoff fact; it SHALL still report that no passed checkpoint baseline exists. A later route trace never changes the pending checkpoint's baseline eligibility.

The reentry checker SHALL NOT let pending evidence suppress, reclassify, or explain drift, status, or handoff facts. This adds no second reentry path: a passed route trace remains the only setup-ready handoff authority.

#### Scenario: only pending setup checkpoint is not selected
- **WHEN** `_checkpoints/` contains a route-pending setup-ready checkpoint but no bound setup-ready passed trace
- **THEN** `check-reentry --at setup_ready` reports the missing passed checkpoint baseline, whether or not a matching route trace is present
- **AND** it may list the pending checkpoint only as diagnostic evidence
- **AND** it SHALL not return that checkpoint as the selected baseline or treat setup handoff as complete
