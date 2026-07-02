---
title: "Gate - Instantiation Complete"
role: "gate specification"
scope: "run bundle creation gate before the execution workspace is initialized"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/WORK_DIRECTORY_LAYOUT.md"
writes: []
---

# Gate - Instantiation Complete

`instantiation_complete` is the first control-state gate. It means the run bundle, five mutable root control files, and run-root agent instruction files have been rendered from the framework snapshot and instantiation placeholders are cleared, but execution has not started.

## Pass Surface

This gate is checked through the generated run bundle:

- `RUN_DIR/_framework/` exists as the read-only framework snapshot.
- `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH` exist directly under `RUN_DIR`.
- `RUN_DIR/AGENTS.md` and `RUN_DIR/CLAUDE.md` exist directly under `RUN_DIR`, not under `_framework`, and contain the five-root-file, queue-source, stop-authorization, and HITL2 pending-user rules.
- `RUN_DIR/seed_topics/`, `RUN_DIR/seed_topics/_reference/`, and the `RUN_DIR/seed_topics/_artifacts/` scaffold required by `specs/WORK_DIRECTORY_LAYOUT.md` exist outside `_framework/`.
- root control files have no unresolved instantiation placeholders or copied output-skeleton boundary text.
- runtime metavariables from `specs/CONSTANTS.md -> Placeholder Classes` remain only as schema/template/pattern guidance, never as active run state, concrete paths, confirmed topic rows, inventory rows, counts, gate flags, active queue batch values, or trace entries.
- `STATUS_PATH` records `current_mode=instantiation_only`, `state=not_started`, `current_wave=Instantiation`, `current_gate=instantiation_complete`, and `next_gate=setup_ready`.

## Fail Rules

Fail if run state appears inside `_framework/`, root control files are missing or inside `_framework/`, run-root agent files are missing or inside `_framework/`, mutable run directories are missing, instantiation placeholders remain unresolved, runtime metavariables appear as active concrete values, or status already self-asserts that qualification passed before an independent check returns `PASS`.
