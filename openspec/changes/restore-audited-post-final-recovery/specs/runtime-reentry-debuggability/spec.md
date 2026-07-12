> req: RRD-002, RRD-008, RRD-009, RRD-010

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

When a valid newer `post_final_reentry` event, its exact current after-profile, route-bound rerun load and exceptional `phase_transition` explain the immediate legal profile/current-node/status-window evolution after an older HITL2 checkpoint, the checker SHALL use the event's bound before/after profile facts plus the event/load/phase-transition/current rerun window as the current baseline for those control changes. It SHALL preserve the older checkpoint as historical context but SHALL NOT report its superseded profile/status hashes as unexplained blocker drift. Before initial topic-state authorization, a current profile that no longer matches the event-bound after-profile SHALL remain blocker drift. A later profile SHALL be accepted as the same rerun lineage only when every field still matches the event-bound after-profile except `rerun_count`, which equals the event-bound `next_count` under the same active rule digest; unrelated profile drift remains blocking.

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

For terminal Final, the post-final recovery root SHALL map direct states to one action:

- accepted post-final workspace → exact `recover`;
- accepted artifact-persistence workspace → existing quiescent `sweep` before Final lineage can be stable;
- accepted topic-state workspace → exact existing topic-state `recover`;
- committed recovery handoff not yet loaded → exact `enter-phase phases/phase-rerun.md`;
- route-bound recovery load not yet status-synchronized → exact `advance-status --to hitl2_recorded`;
- route-bound rerun with canonical topic drift → existing topic-state inspect/apply/recover action;
- eligible terminal Final without an accepted request → exact post-final recovery inspect/apply preparation action;
- exhausted next rerun under the active gate rule → one user decision boundary for a new bundle, not a C5 command;
- stale, ambiguous, nonterminal or unsupported action → one direct blocker or `missing_contract`, never impossible predecessor-gate advice.

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

- **WHEN** an accepted post-final recovery workspace exists before its handoff event is fully committed
- **THEN** the workspace SHALL be the primary lifecycle root with exact recover action
- **AND** partial profile symptoms and canonical topic symptoms SHALL NOT produce competing lifecycle actions

#### Scenario: Pending artifact persistence precedes C5

- **WHEN** terminal Final contains an accepted artifact-persistence workspace
- **THEN** recovery summary SHALL expose only the existing quiescent sweep action
- **AND** SHALL NOT present C5 apply while final inventory remains unstable

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

Reentry diagnostics SHALL consume the side-effect-free topic-state read model and group registry, seed, queue/work-unit and artifact symptoms for one canonical UID into one root finding with at most one reachable nearest action. An accepted topic-state workspace SHALL be a direct blocker whose reachable action is the exact topic-state recover command. Reentry SHALL NOT execute apply/recover, persist progress or create identity.

When no accepted topic-state workspace exists, a post-final legacy or new-scope finding SHALL consult the post-final recovery inspection. Before C5 eligibility or handoff it SHALL expose the exact C5 action or direct C5 blocker rather than presenting topic-state apply as immediately reachable. After a valid route-bound post-final recovery→rerun witness exists, it MAY expose the existing topic-state inspect/apply/recover action under the normal rerun status window. An accepted prepared topic-state workspace remains recoverable after lifecycle drift because recovery finishes previously authorized bytes; this SHALL NOT make fresh apply reachable outside an accepted rerun witness.

#### Scenario: One UID drift becomes one root
- **WHEN** a topic has registry/seed binding failure plus derivative queue/artifact symptoms
- **THEN** reentry SHALL emit one topic-state root and mask derivative symptoms

#### Scenario: Clean topic state remains read-only
- **WHEN** identity/materialization/direct facts are consistent and no accepted workspace remains
- **THEN** integration SHALL add no blocker and mutate no bundle file

#### Scenario: Post-final legacy incident points to C5 first
- **WHEN** reentry inspects terminal Final with legacy or registry-external topic state and no accepted post-final or topic-state workspace
- **THEN** it SHALL expose the exact C5 eligibility/apply action or direct C5 blocker
- **AND** SHALL NOT recommend topic-state migrate-legacy as reachable before rerun entry

#### Scenario: Post-final legacy incident points to missing C5
> **@deprecated** — This pre-C5 scenario name is retained for archive compatibility. A clean eligible Final now exposes C5 as reachable; unsupported, ambiguous or incomplete C5 prerequisites remain an explicit missing/blocked boundary.

- **WHEN** reentry inspects terminal Final with legacy topic state but the post-final recovery evaluator cannot establish an eligible or accepted C5 path
- **THEN** it SHALL report the direct missing/blocked C5 boundary
- **AND** SHALL NOT recommend migrate-legacy apply as reachable

#### Scenario: Post-final accepted workspace exposes exact recovery only
- **WHEN** terminal lifecycle state contains an accepted prepared post-final recovery or topic-state workspace
- **THEN** reentry SHALL expose the exact owning recover operation id
- **AND** SHALL NOT expose fresh apply or new semantic input

#### Scenario: Route-bound post-final rerun exposes existing topic repair
- **WHEN** a valid post-final recovery event has been consumed by route-bound `enter-phase` and current node/status are the existing rerun window
- **THEN** reentry MAY expose existing `operate-topic-state` migrate/add/update/layout actions subject to C3 checks
- **AND** SHALL NOT create a C5-specific topic mutation action

#### Scenario: Legal current-node update preserves recovery lineage

- **WHEN** the recovery event has a route-bound rerun load but existing status sync has not completed
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
