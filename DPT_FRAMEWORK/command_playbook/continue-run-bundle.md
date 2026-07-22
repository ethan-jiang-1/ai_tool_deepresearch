# continue-run-bundle

Agent command: reload one explicitly supplied, reachable existing run bundle.
This playbook is navigation and Agent flow; it does not create lifecycle,
Gate, receipt, trace, permission or mutation authority.

## Preconditions

- The user explicitly supplied/opened the target bundle's `BUNDLE_MAP.md` or
  containing bundle and requested continuation or inspection.
- The containing directory is reachable in the current workspace.
- A DPT source tree is already selected in the current workspace. The map's
  `framework_root` and `repo_command_root` coordinates are creation-time hints
  only: use them only when they resolve inside that selected source context.

Do not select a bundle by scanning, a bare filename, chat memory, or a copied
map. If the bundle or selected source context is unavailable, state the direct
framework-context boundary and do not run a map-provided command path.

## Reload Procedure

1. Treat the map's containing directory as the candidate `<bundle>`. Read
   `BUNDLE_MAP.md`, `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`.
2. Run the existing structural checks from the selected repo command root:

   ```bash
   node DPT_FRAMEWORK/cli/validate-bundle.mjs <bundle>
   node DPT_FRAMEWORK/cli/inspect-bundle.mjs <bundle>
   ```

   Read their direct output. A failure does not authorize direct edits to
   Engine-owned state; follow the named existing owner or report its boundary.
3. Branch on `rb_status.json.current_node`:

   - For a non-null node other than `phases/phase-final.md`, run:

     ```bash
     node DPT_FRAMEWORK/cli/check-reentry.mjs --bundle <bundle> --at <current_node>
     ```

     Read `check`, `root_findings`, `inspect`, and `advice`. Only a clean
     result permits reloading the existing `DPT_FRAMEWORK/workflows/nodes/<current_node>`
     Markdown control surface. Do not infer a node from `current_gate`.
   - For `phases/phase-final.md`, do not run
     `check-reentry --at phase-final`: Final has no Gate and its lawful
     terminal status remains `current_gate: readiness_passed` / `next_gate: none`.
     Read direct status and `final/` facts. A factual user turn may be answered
     from verified facts. A material post-Final request goes only to
     `command_playbook/post-final-recovery.md` and its accepted
     `operate-post-final-recovery.mjs` path.
   - For `null` or absent `current_node`, there is no generic legal target
     selection. Read the existing trace/diagnostic output and preserve the
     missing-coordinate boundary; do not guess from `current_gate`, write
     state, or create a new bundle.

## Authority Boundary

The user's continuation wording supplies semantic intent only. It does not
create a third HITL, expand host permission, override an Engine verdict, or
authorize a rerun. Non-terminal `stop: no` work remains silently autonomous
after legal reload. HITL and post-Final recovery retain their existing
decision/recording contracts.
