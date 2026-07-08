> req: BUM-004

Note: `BUS-001..BUS-003` are retired in the requirement registry. This delta removes their old positive behavior but does not redeclare retired IDs in the active change header.

## REMOVED Requirements

### Requirement: START_FROM_HERE.md is the first file an agent reads

**Reason**: The name and positioning imply an action entrypoint, but active lifecycle execution is controlled by `RUN.md`, phase nodes, command playbooks, Engine checks, and active bundle runtime files. New bundles now use the passive `BUNDLE_MAP.md` surface.

**Migration**: Use `bundle-map` requirements for the current bundle root map contract. Existing bundles with `START_FROM_HERE.md` remain readable through diagnostic compatibility and deprecation advice.

### Requirement: Boot entry documents stop authorization

**Reason**: Detailed stop authorization belongs in lifecycle phase/shared Markdown and accepted Agent command guidance, not in a passive bundle map that could be mistaken for a controller.

**Migration**: `BUNDLE_MAP.md` can point readers to status, trace, queue, phase nodes, and command guidance, but it SHALL NOT duplicate detailed stop/control rules as primary operating instructions.

### Requirement: START_FROM_HERE.md SHALL document current_node as the resume phase coordinate

**Reason**: Current-node reentry guidance remains valid, but the current bundle map file is renamed and repositioned. The old requirement name preserves the wrong primary file.

**Migration**: Move the reentry pointer requirement to `bundle-map` and update `agent-command-surface` / `runtime-reentry-debuggability` to reference `BUNDLE_MAP.md`, with legacy `START_FROM_HERE.md` only as fallback/deprecation advice.
