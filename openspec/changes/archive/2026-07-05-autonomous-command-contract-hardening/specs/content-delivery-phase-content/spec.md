## ADDED Requirements

> req: CDP-004

### Requirement: Final delivery is terminal non-interactive delivery and post-final feedback re-enters through HITL2

Content delivery phase docs SHALL distinguish terminal non-interactive Final delivery from interactive in-run decision checkpoints while preserving the existing post-final feedback routing contract.

For this capability:

- HITL1 and HITL2 are the only interactive in-run checkpoints;
- HITL2 remains the structured in-run human decision checkpoint for review, repair, rerun, or stop decisions;
- readiness remains the structural precheck before final delivery;
- Final remains a terminal non-interactive delivery phase with `gate: none`, `next: none`, no hidden next phase, no hidden gate, and no implicit loop;
- final report delivery MAY surface final artifacts after they exist, but SHALL NOT ask the user whether to continue, whether partial output is enough, or whether to repair inside Final; and
- any user feedback after final delivery SHALL re-enter through the accepted HITL2 feedback / repair / rerun path rather than turning Final into a post-delivery repair surface.

This requirement SHALL NOT remove post-final feedback support. It only preserves the boundary that feedback after delivery is a new HITL2-mediated repair/rerun input, not an interactive Final-phase continuation, a third interactive in-run checkpoint, or a mid-pipeline progress checkpoint.

#### Scenario: Final delivery is not a third in-run checkpoint

- **WHEN** `phase-final.md` delivers final report artifacts
- **THEN** the docs SHALL treat that delivery as terminal output after final artifacts exist
- **AND** they SHALL NOT describe Final as a confirmation loop, progress report, or interactive repair checkpoint

#### Scenario: Post-final feedback keeps HITL2 routing

- **WHEN** user feedback arrives after final delivery
- **THEN** docs SHALL route the feedback through the accepted HITL2 feedback / repair / rerun mechanism
- **AND** they SHALL NOT add a hidden Final gate, hidden Final next edge, or Final-owned repair loop
