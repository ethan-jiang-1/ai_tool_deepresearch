> req: PHS-006, PHS-010

## MODIFIED Requirements

### Requirement: Engine writes Progress on gate pass

The `## Progress` section SHALL contain a pre-populated baseline checklist of all workflow gates in lifecycle order, initially all unchecked (`- [ ] <gate-name>`). Every gate pass SHALL cause the Engine to attempt to flip the corresponding canonical checkbox in the **current Progress block** to `- [x] <gate-name> (<ISO8601 timestamp>)`. This write is idempotent (re-running the same gate in the same block updates the timestamp, does not duplicate the line). If the canonical Progress section exists but the gate is not pre-listed in the current block, the Engine SHALL append one new checked line there.

The Progress section SHALL grow per rerun cycle: when the `rerun-ready` gate passes, after flipping `rerun-ready` in the current block the Engine SHALL append a new cycle block (`### Rerun cycle <N>`, `N` strictly increasing by 1) pre-populated with that cycle's re-executable gates in lifecycle order, all unchecked: `seed-topics-ready`, `wave0-complete`, `wave1-complete`, `wave2-complete`, `hitl2-recorded`, `readiness-passed`, `rerun-ready`. Spawn SHALL be a transition effect: the Engine SHALL append `### Rerun cycle <N+1>` only when the current block's `rerun-ready` line was flipped from unchecked to checked by this pass and no such block already exists, so re-running the `rerun-ready` gate against an already-checked line updates the timestamp without duplicating the block. The baseline block is the checklist pre-populated by the template; while no cycle block exists it is the current block, otherwise the current block is the last appended cycle block. A gate pass SHALL flip its line only in the current block.

The shared `writePlanProgress()` helper SHALL use the canonical host-file locator and return `committed`, `unchanged`, or `failed` to its caller. A `failed` outcome SHALL leave the full pre-write plan bytes unchanged and SHALL NOT be represented as a checked Progress claim. Progress is presentation: a failure to update it SHALL NOT reverse the already-evaluated deterministic gate content result or independently create a new Gate rule. For setup-ready, the existing pass is consumable only when the actual remaining bytes can still be covered by the required route-bound checkpoint and trace contract; this is a handoff-audit prerequisite, not a Progress presentation verdict.

Gate list source: the template pre-populates the baseline block from the known workflow manifest lifecycle. All gate CLIs (instantiation, hitl1, setup, seed-topics, wave0, wave1, wave2, hitl2, readiness, rerun-ready) SHALL invoke the shared Progress writer on pass; cycle blocks are Engine-runtime append-only and SHALL NOT appear in the template.

#### Scenario: Gate pass flips Progress checkbox
- **WHEN** any gate CLI evaluates all rules and the gate passes
- **THEN** the Engine attempts to flip the canonical `- [ ] <gate>` line to `- [x] <gate> (<ISO8601 ts>)` in the current block of `rb_plan.md## Progress`
- **AND** a successful write is reported as `committed` or `unchanged`

#### Scenario: Re-running the same gate is idempotent
- **WHEN** a gate is evaluated and passes a second time in the same cycle (for example a rerun cycle re-passes `seed-topics-ready`)
- **THEN** the Engine updates the timestamp on the existing canonical `- [x] <gate>` line of that block without duplicating it

#### Scenario: Rerun-ready pass grows a new cycle block
- **WHEN** the `rerun-ready` gate passes and no `### Rerun cycle <N+1>` block exists yet
- **THEN** the Engine flips `- [x] rerun-ready` in the current block and appends `### Rerun cycle <N+1>` with `seed-topics-ready`, `wave0-complete`, `wave1-complete`, `wave2-complete`, `hitl2-recorded`, `readiness-passed`, `rerun-ready` all unchecked
- **AND** the next gate pass within that cycle flips its line in the new block

#### Scenario: Re-running rerun-ready does not duplicate a cycle block
- **WHEN** the `rerun-ready` gate passes again while its line in the current block is already checked
- **THEN** the Engine updates the `rerun-ready` timestamp in the current block
- **AND** no additional cycle block is appended

#### Scenario: Gate pass within a rerun cycle updates the current block
- **WHEN** a rerun cycle block exists and a cycle gate (for example `wave0-complete`) passes
- **THEN** the Engine flips that gate's line in the last cycle block, not in the baseline block

