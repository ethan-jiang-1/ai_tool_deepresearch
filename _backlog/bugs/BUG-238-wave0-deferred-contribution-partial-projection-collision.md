# BUG-238: Wave0 deferred contribution collides after partial explicit projection

- **Observed:** 2026-08-24, run `dpt_rb_ai-coding-evolution`.
- **Path:** `operate-topic-state apply --context wave_projection`.
- **Expected from playbook:** `deferred_contribution` selects one submitted contribution and derives every currently unprojected exact identity, writing deferred entries for the remainder.
- **Observed:** After explicit projection of only part of `wu-w0-b000-src-i0002`, applying a deferred contribution for the same work unit is rejected with `projection_deferred_contribution_collision` at `seed_topics/02_models-products-events-ecosystem.md#wu-w0-b000-src-i0002/1`, even though `/1` is already a different persisted projection and later ordinals remain unprojected.
- **Impact:** Phase Agent cannot use the documented contribution-wide deferred form after partial explicit materialization; it must enumerate every remaining ordinal explicitly or seek a contract repair.
- **Status:** unconfirmed Harness defect; could be an intentional whole-contribution disposition rule or an undocumented ordering constraint. Investigate through OpenSpec; do not modify `DEEP_RESEARCH_HARNESS/` during this run.
