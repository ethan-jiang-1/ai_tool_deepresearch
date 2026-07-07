## ADDED Requirements

> req: RRD-007

### Requirement: Reentry diagnostics SHALL use current_node as the current phase coordinate

Runtime reentry and diagnostic tooling SHALL treat `rb_status.json#/current_node`, when present, as the current loaded lifecycle phase node coordinate. This coordinate SHALL be used to explain where an Agent should resume reading Markdown, while existing gate/checkpoint validation remains responsible for deciding whether the runtime state is consistent.

If `current_node` is absent in a legacy bundle, reentry tooling MAY fall back to existing trace/checkpoint inference, but it SHALL report that the status file lacks the current phase coordinate.

#### Scenario: Reentry reports current loaded phase

- **WHEN** `rb_status.json` contains `current_node: "phases/phase-hitl2.md"`
- **AND** reentry or audit tooling reports the current runtime position
- **THEN** the output SHALL include `current_node: "phases/phase-hitl2.md"` or equivalent current phase coordinate
- **AND** it SHALL distinguish this from `current_gate` and `next_gate`

#### Scenario: Legacy bundle without current node remains readable

- **WHEN** `rb_status.json` has no `current_node`
- **THEN** reentry tooling SHALL NOT fail solely for that absence
- **AND** diagnostics SHALL advise that the next successful `enter-phase` will populate `current_node`
