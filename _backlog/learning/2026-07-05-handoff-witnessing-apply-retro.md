# Handoff Witnessing Apply Retro

Date: 2026-07-05

## What Went Well

This apply worked better than usual because the work stayed anchored to the approved OpenSpec task order while still treating every discovered bug as a contract probe, not as an isolated patch.

The key improvement was that concrete user findings, such as the stale `gate-rerun-ready` status rule, were used to search for the whole class of failures: gate definitions, gate CLIs, shared helpers, status windows, phase wording, validators, regression tests, and standard E2E. That prevented a narrow test-only fix.

## Repeatable Practices

- Read the change artifacts before editing: proposal, design, specs, and tasks. The design residuals matter as much as the positive requirements.
- Execute `tasks.md` in order by default. If a later discovery shows the order is wrong, state the reason and adjust explicitly instead of quietly skipping around.
- Treat "this looks like a test issue" with suspicion. If the bug is about a contract, inspect the implementation surface first.
- Convert one concrete gap into a cross-cutting sweep. For handoff/status work, check definitions, CLI status checks, shared helper semantics, Agent-facing phase wording, static validators, regression tests, and E2E.
- Prefer shared helper enforcement plus static wiring validators. A helper that is not proven wired into real CLIs is not protection.
- Use real disposable bundles for E2E and real framework CLIs. Do not hand-write trace events, gate attempts, or receipts to prove runtime behavior.
- Let full-suite failures speak. Capture logs, isolate the one failing test, and fix the actual drift. Do not bury a failing regression under an E2E pass.
- Update `tasks.md` as work becomes genuinely true. Mark final verification and self-review only after the commands have run and the results are known.
- Preserve residual risk honestly. This change hardens later Engine touches against laundered handoff state; it does not prove that same-turn chat-channel halt is impossible.

## Why This Found More Issues

The change had a strong self-review checklist, and the implementation kept checking the same invariant from multiple angles:

1. Gate output chooses `check.next`.
2. `enter-phase` consumes that exact target and writes a route-bound `load_complete`.
3. `advance-status` syncs the just-passed source gate only after the route-bound witness exists.
4. The downstream gate accepts a source-gate status window, not its own gate enum before pass.
5. E2E proves the mechanism with real trace/CLI/bundle state.

Because each layer had to agree, drift became visible. The rerun gap appeared because one gate definition still expressed the old pre-pass status model. The final full-suite failure appeared because a static test was still parsing the old header literal shape. Both were useful signals.

## Next-Time Standard

For state-machine or trace-authority changes, do not call the change ready until these are all true:

- The relevant task sequence is complete in order or the deviation is documented.
- The implementation has a shared checker or a clearly justified equivalent.
- A validator proves the checker is wired into the real runtime path.
- Focused regression tests cover stale, missing, mismatched, superseded, multi-edge, and branch-specific cases.
- Standard E2E uses real CLIs and disposable bundle state.
- Full `node --test` passes.
- Governance and OpenSpec validation pass.
- The archive note does not overclaim beyond what the tests actually prove.
