---
title: "Copy Framework Snapshot"
role: "internal run-bundle instantiation step"
scope: "copy the source template package into RUN_DIR/_framework during initial run-bundle creation"
reads:
  - "specs/CONSTANTS.md"
  - "specs/WORK_DIRECTORY_LAYOUT.md"
writes:
  - "<RUN_DIR>/_framework"
---

# Copy Framework Snapshot

This command is an internal implementation step of run-bundle instantiation. Users normally invoke `instantiate-run-bundle`; this step only creates the run-local read-only framework snapshot.

## Inputs

- `RUN_DIR`
- source template package root

## Steps

1. Confirm `RUN_DIR` is the target run bundle directory.
2. Copy the complete template package into `RUN_DIR/_framework/`, including `COMMANDS.md`, `README.md`, `VERSION-LOG.md`, `specs/`, `flows/`, `output_templates/`, `command_playbooks/`, and `cli_tools/`.
3. Do not omit `cli_tools/`.
4. Do not create root control files in this step.
5. Do not write run state, references, artifacts, final output, or Wave evidence into `_framework`.

## Boundary

This is not `repair-framework-snapshot`. Repair is later maintenance for an already-instantiated run-local `_framework` and must not be part of the normal creation path.
