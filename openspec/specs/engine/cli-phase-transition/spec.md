# CLI Phase Transition

> req: CPT-001, CPT-002, CPT-003, CPT-004, CPT-005, CPT-006, CPT-007, CPT-008

## Purpose

Agent-facing CLI tools for phase transition: `advance-status` (advance `current_gate`/`next_gate` using `transitions.chain.json` as truth source) and `log-event --event` (write phase-completion trace events to `rb_trace.jsonl`).
## Requirements
### Requirement: Advance status CLI advances current_gate and next_gate based on chain.json

`advance-status.mjs` SHALL synchronize `rb_status.json` after a lifecycle gate pass using the existing trace-backed source-gate handoff rules and transition table. When the normal witnessed readiness handoff targets terminal Final and therefore derives `current_gate: readiness_passed` and `next_gate: none`, the same status-write/trace-append transaction SHALL set `state: completed`. Non-terminal status synchronization and the accepted post-final `hitl2_recorded -> rerun_ready` exception SHALL preserve their existing state semantics.

For covered trace-backed handoffs, before mutating `rb_status.json` or appending `phase_transition`, the CLI SHALL verify that the route-bound handoff target matches the already loaded `rb_status.json#/current_node` and that the loaded node frontmatter is readable. On success, in addition to `status`, `current_gate`, and `next_gate`, the CLI SHALL return a small `continuation` object derived directly from that loaded current-node frontmatter:

- non-terminal `stop: no`: `interaction: do_not_initiate`, `next_action: execute_loaded_node`;
- `stop: yes`: `interaction: required`, `next_action: wait_for_user_in_loaded_node`;
- terminal Final: `interaction: terminal_delivery`, `next_action: deliver_final_artifacts`.

For this projection, `do_not_initiate` SHALL mean that the Agent/framework does not initiate user-facing surfacing while executing the loaded autonomous node. It SHALL NOT mean that an already received user-initiated normal conversation turn must be ignored, and it SHALL NOT make the CLI responsible for reading or classifying chat state.

The JSON `continuation` object SHALL be top-level, contain required `interaction` and `next_action` fields and a direct `node_ref` locator. It MAY include the synchronized source gate as `gate`, but SHALL NOT be nested inside status fields and SHALL NOT include confidence, policy decisions, retry trees, context estimates, alternate route choices, chat state, or pause state.

The cue SHALL NOT choose a node, execute Markdown, mutate additional state, prove target-phase completion, create interaction permission, or create a lifecycle checkpoint. If a covered handoff's `current_node` is missing, mismatched with the witnessed target, or has unreadable frontmatter, the CLI SHALL fail closed before mutation rather than guess.

For explicit bootstrap compatibility source sync where existing rules do not require a route-bound handoff, the CLI SHALL preserve current status synchronization behavior. It SHALL emit a loaded-node continuation cue only if `rb_status.json#/current_node` is non-null, matches the computed target node, and has readable frontmatter; otherwise it SHALL omit `continuation`, MAY include an explicit `continuation_diagnostic`, and SHALL NOT infer loaded-node execution from manifest/chain lookup alone.

#### Scenario: Advance into Wave1 returns execute cue

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed and `advance-status --to wave0_complete` succeeds
- **THEN** status SHALL synchronize normally
- **AND** stdout SHALL state `interaction: do_not_initiate` and Wave1 as the loaded node to execute
- **AND** stdout SHALL NOT create a user-interaction or pause authority

#### Scenario: Covered handoff with mismatched current_node fails before mutation

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed
- **AND** `rb_status.json#/current_node` is missing or names another node
- **WHEN** `advance-status --to wave0_complete` is called
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or append `phase_transition`

#### Scenario: Advance into HITL2 returns user-interaction cue

- **WHEN** Wave2 handoff to `phases/phase-hitl2.md` is witnessed and status sync succeeds
- **THEN** continuation SHALL state `interaction: required`
- **AND** it SHALL direct the Agent to the loaded HITL2 user loop

#### Scenario: Bootstrap compatibility does not guess loaded-node cue

- **WHEN** a bootstrap-compatible source sync succeeds without a covered route-bound handoff
- **AND** `rb_status.json#/current_node` is null or does not match the computed target node
- **THEN** status MAY synchronize according to the existing compatibility path
- **AND** stdout SHALL NOT claim that the target node is loaded or executable

#### Scenario: Readiness status sync commits the terminal triple and returns delivery cue

- **WHEN** readiness handoff to `phases/phase-final.md` is witnessed, Final has been loaded, and `advance-status --to readiness_passed` succeeds
- **THEN** status SHALL synchronize with `current_gate: readiness_passed`, `next_gate: none`, and `state: completed`
- **AND** continuation SHALL state `interaction: terminal_delivery` and `next_action: deliver_final_artifacts`

#### Scenario: Terminal trace failure restores the previous lifecycle state

- **WHEN** the witnessed readiness handoff reaches the status write but `phase_transition` trace append fails
- **THEN** `rb_status.json` SHALL equal its pre-command bytes, including its prior `state`, `current_gate`, and `next_gate`
- **AND** no `phase_transition` event SHALL be appended

