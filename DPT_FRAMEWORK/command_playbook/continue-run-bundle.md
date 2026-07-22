# continue-run-bundle

Agent command: reload one explicitly supplied, reachable existing run bundle.
This playbook is navigation and Agent flow; it does not create lifecycle,
Gate, receipt, trace, permission or mutation authority.

## Preconditions

- The user explicitly supplied/opened a reachable existing bundle directory
  (or its `RUN_BUNDLE.md` or `BUNDLE_MAP.md`) in the current workspace and
  requested continuation or inspection.
- A DPT source tree is already selected in the current workspace. The
  bundle's creation-time coordinates are navigation hints only: use them
  only when they resolve inside that selected source context.

Do not select a bundle by scanning, a bare filename, chat memory, or a
copied map. If the bundle or selected source context is unavailable, state
the direct framework-context boundary and do not run a map-provided command
path.

## Reload Procedure

1. Read `RUN_BUNDLE.md` from the supplied bundle root. If `RUN_BUNDLE.md`
   does not exist, fallback to reading `BUNDLE_MAP.md`.
2. Resolve the framework relative path from the file. If the framework is
   not reachable in the current workspace, report the boundary and stop.
3. If step 1 read `RUN_BUNDLE.md` (not the fallback), read `BUNDLE_MAP.md`
   in the same directory for the full directory layout.
4. Read `DPT_FRAMEWORK/COMMANDS.md`.
5. Select and execute the command matching the user's stated intent.

## Authority Boundary

This playbook only bridges the user's entry point (`RUN_BUNDLE.md` or
`BUNDLE_MAP.md` for older bundles) through the bundle layout to the command
surface (`COMMANDS.md`). It does not duplicate lifecycle branching logic,
reentry diagnostic procedures, per-node target selection, or post-final
recovery — those decisions belong to `COMMANDS.md` and the individual CLI
tools it references.

The user's continuation wording supplies semantic intent only. It does not
create a third HITL, expand host permission, override an Engine verdict, or
authorize a rerun. HITL and post-Final recovery retain their existing
decision/recording contracts.
