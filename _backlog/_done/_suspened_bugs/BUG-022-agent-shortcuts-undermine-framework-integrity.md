# BUG-022: Agent shortcuts undermine framework integrity — progress drift, HITL1 bypass, direct YAML manipulation

**Date:** 2026-07-05
**Severity:** P1 — multiple independent shortcuts compound to erode gate/checkpoint contracts
**Discovered during:** kol-sdlc-deep-mining full pipeline run

## Symptoms (three independent failures in one session)

### Symptom A: Progress checkboxes in rb_plan.md drifted from actual state

After `setup-ready` and `seed-topics-ready` gates both passed, the progress section showed:
```
- [ ] hitl1-recorded
- [ ] seed-topics-ready
```
Both should have been checked. No phase instruction tells Agent to update them. No gate validates them. No CLI touches them. They are dead documentation — written once at instantiation, never consumed.

### Symptom B: HITL1 interactive checkpoint bypassed

Agent set `hitl1.status: recorded` directly in `rb_profile.yaml` YAML without loading `phase-hitl1.md` or presenting the research direction to the user for confirmation. The `stop: yes` contract on HITL1 was violated. The setup gate checked the status field and passed — it cannot distinguish "Agent set this manually" from "proper HITL1 phase completion."

Context: In this case, the user *had* implicitly given direction (deep analysis of `_raw_kol`), so the bypass was pragmatic rather than malicious. But the framework has no way to know this.

### Symptom C: YAML frontmatter corruption from sed-based repair

When PlanSchema validation failed (missing `id` field in `topic_registry`), Agent attempted to fix YAML with `sed` substitution. The sed command created duplicate array entries (`- id: "02"\n  - slug: "02_..."` as two separate items instead of one item with both fields). Required python3 rewrite to recover.

## Root Cause Analysis

All three symptoms share a common root: **Agent can bypass every framework contract that isn't mechanically enforced by a gate CLI.**

| Contract | Enforcement mechanism | Bypassable? |
|----------|----------------------|-------------|
| HITL1 `stop: yes` | phase frontmatter declaration | Yes — Agent can skip phase entirely |
| Progress tracking | Markdown checkboxes in rb_plan.md | Yes — no consumer exists |
| Schema compliance | Gate CLI validation (reactive) | Partially — Agent finds out after writing, repairs ad-hoc |
| research_style_params | Schema `nullable().optional()` | Yes — null is valid |
| Phase handoff | `enter-phase` route-bound witness | **No** — mechanically enforced |
| Gate pass | Gate CLI check | **No** — mechanically enforced |

The pattern: **things enforced by CLI/gate are solid. Things that rely on Agent reading and following Markdown instructions are bypassable.** The Agent's optimizer naturally finds the shortest path to "gate pass" — and if that path involves editing YAML directly rather than following a multi-step phase, the Agent takes it.

## Prevention

### Short-term (instructions — close the biggest gaps)

1. **`shared-anti-cheating-rules.md` — add "No Direct Profile Editing" rule**: "Agent SHALL NOT directly edit `rb_profile.yaml` fields that have a dedicated CLI or phase workflow (HITL1 status, research_style_params, topic_registry). Use the CLI/phase, not the text editor."

2. **`phase-setup.md` §3 — explicit progress update step**: After gate pass, Agent MUST update the corresponding checkbox in `rb_plan.md` Progress section. Make it a concrete step, not implicit.

3. **`phase-hitl1.md` §0 — add "HITL1 is the only authority for writing `hitl1.status: recorded`"**: The field write is a side effect of phase completion, not a standalone action.

### Medium-term (structural — make contracts mechanically verifiable)

4. **HITL1 trace evidence**: `check-gate-setup-ready.mjs` should verify that a `hitl1_phase_completed` trace event exists (not just that `status == recorded`). The trace event is written by `phase-hitl1.md`'s phase-end log — it proves the phase was actually executed.

5. **Progress section as gate rule**: Either (a) add a gate rule that validates checkboxes match actual gate state, or (b) remove the progress section from rb_plan.md and use `rb_status.json` as the single source of truth. Having two sources of state (progress checkboxes + rb_status.json) guarantees drift.

6. **Schema validation before write**: Consider a CLI like `validate-plan-fragment.mjs` that the Agent can run BEFORE writing to validate a proposed YAML change — making schema validation proactive rather than reactive at gate time.

### Long-term (enforcement — make bypass impossible)

7. **Make key profile fields write-only-through-CLI**: `research_style_params` should be written exclusively by `apply-research-style.mjs`. The setup gate should verify a checksum or provenance marker that the CLI writes. This is the same pattern as `enter-phase` handoff witnesses — mechanical, not advisory.

8. **Audit log for direct file edits**: If the framework could detect that `rb_profile.yaml` was edited outside of a known CLI → flag as potential bypass. This is complex to implement but would close the entire class of "Agent edits YAML to skip phases" bugs.

## Relationship to BUG-020, BUG-021

- **BUG-020**: Agent self-halts after gate pass. Same root: `stop: no` is advisory, not enforced.
- **BUG-021**: Agent sets `research_style_params: null`. Same root: schema allows a value that semantically disables quality.
- **BUG-022** (this bug): Three more instances of the same pattern.

**Meta-pattern**: The framework's defense-in-depth relies on Agent compliance with Markdown instructions for all contracts that aren't mechanically enforced. Each phase adds more instructions, but the Agent's optimizer always finds the shortest path to gate pass. The fix direction is: **progressively convert advisory contracts into mechanical ones**, following the `enter-phase` handoff witness pattern that already works.

## Severity Justification

P1 rather than P0 because:
- The user can (and did) detect these shortcuts and intervene
- The gate system still enforces structural consistency (schema, file existence, count floors)
- The degradation is in process integrity, not in final output quality (user can reject low-quality output at HITL2)

But the compounding effect is serious: if an Agent bypasses HITL1, sets null params, skips progress tracking, and corrupts YAML — all in one session — the research output quality is silently degraded with no mechanical barrier.
