> req: PHS-010

## ADDED Requirements

### Requirement: Progress checkbox states are Engine-owned and tamper-evident

The Engine remains the only legal writer that flips canonical `## Progress` checkboxes on gate pass. A canonical `- [x] <gate>` line whose gate lacks a passed `gate_attempt` with its route-bound consumption witness in `rb_trace.jsonl` SHALL be tamper evidence; the phase status audit SHALL report it as `plan_progress_tamper_suspected` naming the affected gate lines. A checked line whose gate did pass while the Engine's Progress write reported `failed` MAY be reported as advisory presentation staleness; staleness SHALL be non-blocking. Tamper evidence and staleness SHALL remain presentation facts: they SHALL NOT substitute for trace truth in any gate verdict, SHALL NOT authorize any phase, delivery, or completion conclusion, and SHALL NOT be repairable by editing the checkbox alone. Progress SHALL NOT become a second lifecycle authority, and the canonical locator SHALL continue to exclude user-snapshot content from checkbox interpretation.

#### Scenario: Hand-checked gate without a pass is tamper evidence

- **WHEN** `rb_plan.md## Progress` contains `- [x] wave1-complete` and `- [x] wave2-complete`
- **AND** trace contains no passed wave1/wave2 gate attempt with route-bound consumption
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming both gate lines

#### Scenario: Engine flip remains the only legal checked state

- **WHEN** a gate passes and the Engine flips its canonical line
- **THEN** the audit SHALL NOT report tamper evidence for that line

#### Scenario: Engine write failure is staleness, not tamper

- **WHEN** a gate passed but the Progress write reported `failed`
- **THEN** the unchecked line MAY be reported as advisory presentation staleness
- **AND** it SHALL NOT be reported as tamper evidence

#### Scenario: Checked lines never substitute for trace truth

- **WHEN** a canonical line is checked without a passed gate witness
- **THEN** no gate, entry, or delivery surface SHALL treat it as completion or authorization evidence
- **AND** the deterministic gate content evaluation SHALL continue to use trace and runtime truth only
