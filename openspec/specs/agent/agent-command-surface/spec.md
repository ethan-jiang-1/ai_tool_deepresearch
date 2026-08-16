# Agent Command Surface

> req: ACS-001, ACS-002, ACS-003, ACS-004, ACS-005

## Purpose

Define the Agent-facing audience contract for Deep Research Harness command surfaces. Harness commands are invoked by the Phase Agent or another Agent actor, not by a human or operator co-runner during the autonomous pipeline. This capability establishes the discoverable command audience, entry-doc trigger semantics, static validation coverage, and phase-boundary terminology canon.
## Requirements
### Requirement: Command surfaces declare Agent-facing audience

Harness command surfaces SHALL state that commands are invoked by the Phase
Agent or another Agent actor, not by a human/operator co-runner during the
pipeline.

`Agent-facing` SHALL mean that when the recorded goal, current permissions,
accepted contracts, current user semantic input, and a legal command path
determine an ordinary action, the Agent executes the command and reversible
mechanical repair itself. Command surfaces SHALL not tell the human to run
ordinary pipeline commands, edit runtime authority, allocate a Final filename,
or complete deterministic repair.

When a direct prerequisite blocks progress, guidance SHALL preserve the
smallest blocker and nearest legal Agent action. If an accepted, authorized,
reversible path exists, the Agent SHALL perform it and rerun the same
checkpoint/operation. Without a legal path it SHALL retain the boundary rather
than invent a transition, hand-write authority, or create an Engine-invisible
parallel path. Interaction placement remains separate: HITL1/HITL2 MAY request
their owned decisions; non-terminal `stop: "no"` phases do not initiate
surfacing; an already-current user turn may be answered; terminal Final follows
its deliver-first refinement contract.

`Autonomous` SHALL mean Agent-driven execution under recorded intent, accepted
contracts, and Engine feedback. `Human-directed` SHALL mean that a semantic
decision/correction or maintenance instruction came from the human; it SHALL not
be a permission token or lifecycle mode. HITL1 and HITL2 SHALL remain the only
Harness-initiated in-run lifecycle decision checkpoints. Final SHALL remain the
terminal lifecycle node and SHALL not become a third HITL, while allowing
artifact-focused collaboration after immediate first delivery.

At Final, command docs SHALL place responsibility as follows:

- whenever the current legal Final lineage has no bound report, the Agent
  completes the exact entry/status synchronization owner, prepares staging, and
  runs `publish-final-report` before asking for feedback, creating the bundle base
  only after empty-primary entry admission and otherwise global `latest + 1`
  after a later audited rerun whose new Final load admitted the exact event-bound
  prior inventory;
- after a committed report, clear presentation feedback authorizes the Agent to
  prepare one revised staging report and run publication again, without asking
  the user to choose a filename or execute a command;
- a backing, inventory, concurrency, or crash-recovery blocker is ordinary
  Agent/Engine collaboration through direct feedback and the existing sweep/
  retry path;
- the Agent asks only the smallest material presentation clarification, genuine
  semantic/risk decision, missing permission, or host-required non-delegable
  action;
- satisfaction ends the current interaction and runs no command; and
- only an Agent-classified evidence-expanding request uses post-final recovery.

A user MAY initiate a normal turn in any non-HITL phase. The Agent SHALL answer
without treating the message as checkpoint, permission expansion, arbitrary
state mutation, pause, or durable mid-run intent. During Final, clear bounded
presentation feedback is an accepted input to the existing publication path;
it SHALL not change lifecycle node/status, the current lineage's HITL2 profile/
handoff, permission, or research evidence. If feedback requires new sources,
Topics, evidence,
conclusions, or research-profile changes, the Agent SHALL classify that semantic
boundary, retain the request, and use audited post-final rerun. If ambiguous, it
SHALL ask the smallest clarification before choosing publication or C5. The
Engine SHALL not classify free-form feedback.

Separate human-directed maintenance/recovery/debug collaboration SHALL remain
out-of-band, not another lifecycle checkpoint or a generic Final override.
Command docs SHALL not claim arbitrary state mutation, overwrite, deletion,
permission, or reentry without an accepted Engine path.

