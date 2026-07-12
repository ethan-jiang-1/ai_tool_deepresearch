# BUG-078: Post-final HITL2 rerun re-entry is blocked by the one-way handoff ratchet

**Reported:** 2026-07-11
**Bundle:** `dpt_rb_ai-era-bpm-process-disruption`
**Phase:** Final (terminal) → attempted post-final HITL2 rerun
**Severity:** High — the documented "post-final feedback re-enters HITL2 via rerun" contract is not achievable with sanctioned CLIs
**Current status (2026-07-12):** Active — v0.21 clarified that current HITL2 guidance does not create post-final reentry; a sanctioned runtime reopen/reentry path remains absent.

## Symptom

After a run reaches terminal delivery (`readiness_passed` → `phase-final`, `final/` artifacts written), the user requested a rerun (add topics). The framework documents this path in multiple places:

- `RUN.md` / `COMMANDS.md`: *"Post-final feedback ... 必须通过 HITL2 repair/rerun 重新进入"*
- `phase-final.md` §8: *"Post-delivery 用户反馈入口：... 通过 HITL2 rerun 从 seed-topics 重新跑"*
- `phase-hitl2.md` §1: *"用户 final 后反馈也通过 HITL2 repair/rerun 承载"*

But there is **no sanctioned CLI path** to re-enter HITL2 (or any earlier phase) once the pipeline is terminal.

## Root cause

`validateEnterPhaseTarget` (in `engine/helpers/handoff-helpers.mjs`) authorizes `enter-phase` only against `latestLegalPassedHandoff` — the **newest** passed `gate_attempt` with non-null `next` in `rb_trace.jsonl`. This is a strict, trace-order, one-way ratchet:

- Latest handoff after delivery = `readiness-passed → phases/phase-final.md`.
- `enter-phase --node phases/phase-hitl2.md` → `error: requested node ... is not authorized by latest deterministic handoff; latest check.next is "phases/phase-final.md"`.
- Every gate CLI also enforces `handoff_preflight` = (latest handoff targets its own current node). So re-running the **wave2** gate to re-emit the `wave2→hitl2` handoff **also** fails (`handoff_preflight: false`), and so would wave1, wave0, ... — the block cascades all the way back.

There is no `--force` / `--reentry` flag on `enter-phase`, no reopen CLI, and `check-reentry.mjs` is read-only (and uses a *different* status-window model: it expects `current_gate: hitl2_recorded` to re-enter `phase-hitl2`, which is inconsistent with the gate's own preflight expectation of `wave2_complete` — a secondary inconsistency worth noting).

The only way to make `hitl2`/`phase-rerun` the latest authorized handoff is to append a `gate_attempt`/`load_complete` handoff event to `rb_trace.jsonl` — but **hand-writing trace events is explicitly forbidden** (charter + per-phase anti-cheating rules). So the two mechanisms are mutually exclusive: the documented rerun path requires an action the anti-cheating rules prohibit.

## Impact

- The advertised post-final rerun/repair loop cannot be executed in-framework.
- Users who accept `A (proceed_to_readiness)` at HITL2 and then want to add/adjust topics have no gated path back; their only options are (a) an out-of-gate research addendum, (b) a brand-new bundle, or (c) a framework fix.

## Suggested fix

Add a sanctioned post-final reopen, e.g. one of:
1. A `reopen-hitl2` / `enter-phase --reentry` command that appends an **audited** re-entry handoff event (Engine-written, not hand-authored), resetting `latestLegalPassedHandoff` to `phase-hitl2` and the status window to the HITL2 source-gate window.
2. Treat `user_decision: rerun` written post-final as a first-class trigger that the Engine converts into a `phase-rerun` handoff.
3. Reconcile `check-reentry.mjs`'s status-window model with the gate `handoff_preflight` model so a single documented resume procedure works.

## Workaround options (none clean)

- **Out-of-gate addendum**: run real sub-agent evidence collection for the new topics and fold results into an expanded `final/` report, transparently labeled as a post-final addendum (real evidence, but the new topics do not pass through wave gates because the pipeline is terminally closed).
- **Fresh bundle**: instantiate a new `dpt_rb_*` for the added topics, cross-referencing this bundle's 55 evidence cards.
- **Framework fix first** (OpenSpec change implementing the suggested fix), then rerun cleanly.

## Related

- `DPT_FRAMEWORK/engine/helpers/handoff-helpers.mjs` (`validateEnterPhaseTarget`, `latestLegalPassedHandoff`)
- `DPT_FRAMEWORK/cli/enter-phase.mjs`, `DPT_FRAMEWORK/cli/check-reentry.mjs`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md` §1/§6, `phase-rerun.md`, `phase-final.md` §8
- Bundle: `/Users/bowhead/ai_tool_deepresearch/dpt_rb_ai-era-bpm-process-disruption`