#### Scenario: Progress write failure does not affect gate output
- **WHEN** `writePlanProgress()` cannot write (for example disk full or permission error)
- **THEN** the plan retains its pre-write bytes and no checked Progress claim is emitted
- **AND** the deterministic gate content evaluation remains its actual result
- **AND** only the route-bound checkpoint/trace contract determines whether that passed result can be consumed

### Requirement: Progress checkbox states are Engine-owned and tamper-evident

The Engine remains the only legal writer that flips canonical `## Progress` checkboxes on gate pass. A canonical `- [x] <gate>` line whose gate lacks a passed `gate_attempt` with its route-bound consumption witness in `rb_trace.jsonl` SHALL be tamper evidence; for a line in a cycle block, the witness SHALL be a passed `gate_attempt` for that gate recorded at or after that block's spawn, except that a cycle block's `rerun-ready` line SHALL be witnessed only by a LATER `rerun-ready` pass — the pass that spawned the block witnesses the PREVIOUS block's `rerun-ready` line, never its own. The phase status audit SHALL report tamper as `plan_progress_tamper_suspected` naming the affected gate lines and their blocks. A passed `gate_attempt` (consumed gate) whose line in the block that was current at that attempt is unchecked SHALL be surfaced by the audit as advisory presentation staleness, naming the gate and its block; staleness SHALL be non-blocking and SHALL NOT appear among blocking integrity outcomes. Tamper evidence and staleness SHALL remain presentation facts: they SHALL NOT substitute for trace truth in any gate verdict, SHALL NOT authorize any phase, delivery, or completion conclusion, and SHALL NOT be repairable by editing the checkbox alone. Progress SHALL NOT become a second lifecycle authority, and the canonical locator SHALL continue to exclude user-snapshot content from checkbox interpretation.

A reconcile tool MAY rebuild Progress state (including cycle blocks) for a bundle whose Progress lagged; it SHALL derive every checked line and every cycle block from `rb_trace.jsonl` route-bound `gate_attempt` witnesses and the canonical baseline checklist, so every line it writes satisfies the same witness rule as a gate-pass flip (checked only when a passed `gate_attempt` with route-bound consumption exists). Its writes SHALL count as Engine writes subject to the same tamper evidence.

#### Scenario: Hand-checked gate without a pass is tamper evidence
- **WHEN** `rb_plan.md## Progress` contains `- [x] wave1-complete` and `- [x] wave2-complete`
- **AND** trace contains no passed wave1/wave2 gate attempt with route-bound consumption
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming both gate lines

#### Scenario: Cycle-block line without a witnessed pass in its cycle is tamper evidence
- **WHEN** a `### Rerun cycle <N>` block contains `- [x] wave0-complete`
- **AND** no passed `wave0-complete` gate attempt with route-bound consumption exists at or after that block's spawn
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming that line and its block

#### Scenario: Cycle-block rerun-ready line is witnessed only by a later rerun pass
- **WHEN** a `### Rerun cycle <N>` block contains `- [x] rerun-ready`
- **AND** the only `rerun-ready` pass with route-bound consumption is the one that spawned that block
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming that line and its block
- **AND** the audit SHALL NOT treat the block's own spawner pass as its `rerun-ready` witness

#### Scenario: Engine flip remains the only legal checked state
- **WHEN** a gate passes and the Engine flips its canonical line in the current block
- **THEN** the audit SHALL NOT report tamper evidence for that line

#### Scenario: Consumed gate without a checked line is advisory staleness
- **WHEN** a passed `gate_attempt` with route-bound consumption exists for a gate
- **AND** the line for that gate in the block current at that attempt is unchecked
- **THEN** the audit SHALL surface advisory presentation staleness naming the gate and its block
- **AND** staleness SHALL be non-blocking and SHALL NOT appear among blocking integrity outcomes

#### Scenario: Engine write failure is staleness, not tamper
- **WHEN** a gate passed but the Progress write reported `failed`
- **THEN** the unchecked line SHALL be surfaced as advisory presentation staleness
- **AND** it SHALL NOT be reported as tamper evidence

#### Scenario: Checked lines never substitute for trace truth
- **WHEN** a canonical line is checked without a passed gate witness
- **THEN** no gate, entry, or delivery surface SHALL treat it as completion or authorization evidence
- **AND** the deterministic gate content evaluation SHALL continue to use trace and runtime truth only