#### Scenario: Post-final recovery does not rewrite terminal completion semantics

- **WHEN** an accepted post-final recovery uses the existing `advance-status --to hitl2_recorded` exception after its route-bound rerun load
- **THEN** it SHALL retain the existing derived `hitl2_recorded -> rerun_ready` window and its existing lifecycle state semantics
- **AND** it SHALL NOT be treated as another normal readiness-to-Final completion transition

#### Scenario: Unknown gate still fails without mutation

- **WHEN** an unknown gate is passed to `advance-status`
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or trace

### Requirement: Log event CLI supports phase-completion trace events

The existing `log-event.mjs` CLI SHALL be extended with a `--event` parameter for writing trace events to `rb_trace.jsonl`.

- When `--event` is provided, the CLI SHALL write to `rb_trace.jsonl` (not `_logs/run.log`).
- The JSONL line SHALL contain `ts` (ISO8601), `bundle` (read from `rb_status.json`), `event` (value of `--event`), and optionally `detail` (parsed from `--detail` JSON).
- When `--event` is NOT provided, the CLI SHALL retain its existing behavior.
- When both `--event` and `--msg`/`--level` are present, `--event` SHALL take precedence.

#### Scenario: Write phase completion trace event

- **WHEN** `log-event.mjs --bundle <bundle> --event seed_topics_completion` is called
- **THEN** a JSONL line with `"event": "seed_topics_completion"` SHALL be appended to `rb_trace.jsonl`
- **AND** `_logs/run.log` SHALL NOT be modified

#### Scenario: Existing behavior preserved when --event is absent

- **WHEN** `log-event.mjs --bundle <bundle> --level info --msg "phase done"` is called
- **THEN** the line SHALL be written to `_logs/run.log` in the existing format
- **AND** `rb_trace.jsonl` SHALL NOT be modified

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
unique retired ReopenResearchPass event as the entry witness. Before writing the new Final load,
the current deterministic sorted inventory of safe regular files under `final/`
SHALL reproduce `previous_final.final_inventory_sha256` exactly. A premature
canonical append, supplementary-file drift, unsafe entry, unreadable inventory,
ambiguous primary classification, missing retired witness, or conflicting
descendant lineage SHALL reject the entry without `load_complete` or
`current_node` mutation. This admission establishes only the inventory baseline
at Final entry; publication after entry and later immutable-prefix proof remain
separate facts.

If an earlier route-bound legal Final load exists but the new authorized Final
handoff cannot be bound to exactly one accepted ReopenResearchPass descendant lineage, entry
SHALL block as unsupported lineage. It SHALL not reuse the first-entry empty rule,
select an older ReopenResearchPass event by recency guess, or treat an existing report as delivery
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

Handoff selection SHALL compare structurally valid authorities from both classes in append-only trace order rather than let a ReopenResearchPass-specific selector compete with the existing gate selector. A valid post-final event becomes the latest handoff only after its Final lineage and route resolution pass; a later valid normal gate handoff or newer valid post-final lineage supersedes it for future entry. Failed gate attempts, arbitrary events and partial lookalikes SHALL NOT become a newer handoff authority merely because they appear later.

The exceptional event SHALL bind its request digest, operation id, previous readiness->Final handoff/load lineage, expected profile/terminal-status/final-inventory facts, transition-table resolution and derived target status window. One structural parser SHALL produce immutable event facts; closed stage predicates SHALL add the mutable checks needed by entry, status sync and completed rerun preflight. Before phase entry it SHALL be accepted only when those facts remain current, no accepted ReopenResearchPass workspace remains, re-resolving HITL2 outcome `rerun` produces the recorded target/window, the event is not superseded, `rb_profile.yaml` matches the committed recovery profile, and `rb_status.json` remains the terminal Final window. After a route-bound rerun `load_complete` exists, `advance-status` SHALL validate the immutable event and that exact load witness before writing the derived `hitl2_recorded -> rerun_ready` window. Downstream consumers SHALL then require event+load+phase_transition+current rerun window without reapplying the terminal pre-entry predicate. Arbitrary trace text, ReopenResearchPass-local/caller-supplied target nodes, `human-directed` flags and hand-written gate attempts SHALL NOT become handoff authority.

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

- **WHEN** accepted ReopenResearchPass descendants reach a newer legal Readiness-to-Final handoff with no route-bound Final load for that handoff
- **THEN** `enter-phase` SHALL require current safe sorted Final inventory to reproduce the unique retired event's `previous_final.final_inventory_sha256` exactly
- **AND** any premature append, supplementary drift, unsafe inventory, missing witness, or conflicting lineage SHALL reject before `load_complete` or `current_node` mutation

#### Scenario: Existing bound Final entry remains compatible

- **WHEN** the authorized Final handoff already has its route-bound `load_complete`, including an already-entered post-`0edb58310` bundle or a partial current-node write retry
- **THEN** the new inventory admission SHALL not retroactively reject that established entry or fabricate a historical baseline
- **AND** existing compatibility, audit, and partial-entry recovery contracts SHALL remain responsible for subsequent interpretation

#### Scenario: Later Final handoff without accepted ReopenResearchPass provenance is rejected