The helper-oriented posture SHALL not override Engine verdicts, silently change
intent, expand permission, or fabricate evidence, receipt, trace, publication,
or runtime state. `Human-directed` identifies semantic source; it does not
transfer ordinary commands to the human. An accepted action requires the
contract-owned semantic decision/correction at its legal placement, current host
permission, and an existing Engine path.

For accepted post-final rerun, the user-owned boundary is the new research
scope/risk decision plus any non-delegable host approval. The request carries
reason/scope and expected Final lineage but is not verified identity or a
permission token. The Agent SHALL prepare/retain it, run C5 inspect/apply/
recover, consume legal rerun entry, synchronize status, run reentry/topic-state
checks, and continue the existing pipeline.

Before recommending or accepting rerun at HITL2 or Final, the Agent SHALL
consume the shared pure rerun-availability result for current `rerun_count` plus
the increment owned by `phase-rerun.md`. It SHALL not raw-parse the Gate
definition, copy numeric limits, write eligibility state, or create another
Gate. The formal rerun-ready Gate and C5 SHALL use the same evaluator.

If direct facts show supported but unavailable rerun, the Agent SHALL not
recommend/record it, run C5 apply, create a C5 workspace, reset the count, or
enter an impossible rerun. C5 inspect MAY expose the same read-only fact. At
HITL2 or current Final interaction, the Agent SHALL ask only whether to start a
new bundle for that requested research scope. Unsupported/unreadable rule or
profile facts SHALL be stated as that exact boundary rather than claiming a new
bundle repairs them.

When an accepted decision authorizes a destructive/irreversible action, the
Agent SHALL execute the remaining legal mechanics. If host policy requires a
non-delegable human action, guidance SHALL identify only that action at an
authorized interaction placement and resume Agent execution afterward.

The discoverable command index SHALL place a top-level audience statement before
command tables. It SHALL say:

- commands and ordinary reversible repair are Agent-facing;
- a blocker preserves one direct prerequisite and legal action, without ad-hoc authority;
- HITL1/HITL2 are the only lifecycle decision checkpoints;
- Final is terminal, publishes first, then permits bounded report refinement without becoming HITL;
- user messages do not by themselves expand permission or override Engine facts;
- the Agent chooses and executes `publish-final-report`; the user does not allocate versions or run it;
- accepted evidence-expanding Final feedback uses audited C5 and returns mechanics to the Agent;
- unsupported maintenance remains a missing capability rather than generic override;
- non-terminal `stop: "no"` remains silent; and
- command docs are operating surfaces for the Agent, not mid-pipeline human instructions.

Agent-facing docs SHALL not use unqualified `Agent/operator` wording unless the
same sentence limits operator activity to post-run inspection or out-of-band
maintenance.

#### Scenario: Command index declares Agent audience

- **WHEN** the Phase Agent reads `DEEP_RESEARCH_HARNESS/COMMANDS.md`
- **THEN** a top-level audience statement SHALL precede command tables and assign ordinary commands/repair to the Agent
- **AND** it SHALL distinguish HITL1/HITL2 decisions, non-terminal silence, and terminal Final refinement
- **AND** it SHALL distinguish current user turns and out-of-band maintenance from permission or another checkpoint

#### Scenario: Agent handles a repairable deterministic blocker

- **WHEN** an ordinary command fails and an accepted reversible repair exists
- **THEN** guidance SHALL name the direct blocker and Agent action
- **AND** the Agent SHALL repair and rerun without asking the human to execute commands or edit authority

#### Scenario: Missing legal path does not create ad-hoc authority

- **WHEN** requested progress has no legal path or Engine feedback remains failed
- **THEN** guidance SHALL retain that boundary and obey current interaction placement
- **AND** it SHALL not invent a transition, publication, overwrite, or hidden state path

#### Scenario: Autonomous and human-directed authority remain distinct

- **WHEN** docs describe autonomous execution, HITL decision, user turn, Final feedback, or maintenance/debug
- **THEN** they SHALL distinguish Agent mechanics from human semantic input
- **AND** Final feedback SHALL not be named a third HITL or generic repair override
- **AND** arbitrary mutation/reentry SHALL require an accepted Engine contract

#### Scenario: User-initiated turn does not create command authority

- **WHEN** a user sends a normal message during a non-HITL phase including Final
- **THEN** the Agent SHALL answer or state the smallest boundary without expanding permission or hand-editing authority
- **AND** bounded Final presentation feedback MAY use only the accepted publication path while node/status remain Final

