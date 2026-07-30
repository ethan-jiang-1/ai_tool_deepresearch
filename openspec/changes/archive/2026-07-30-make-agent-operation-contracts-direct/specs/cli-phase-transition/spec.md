> req: CPT-003, CPT-004

## MODIFIED Requirements

### Requirement: Enter phase CLI witnesses lifecycle node entry (CPT-003)

After valid static invocation and latest trace-durable clean/degraded handoff
authorization, `enter-phase` SHALL preflight the selected target's action-core
configuration before it calls `assessNode()`. Only then SHALL it load the target
dependency closure through `assessNode()`, write route-bound `load_complete`,
and update `rb_status.json#/current_node` without mutating gate windows.

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

### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs (CPT-004)

Source-gate `advance-status` SHALL treat a trace-durable degraded gate pass as a legal deterministic handoff witness only when all normal source-gate, target-node, and route-bound `load_complete` checks pass.

The accepted post-final exception SHALL allow `advance-status --to hitl2_recorded` without a synthetic HITL2 gate attempt only when no accepted C5 workspace remains, a valid `post_final_reentry` event records HITL2 outcome `rerun`, its target/window re-resolve through the existing transition table/manifest, and a later route-bound rerun `load_complete` references that exact event while `current_node` equals the rerun target. The CLI SHALL preserve this exceptional source kind in `phase_transition` diagnostics. No other source gate, action or target SHALL use this exception.

The exceptional `phase_transition` SHALL add `source_handoff_kind: post_final_reentry`, `source_handoff_event_id`, `source_handoff_event_index`, `source_handoff_event_sha256`, `source_handoff_operation_id`, and `source_handoff_load_index`. These exact fields SHALL let audit/reentry distinguish the matching transition from an unrelated or hand-written lookalike without changing the existing normal success fields.

Exceptional status-sync retry SHALL be idempotent only when status is already the exact derived window and no conflicting later transition claims the same synchronization with different event/load/from/to binding. An exact existing bound transition means success without append; no matching transition means append the missing exact transition; a conflicting lookalike means fail closed without another transition.

Successful status synchronization after a degraded or accepted exceptional handoff SHALL establish the normal source-gate status window for the target lifecycle phase. It SHALL preserve degraded/recovery context in diagnostics or trace and SHALL NOT reinterpret either handoff as a gate attempt that did not occur.

`--to <gate>` SHALL normally name the just-passed source gate being synchronized into `rb_status.json`. For the accepted C5 path, `--to hitl2_recorded` SHALL name the existing HITL2 decision checkpoint semantics recorded by the recovery event; it SHALL NOT claim that `check-gate-hitl2-recorded.mjs` ran post-Final. It SHALL NOT name the next phase's gate.

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

Downstream lifecycle gates SHALL NOT require `current_gate` to already equal their own gate enum before they pass. For a non-entry lifecycle node, the active status window before its gate pass is `current_gate == <legal predecessor source gate enum>` and `next_gate == <this node's gate enum>`, derived from `manifest.json` and `transitions.chain.json`. The accepted C5 event reuses the existing HITL2→rerun window and SHALL NOT add a new gate/window enum.

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