- **WHEN** an earlier legal Final load exists and a different authorized Final handoff has no unique accepted ReopenResearchPass descendant provenance
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

- **WHEN** the exact recovery event exists but its accepted ReopenResearchPass workspace still remains after cleanup interruption
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


### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs (CPT-004)

Source-gate `advance-status` SHALL treat a trace-durable degraded gate pass as a legal deterministic handoff witness only when all normal source-gate, target-node, and route-bound `load_complete` checks pass.

The accepted post-final exception SHALL allow `advance-status --to hitl2_recorded` without a synthetic HITL2 gate attempt only when no accepted ReopenResearchPass workspace remains, a valid `post_final_reentry` event records HITL2 outcome `rerun`, its target/window re-resolve through the existing transition table/manifest, and a later route-bound rerun `load_complete` references that exact event while `current_node` equals the rerun target. The CLI SHALL preserve this exceptional source kind in `phase_transition` diagnostics. No other source gate, action or target SHALL use this exception.

The exceptional `phase_transition` SHALL add `source_handoff_kind: post_final_reentry`, `source_handoff_event_id`, `source_handoff_event_index`, `source_handoff_event_sha256`, `source_handoff_operation_id`, and `source_handoff_load_index`. These exact fields SHALL let audit/reentry distinguish the matching transition from an unrelated or hand-written lookalike without changing the existing normal success fields.

Exceptional status-sync retry SHALL be idempotent only when status is already the exact derived window and no conflicting later transition claims the same synchronization with different event/load/from/to binding. An exact existing bound transition means success without append; no matching transition means append the missing exact transition; a conflicting lookalike means fail closed without another transition.

Successful status synchronization after a degraded or accepted exceptional handoff SHALL establish the normal source-gate status window for the target lifecycle phase. It SHALL preserve degraded/recovery context in diagnostics or trace and SHALL NOT reinterpret either handoff as a gate attempt that did not occur.

`--to <gate>` SHALL normally name the just-passed source gate being synchronized into `rb_status.json`. For the accepted ReopenResearchPass path, `--to hitl2_recorded` SHALL name the existing HITL2 decision checkpoint semantics recorded by the recovery event; it SHALL NOT claim that the HITL2-recorded gate CLI ran post-Final. It SHALL NOT name the next phase's gate.

Before writing `current_gate`, `next_gate`, or `phase_transition`, the CLI SHALL read `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json` and verify one accepted witness class:

- normal: the source gate named by `--to` is the latest passed deterministic `gate_attempt` with non-null `next`, its actual target is legal, and a later route-bound load points to that gate attempt; or
- post-final: `--to` is `hitl2_recorded`, the latest legal handoff is a valid non-superseded `post_final_reentry` whose recorded HITL2 `rerun` outcome resolves to the actual target, and a later route-bound load points to that event.

For both classes the CLI SHALL use the actual/resolved target instead of choosing a default branch, derive the target gate from manifest, require `rb_status.json#/current_node` to equal the loaded target, and reject stale/unbound load witnesses. Existing normal gate-attempt parsing and degraded semantics SHALL remain unchanged.

On failure, the CLI SHALL print JSON with `status: "error"`, a short `reason`, and `advice[]` naming the missing trace condition and the appropriate `enter-phase` or owner remedy. It SHALL exit non-zero and SHALL NOT mutate `rb_status.json` or append `phase_transition`.

The existing success output shape SHALL be preserved.

`advance-status --help` and `-h` SHALL return static help with exit code `0`
and no status/trace side effect. Unknown options, missing required values, and
invalid invocation shape SHALL return a direct code-`2` structured error before
the command reads a bundle or evaluates a handoff. Once a valid invocation
reaches the existing handoff checker, its normal accepted/rejected lifecycle
semantics and code-`0`/`1` outcomes remain unchanged. A rejected witnessed
handoff SHALL continue to name its earliest missing/invalid trace condition and
the exact existing `enter-phase`, Gate, or owner boundary; it SHALL not suggest
manual status editing or invent another route.

The only non-help `advance-status` form SHALL contain exactly one `--bundle
<bundle-path>` and one `--to <source-gate-enum>` pair, with no positional
arguments or other options. A duplicate pair, mixed-help form, or any unlisted
shape is the same side-effect-free code-`2` path; it does not reach bundle,
trace, manifest, or handoff evaluation.

Successful status synchronization SHALL establish a source-gate status window for the next lifecycle phase. After accepted source checkpoint `G` points to target node `N`, `advance-status --to <G enum>` SHALL set:

- `rb_status.json#/current_gate` to the accepted source gate/checkpoint enum;
- `rb_status.json#/next_gate` to the target node's gate enum, or `"none"` when the target node is terminal Final.

Downstream lifecycle gates SHALL NOT require `current_gate` to already equal their own gate enum before they pass. For a non-entry lifecycle node, the active status window before its gate pass is `current_gate == <legal predecessor source gate enum>` and `next_gate == <this node's gate enum>`, derived from `manifest.json` and `transitions.chain.json`. The accepted ReopenResearchPass event reuses the existing HITL2→rerun window and SHALL NOT add a new gate/window enum.

