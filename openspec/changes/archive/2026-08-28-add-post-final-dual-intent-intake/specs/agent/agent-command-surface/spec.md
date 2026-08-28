> req: ACS-006

## ADDED Requirements

### Requirement: The command index discoverably routes post-final iteration intents

The Agent-facing command index (`DEEP_RESEARCH_HARNESS/COMMANDS.md`) SHALL provide a post-final iteration intent routing aid that maps the two post-final request families to their existing legal routes:

- an evidence-expanding wording family — requests needing new sources, Topics, evidence collection, research conclusions, or research-profile changes (for example 再挖一轮 / 继续挖 / rerun) — SHALL be mapped to `command_playbook/post-final-recovery.md`; and
- a presentation wording family — requests that only change reader, structure, ordering, length, wording, emphasis, evidence visibility, appendix posture, or explanation of already verified content (for example 整理 / 重写 / 自包含版 / 换个读者版本) — SHALL be mapped to in-place Final refinement owned by `workflows/nodes/phases/phase-final.md` together with the persist-artifact publication path.

The routing aid SHALL be navigation only. It SHALL NOT redefine the ACS-001 audience statement or responsibility boundaries, create a second route for either family, or hand classification to the Engine. For wording that mixes both families or is materially ambiguous, the aid SHALL direct the Agent to the existing Agent-owned semantic classification boundary and its smallest-clarification rule instead of automatic selection. Any executable command string appearing in the aid SHALL keep the full `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs ...` prefix required by the index copyability contract.

#### Scenario: Evidence-expanding wording reaches the rerun playbook

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/COMMANDS.md` while handling an explicit post-final evidence-expanding request
- **THEN** the routing aid SHALL lead from that request family to `command_playbook/post-final-recovery.md` without requiring the Agent to already know the tool-named index row
- **AND** the aid SHALL NOT route that family to Final presentation refinement

#### Scenario: Presentation wording stays in Final

- **WHEN** a post-final request only asks for reorganization or rewriting of already verified report content
- **THEN** the routing aid SHALL point to in-place Final refinement and the persist-artifact publication path
- **AND** it SHALL NOT point that family at `command_playbook/post-final-recovery.md`

#### Scenario: Mixed or ambiguous wording does not auto-route

- **WHEN** a post-final request mixes both families or its evidence-versus-presentation boundary is materially ambiguous
- **THEN** the routing aid SHALL direct the Agent to the existing Agent-owned classification boundary with the smallest clarification
- **AND** it SHALL NOT select a route automatically or create a new classification authority

#### Scenario: The routing aid adds no authority

- **WHEN** the routing aid is present in the command index
- **THEN** it SHALL NOT create permission, a checkpoint, a lifecycle route, or an Engine verdict
- **AND** the ACS-001 audience statement, marker, and responsibility contracts SHALL remain intact
