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

After sanctioned topic-state preparation, the checker SHALL consume the same C5 ownership/stage evaluation used by post-final inspection rather than maintain a count-only profile comparator. A later profile MAY remain in the same rerun lineage when `research_profile` and every unrelated field remain event-bound and either: the event-bound current count is paired with unchanged event-bound style params or the exact `computeResearchStyleParams` projection for event-bound style plus current committed canonical registry; or the event-bound next count is paired with either of those two style shapes under the same active rule digest. Current count plus an exact projection that differs from event-bound params SHALL retain `synchronized_initial_profile` and expose the existing phase-rerun count owner; an equal projection retains the idempotent topic-state/phase owner because values alone do not prove execution; next count SHALL expose the formal Gate. A style value matching neither allowed shape, changed profile name, partial parameter object or unrelated profile delta SHALL remain blocking.

After rerun-ready passes, the checker SHALL suppress superseded C5 control hashes only when the C5 ownership/stage evaluator proves the exact normal descendant stage currently present: non-superseded attempt plus unchanged source window before load, matching route-bound load plus target node before status synchronization, or matching transition/resulting status/current node afterward. A later passed `gate_attempt` from the wrong source/target SHALL NOT prove descendant ownership, and an observed load/transition/status mismatch SHALL remain blocker drift rather than falling through to fresh Final eligibility or an unspecified current owner.

Immediately after legal C5 entry, `check-reentry --at hitl2_recorded` SHALL validate the incoming source-gate checkpoint. `--at phase-rerun` / `rerun_ready` SHALL continue to mean the rerun phase has passed; C5 SHALL NOT change target normalization to hide this distinction.

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
- **AND** a valid newer C5 event plus route-bound rerun load and exceptional phase transition explains the exact profile/current-node/status evolution
- **THEN** `check-reentry --at hitl2_recorded` SHALL use the accepted event/load/current window as the control baseline
- **AND** SHALL NOT report the older profile/status hashes as unexplained blockers

#### Scenario: Exact rerun style projection remains in lineage

- **WHEN** sanctioned topic add or safe removal changes the committed canonical registry length and the existing style CLI writes the exact shared projection before or with rerun count advancing to the event-bound next count
- **THEN** C5 and reentry SHALL recognize that profile as the same accepted rerun lineage
- **AND** at the event-bound current count a projection differing from event-bound params SHALL expose the existing phase-rerun count owner, while an equal projection SHALL conservatively retain the idempotent topic-state/phase owner
- **AND** reentry SHALL NOT restore the older checkpoint hash or require a new user decision

#### Scenario: Wrong projection or unrelated profile change remains drift

- **WHEN** current style parameters equal neither unchanged event-bound params nor the event-bound style projected over the current canonical registry, `research_profile` changes, or any unrelated profile field changes
- **THEN** reentry SHALL report blocker drift
- **AND** SHALL NOT normalize, rewrite or silently accept the profile

#### Scenario: Descendant pass suppresses only explained control evolution

- **WHEN** the exact rerun-ready attempt passes and the source window, optional matching load, optional matching transition/status and current node agree with the normal stage reached so far
- **THEN** reentry MAY suppress only the C5 control hashes explained by that stage and expose its existing next owner
- **AND** a wrong-source attempt or any observed conflicting load/transition/status/current node SHALL keep the C5 lineage discontinuity as a blocker

#### Scenario: Post-final entry does not redefine phase target semantics

- **WHEN** C5 has entered rerun but the rerun-ready gate has not passed
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

Runtime reentry and diagnostic tooling SHALL treat `rb_status.json#/current_node`, when present, as the current loaded lifecycle phase node coordinate. This coordinate SHALL be used to explain where an Agent resumes reading Markdown, while existing gate/checkpoint validation remains responsible for deciding whether the runtime state is consistent.

For a current-pair bundle, if `current_node` is `null` or absent in an initial bundle, reentry tooling SHALL report that status lacks a populated current phase coordinate and SHALL use existing trace/checkpoint inference where available. Advice SHALL point the Agent to `BUNDLE_MAP.md`, trace, and reentry diagnostics. A directory without the pair fails earlier at the unsupported-current-entry-contract boundary; reentry SHALL not name `START_FROM_HERE.md` as a compatibility fallback or recommend migration.