The bootstrap compatibility exception for setup remains narrow and unchanged.

For multi-outcome HITL2, normal status synchronization SHALL remain tied to the actual target emitted into `gate_attempt.next`. Post-final status synchronization SHALL remain tied to the target obtained by re-resolving the event's recorded HITL2 `rerun` outcome. Neither path SHALL infer the target from free-form profile prose or hardcoded outcome preference.

#### Scenario: Advance status preserves degraded handoff context

- **WHEN** `advance-status --bundle <bundle> --to wave0_complete` synchronizes after a route-bound degraded wave0 pass and target-node load
- **THEN** it SHALL write the normal source-gate status window
- **AND** it SHALL NOT clear `rb_status.json.current_node`
- **AND** diagnostics or trace context SHALL preserve that the source handoff was degraded

#### Scenario: Degraded marker alone is insufficient for status sync

- **WHEN** trace contains a degraded-looking event without `passed: true`, without non-null `next`, without route-bound source metadata, or without a matching later `load_complete`
- **THEN** `advance-status` SHALL reject it
- **AND** advice SHALL require rerunning the gate and consuming `check.next` through `enter-phase`

#### Scenario: Advance status rejects source gate that is not the latest handoff

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called
- **AND** the latest accepted handoff is neither the named normal source gate nor an allowed post-final HITL2 exception
- **THEN** the CLI SHALL exit non-zero with `status: "error"`
- **AND** `rb_status.json` SHALL NOT be modified
- **AND** no `phase_transition` event SHALL be appended

#### Scenario: Advance status rejects superseded source pass

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called
- **AND** an older `wave0-complete` pass points to `phases/phase-wave1.md`
- **AND** a newer `wave0-complete` attempt failed or passed with a different `next`
- **THEN** the CLI SHALL exit non-zero with `status: "error"`
- **AND** `rb_status.json` SHALL NOT be modified
- **AND** no `phase_transition` event SHALL be appended

#### Scenario: Advance status rejects missing phase entry witness

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called after the latest passed deterministic handoff is `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **AND** `rb_trace.jsonl` has no `load_complete` for `phases/phase-wave1.md`
- **THEN** the CLI SHALL exit non-zero with advice to run `enter-phase --bundle <bundle> --node phases/phase-wave1.md`
- **AND** `rb_status.json` SHALL NOT be modified

#### Scenario: Advance status rejects unbound phase entry witness

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called after the latest passed deterministic handoff is `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **AND** `rb_trace.jsonl` contains a later `load_complete(entry="phases/phase-wave1.md")` whose binding is missing or points to a different handoff
- **THEN** the CLI SHALL exit non-zero with advice to rerun `enter-phase --bundle <bundle> --node phases/phase-wave1.md`
- **AND** `rb_status.json` SHALL NOT be modified

#### Scenario: Advance status rejects next-gate enum used as source gate

- **WHEN** wave0 has passed and `check.next` is `phases/phase-wave1.md`
- **AND** `advance-status.mjs --bundle <bundle> --to wave1_complete` is called before the wave1 gate has passed
- **THEN** the CLI SHALL exit non-zero because `wave1-complete` is not the accepted source gate being synchronized
- **AND** advice SHALL name `advance-status --bundle <bundle> --to wave0_complete`

#### Scenario: Advance status succeeds after witnessed handoff

- **WHEN** trace contains `gate_attempt(passed=true, gate="wave0-complete", currentNodeRef="phases/phase-wave0.md", next="phases/phase-wave1.md")`
- **AND** a later route-bound `load_complete(entry="phases/phase-wave1.md")` exists in trace
- **AND** `advance-status.mjs --bundle <bundle> --to wave0_complete` is called
- **THEN** `rb_status.json` SHALL be updated using the existing chain lookup behavior
- **AND** stdout SHALL retain `{ "status": "ok", "current_gate": "<value>", "next_gate": "<value>" }`
- **AND** a `phase_transition` trace event SHALL be appended

#### Scenario: Advance status follows actual multi-edge target

- **WHEN** trace contains a passed deterministic handoff from a multi-outcome source node whose `next` is `phases/phase-rerun.md`
- **AND** a later route-bound `load_complete(entry="phases/phase-rerun.md")` exists in trace
- **AND** `advance-status.mjs --bundle <bundle> --to hitl2_recorded` is called for that selected deterministic branch
- **THEN** `advance-status` SHALL validate `phases/phase-rerun.md` as the actual target from trace
- **AND** it SHALL NOT replace the target with the source node's default `passed` transition

#### Scenario: Post-final recovery uses existing status synchronization

- **WHEN** a valid `post_final_reentry` records the HITL2 `rerun` resolution, `enter-phase` writes the route-bound rerun load, and `advance-status --to hitl2_recorded` is called
- **THEN** the CLI SHALL write `current_gate: hitl2_recorded`, `next_gate: rerun_ready` and preserve `current_node: phases/phase-rerun.md`
- **AND** SHALL append one normal `phase_transition` carrying exceptional handoff context
- **AND** SHALL NOT require or fabricate a post-Final HITL2 gate attempt

