> req: CPT-003

## MODIFIED Requirements

### Requirement: Enter phase CLI witnesses lifecycle node entry (CPT-003)

After valid static invocation and latest trace-durable clean/degraded handoff
authorization, `enter-phase` SHALL preflight the selected target's action-core
configuration before it calls `assessNode()`. Only then SHALL it load the target
dependency closure through `assessNode()`, write route-bound `load_complete`,
and update `rb_status.json#/current_node` without mutating gate windows.

Before the first route-bound `load_complete` for an authorized
`phases/phase-final.md` handoff, `enter-phase` SHALL also establish the
pre-publication Final inventory baseline after action-core preflight and before
`assessNode()` or any entry mutation. For the bundle's first legal Final entry,
with no earlier route-bound legal Final load, the shared canonical primary-series
resolver SHALL return one valid empty primary inventory. A modern base, a
canonical revision, a legacy-primary candidate, or an invalid/ambiguous primary
classification SHALL block the entry; the command SHALL not infer creation order
from filename, mtime, directory order, report content, or chat.

For a later Readiness-to-Final handoff descended from one accepted
`post_final_reentry` lineage, the shared handoff evaluation SHALL return that
unique retired C5 event as the entry witness. Before writing the new Final load,
the current deterministic sorted inventory of safe regular files under `final/`
SHALL reproduce `previous_final.final_inventory_sha256` exactly. A premature
canonical append, supplementary-file drift, unsafe entry, unreadable inventory,
ambiguous primary classification, missing retired witness, or conflicting
descendant lineage SHALL reject the entry without `load_complete` or
`current_node` mutation. This admission establishes only the inventory baseline
at Final entry; publication after entry and later immutable-prefix proof remain
separate facts.

If an earlier route-bound legal Final load exists but the new authorized Final
handoff cannot be bound to exactly one accepted C5 descendant lineage, entry
SHALL block as unsupported lineage. It SHALL not reuse the first-entry empty rule,
select an older C5 event by recency guess, or treat an existing report as delivery
for the new handoff.

The Final inventory admission SHALL apply only before the first bound load for
the authorized handoff. An exact retry after that load already exists SHALL use
the established route-bound witness and existing partial-entry behavior rather
than reinterpret a report published after the load as premature. The readability guarantee SHALL cover Final loads bound by the four-field handoff
binding (`handoff_source_attempt_index` / `gate` / `node` / `target_node`) introduced by
commit `0edb58310` (harden-phase-handoff-witnessing) and later. A pre-`0edb58310`
Final load carrying only the legacy three fields (`entry`, `plan`, `ts`) is outside this
guarantee: such a bundle SHALL report the honest migration boundary rather than
fabricate a historical baseline, pretend compatibility, or require a replacement
load.

`enter-phase --help` and `-h` SHALL return static invocation help with exit
code `0` and no bundle, trace, status, or loader side effect. Its only non-help
form is exactly one `--bundle <bundle-path>` and one `--node <file-ref>`, with
optional one `--full`, no positional arguments, and no other option. Missing,
unknown, duplicate, mixed-help, absent-value, or invalid target invocation
shape SHALL return one direct code-`2` invocation/configuration result before
the command reads runtime truth or appends `load_complete`. A valid entry
remains the existing side-effecting witness operation; these help and rejection
forms do not weaken its lifecycle checks.

The accepted handoff vocabulary SHALL contain exactly two Engine-written classes:

- the existing latest legal passed `gate_attempt` with non-null `next`; and
- one `post_final_reentry` event produced by the accepted post-final recovery operation, whose closed action is `post_final_rerun`, whose recorded HITL2 decision outcome is `rerun`, and whose target/window are resolved through the existing transition table and manifest helpers.

Handoff selection SHALL compare structurally valid authorities from both classes in append-only trace order rather than let a C5-specific selector compete with the existing gate selector. A valid post-final event becomes the latest handoff only after its Final lineage and route resolution pass; a later valid normal gate handoff or newer valid post-final lineage supersedes it for future entry. Failed gate attempts, arbitrary events and partial lookalikes SHALL NOT become a newer handoff authority merely because they appear later.

The exceptional event SHALL bind its request digest, operation id, previous readiness->Final handoff/load lineage, expected profile/terminal-status/final-inventory facts, transition-table resolution and derived target status window. One structural parser SHALL produce immutable event facts; closed stage predicates SHALL add the mutable checks needed by entry, status sync and completed rerun preflight. Before phase entry it SHALL be accepted only when those facts remain current, no accepted C5 workspace remains, re-resolving HITL2 outcome `rerun` produces the recorded target/window, the event is not superseded, `rb_profile.yaml` matches the committed recovery profile, and `rb_status.json` remains the terminal Final window. After a route-bound rerun `load_complete` exists, `advance-status` SHALL validate the immutable event and that exact load witness before writing the derived `hitl2_recorded -> rerun_ready` window. Downstream consumers SHALL then require event+load+phase_transition+current rerun window without reapplying the terminal pre-entry predicate. Arbitrary trace text, C5-local/caller-supplied target nodes, `human-directed` flags and hand-written gate attempts SHALL NOT become handoff authority.

