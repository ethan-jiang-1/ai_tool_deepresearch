# continue-run-bundle

Agent command: reload one explicitly supplied, reachable existing run bundle.
This playbook is navigation and Agent flow; it does not create lifecycle,
Gate, receipt, trace, permission, or mutation authority.

## Preconditions

- The user explicitly supplied/opened a reachable existing bundle candidate
  (a directory or a file within it) in
  the selected Deep Research Harness workspace and requested continuation or
  inspection.
- The bundle's creation-time Harness coordinate is navigation text only. Use
  it only when it resolves inside the selected source context.

Do not select a bundle by scanning, a bare filename, chat memory, chronology,
or a copied/unreachable map. If the supplied bundle or selected Harness context
is unavailable, report the selected Harness context as unavailable and stop
before executing any bundle-provided command. Do not rewrite the bundle, scan
for another bundle, create an alternate source path, or infer a replacement
coordinate.

## Reload Procedure

1. Resolve the user-supplied directory (or the containing directory of the
   supplied entry file) to its canonical absolute path. This is the current
   run bundle root for this operation.
2. Verify the same root contains both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`
   before reading either file. If either is absent, report
   `unsupported_current_entry_contract` and stop. Do not read legacy Markdown,
   fall back to `RUN.md`, create or select another bundle, migrate, upgrade, or
   offer a human-only Harness command.
3. Read `BUNDLE_ENTRY.md`, then resolve the rendered Harness relative path from
   that entry. If the
   Harness is not reachable in the selected workspace, report the boundary and
   stop.
4. Read `BUNDLE_MAP.md` in the same current run bundle root for the full
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
authorize a rerun. `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` do not themselves
select lifecycle work or runtime authority. Historical Markdown may be read
directly by a human outside this Harness operational contract.

When the selected current coordinate is Final, reload the resolved owner rather
than inferring one from chat: an admitted empty inventory needs bundle-base
delivery, an admitted post-C5 zero-append inventory needs the next global
delivery, and a bound current-lineage report may be refined in place. A clean
Final is not a default C5 request; satisfaction is not a runtime fact; and a
primary-looking pre-entry or drifted inventory remains blocked by the entry/
reentry contracts.
