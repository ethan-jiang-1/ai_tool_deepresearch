# continue-run-bundle

Agent command: reload one explicitly supplied, reachable existing run bundle.
This playbook is navigation and Agent flow; it does not create lifecycle,
Gate, receipt, trace, permission, or mutation authority.

## Preconditions

- The user explicitly supplied/opened a reachable existing run bundle directory
  (or its `BUNDLE_ENTRY.md`, legacy `RUN_BUNDLE.md`, or `BUNDLE_MAP.md`) in
  the selected Deep Research Harness workspace and requested continuation or
  inspection.
- The bundle's creation-time Harness coordinate is navigation text only. Use
  it only when it resolves inside the selected source context.

Do not select a bundle by scanning, a bare filename, chat memory, chronology,
or a copied/unreachable map. If the supplied bundle or selected Harness context
is unavailable, state that direct boundary and do not run a map-provided command
path.

## Reload Procedure

1. Resolve the user-supplied directory (or the containing directory of the
   supplied entry file) to its canonical absolute path. This is the current
   run bundle root for this operation.
2. Read `BUNDLE_ENTRY.md` when it exists; otherwise read legacy
   `RUN_BUNDLE.md`; otherwise read `BUNDLE_MAP.md`. If all three are absent,
   report the entry boundary and stop.
3. Resolve the rendered Harness relative path from the selected entry. If the
   Harness is not reachable in the selected workspace, report the boundary and
   stop.
4. When the selected entry is `BUNDLE_ENTRY.md` or legacy `RUN_BUNDLE.md`,
   read `BUNDLE_MAP.md` in the same current run bundle root for the full
   directory layout.
5. Read `DEEP_RESEARCH_HARNESS/COMMANDS.md` and select the command matching
   the user's stated intent.

## Authority Boundary

This playbook only bridges an explicitly supplied current run bundle root
through its static entry and passive bundle map to `COMMANDS.md`. It does not
duplicate lifecycle branching logic, reentry diagnostic procedures, per-node
target selection, or post-final recovery; those decisions belong to
`COMMANDS.md` and the individual CLI tools it references.

The user's continuation wording supplies semantic intent only. It does not
create a third HITL, expand host permission, override an Engine verdict, or
authorize a rerun. `BUNDLE_ENTRY.md`, legacy `RUN_BUNDLE.md`, and
`BUNDLE_MAP.md` do not themselves select lifecycle work or runtime authority.