#### Scenario: Partial exceptional status sync completes idempotently

- **WHEN** the exact exceptional handoff/load are valid, status already equals the derived rerun window after a prior status write, and the matching bound `phase_transition` is absent
- **THEN** repeating `advance-status --to hitl2_recorded` SHALL append the missing bound transition without changing the already-correct status window
- **AND** SHALL NOT append a duplicate transition when the exact bound transition already exists

#### Scenario: Conflicting exceptional transition blocks retry

- **WHEN** status already equals the derived rerun window but a later `phase_transition` claims incompatible event id/hash, load index or from/to values for that synchronization
- **THEN** `advance-status --to hitl2_recorded` SHALL fail closed without appending another transition or rewriting status
- **AND** diagnostics SHALL identify the conflicting trace binding as the direct owner boundary

#### Scenario: Status window enables the next lifecycle gate

- **WHEN** wave1 has passed with `check.next: "phases/phase-wave2.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave2.md` has written a later `load_complete(entry="phases/phase-wave2.md")`
- **AND** `advance-status.mjs --bundle <bundle> --to wave1_complete` succeeds
- **THEN** `rb_status.json` SHALL contain `current_gate: "wave1_complete"` and `next_gate: "wave2_complete"`
- **AND** the wave2 gate SHALL treat that pair as the valid active status window for `phases/phase-wave2.md`
- **AND** the wave2 gate SHALL NOT require `current_gate: "wave2_complete"` before wave2 itself passes

#### Scenario: Setup bootstrap status does not replace covered setup handoff

- **WHEN** bootstrap compatibility has established `current_gate: "setup_ready"` and `next_gate: "seed_topics_ready"` before the setup gate passes
- **THEN** that status pair MAY enable the setup gate's own legacy/bootstrap checks
- **BUT** it SHALL NOT authorize seed-topics entry by itself
- **AND** after setup passes, seed-topics entry SHALL still require setup's real `gate_attempt.next`, route-bound `enter-phase` witness, and source-gate `advance-status --to setup_ready`

#### Scenario: Terminal target sets next gate to none after witnessed final entry

- **WHEN** readiness has passed with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-final.md` has written a later `load_complete(entry="phases/phase-final.md")`
- **AND** `advance-status.mjs --bundle <bundle> --to readiness_passed` succeeds
- **THEN** `rb_status.json` SHALL contain `current_gate: "readiness_passed"` and `next_gate: "none"`

#### Scenario: Advance status help and parser rejection are side-effect-free

- **WHEN** `advance-status.mjs --help`, `-h`, or an unknown/missing-option
  invocation is supplied
- **THEN** help SHALL exit `0` and parser/invocation rejection SHALL exit `2`
- **AND** neither path SHALL read or write `rb_status.json` or append
  `phase_transition`

#### Scenario: Missing entry witness names the existing handoff action

- **WHEN** a valid `advance-status --to <source_gate>` invocation reaches a
  missing or stale route-bound entry witness
- **THEN** its structured rejection SHALL identify that direct trace condition
  and the exact existing `enter-phase` retry or owner boundary
- **AND** it SHALL not propose a status override, an automatic entry, or a
  competing route selection

### Requirement: Phase-boundary terminology separates transition, handoff, completion, and witnessing

The `cli-phase-transition` capability SHALL use the canonical phase-boundary terminology shared by guidance and Agent-facing docs.

For this capability:

- `phase transition` means status synchronization in `rb_status.json`, recorded by the `phase_transition` trace event after `advance-status` succeeds;
- `phase handoff` means the Phase Agent consuming either gate CLI `check.next` or the one accepted `post_final_reentry` exceptional handoff through `enter-phase` and receiving the next Markdown control surface;
- `work completion` means the target phase's own artifacts and gate/content rules prove that target phase's work is done; and
- `witnessing` means Engine-written evidence that binds one accepted handoff authority to a later route-bound load: normally `gate_attempt(passed=true,next=<target>)` followed by `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)`, or narrowly `post_final_reentry(action=post_final_rerun,target=<target>)` followed by `load_complete(entry=<target>, handoff_source_event_id=<same event>)`.

The exceptional terminology SHALL NOT imply that a post-Final HITL2 gate ran or passed. It names a recorded HITL2 `rerun` decision checkpoint consumed through the existing loader and status owner. No arbitrary event, caller-declared context, profile prose, artifact presence or `current_node` alone SHALL qualify as witnessing.

`advance-status` SHALL NOT be described as entering, loading, or executing the next phase. `enter-phase` / `load_complete` SHALL NOT be described as completing the target phase's work. Machine-level names such as `phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `current_gate`, and `next_gate` SHALL remain stable unless a separate migration changes them.

For a normal passed gate, Agent-facing entry guidance SHALL present the complete
accepted sequence: consume `check.next` with `enter-phase`, synchronize the
just-passed source gate with `advance-status --to <source_gate_enum>`, then
execute the loaded target phase. Guidance SHALL NOT omit the source-gate status
synchronization, reverse the two lifecycle operations, or present entry alone
as authorization to claim target work completion.

#### Scenario: Advance status is state transition only

