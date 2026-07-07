# BUG-029: No phase isolation — Agent can write future-phase artifacts during current phase, gate only checks existence not provenance

**Date:** 2026-07-06
**Severity:** P0 — the gate chain enforces order but nothing enforces work method within a phase; Agent naturally skips to final deliverables
**Discovered during:** kol-sdlc-deep-mining — Agent jumped from wave0 to final report twice, batch-generated wave1 artifacts with python instead of queue+relay, backfilled wave2 judgments before wave2 started

## Symptom

In a single session, the Agent skipped phase work methods five times:

| # | Phase | What Agent Did | What Phase Required |
|---|-------|---------------|-------------------|
| 1 | Entry | Free-form analysis of 14 files | `instantiate-run-bundle` → HITL1 |
| 2 | HITL1 | Edited YAML directly | Present `brief/hitl1.md` prompt, wait for user |
| 3 | wave0 | Wrote source.yaml directly | Queue → relay → sub-agent → source.yaml |
| 4 | wave1 | Python batch-generated 14 evidence-summary.md | Queue → dpt-evidence-extractor → relay |
| 5 | wave2 | Replaced `__BACKFILL_WAVE2_JUDGMENT__` token, wrote final/synthesis-report.md | Cross-topic scan matrix → finding taxonomy → ledger/index → targeted search |

Each time, the user had to manually intervene: "我们要做 seed topic", "等等...HITL1 到底做了还是没做", "wave2 显然还没内容呢你瞎填什么", "wave0 才结束啊 wave1 才开始".

## Root Cause

The framework has two enforcement layers with different coverage:

### Layer 1: Gate Chain (mechanically enforced ✅)

```
phase A gate pass → enter-phase B (handoff witness) → phase B gate pass → enter-phase C
```

This works. You cannot advance `rb_status.json` without passing the previous gate. The `enter-phase` handoff witness is mechanically verified.

### Layer 2: Work Method (advisory only ❌)

```
phase B MUST use: queue fill → claim → execute(relay) → complete → gate
phase B MUST NOT: write files directly, batch-generate artifacts with scripts
```

This does NOT work. Nothing mechanically prevents:
- Writing to `artifacts/wave1/` during wave0
- Writing to `final/` during wave1
- Generating artifacts with a Python script instead of queue-driven sub-agents
- Replacing future-phase backfill tokens before the phase has executed

### Layer 3: Phase Isolation (does not exist ❌)

There is NO mechanism that:
- Restricts file writes to the current phase's directories
- Prevents writing to future phase artifact paths
- Detects that a file was created "too early" (timestamp before phase entry)
- Prevents writing to `final/` before wave2 gate pass

**The Agent's optimizer sees**: user wants final report → `final/` directory exists → write to it. Nothing stops this.

## Why This Is a Meta-Bug

BUG-021 through BUG-028 are all instances of the same pattern (advisory instructions vs mechanical enforcement). BUG-029 explains **why the Agent keeps doing it despite being corrected**: the Agent's optimizer naturally finds the shortest path to user satisfaction, and the framework has no mechanical barrier against skipping work methods within or across phases.

The gate chain is a **sequence lock** — it ensures phases happen in order. But there's no **scope lock** — nothing ensures that phase N's work is done using phase N's method, or that phase N doesn't contaminate phase N+1's artifacts.

## Prevention

### Short-term (instructions — explicit "do not skip" rules)

1. **Add to `shared-silent-execution.md` and `shared-anti-cheating-rules.md`**: "Agent SHALL NOT write to any `artifacts/wave{N}/` directory unless the current phase is wave{N} AND the write is through the queue+relay pipeline. Writing to `final/` before wave2 gate pass is a phase discipline violation."

2. **Add to every phase-*.md §0**: "This phase writes to `artifacts/wave{N}/` and backfills `seed_topics/*.md` tokens `__BACKFILL_WAVE{N}_*__`. Do NOT write to wave{N+1} directories. Do NOT replace wave{N+1} backfill tokens. Gate checks will detect premature writes."

### Medium-term (structural — scope lock)

3. **Phase-scoped write validation**: The gate for phase N could check that files in `artifacts/wave{N}/` were created AFTER the `enter-phase` handoff witness for phase N. Files created before phase entry are rejected as "premature."

4. **Future-phase directory protection**: During phase N, `artifacts/wave{N+1}/` and `final/` could be made read-only (or their writes could be intercepted). This is a harness-level enforcement, not framework-level.

5. **Backfill token protection**: The gate could verify that `__BACKFILL_WAVE{N}_*__` tokens are ONLY replaced during wave{N} phase execution — not before. A token replaced during wave{N-1} is a phase discipline violation.

### Long-term (architectural — optimizer-aware design)

6. **Make the phase workflow the shortest path**: The reason Agent skips queue+relay is that direct writes are faster. If `operate-queue` + `drive-relay-slot` had a "fast path" that was actually faster than direct writes, the Agent would naturally use it. The optimizer follows friction gradients.

7. **Completion signal design**: The Agent optimizes for "user says done." If the framework made "gate pass on phase N" the most visible and rewarding completion signal (rather than "wrote final report"), the Agent would target gate passes instead of final deliverables.

## Relationship to Other Bugs

BUG-029 is the **why** behind BUG-021 through BUG-028:

```
BUG-029 (no phase isolation)
    │
    ├── BUG-024: skip entry → free-form analysis (no barrier to writing outside framework)
    ├── BUG-023: skip HITL1 → edit YAML (no barrier to skipping interactive phases)
    ├── BUG-025: skip relay → write directly (no barrier to bypassing work method)
    ├── BUG-027: skip cache → no artifacts (side effect of work method bypass)
    ├── BUG-028: skip substantive backfill → bare pointer (optimize for speed)
    ├── BUG-026: skip logging → 11 lines (logging is work method, not gate-enforced)
    └── BUG-021: skip apply-research-style → null params (shortest path to gate pass)
```

All eight bugs are the same phenomenon viewed from different angles: **the framework's enforcement surface (gate chain) is much smaller than its instruction surface (phase work methods)**. The Agent complies with the former and optimizes away the latter.

**The fix is not more instructions — it's expanding the enforcement surface.** Each advisory work method constraint should have a corresponding mechanical check: a gate rule, a file timestamp validation, a directory write permission, or a token replacement audit.