#### Scenario: Reentry reports current loaded phase

- **WHEN** a current-pair bundle's `rb_status.json` contains `current_node: "phases/phase-hitl2.md"`
- **AND** reentry or audit tooling reports the current runtime position
- **THEN** the output SHALL include `current_node: "phases/phase-hitl2.md"` or equivalent current phase coordinate
- **AND** it SHALL distinguish this from `current_gate` and `next_gate`

#### Scenario: Legacy or initial bundle without populated current node remains readable

- **WHEN** a current-pair bundle's `rb_status.json` has no `current_node` or has `current_node: null`
- **THEN** reentry tooling SHALL NOT fail solely for that absence
- **AND** diagnostics SHALL advise that the next successful `enter-phase` will populate `current_node`
- **AND** diagnostics SHALL point to `BUNDLE_MAP.md`, trace, and reentry diagnostics rather than `current_gate` guessing

#### Scenario: Legacy START_FROM_HERE fallback is deprecated

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy-map fallback.

- **WHEN** reentry tooling finds `START_FROM_HERE.md` but the selected root lacks `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`
- **THEN** it SHALL return the unsupported-current-entry-contract blocker before runtime diagnostics
- **AND** it SHALL not keep the directory readable through a deprecated compatibility path or recommend migration

### Requirement: Reentry diagnostics SHALL summarize incident-shaped recovery truth

`check-reentry` SHALL compose existing status, queue, artifact, ledger, checkpoint, file-observability and post-final recovery inspections into an additive structured recovery summary. The summary SHALL identify canonical topic footprint or lifecycle recovery root findings and supporting finding count. Each independent root finding SHALL state whether its nearest deterministic sanctioned path status is `reachable`, `missing_contract`, or `not_applicable` and SHALL carry at most one structured recommended action.

The recovery summary SHALL be validated by an Engine-owned Zod schema. Per-root cross-field validation SHALL require a concrete structured action only when that root's path status is `reachable`, SHALL forbid a fabricated action when status is `missing_contract`, and SHALL require every blocking canonical primary finding to appear in the root summary while supporting details do not create a second primary action. The Engine SHALL NOT select one global repair strategy across independent roots. Results produced after bundle loading and target normalization SHALL use output `schema_version: "1.1.0"` and include `recovery`. Exit-code `2` invocation/configuration failures that cannot form a recovery context MAY omit `recovery`. Existing `check`, `normalized_target`, `blockers`, `warnings`, `drift`, `findings`, `inspect`, `advice`, and exit-code behavior SHALL otherwise remain compatible.

Blocking canonical primary findings SHALL participate in the existing reentry verdict: they SHALL make `check.passed` false and produce exit code `1`. Warning/info canonical findings SHALL remain non-blocking. The projection SHALL reuse the same canonical finding or post-final eligibility result rather than reimplementing the audit condition in the CLI.

Reentry diagnostics SHALL derive these facts from current run bundle files and existing deterministic transition/handoff/recovery helpers. They SHALL NOT rely on chat memory and SHALL NOT mutate runtime authority.

Immediately after legal post-final `enter-phase` and existing `advance-status --to hitl2_recorded` synchronization, Agent-facing postcondition guidance SHALL invoke `check-reentry --at hitl2_recorded`, because that is the current source-gate checkpoint. Before status sync, the only action SHALL be that exact `advance-status` command. It SHALL NOT recommend `--at phase-rerun` / `rerun_ready` until the rerun-ready gate has actually passed.

For a terminal Final or an accepted post-final recovery lineage descended from it, the post-final recovery root SHALL consume the same C5 stage/owner result used by post-final inspect, handoff/status and reentry, and SHALL map direct states to one action:

- accepted post-final workspace, including event-committed cleanup-only state -> exact `recover`;
- accepted artifact-persistence workspace -> existing quiescent `sweep` before Final lineage can be stable;
- accepted topic-state workspace -> exact existing topic-state `recover`;
- committed recovery handoff without a completed rerun `current_node` update, including load-written partial entry -> exact `enter-phase phases/phase-rerun.md`;
- completed rerun entry not yet status-synchronized, or derived status present without the exact event/load-bound `phase_transition` and without a conflicting transition -> exact idempotent `advance-status --to hitl2_recorded`;
- synchronized initial rerun profile/window whose stage owner is topic-state/phase -> existing topic-state inspect/apply/recover checkpoint; an unchanged topic result returns execution to the current phase-rerun owner;
- synchronized initial rerun profile/window whose distinct exact style projection proves the style-before-count crash window -> the existing `current_owner` action targeted at the phase-rerun count increment;
- event-bound rerun count incremented under the same rule digest -> existing rerun-ready gate;
- proven later normal descendant handoff -> current existing lifecycle-owner action;
- eligible terminal Final without an accepted request -> exact post-final recovery inspect/apply preparation action;
- exhausted next rerun under the active gate rule -> one user decision boundary for a new bundle, not a C5 command;
- stale, ambiguous, conflicting-transition, nonterminal or unsupported action -> one direct blocker or `missing_contract`, never impossible predecessor-gate advice.

The recovery summary SHALL project that shared stage owner directly. It SHALL NOT derive every `synchronized_initial_profile` action from the stage label alone, maintain a second profile comparator or add a recovery action kind.

#### Scenario: Incident-shaped bundle produces one canonical recovery root

- **WHEN** a bundle contains one registry-external durable topic that also causes dangling reference and missing canonical wave surfaces
- **THEN** `check-reentry` SHALL preserve the detailed findings
- **AND** its recovery summary SHALL identify the unregistered durable topic as a root finding
- **AND** dependent symptoms SHALL not produce competing primary actions
- **AND** `check.passed` SHALL be false with exit code `1`

#### Scenario: Missing sanctioned path is explicit

- **WHEN** the current handoff/status window cannot legally reach the suggested predecessor gate or phase and no accepted post-final recovery operation applies
- **THEN** the affected root finding SHALL report `sanctioned_path_status: missing_contract`
- **AND** that root SHALL NOT emit the unreachable command as its recommended action

#### Scenario: Eligible terminal Final exposes one recovery action

- **WHEN** the latest delivery lineage is a clean eligible terminal Final and no post-final request/workspace/event exists
- **THEN** recovery summary SHALL report the post-final rerun path as `reachable`
- **AND** SHALL emit only the exact post-final recovery inspect/apply preparation action

#### Scenario: Prepared post-final operation masks downstream symptoms

- **WHEN** an accepted post-final recovery workspace exists before its handoff event is fully committed or after event commit with cleanup incomplete
- **THEN** the workspace SHALL be the primary lifecycle root with exact recover action
- **AND** partial profile symptoms and canonical topic symptoms SHALL NOT produce competing lifecycle actions

#### Scenario: Pending artifact persistence precedes C5

- **WHEN** terminal Final contains an accepted artifact-persistence workspace
- **THEN** recovery summary SHALL expose only the existing quiescent sweep action
- **AND** SHALL NOT present C5 apply while final inventory remains unstable

#### Scenario: Style-before-count summary uses the shared current owner

- **WHEN** the shared C5 stage/owner result retains `synchronized_initial_profile` because current params equal a distinct exact style projection at the event-bound count
- **THEN** recovery summary SHALL emit one reachable `current_owner` action targeted at the existing phase-rerun count increment
- **AND** SHALL NOT emit topic-state, create another action kind or require a user decision

#### Scenario: Equal projection keeps the idempotent phase owner

- **WHEN** current params equal both event-bound params and the exact current projection so values cannot prove style execution
- **THEN** recovery summary SHALL preserve the shared topic-state/phase owner
- **AND** SHALL NOT infer the count-increment owner from projection equality alone

#### Scenario: Exhausted rerun limit does not expose an impossible path

- **WHEN** the existing rerun phase increment would make the active rerun-count gate rule fail
- **THEN** recovery summary SHALL not present C5 apply as reachable
- **AND** SHALL expose only the user decision boundary for starting a new bundle

#### Scenario: Existing reentry output remains compatible

- **WHEN** an existing clean reentry case runs after this change
- **THEN** existing output fields and exit codes SHALL preserve their accepted semantics
- **AND** output SHALL use `schema_version: "1.1.0"`
- **AND** the additive recovery summary SHALL validate successfully

#### Scenario: Invocation error may omit recovery context

- **WHEN** `check-reentry` cannot load a bundle or normalize the requested target and returns exit code `2`
- **THEN** it MAY omit the `recovery` field
- **AND** it SHALL preserve structured invocation inspect/advice

