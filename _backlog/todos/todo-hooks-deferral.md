# TODO: workflow boundary hooks

> 状态: 延后 | 优先级: 低 | 更新: 2026-07-07

## Why

Boundary hooks are optional workflow checks that may run between major phase transitions, such as setup to wave0, wave0 to wave1, wave1 to wave2, and readiness to final delivery.

They remain deferred because the current priority is to stabilize:

- work-unit submitted output declarations
- evidence extraction and quality projections
- rerun and recovery behavior
- final delivery readiness

## Current Direction

When hooks become active, they should be framework-level deterministic checkpoints that read active bundle-root state and submitted declarations. They should not become another Agent flow controller and should not discover Agent output by scanning arbitrary directories.

Potential first hook:

- `wave0_closeout_to_wave1_start`
- validates that wave0 submitted declarations, reference inventory, and queue state are coherent before wave1 demand is created
- writes trace diagnostics and advice, not final semantic judgment

## Design Questions

- Should hooks be represented as gate-like CLIs, phase-node advice, or a separate checkpoint family?
- Which hook results are blocking versus diagnostic?
- How should hook outputs return to the Agent as actionable feedback?

## Non-Goals

- Do not add hooks before evidence ownership is clean.
- Do not turn hooks into a hidden workflow runner.
- Do not write runtime data to `DPT_FRAMEWORK/`.