- **WHEN** `advance-status.mjs` succeeds after a witnessed deterministic route
- **THEN** its docs and diagnostics SHALL describe the result as synchronizing `rb_status.json`
- **AND** they SHALL NOT claim that `advance-status` entered or completed the target phase

#### Scenario: Enter phase witnesses entry only

- **WHEN** `enter-phase.mjs --node <check.next>` succeeds
- **THEN** its docs and diagnostics SHALL describe `load_complete` as a route-bound entry witness for the target Markdown control surface
- **AND** they SHALL NOT claim the target phase's work is complete

#### Scenario: Normal entry guidance completes source-gate synchronization before target execution

- **WHEN** a generic Agent-facing playbook instructs a passed normal lifecycle gate handoff
- **THEN** it SHALL order `enter-phase --node <check.next>` before `advance-status --to <source_gate_enum>`
- **AND** it SHALL direct execution of the loaded target phase only after that source-gate synchronization

#### Scenario: Post-final witnessing does not impersonate gate completion

- **WHEN** `enter-phase` consumes a valid `post_final_reentry` and writes its route-bound rerun load
- **THEN** docs and diagnostics SHALL describe the event/load pair as the accepted exceptional handoff witness
- **AND** SHALL NOT claim that a post-Final HITL2 gate attempt ran, passed or completed rerun work

#### Scenario: Machine names remain stable

- **WHEN** docs introduce the conceptual terms `phase transition`, `phase handoff`, `work completion`, and `witnessing`
- **THEN** existing CLI names, trace event names, status fields, and schema fields SHALL remain unchanged
- **AND** any future machine-level rename SHALL require a separate OpenSpec change

### Requirement: Phase status drift audit SHALL detect impossible current_gate/next_gate windows and manual bypass suspicion

The phase transition tooling SHALL provide an audit that compares `rb_status.json` with deterministic route evidence from `rb_trace.jsonl`, `manifest.json`, and `transitions.chain.json`. Normal lifecycle windows SHALL remain authorized by the latest passed source gate, route-bound `load_complete`, and `phase_transition` evidence.

An accepted prepared post-final workspace SHALL short-circuit partial profile symptoms as `post_final_recovery_pending` with only the exact recover action, even when the event already exists and only cleanup remains. After event-last commit and workspace cleanup, the accepted `post_final_reentry` exception SHALL be evaluated through the same pure event parser used by handoff validation. Before a completed rerun entry, event-backed terminal status/current Final node SHALL be classified as `post_final_reentry_pending_load`; this includes a bound `load_complete` followed by failed `current_node` update. After route-bound rerun `load_complete` and successful current-node update but before status sync, event+load with the still-terminal gate window SHALL be classified as `post_final_reentry_pending_status_sync`. If status equals the derived rerun window but the exact bound `phase_transition` is missing, the same outcome SHALL expose only idempotent `advance-status --to hitl2_recorded`. After existing `advance-status` writes the derived rerun window and exact bound `phase_transition`, the exceptional handoff SHALL pass. Any mismatch, unsupported event, missing binding or caller-edited lookalike SHALL remain drift/manual-bypass evidence.

The audit SHALL be diagnostic and fail-closed. It SHALL NOT mutate `rb_status.json`, invent a degradation route, or treat manual edits as valid handoff evidence.

The audit SHALL expose a closed diagnostic outcome vocabulary so downstream advice and tests do not infer ad-hoc meanings. At minimum, outcomes SHALL include `passed`, `post_final_recovery_pending`, `post_final_reentry_pending_load`, `post_final_reentry_pending_status_sync`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, `failed_gate_downstream_status`, and `bootstrap_exception`. Exceptional outcomes SHALL name the exact accepted workspace/event contract; none SHALL be a generic escape hatch.

#### Scenario: Status claims later phase without trace authorization

- **WHEN** `rb_status.json` claims `current_gate: "hitl2_recorded"` or `next_gate: "readiness_passed"`
- **AND** trace lacks the required normal handoff or accepted post-final recovery event/load evidence
- **THEN** the audit SHALL report phase status drift
- **AND** diagnostics SHALL name the missing predecessor/recovery witness

#### Scenario: Manual status edit suspicion is reported

- **WHEN** `rb_status.json` changes to a status window that cannot be derived from the latest passed deterministic handoff/transition or accepted post-final recovery event stage
- **THEN** the audit SHALL report manual bypass suspicion
- **AND** it SHALL advise returning to the latest authorized owner/action rather than continuing from the edited status

#### Scenario: Failed gate cannot authorize next phase status

- **WHEN** the latest `gate_attempt` for a source phase failed with `next: null`
- **AND** no accepted post-final recovery event applies
- **AND** `rb_status.json` indicates a downstream phase window
- **THEN** the audit SHALL fail with an impossible status window diagnostic
- **AND** it SHALL NOT write a corrective status file

#### Scenario: Legal witnessed handoff passes audit

- **WHEN** trace contains a passed source gate with non-null `next`, a later route-bound `load_complete` for that target, and a matching `phase_transition`
- **AND** `rb_status.json` reflects the corresponding source-gate status window
- **THEN** the audit SHALL pass without drift diagnostics

