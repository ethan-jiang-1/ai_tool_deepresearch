# plan-hostfile-sections Specification (delta)

> req: PHS-001, PHS-002, PHS-003, PHS-004, PHS-005, PHS-006, PHS-007, PHS-008, PHS-009, PHS-010

## MODIFIED Requirements

### Requirement: Progress checkbox states are Engine-owned and tamper-evident

The Engine remains the only legal writer that flips canonical `## Progress` checkboxes on gate pass. A canonical `- [x] <gate>` line whose gate lacks a passed `gate_attempt` with its route-bound consumption witness in `rb_trace.jsonl` SHALL be tamper evidence; for a line in a cycle block, the witness SHALL be a passed `gate_attempt` for that gate recorded at or after that block's spawn, except that a cycle block's `rerun-ready` line SHALL be witnessed only by a LATER `rerun-ready` pass — the pass that spawned the block witnesses the PREVIOUS block's `rerun-ready` line, never its own. A cycle block's spawn timestamp SHALL be the Engine's canonical written form (ISO 8601 Zulu); a cycle-looking header whose spawn timestamp is missing or is not in that canonical form SHALL be treated the same as an unparseable cycle header — manual interference, fail closed. Witness-window membership SHALL be decided on parsed timestamps, not lexical string comparison. Block membership of `## Progress` lines SHALL be determined by one shared Engine-owned parse consumed by every writer and every auditor of the section, so the writer that flips lines and the audit that judges them can never disagree about which block a line belongs to. The phase status audit SHALL report tamper as `plan_progress_tamper_suspected` naming the affected gate lines and their blocks. A passed `gate_attempt` (consumed gate) whose line in the block that was current at that attempt is unchecked SHALL be surfaced by the audit as advisory presentation staleness, naming the gate and its block; staleness SHALL be non-blocking and SHALL NOT appear among blocking integrity outcomes. Tamper evidence and staleness SHALL remain presentation facts: they SHALL NOT substitute for trace truth in any gate verdict, SHALL NOT authorize any phase, delivery, or completion conclusion, and SHALL NOT be repairable by editing the checkbox alone. Progress SHALL NOT become a second lifecycle authority, and the canonical locator SHALL continue to exclude user-snapshot content from checkbox interpretation.

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

#### Scenario: Forged early spawn timestamp is tamper evidence

- **WHEN** a cycle block header carries a spawn timestamp that is not the Engine's canonical Zulu form (for example `spawned 2020-01-01` or `spawned <fabricated text>`)
- **AND** the block contains checked gate lines
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming those lines and the block
- **AND** the audit SHALL NOT admit any witness against that block on the basis of the malformed timestamp

#### Scenario: Writer and auditor agree on block membership

- **WHEN** a `## Progress` section contains a cycle-looking header the Engine would not write (for example an indented `### Rerun cycle 2` line)
- **THEN** the Progress writer and the phase status audit SHALL resolve that line to the same block through the one shared Engine-owned parse
- **AND** the audit SHALL fail closed on any checked line whose witness window cannot be established