#### Scenario: Human decision returns execution to the Agent

- **WHEN** a required semantic decision/correction is explicit at an accepted placement, host permission allows it, and a legal Engine path exists
- **THEN** the Agent SHALL execute the remaining mechanics
- **AND** only a host-required non-delegable action SHALL return to the human

#### Scenario: Post-final rerun decision returns the complete mechanical chain

- **WHEN** the Agent classifies an explicit Final request as evidence-expanding and host permission allows C5
- **THEN** the Agent SHALL execute request preparation, inspect/apply/recover, entry, status sync, reentry/topic-state checks, and normal rerun
- **AND** it SHALL not ask the user to run commands or repeat the same decision

#### Scenario: Human direction does not create authority by itself

- **WHEN** a human requests mutation/reentry without an accepted Engine path or sufficient permission
- **THEN** the Agent SHALL explain the missing boundary and SHALL not hand-write state or bypass the verdict

#### Scenario: Request metadata is not an identity token

- **WHEN** a post-final request contains reason, scope, or decision-source metadata
- **THEN** docs SHALL describe it as semantic/audit input and concurrency binding
- **AND** it SHALL not be claimed as caller identity or expanded permission

#### Scenario: Exhausted rerun limit escalates one new decision

- **WHEN** shared availability proves the required next increment unavailable
- **THEN** HITL2 or current Final interaction SHALL ask only whether to start a new bundle for that research scope
- **AND** guidance MAY inspect but SHALL not apply C5, reset state, or ask the human to run commands
- **AND** unsupported evaluator facts SHALL remain their concrete contract boundary

#### Scenario: Operator wording is not a co-runner audience

- **WHEN** static validation scans Agent-facing command docs
- **THEN** unqualified `Agent/operator` command-audience wording SHALL fail
- **AND** operator inspection wording SHALL be allowed only for post-run or diagnostic activity

### Requirement: Entry docs distinguish trigger from command execution

The Harness entry docs SHALL distinguish the human's one-time trigger action from the subsequent Agent-run command execution.

Before that trigger, root entry documentation SHALL expose a human-facing setup path that covers the existing Node/npm installation baseline, Coding Agent permission preparation for supported Claude Code and Codex surfaces, configuration verification, and the DEEP_RESEARCH_HARNESS trigger. Permission preparation SHALL be framed as a pre-pipeline human decision with explicit risk and opt-in boundaries, not as a command that the Agent can grant to itself.

Human-facing permission setup SHALL remain outside `DEEP_RESEARCH_HARNESS/command_playbook/`. Agent-facing `RUN.md` MAY name the setup prerequisite and its location, but after `RUN.md` selects the DEEP_RESEARCH_HARNESS entry path it SHALL NOT ask the human to become a permission or command co-runner during a non-HITL lifecycle phase.

The setup path SHALL distinguish reviewed/interactive posture from explicitly opted-in autonomous research posture. It SHALL NOT copy ignored local permission history into a committed allowlist, silently expand committed project configuration, represent unrestricted/full-access permissions as risk-free defaults, or imply that `dry-submit` or a nonexistent gate `--non-interactive` flag grants host permissions.

Dragging or pasting `RUN.md` into a conversation SHALL be framed as selecting the DEEP_RESEARCH_HARNESS entry path and handing control to the Agent. It SHALL NOT imply that a human remains present to choose commands, run commands, answer mid-pipeline confirmations, receive progress updates, or decide whether partial output is enough.

Any pre-pipeline clarification outside HITL1/HITL2 SHALL be explicitly labeled as a pre-pipeline routing exception and SHALL NOT appear inside `stop: no` lifecycle phase instructions. If the entry path has already been selected by reading `RUN.md`, the default instruction SHALL be to proceed with the Harness, not to ask whether to use it.

Bundle naming instructions SHALL frame naming as an Agent-derived or already-supplied command input. They SHALL NOT imply that the user must provide a bundle name during autonomous execution.

#### Scenario: Human setup is discoverable before the trigger

- **WHEN** a human reads the root entry documentation before selecting DEEP_RESEARCH_HARNESS
- **THEN** the documentation SHALL provide a discoverable setup path for installation and Coding Agent permissions
- **AND** it SHALL distinguish reviewed approval posture from any explicitly opted-in autonomous research posture
- **AND** it SHALL direct the human to complete and verify permission setup before the Harness trigger
- **AND** it SHALL name the risk/opt-in boundary instead of promising prompt-free execution under every host or organization policy

