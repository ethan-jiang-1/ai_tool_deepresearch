> req: ACS-001

## MODIFIED Requirements

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