#### Scenario: Post-final event pending load is explicit

- **WHEN** a valid event-last ReopenResearchPass commit exists under unchanged terminal Final status but `enter-phase` has not yet written its route-bound load
- **THEN** the audit SHALL report `post_final_reentry_pending_load`
- **AND** its only next action SHALL be the exact rerun `enter-phase` command

#### Scenario: Partial rerun entry retries the loader owner

- **WHEN** a valid event has a bound rerun `load_complete` but `current_node` still names terminal Final because entry state update failed
- **THEN** the audit SHALL report `post_final_reentry_pending_load`
- **AND** its only next action SHALL remain the exact rerun `enter-phase` retry

#### Scenario: Prepared post-final workspace masks partial profile drift

- **WHEN** an accepted post-final workspace exists after profile commit and before event append
- **THEN** the audit SHALL report `post_final_recovery_pending`
- **AND** its only next action SHALL be the exact recover command
- **AND** it SHALL NOT emit a competing manual-bypass repair

#### Scenario: Route-bound post-final handoff awaits status sync

- **WHEN** a valid post-final recovery event has a route-bound rerun load, current node is rerun, and gate fields still show terminal Final
- **THEN** the audit SHALL report `post_final_reentry_pending_status_sync`
- **AND** its only next action SHALL be `advance-status --to hitl2_recorded`

#### Scenario: Correct status without bound transition remains pending sync

- **WHEN** event/load/current-node and the derived rerun status window are correct but the exact event/load-bound `phase_transition` is absent
- **THEN** the audit SHALL report `post_final_reentry_pending_status_sync`
- **AND** its only next action SHALL be idempotent `advance-status --to hitl2_recorded`

#### Scenario: Route-bound and synchronized post-final handoff passes audit

- **WHEN** a valid post-final recovery event has a route-bound rerun load and matching exceptional `phase_transition`
- **AND** status/current-node match the derived rerun window
- **THEN** the audit SHALL pass without requiring a synthetic gate attempt
- **AND** SHALL preserve recovery event context in diagnostics

#### Scenario: Bootstrap exception is explicit and narrow

- **WHEN** the audit accepts a bootstrap compatibility status window
- **THEN** the result SHALL use outcome `bootstrap_exception`
- **AND** diagnostics SHALL name the exact exception rather than treating arbitrary missing witnesses as acceptable

### Requirement: current_node records active loaded lifecycle control surface

`current_node` SHALL continue to record the most recently loaded lifecycle control surface after a clean or degraded source-gate handoff. It SHALL NOT prove target-phase work completion, SHALL NOT convert a degraded handoff into clean quality evidence, and SHALL NOT erase degraded quality context.

Before any lifecycle node has been successfully loaded by `enter-phase`, `current_node` MAY be `null` or absent for legacy bundles. New bundle templates SHALL use `current_node: null`.

`advance-status` SHALL preserve `current_node` when synchronizing `current_gate` / `next_gate`. It SHALL NOT clear `current_node` after source-gate status sync, because accepted handoff order loads the target node before synchronizing the source-gate status window.

#### Scenario: Current node survives degraded source-gate status sync

- **WHEN** Wave0 emits a degraded pass with `check.next: "phases/phase-wave1.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave1.md` succeeds
- **AND** `advance-status --bundle <bundle> --to wave0_complete` succeeds
- **THEN** `rb_status.json` SHALL contain `current_node: "phases/phase-wave1.md"`
- **AND** the source-gate status window SHALL be synchronized normally
- **AND** degraded quality context SHALL remain available to downstream diagnostics

#### Scenario: Current node survives source-gate status sync

- **WHEN** Wave0 passes with `check.next: "phases/phase-wave1.md"`
- **AND** `enter-phase --bundle <bundle> --node phases/phase-wave1.md` succeeds
- **AND** `advance-status --bundle <bundle> --to wave0_complete` succeeds
- **THEN** `rb_status.json` SHALL contain `current_node: "phases/phase-wave1.md"`
- **AND** `current_gate` SHALL be `wave0_complete`
- **AND** `next_gate` SHALL be `wave1_complete`

#### Scenario: Current node is not phase completion evidence

- **WHEN** `rb_status.json.current_node` is `phases/phase-wave1.md`
- **THEN** tools SHALL treat it as the loaded control surface only
- **AND** they SHALL NOT treat it as evidence that Wave1 work or the Wave1 gate has completed

#### Scenario: Initial current node may be null

- **WHEN** a new bundle has not yet loaded a lifecycle control surface through `enter-phase`
- **THEN** `rb_status.json.current_node` MAY be `null`
- **AND** tools SHALL NOT infer the current phase solely from that null value

### Requirement: Phase transition tooling SHALL fail closed on failed or missing source-gate handoffs