Successful stdout SHALL remain Agent-readable Markdown with stable markers and
no mixed JSON status envelope. By default, it SHALL be a bounded entry
presentation in this order: one generated continuation block derived from the
target node frontmatter; the exact existing source-gate status synchronization
command now required before target work; the target phase's `## 0. Execution
Brief` action core; and the ordered shared-file manifest. That manifest SHALL
contain only the successful load plan's dependency refs, in load order, with the
target node excluded and no concatenated Markdown bytes. The default SHALL NOT
concatenate the complete shared dependency closure. The explicit `--full` form
SHALL retain the complete original loaded Markdown closure, including the target
node, for an Agent that needs reference detail, while preserving the same
visible continuation and source-gate synchronization information. Neither form
SHALL invoke `advance-status`, choose a route, or merge the two lifecycle
writers.

The generated continuation block SHALL contain:

- non-terminal stop:no: `interaction: do_not_initiate`; execute the loaded node now without initiating a user-facing pause;
- stop:yes: `interaction: required`; follow the loaded HITL prompt;
- Final: `interaction: terminal_delivery`; deliver final artifacts only.

The generated block SHALL be a feedback projection, not a new authority
surface, and SHALL not duplicate the full silent-execution contract.
`do_not_initiate` SHALL not prohibit answering an already received
user-initiated normal conversation turn, and the Engine SHALL not read chat
state to produce the token. The block SHALL be the first default stdout content
and use stable markers with short key/value lines; `--full` SHALL keep it
visible before the expanded dependency closure:

```markdown
<!-- DPT_CONTINUATION_CUE_START -->
interaction: do_not_initiate
next_action: execute_loaded_node
node_ref: phases/phase-wave1.md
<!-- DPT_CONTINUATION_CUE_END -->
```

For a post-final recovery handoff, route-bound `load_complete` SHALL reference the recovery event identity and lineage rather than pretending a HITL2 gate attempt occurred. Its additive binding fields SHALL be `handoff_source_kind: post_final_reentry`, `handoff_source_event_id`, `handoff_source_event_index`, `handoff_source_event_sha256`, `handoff_source_operation_id`, and the existing `handoff_target_node`. Existing source-gate handoff behavior SHALL remain unchanged.

The action-core preflight is a read-only framework configuration check over the
target Markdown's `## 0. Execution Brief` through the next H2. A missing or
ambiguous boundary SHALL return a structured configuration result with exit `2`
before `assessNode()` runs; it SHALL not append `load_complete`, mutate
`current_node`, emit a workflow/trace/receipt event, or synthesize a replacement
action core. The preflight SHALL read only the selected framework target source;
it SHALL not invoke the workflow loader or resolve the target dependency
closure.

#### Scenario: First Final entry requires an empty primary baseline

- **WHEN** the latest legal handoff authorizes the bundle's first entry to `phases/phase-final.md` and no route-bound legal Final load exists
- **THEN** `enter-phase` SHALL require the shared primary-series resolver to return a valid empty inventory before `assessNode()` or entry mutation
- **AND** any existing modern, revision, legacy-primary, invalid, or ambiguous primary inventory SHALL reject without guessing creation order

#### Scenario: Post-final return requires the event-bound prior inventory

- **WHEN** accepted C5 descendants reach a newer legal Readiness-to-Final handoff with no route-bound Final load for that handoff
- **THEN** `enter-phase` SHALL require current safe sorted Final inventory to reproduce the unique retired event's `previous_final.final_inventory_sha256` exactly
- **AND** any premature append, supplementary drift, unsafe inventory, missing witness, or conflicting lineage SHALL reject before `load_complete` or `current_node` mutation

#### Scenario: Existing bound Final entry remains compatible

- **WHEN** the authorized Final handoff already has its route-bound `load_complete`, including an already-entered post-`0edb58310` bundle or a partial current-node write retry
- **THEN** the new inventory admission SHALL not retroactively reject that established entry or fabricate a historical baseline
- **AND** existing compatibility, audit, and partial-entry recovery contracts SHALL remain responsible for subsequent interpretation

#### Scenario: Later Final handoff without accepted C5 provenance is rejected

- **WHEN** an earlier legal Final load exists and a different authorized Final handoff has no unique accepted C5 descendant provenance
- **THEN** `enter-phase` SHALL reject before workflow dependency loading, `load_complete`, or `current_node` mutation
- **AND** it SHALL not reuse first-entry admission or choose an older event by timestamp, filename, or append order

#### Scenario: Enter phase accepts degraded source pass

- **WHEN** the latest deterministic source gate has a valid degraded pass and matching next node
- **THEN** enter-phase SHALL accept the same route-binding conditions as a clean pass
- **AND** degraded context SHALL remain in `load_complete`

