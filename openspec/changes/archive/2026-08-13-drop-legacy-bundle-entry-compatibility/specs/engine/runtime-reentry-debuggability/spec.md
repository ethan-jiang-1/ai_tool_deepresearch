> req: RRD-002, RRD-005, RRD-006, RRD-007

## MODIFIED Requirements

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