Phase transition tooling SHALL NOT allow failed gates, missing handoff witnesses, manual status edits, artifact presence, or `current_node` alone to authorize downstream lifecycle state. Normal `advance-status` SHALL continue to synchronize only the just-passed source gate after a trace-durable clean or degraded handoff has been consumed through a route-bound entry witness. The only exception SHALL be `advance-status --to hitl2_recorded` after an accepted `post_final_reentry(action=post_final_rerun)` has been consumed through its route-bound rerun entry witness; this synchronizes the existing HITL2 `rerun` decision checkpoint semantics and SHALL NOT claim that a post-Final HITL2 gate ran. The tooling SHALL NOT provide a broad force option that writes downstream `current_gate`, `next_gate`, or terminal state without one of these closed accepted evidence chains.

The accepted evidence chains for covered lifecycle handoff SHALL be exactly:

- normal: `gate_attempt(passed=true,next=<target>)` -> later route-bound `load_complete(entry=<target>, handoff_source_attempt_index=<same attempt>)` -> `advance-status --to <source_gate_enum>` -> matching `phase_transition`; or
- post-final: valid non-superseded `post_final_reentry(action=post_final_rerun,target=<resolved HITL2 rerun target>)` -> later route-bound `load_complete(entry=<target>, handoff_source_event_id=<same event>, handoff_source_event_sha256=<exact line hash>)` -> `advance-status --to hitl2_recorded` -> exact event/load-bound exceptional-context `phase_transition` and the existing `hitl2_recorded -> rerun_ready` window.

The post-final chain SHALL re-resolve the recorded HITL2 `rerun` outcome through `transitions.chain.json` and manifest/status-window helpers, require the event/load/current-node bindings defined by `POF-003` and `CPT-003/004`, and remain unavailable to every other action, target, source checkpoint or caller-provided route. Event+load without the matching status synchronization SHALL be a pending stage, not downstream lifecycle authority.

Degraded passes SHALL be accepted only when they satisfy the existing degraded handoff contract: `passed: true`, `degraded: true`, durable non-null `next`, route-bound entry witness, and no runtime-truth blocker.

#### Scenario: failed source gate cannot authorize downstream status

- **WHEN** the latest gate attempt for a source lifecycle phase failed with `passed: false` or `next: null`
- **AND** `advance-status` is invoked for that source gate or a downstream gate
- **THEN** `advance-status` SHALL exit non-zero with structured diagnostics
- **AND** it SHALL NOT mutate `rb_status.json`
- **AND** it SHALL NOT append `phase_transition`

#### Scenario: missing route-bound entry witness blocks status sync

- **WHEN** a source gate has `gate_attempt(passed=true,next=<target>)`
- **AND** `rb_trace.jsonl` lacks a later route-bound `load_complete` for that target bound to the same attempt
- **THEN** `advance-status --to <source_gate_enum>` SHALL fail closed
- **AND** advice SHALL name the required `enter-phase --bundle <bundle> --node <target>` path

#### Scenario: manual downstream status is diagnostic only

- **WHEN** `rb_status.json` claims a downstream status window that cannot be derived from the latest accepted normal or post-final handoff, route-bound entry witness, and matching `phase_transition`
- **THEN** phase status audit SHALL report `status_drift`, `manual_bypass_suspected`, or `failed_gate_downstream_status`
- **AND** audit SHALL NOT repair the file or treat the edited status as authority

#### Scenario: premature final lifecycle state is rejected

- **WHEN** `rb_status.json` claims terminal or final-adjacent state
- **AND** trace lacks the required HITL2/readiness source-gate passes and readiness-to-final route-bound entry witness
- **THEN** transition tooling SHALL report missing lifecycle evidence
- **AND** it SHALL NOT treat final artifacts or `current_node: "phases/phase-final.md"` as a substitute for the missing handoff

#### Scenario: degraded source pass remains legal only with full route evidence

- **WHEN** a source gate emitted a degraded pass with `passed: true`, `degraded: true`, and non-null `next`
- **AND** a later route-bound `load_complete` consumes that exact attempt
- **AND** runtime-truth preconditions are satisfied
- **THEN** `advance-status --to <source_gate_enum>` MAY synchronize the normal source-gate status window
- **AND** diagnostics SHALL preserve degraded context rather than presenting it as a clean quality pass

#### Scenario: accepted post-final chain remains narrow and complete

- **WHEN** a valid `post_final_reentry` is bound to the latest terminal Final lineage and a later route-bound rerun load consumes that exact event
- **AND** `advance-status --to hitl2_recorded` validates the existing HITL2 `rerun` resolution
- **THEN** it MAY append the matching exceptional-context `phase_transition` and establish the existing rerun window
- **AND** it SHALL NOT require or fabricate a post-Final `gate_attempt`

#### Scenario: incomplete post-final chain cannot authorize topic or rerun work

- **WHEN** a valid `post_final_reentry` exists with no route-bound load, or event+load exist without the matching `phase_transition` and rerun status window
- **THEN** transition tooling SHALL expose only the exact pending `enter-phase` or `advance-status --to hitl2_recorded` action
- **AND** downstream topic mutation, reentry success and rerun work SHALL remain unauthorized

#### Scenario: broad force advance is unavailable

- **WHEN** a caller attempts to bypass missing source-gate or route-bound entry evidence through a force-style status transition
- **THEN** transition tooling SHALL reject the invocation or treat it as unsupported
- **AND** no downstream lifecycle status SHALL be written by that bypass path