#### Scenario: Recovery summary is read-only

- **WHEN** `check-reentry` produces the recovery summary
- **THEN** a recursive before/after snapshot SHALL show no mutation to status, profile, queue, trace, ledger, checkpoints, workspaces, artifacts, references, final output, or cache

### Requirement: Reentry SHALL consume canonical topic-state inspection without mutation

Reentry diagnostics SHALL consume the side-effect-free topic-state read model
and group registry, seed, queue/work-unit and artifact symptoms for one
canonical UID into one root finding with at most one reachable nearest action.
An accepted topic-state workspace SHALL be a direct blocker whose reachable
action is the exact topic-state recover command. Reentry SHALL NOT execute
apply/recover, persist progress or create identity.

A plan that fails the current canonical plan contract SHALL produce the shared
canonical-topic-state blocker without reentry mutation, migration, adoption,
upgrade, conversion, or a C5 route for making the historical plan current. Its
historical bytes remain human-readable outside the current Engine. C5 continues
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

#### Scenario: Post-final legacy incident points to C5 first
- **WHEN** reentry inspects terminal Final with a schema-valid canonical topic state that needs post-final repair and no accepted post-final or topic-state workspace
- **THEN** it SHALL expose the exact C5 eligibility/apply action or direct C5 blocker
- **AND** it SHALL not use that C5 action to make a historical mutable plan current

#### Scenario: Post-final legacy incident points to missing C5
- **WHEN** reentry inspects terminal Final with a schema-valid canonical topic state but the post-final recovery evaluator cannot establish an eligible or accepted C5 path
- **THEN** it SHALL report the direct missing/blocked C5 boundary
- **AND** it SHALL not recommend historical-plan migration, adoption, upgrade, or conversion

#### Scenario: Historical mutable plan stops at the current topic-state boundary
- **WHEN** reentry reads an `rb_plan.md` that fails the current canonical plan contract
- **THEN** it SHALL return the shared canonical-topic-state blocker without changing bundle bytes
- **AND** it SHALL not advertise migration, adoption, upgrade, conversion, or C5 as a route to make that plan current

#### Scenario: Post-final accepted workspace exposes exact recovery only
- **WHEN** terminal lifecycle state contains an accepted prepared post-final recovery or topic-state workspace, including a C5 workspace whose event is committed but cleanup is incomplete
- **THEN** reentry SHALL expose the exact owning recover operation id
- **AND** SHALL NOT expose fresh apply or new semantic input

#### Scenario: Route-bound post-final rerun exposes existing topic repair
- **WHEN** a valid post-final recovery event and exact after-profile have been consumed by completed route-bound `enter-phase`, the exact bound exceptional `phase_transition` exists, and current node/status are the existing rerun window
- **THEN** reentry MAY expose existing canonical `operate-topic-state` add/update/direction/layout actions subject to C3 checks
- **AND** SHALL NOT create a C5-specific topic mutation action or a historical-plan migration route

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

Post-final fresh layout requests SHALL consult the accepted C5 path. Before a valid route-bound recovery→rerun witness exists, reentry SHALL expose the C5 action/boundary rather than presenting `mutate_layout` as reachable. After that witness exists, the existing C3B layout action MAY be presented under the normal rerun authorization and quiescence rules.

#### Scenario: Partial layout commit has one recovery action
- **WHEN** reentry sees an accepted operation after new seed replacement and before registry replacement or old-seed cleanup
- **THEN** it SHALL return only the exact topic-state recover command as primary action

#### Scenario: Terminal Final requires C5 before layout mutation
- **WHEN** a terminal bundle has no accepted recovery workspace/event and a human requests rename or renumber
- **THEN** reentry SHALL expose the exact C5 eligibility/apply action or direct C5 blocker
- **AND** SHALL NOT treat the request source as direct topic mutation permission

#### Scenario: Terminal final does not gain mutation authority

- **WHEN** a terminal bundle has no accepted C5 event plus route-bound rerun load and a human requests rename or renumber
- **THEN** reentry SHALL require the C5 path or report its direct blocker
- **AND** SHALL NOT treat terminal position or request source as topic mutation permission

#### Scenario: Post-final rerun reuses C3B layout owner
- **WHEN** C5 recovery has been route-bound into the existing rerun node and layout mutation is otherwise eligible
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