#### Scenario: Permission setup does not create a human pipeline co-runner

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` after entry selection
- **THEN** any permission prerequisite SHALL be described as pre-trigger setup
- **AND** the Agent SHALL NOT ask the human to approve ordinary lifecycle commands or reconfigure the host during non-HITL `stop: no` execution
- **AND** human-facing permission instructions SHALL NOT be placed in `DEEP_RESEARCH_HARNESS/command_playbook/`

#### Scenario: Permission preflight does not overclaim validation tools

- **WHEN** a human reads the setup path before the trigger
- **THEN** `dry-submit` MAY be documented only as a work-unit submit contract preflight
- **AND** the docs SHALL NOT describe `dry-submit` as validating network, shell, file-write, approval-policy, or host permission readiness
- **AND** the docs SHALL NOT claim that a gate `--non-interactive` flag exists

#### Scenario: Drag trigger hands control to the Agent

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/RUN.md` or `DEEP_RESEARCH_HARNESS/README.md`
- **THEN** drag-trigger wording SHALL identify the action as selecting the DEEP_RESEARCH_HARNESS entry path
- **AND** subsequent command execution SHALL be assigned to the Agent
- **AND** the docs SHALL NOT imply mid-pipeline human command execution

#### Scenario: Pre-pipeline question is explicit or absent

- **WHEN** static validation scans `DEEP_RESEARCH_HARNESS/RUN.md`
- **THEN** any instruction to ask the user before starting SHALL be either absent after DEEP_RESEARCH_HARNESS entry selection or explicitly labeled as pre-pipeline routing outside the autonomous lifecycle
- **AND** it SHALL NOT weaken the HITL1/HITL2-only interactive in-run boundary

