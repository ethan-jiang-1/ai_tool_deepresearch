# Persist Artifact Safely

Use this playbook when an Agent has finished a content-bearing staging file for `reference/`, `artifacts/`, `final/`, or producer-owned `_cache/` and needs a crash-safe commit into the selected bundle.

This is an Agent-run ordinary command path. Do not ask the user to run these commands unless host policy makes that single action non-delegable.

## Persist

Keep the completed staging source until the command returns `verdict: committed`.

For a new target:

```bash
node DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs persist \
  --bundle <bundle> \
  --source <completed-staging-file> \
  --target <reference|artifacts|final|_cache/path> \
  --expect-absent
```

For replacement, calculate the current target SHA-256 and use compare-and-swap:

```bash
node DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs persist \
  --bundle <bundle> \
  --source <completed-staging-file> \
  --target <reference|artifacts|final|_cache/path> \
  --expect-sha256 <current-target-sha256>
```

There is no force overwrite. A blocked compare-and-swap means the Agent must inspect the current target and decide whether to prepare a new staging file or retry with the newly observed digest.

## Recover After A Crash

First stop concurrent persist activity for the selected bundle. Then run the single quiescent sweep:

```bash
node DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs sweep --bundle <bundle>
```

- `finalized`: a valid prepared payload was committed and its workspace removed.
- `cleaned`: the target already contained the prepared bytes and the stale workspace was removed.
- `blocked`: inspect the one reported root fact and follow its `recommended_action`.

For an incomplete or invalid workspace, the nearest legal repair is Agent-owned: inspect the reported `_diagnostics/artifact-persistence/<operation-id>/`, remove only that diagnostic workspace without following symlinks, retry persist from the retained staging source, then rerun sweep. For a target conflict, resolve which content should win before removing/retrying the workspace. There is no automatic discard, quarantine, repair-all, or unknown-temp promotion.

Never rename an arbitrary `.tmp` file into a canonical target. Only `operation.json` plus its bound payload under the Engine-owned workspace is recovery authority.

## Authority Boundary

Persistence proves exact file bytes were committed durably. It does not create evidence provenance, a submitted work-unit row, queue completion, gate pass, phase handoff, lifecycle progress, topic identity, or Final delivery authority. Delegated outputs and cache trails still pass through `operate-work-unit submit`; Phase-owned projections still require submitted backing; Final still requires legal Final entry.
