---
title: "Repair Framework Snapshot"
role: "same-version framework snapshot repair command"
scope: "repair incomplete run-local _framework snapshots without migrating active run rules"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "COMMANDS.md"
writes:
  - "<RUN_DIR>/_framework"
  - "<TRACE_PATH>"
  - "<STATUS_PATH>"
---

# Repair Framework Snapshot

Use this command only when a run-local `RUN_DIR/_framework/` snapshot is incomplete but should remain on the same template version.

This command is a repair path, not a framework migration. It restores missing files that should have been copied during instantiation. It must not overwrite existing framework files, must not regenerate root control files from `_framework/output_templates/*.md`, and must not change research state, evidence, topics, artifacts, or final output.

## Preconditions

The repair may proceed only when all conditions are true:

- `RUN_DIR/_framework/specs/CONSTANTS.md` exists.
- The source framework package and run-local `_framework` have the same `template_family`.
- The source framework package and run-local `_framework` have the same `current_version`.
- The missing paths are required framework package paths, such as `cli_tools/*`, `COMMANDS.md`, `command_playbooks/*`, `specs/*`, `flows/*`, `output_templates/*`, `README.md`, or `VERSION-LOG.md`.
- Existing run-local `_framework` files are not overwritten.

If any version, family, or existing-file content drift is detected, return `FAIL_BLOCKED` and require an explicit framework migration plan.

## Snapshot / Control-File Boundary

`RUN_DIR/_framework/output_templates/PROFILE.md`, `PLAN.md`, `STATUS.md`, `QUEUE.md`, and `TRACE.md` are output skeletons. They may contain placeholders and are not runtime control files.

The instantiated control files live directly under `RUN_DIR`:

```text
<PLAN_BASENAME>.profile.md
<PLAN_BASENAME>.plan.md
<PLAN_BASENAME>.status.md
<PLAN_BASENAME>.queue.md
<PLAN_BASENAME>.trace.md
```

Do not copy `_framework/output_templates/*.md` over those root files during repair.

## Repair Steps

1. Compare source framework package required paths against `RUN_DIR/_framework/`.
2. For each missing required path, copy it from the source package into the matching path under `RUN_DIR/_framework/`.
3. Do not copy, overwrite, or normalize any path that already exists under `RUN_DIR/_framework/`.
4. Run the read-only CLI helper against the run.
5. If the active run already has a trace file, append a diagnostic entry tagged `framework_snapshot_repair` with timestamp, missing paths repaired, source framework version, and gate consequence.
6. Update `STATUS_PATH -> Directory / Integration State.framework_readonly_boundary_ready` only if the repair makes the framework snapshot complete.

## Result

Return one of:

| result | meaning |
| --- | --- |
| `PASS` | Missing same-version framework files were restored and root control files were not touched. |
| `FAIL_FIX` | Same-version repair is possible but a local mutable control-file update remains. |
| `FAIL_BLOCKED` | Version/family mismatch or existing-file drift requires explicit migration. |