#### Scenario: Bundle name is not a mid-pipeline user dependency

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md`
- **THEN** naming instructions SHALL describe an Agent-derived or already-provided `<name>` input
- **AND** they SHALL NOT require the user to provide a bundle name during autonomous execution

### Requirement: Command-surface wording drift is statically validated

The project SHALL include regression coverage or a static validator that checks Agent-facing command surfaces for the command audience and HITL-boundary contract.

The validator SHALL scan at least:

- `DEEP_RESEARCH_HARNESS/COMMANDS.md`
- `DEEP_RESEARCH_HARNESS/RUN.md`
- `DEEP_RESEARCH_HARNESS/README.md`
- `DEEP_RESEARCH_HARNESS/cli/README.md`
- `DEEP_RESEARCH_HARNESS/command_playbook/*.md`
- lifecycle and shared workflow Markdown touched by this change

For `DEEP_RESEARCH_HARNESS/COMMANDS.md`, it SHALL keep the existing audience/HITL/Final/trigger markers and add only three stable helper-oriented marker groups:

- ordinary authorized command execution and reversible mechanical repair remain Agent-owned;
- human-directed identifies the decision source without transferring the command-runner role or creating host permission/Engine capability; and
- in-run HITL decisions are distinct from out-of-band maintenance/debug collaboration and from any accepted mutation/reentry capability.

Across all scanned surfaces, the validator SHALL continue to reject known drift phrases unless allowlisted with an explicit diagnostic/post-run meaning. The positive-marker contract SHALL NOT require every command playbook to repeat the top-level audience statement or encode every ACS-001 sentence as an exact substring assertion.

Allowlist entries SHALL be explicit and reviewable: file or glob, phrase class, allowed context, and reason. Operator wording MAY be allowlisted only for post-run diagnostics, maintenance, or out-of-band review, never for command co-runner audience during autonomous lifecycle execution.

The validator SHALL reuse the existing command-contract documentation regression surface, remain deterministic, and use Node.js built-ins only. It SHALL NOT add a prose-quality classifier or attempt to judge wording beyond the defined phrase classes and required stable markers.

The command-index regression SHALL additionally verify command-index completeness and copyability for the surfaces this change touches:

- `persist-final-report` SHALL appear in `COMMANDS.md` as an Agent-facing operation of `operate-artifact-persistence.mjs`;
- an executable command string presented in prose or in a command playbook copy context SHALL carry the full executable prefix `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs <verb> ...` so a copied command string executes without reconstruction; and
- the compact operation tables in `COMMANDS.md` MAY keep their bare non-help form when the same table row names the exact `cli/` file coordinate for the operation, because the coordinate is resolvable from the row.

The regression SHALL be deterministic, name the missing or non-copyable entry, and SHALL NOT invent requirements for commands that are not Agent-facing operation surfaces.

#### Scenario: Static validation catches implicit human presence

- **WHEN** an Agent-facing command doc says a user/operator should run a pipeline command or decide whether to continue during a non-HITL phase
- **THEN** the static validation SHALL fail
- **AND** the failure SHALL name the file and phrase class

#### Scenario: Static validation requires a small stable helper contract

- **WHEN** `DEEP_RESEARCH_HARNESS/COMMANDS.md` omits one of the three helper-oriented marker groups
- **THEN** the existing command-contract documentation regression SHALL fail
- **AND** the failure SHALL name the missing stable marker
- **AND** individual command playbooks SHALL NOT be required to duplicate the full top-level audience statement
- **AND** the regression SHALL NOT grow a phrase class or exact marker for every normative sentence in ACS-001

#### Scenario: Static validation accepts diagnostic operator inspection

- **WHEN** a framework doc mentions operator inspection as post-run or diagnostic review
- **THEN** static validation SHALL NOT fail solely for that phrase
- **AND** the wording SHALL NOT describe the operator as a command co-runner during the autonomous pipeline

#### Scenario: Implemented command is missing from the index

- **WHEN** `persist-final-report` is absent from `COMMANDS.md` even though it is implemented and required by an accepted spec
- **THEN** the command-index regression SHALL fail
- **AND** the failure SHALL name the missing command

#### Scenario: Prose command string is not directly executable

- **WHEN** `COMMANDS.md` prose or a command playbook presents an executable command string without the full `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs` prefix
- **THEN** the command-index regression SHALL fail
- **AND** the failure SHALL name the entry and its expected prefix

### Requirement: Phase-boundary terminology is discoverable

Guidance and Agent-facing docs SHALL make the conceptual distinction between
phase transition, phase handoff, work completion, and witnessing discoverable
without renaming existing machine-level fields, trace events, or CLI names.

The terminology canon SHALL define:

- `phase transition`: synchronization of runtime status such as
  `rb_status.json` current/next gate state;
- `phase handoff`: the Phase Agent consuming gate CLI `check.next` through the
  accepted loader/check path and entering the next Markdown control surface;
- `work completion`: target-phase artifacts and gate/content rules proving the
  target phase's work is done; and
- `witnessing`: Engine-written evidence that binds a deterministic gate output
  to the subsequent handoff, such as the ordered
  `gate_attempt(passed=true,next=<target>)` and route-bound
  `load_complete(entry=<target>)` pair; and
- `current_node`: when non-null, the durable `rb_status.json` coordinate for
  the lifecycle Markdown control surface most recently loaded by successful
  route-bound `enter-phase`.

The docs SHALL state that `enter-phase` / `load_complete` proves entry into the
target node, not target-phase work completion. Existing machine names such as
`phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `stop:
no`, and capability names SHALL remain stable unless a separate migration
changes them.

Agent-facing resume guidance, including command playbooks for an already-existing
current run bundle, SHALL prefer non-null `rb_status.json.current_node` as the
phase Markdown coordinate. It SHALL NOT tell the Agent to infer the active
phase from `current_gate` alone. If `current_node` is `null` or absent, guidance
SHALL direct the Agent to existing `BUNDLE_MAP.md`, trace, and reentry
diagnostics rather than guessing the phase from the gate window. This diagnostic
guidance applies only after the current-entry pair has been admitted; a root
without the pair fails earlier at the unsupported-current-entry-contract
boundary, and `START_FROM_HERE.md` SHALL NOT be named as a fallback.

#### Scenario: Terminology canon names the boundary layers

- **WHEN** an Agent or maintainer reads the guidance glossary or execution-model
  terminology canon
- **THEN** it SHALL distinguish phase transition, phase handoff, work
  completion, and witnessing
- **AND** it SHALL preserve existing machine-level names as stable
  implementation vocabulary

#### Scenario: Command docs do not overclaim handoff witness

- **WHEN** command docs describe `enter-phase`
- **THEN** they SHALL describe it as consuming `check.next` and witnessing
  entry/loading of the next control surface
- **AND** they SHALL NOT describe it as completing the target phase's work

#### Scenario: Existing current run bundle guidance uses current node

- **WHEN** an Agent-facing command playbook describes resuming an already-existing
  bundle that has passed current-entry admission
- **THEN** it SHALL tell the Agent to use non-null `rb_status.json.current_node`
  as the preferred phase Markdown coordinate
- **AND** it SHALL distinguish `current_node` from `current_gate` and `next_gate`
- **AND** it SHALL NOT tell the Agent to judge the current phase from
  `current_gate` alone

#### Scenario: Missing current node falls back to diagnostics

- **WHEN** a current-pair bundle has `rb_status.json.current_node: null` or no
  `current_node`
- **THEN** resume guidance SHALL direct the Agent to existing `BUNDLE_MAP.md`,
  trace, and reentry diagnostics
- **AND** it SHALL NOT guess the phase from `current_gate` alone
- **AND** it SHALL NOT name `START_FROM_HERE.md` as a legacy fallback

### Requirement: Bundle continuation enters through BUNDLE_ENTRY.md, delegates to BUNDLE_MAP.md and COMMANDS.md

The Harness SHALL provide one canonical Agent-facing playbook for continuing an
already existing run bundle: `command_playbook/continue-run-bundle.md`.
`BUNDLE_ENTRY.md`, `COMMANDS.md`, and relevant entry guidance SHALL point to
that playbook.

The playbook's procedure SHALL be: accept the supplied bundle root; resolve it
to the current run bundle root's canonical absolute path; verify that the same
root contains both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`; read
`BUNDLE_ENTRY.md`; resolve the Harness relative path from that entry (if not
reachable, report the boundary and stop); read `BUNDLE_MAP.md` for the full
directory layout; read `DEEP_RESEARCH_HARNESS/COMMANDS.md`; and select and
execute the command matching the user's stated intent.

A supplied directory missing either member of that pair SHALL stop at the
unsupported-current-entry-contract boundary. The playbook SHALL NOT read
`RUN_BUNDLE.md`, `START_FROM_HERE.md`, or a map-only root as an operational
entry, fall back to `RUN.md`, create a new bundle, select another bundle, or
offer migration, upgrade, compatibility, or a human-only Harness inspection
route. A human may directly read historical Markdown outside this operational
contract.

The playbook SHALL NOT duplicate lifecycle branching logic, reentry diagnostic
procedures, or per-node target selection. Those decisions belong to
`COMMANDS.md` and the individual CLI tools it references. The playbook only
bridges the user-supplied current run bundle root through the verified pair to
the command surface. It SHALL NOT scan for a bundle, infer one from chat or
chronology, or turn either entry file into runtime authority.

#### Scenario: Agent enters through BUNDLE_ENTRY.md

- **WHEN** a user provides a bundle containing both `BUNDLE_ENTRY.md` and
  `BUNDLE_MAP.md` and states an intent
- **THEN** the Agent SHALL read `BUNDLE_ENTRY.md`, resolve the current run
  bundle root and Harness path, read `BUNDLE_MAP.md` for layout, read
  `COMMANDS.md` for operations, and execute the matching command
- **AND** it SHALL NOT start a new research bundle

#### Scenario: Legacy bundle entry still works

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy route.

- **WHEN** a user provides a directory missing `BUNDLE_ENTRY.md` or
  `BUNDLE_MAP.md`, including a directory containing only `RUN_BUNDLE.md`, only
  `START_FROM_HERE.md`, or only `BUNDLE_MAP.md`
- **THEN** the Agent SHALL report the unsupported current-entry contract and
  stop before reading `COMMANDS.md` or executing a bundle command
- **AND** it SHALL NOT fall back to a legacy entry, `RUN.md`, new-bundle
  creation, migration, or another selected bundle

#### Scenario: Continuation request preserves existing decision boundaries

- **WHEN** a user asks in ordinary language to continue, inspect, supplement,
  or question an existing bundle that passes the current-entry preflight
- **THEN** the Agent SHALL classify the request against the current bundle's
  verified lifecycle facts and existing legal routes from `COMMANDS.md`
- **AND** the playbook SHALL NOT make the request a third HITL, permission
  token, or automatic rerun
