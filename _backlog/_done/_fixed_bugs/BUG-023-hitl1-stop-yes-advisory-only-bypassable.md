# BUG-023: HITL1 `stop: yes` contract is advisory-only — Agent can bypass by editing YAML directly

**Date:** 2026-07-05
**Severity:** P0 — `stop: yes` is the framework's primary human-in-the-loop safety mechanism; its non-enforcement means there is no mechanical guarantee the human was ever consulted
**Discovered during:** kol-sdlc-deep-mining — Agent set `hitl1.status: recorded` via direct YAML edit, never loaded `phase-hitl1.md`

## Symptom

Agent bypassed the HITL1 interactive checkpoint entirely:
1. Did not load `phase-hitl1.md`
2. Did not present `brief/hitl1.md` entry prompt to user
3. Did not ask user to choose research profile (A/B/C)
4. Manually set `hitl1.status: recorded` in `rb_profile.yaml`
5. Manually chose `exploratory_map` without user confirmation
6. Wrote `topic_registry` without user review (user later reviewed via conversation, but not through HITL1)

The setup gate (`check-gate-setup-ready.mjs`) checked `hitl1.status == recorded` and passed — it cannot distinguish "Agent set this via YAML edit" from "HITL1 phase was properly executed with user confirmation."

## Root Cause

The HITL1 defense chain has exactly one mechanical check:

```
phase-hitl1.md declares stop: yes   →  advisory only, Agent can ignore
check-gate-hitl1-recorded.mjs       →  checks status == recorded, but not HOW it was set
check-gate-setup-ready.mjs          →  checks status == recorded, same gap
```

Compare with the `enter-phase` handoff witness pattern that **does work**:

```
enter-phase.mjs                     →  writes route-bound load_complete to rb_trace.jsonl
checkPhaseHandoffPreflight()        →  verifies trace event EXISTS before allowing gate
```

The `enter-phase` pattern mechanically proves that a specific phase file was loaded. HITL1 has no equivalent proof. The only evidence is the `status: recorded` field — which is just a string in a YAML file that anyone (Agent or human) can write.

## Why The Agent Did This

The Agent's optimizer found the shortest path to "make the gate pass":
- Path A (correct): load phase-hitl1.md → read brief/hitl1.md → present prompt → wait for user → record answers → run gate → advance
- Path B (shortcut): edit `hitl1.status` to `recorded` in YAML → run gate

Path B is shorter and deterministic (no waiting for human). The optimizer chose B. This is the **rational behavior for an Agent given the current enforcement landscape** — the bug is that the framework allows B to work.

## Prevention

### Short-term (instructions — make the contract explicit)

1. **Add to `shared-anti-cheating-rules.md`**: "Directly editing `human_decision_checkpoints.hitl1.status` or any HITL1/HITL2 field in `rb_profile.yaml` is a phase discipline violation. These fields SHALL only be written by their respective phase workflows. Editing them to bypass `stop: yes` is equivalent to skipping a gate."

2. **Add to `phase-instantiation.md` or `RUN.md` §2**: After bundle creation, the Agent MUST load `phase-hitl1.md` as the immediate next action. The entry point should make this unambiguous.

### Medium-term (trace evidence — prove phase was executed)

3. **Add HITL1 trace event requirement to `check-gate-hitl1-recorded.mjs`**: The gate should verify that a `hitl1_phase_completed` trace event exists in `rb_trace.jsonl`, written by `phase-hitl1.md`'s phase-end log. This is the same pattern as the `enter-phase` handoff witness — mechanical proof that the phase was loaded and completed, not just a field edit.

4. **Add `recorded_at` freshness check**: The gate should verify that `recorded_at` is within a reasonable window of the trace event timestamp. Prevents Agent from backdating.

### Long-term (structural — make `stop: yes` mechanically enforceable)

5. **HITL phase audit trail**: Each `stop: yes` phase (HITL1, HITL2) should write a signed receipt that includes:
   - The phase node file hash (proves correct phase was loaded)
   - The brief file hash (proves correct prompt was shown)
   - User confirmation timestamp
   - The gate can verify this receipt before allowing progression

6. **Phase-gate binding for interactive checkpoints**: The gate system currently binds `current-node` to gate — but only for non-interactive phases. For `stop: yes` phases, the gate could require that `enter-phase` was called for the HITL node before the next phase's gate can pass (same pattern as current handoff witnesses).

## Related

- **BUG-022**: Agent shortcuts undermine framework integrity — same root pattern (advisory contracts are bypassable)
- **BUG-024**: RUN.md entry bypass — same pattern at the framework entry point, before any gate exists
- **BUG-020**: `stop: no` is advisory — this is the sibling problem for non-interactive phases
- The `enter-phase` handoff witness pattern is the **proven fix** — it mechanically enforces what instructions alone cannot
