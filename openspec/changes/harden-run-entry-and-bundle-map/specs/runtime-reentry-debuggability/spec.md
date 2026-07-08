> req: RRD-007

## MODIFIED Requirements

### Requirement: Reentry diagnostics SHALL use current_node as the current phase coordinate

Runtime reentry and diagnostic tooling SHALL treat `rb_status.json#/current_node`, when present, as the current loaded lifecycle phase node coordinate. This coordinate SHALL be used to explain where an Agent should resume reading Markdown, while existing gate/checkpoint validation remains responsible for deciding whether the runtime state is consistent.

If `current_node` is `null` or absent in a legacy or initial bundle, reentry tooling MAY fall back to existing trace/checkpoint inference, but it SHALL report that status lacks a populated current phase coordinate. Advice SHALL point the Agent to `BUNDLE_MAP.md`, trace, and reentry diagnostics. If only legacy `START_FROM_HERE.md` exists, advice MAY mention it as deprecated bundle-map compatibility and SHOULD recommend migration to `BUNDLE_MAP.md`.

#### Scenario: Reentry reports current loaded phase
- **WHEN** `rb_status.json` contains `current_node: "phases/phase-hitl2.md"`
- **AND** reentry or audit tooling reports the current runtime position
- **THEN** the output SHALL include `current_node: "phases/phase-hitl2.md"` or equivalent current phase coordinate
- **AND** it SHALL distinguish this from `current_gate` and `next_gate`

#### Scenario: Legacy or initial bundle without populated current node remains readable
- **WHEN** `rb_status.json` has no `current_node` or has `current_node: null`
- **THEN** reentry tooling SHALL NOT fail solely for that absence
- **AND** diagnostics SHALL advise that the next successful `enter-phase` will populate `current_node`
- **AND** diagnostics SHALL point to `BUNDLE_MAP.md`, trace, and reentry diagnostics rather than `current_gate` guessing

#### Scenario: Legacy START_FROM_HERE fallback is deprecated
- **WHEN** reentry tooling finds `START_FROM_HERE.md` but no `BUNDLE_MAP.md`
- **THEN** diagnostics MAY keep the old bundle readable
- **AND** diagnostics SHALL identify `START_FROM_HERE.md` as deprecated compatibility rather than current bundle map
