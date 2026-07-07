# BUG-021: research_style_params: null passes schema but silently disables all quality thresholds

**Date:** 2026-07-05
**Severity:** P1 — silently degrades research quality with no warning
**Discovered during:** kol-sdlc-deep-mining wave0 setup

## Symptom

Agent wrote `research_style_params: null` in `rb_profile.yaml`. Schema accepts it (`ResearchStyleParamsSchema.nullable().optional()`). Gate uses `resolveThreshold()` which defaults to `threshold: 1` when the profile path resolves to null. Result: wave0 per-topic source floor dropped from 10 (per `exploratory_map.json`) to 1, shared ref floor from 18 to 1 — with zero indication that quality thresholds were bypassed.

## Root Cause

Two interacting gaps:

1. **Schema allows null but null means "no quality floor"** — the nullable type conflates "intentionally unset" with "profile not selected" (`not_selected`). When `research_profile` is a real value like `exploratory_map`, the params should never be null.

2. **Agent didn't discover `apply-research-style.mjs`** — this CLI exists and works correctly (validated in the same session), but no phase instruction in the setup/seed-topics path explicitly tells the Agent to run it. The Agent must discover it through exploration or memory — fragile.

## Why The Agent Did This

Sequence:
1. Agent wrote custom `research_style_params` with ad-hoc fields (`depth`, `cross_validation`, `silence_dimension_hunting`) → schema rejected them
2. Agent saw `nullable().optional()` in schema → set to `null` as expedient fix
3. Schema accepted null → gate passed with threshold=1
4. No warning surfaced to Agent or user that quality was degraded

The Agent optimized for "make the gate pass" rather than "apply the correct research style."

## Prevention

### Short-term (instructions — prevent Agent from taking this shortcut)

1. **Add to `phase-setup.md` §3 (Allowed Actions)**: After HITL1 records a research profile ≠ `not_selected`, Agent MUST run `apply-research-style.mjs --style <profile>`. The CLI is the single computation point for params — Agent never writes them manually.

2. **Add to `shared-anti-cheating-rules.md`**: "Setting `research_style_params` to null or any value not computed by `apply-research-style.mjs` when `research_profile ≠ not_selected` is a quality bypass equivalent to skipping a gate."

### Medium-term (schema — make null impossible when profile is selected)

3. **Schema constraint**: `ProfileSchema` should conditionally require `research_style_params` to be non-null when `research_profile ≠ not_selected`. This makes the type system enforce the invariant rather than relying on Agent compliance.

4. **Gate-level assertion**: `check-gate-setup-ready.mjs` should validate that `research_style_params` fields match the research profile's JSON template. If params are null but profile is selected → fail with explicit advice to run `apply-research-style.mjs`.

### Long-term (discoverability)

5. **`COMMANDS.md` entry**: Add `apply-research-style` to the command index under HITL1/setup phase, so Agents consulting `COMMANDS.md` discover it.

## Related

- The `apply-research-style.mjs` CLI itself works correctly — this is purely an Agent compliance/discoverability issue
- Similar pattern to BUG-020: Agent takes shortcut that passes gate but undermines intent
