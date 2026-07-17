> req: RRD-002, RRD-008

## MODIFIED Requirements

### Requirement: Reentry check SHALL validate runtime consistency for a target node

The system SHALL provide `DPT_FRAMEWORK/cli/check-reentry.mjs --bundle <path> --at <target>`.

The `--at` target vocabulary SHALL be closed and deterministic. Target normalization SHALL be derived from `DPT_FRAMEWORK/workflows/manifest.json` whenever possible, using each phase entry's `key`, `node`, and `gate`. Implementations SHALL NOT maintain a second hand-written phase/gate mapping that can drift from the manifest.

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
- ledger declarations cover reference files that participate in gate pass conditions
- latest checkpoint manifest is present when available and reports drift against current files
- unresolved blocking unplanned files are reported

When a valid newer `post_final_reentry` event, its exact current after-profile, route-bound rerun load and exceptional `phase_transition` explain the immediate legal profile/current-node/status-window evolution after an older HITL2 checkpoint, the checker SHALL use the event's bound before/after profile facts plus the event/load/phase-transition/current rerun window as the current baseline for those control changes. It SHALL preserve the older checkpoint as historical context but SHALL NOT report its superseded profile/status hashes as unexplained blocker drift. Before initial topic-state authorization, a current profile that no longer matches the event-bound after-profile SHALL remain blocker drift.

After sanctioned topic-state preparation, the checker SHALL consume the same C5 ownership/stage evaluation used by post-final inspection rather than maintain a count-only profile comparator. A later profile MAY remain in the same rerun lineage when `research_profile` and every unrelated field remain event-bound and either: the event-bound current count is paired with unchanged event-bound style params or the exact `computeResearchStyleParams` projection for event-bound style plus current committed canonical registry; or the event-bound next count is paired with either of those two style shapes under the same active rule digest. Current count plus an exact projection that differs from event-bound params SHALL retain `synchronized_initial_profile` and expose the existing phase-rerun count owner; an equal projection retains the idempotent topic-state/phase owner because values alone do not prove execution; next count SHALL expose the formal Gate. A style value matching neither allowed shape, changed profile name, partial parameter object or unrelated profile delta SHALL remain blocking.

After rerun-ready passes, the checker SHALL suppress superseded C5 control hashes only when the C5 ownership/stage evaluator proves the exact normal descendant stage currently present: non-superseded attempt plus unchanged source window before load, matching route-bound load plus target node before status synchronization, or matching transition/resulting status/current node afterward. A later passed `gate_attempt` from the wrong source/target SHALL NOT prove descendant ownership, and an observed load/transition/status mismatch SHALL remain blocker drift rather than falling through to fresh Final eligibility or an unspecified current owner.

Immediately after legal C5 entry, `check-reentry --at hitl2_recorded` SHALL validate the incoming source-gate checkpoint. `--at phase-rerun` / `rerun_ready` SHALL continue to mean the rerun phase has passed; C5 SHALL NOT change target normalization to hide this distinction.

The CLI SHALL NOT mutate runtime files.

#### Scenario: Reentry pass at wave1_complete

- **WHEN** a bundle has `rb_status.json#/current_gate = wave1_complete`
- **AND** required wave1 artifacts and ledger-covered references exist
- **THEN** `check-reentry --at wave1_complete` SHALL return `check.passed: true`
- **AND** process exit code SHALL be `0`
- **AND** output SHALL include `normalized_target.status_gate = "wave1_complete"`
- **AND** output SHALL include `normalized_target.gate_key = "wave1-complete"`

#### Scenario: Phase alias normalizes to canonical node

- **WHEN** `check-reentry --at phase-wave1` is executed
- **THEN** output SHALL include `normalized_target.kind = "phase"`
- **AND** output SHALL include `normalized_target.node_ref = "phases/phase-wave1.md"`
- **AND** output SHALL include the mapped reentry gate/checkpoint for wave1
- **AND** the mapping SHALL be derived from `DPT_FRAMEWORK/workflows/manifest.json`

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

### Requirement: Reentry diagnostics SHALL summarize incident-shaped recovery truth

`check-reentry` SHALL compose existing status, queue, artifact, ledger, checkpoint, file-observability and post-final recovery inspections into an additive structured recovery summary. The summary SHALL identify canonical topic footprint or lifecycle recovery root findings and supporting finding count. Each independent root finding SHALL state whether its nearest deterministic sanctioned path status is `reachable`, `missing_contract`, or `not_applicable` and SHALL carry at most one structured recommended action.

The recovery summary SHALL be validated by an Engine-owned Zod schema. Per-root cross-field validation SHALL require a concrete structured action only when that root's path status is `reachable`, SHALL forbid a fabricated action when status is `missing_contract`, and SHALL require every blocking canonical primary finding to appear in the root summary while supporting details do not create a second primary action. The Engine SHALL NOT select one global repair strategy across independent roots. Results produced after bundle loading and target normalization SHALL use output `schema_version: "1.1.0"` and include `recovery`. Exit-code `2` invocation/configuration failures that cannot form a recovery context MAY omit `recovery`. Existing `check`, `normalized_target`, `blockers`, `warnings`, `drift`, `findings`, `inspect`, `advice`, and exit-code behavior SHALL otherwise remain compatible.

Blocking canonical primary findings SHALL participate in the existing reentry verdict: they SHALL make `check.passed` false and produce exit code `1`. Warning/info canonical findings SHALL remain non-blocking. The projection SHALL reuse the same canonical finding or post-final eligibility result rather than reimplementing the audit condition in the CLI.

Reentry diagnostics SHALL derive these facts from active bundle files and existing deterministic transition/handoff/recovery helpers. They SHALL NOT rely on chat memory and SHALL NOT mutate runtime authority.

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