#### Scenario: Post-final recovery enters the existing rerun node

- **WHEN** the latest legal handoff is a valid non-superseded `post_final_reentry` event bound to the current Final lineage and target status/profile bytes
- **AND** the Agent invokes `enter-phase --node phases/phase-rerun.md`
- **THEN** enter-phase SHALL load the existing rerun dependency closure and append a route-bound `load_complete` referencing the recovery operation/event
- **AND** it SHALL NOT write or claim a synthetic `gate_attempt`

#### Scenario: Forged exceptional event is rejected

- **WHEN** a `post_final_reentry` trace object has an unsupported action/target, wrong Final lineage, mismatched current profile/status bytes, missing operation binding or stale supersession
- **THEN** enter-phase SHALL reject the target without `load_complete` or `current_node` mutation
- **AND** one direct inspect/advice item SHALL identify the failed binding

#### Scenario: Accepted workspace must be cleaned before entry

- **WHEN** the exact recovery event exists but its accepted C5 workspace still remains after cleanup interruption
- **THEN** enter-phase SHALL reject without another load or current-node mutation
- **AND** its only advice SHALL be the exact post-final recovery command for that operation

#### Scenario: Legal entry exposes existing status synchronization

- **WHEN** enter-phase has consumed a valid recovery event and written its route-bound rerun load while updating `current_node` to `phases/phase-rerun.md`
- **THEN** the event/load lineage SHALL authorize only existing `advance-status --to hitl2_recorded` as the next status action
- **AND** downstream topic-state/reentry SHALL remain blocked until the derived rerun window and phase_transition exist

#### Scenario: stop:no rendered output ends with continuation cue

> **Scenario identity note:** This historical heading is retained for OpenSpec
> archive identity. The current behavior deliberately requires the cue to begin
> default stdout, not end it.

- **WHEN** enter-phase loads `phases/phase-wave1.md`
- **THEN** default stdout SHALL begin with the generated block stating
  `interaction: do_not_initiate` and direct execution of Wave1
- **AND** it SHALL then expose the source-gate status synchronization, action
  core, and shared-file manifest without the full dependency closure
- **AND** the block SHALL NOT create a chat-interception or permission contract

#### Scenario: stop:yes rendered output ends with interaction cue

> **Scenario identity note:** This historical heading is retained for OpenSpec
> archive identity. The current behavior deliberately requires the cue to begin
> default stdout, not end it.

- **WHEN** enter-phase loads HITL2
- **THEN** the leading generated block SHALL state that user interaction is required

#### Scenario: Enter phase rejects unauthorized or stale route

- **WHEN** the target node is not authorized by the latest deterministic source-gate or accepted post-final recovery handoff
- **THEN** enter-phase SHALL exit non-zero
- **AND** it SHALL not append a successful continuation block, `load_complete`, or current-node update

#### Scenario: Current node write failure is partial entry failure

- **WHEN** loading succeeded but updating `current_node` fails
- **THEN** stdout SHALL be diagnostic JSON rather than successful Markdown
- **AND** a later audit SHALL treat the existing load with terminal Final `current_node` as incomplete entry and recommend the same `enter-phase` retry, not `advance-status`

#### Scenario: Default entry keeps action and status synchronization visible

- **WHEN** `enter-phase` legally enters `phases/phase-wave1.md`
- **THEN** default stdout SHALL place the continuation cue and exact
  `advance-status --to wave0_complete` command before the Wave1 action core
- **AND** it SHALL list only the load-ordered dependency refs other than the
  target node, without concatenating their full contents
- **AND** `load_complete` and `current_node` behavior SHALL remain the existing
  entry witness behavior

#### Scenario: Full entry retains reference closure explicitly

- **WHEN** a caller invokes a legal `enter-phase` entry with `--full`
- **THEN** stdout SHALL include the complete loaded dependency closure, including
  the target node, in addition to the bounded entry information
- **AND** the command SHALL not run `advance-status` or create a second
  lifecycle transition

#### Scenario: Help and invalid invocation do not create an entry witness

- **WHEN** `enter-phase` receives `--help`, `-h`, or an invalid invocation
  before a valid bundle/node pair is supplied
- **THEN** help SHALL exit `0` and invalid invocation SHALL exit `2`
- **AND** neither path SHALL read a bundle, append `load_complete`, or mutate
  `rb_status.json#/current_node`

#### Scenario: Action-core configuration failure does not create an entry witness

- **WHEN** a validly authorized target lacks one unambiguous `## 0. Execution
  Brief` block through the next H2
- **THEN** `enter-phase` SHALL return the structured framework-configuration
  result with exit `2` before `assessNode()` runs
- **AND** it SHALL not append `load_complete` or mutate
  `rb_status.json#/current_node`
- **AND** it SHALL not emit a workflow, trace, or receipt event while attempting
  the action-core preflight

