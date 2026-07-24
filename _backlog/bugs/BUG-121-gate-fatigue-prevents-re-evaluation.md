# BUG-121: Gate fatigue permanently caches failures — prevents re-evaluation after Agent fixes

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-121 |
| **Severity** | P1 |
| **Phase** | wave1 |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

After 10+ gate retries, rules that the Agent has FIXED remain in `check.failed_rule_ids` with ZERO corresponding inspect items. The gate emits `[degraded_not_eligible] Fatigue threshold reached, but runtime-truth or structural blocker(s) remain: <rule_ids>`. The rules listed have NO actual violations — the gate is reporting cached failures from earlier attempts.

## Concrete Example

### Attempt 5 (early): depth-review.yaml has wrong schema
```
Inspect: [depth_review_contract] FAIL: depth_dimensions must be an object...
Failed: [..., per_topic_depth_review_contract, ...]
```

### Attempt 7 (after fix): depth-review.yaml corrected
Agent fixed depth-review.yaml: changed `depth_dimensions` from array to object with keys `mechanism`, `trend_or_difficulty`, `limitation_or_dispute`. Added `carried_targets` as `{target_id, target_text}` objects. Added `version`, correct `decision: accept`.

```
Inspect: (NO depth_review_contract errors)
Failed: [..., per_topic_depth_review_contract, ...]  ← STILL FAILING
```

The rule `per_topic_depth_review_contract` appears in `check.failed_rule_ids` but has ZERO inspect items. The only mention is in the fatigue summary:
```
[degraded_not_eligible] Fatigue threshold reached, but runtime-truth or structural blocker(s) remain: per_topic_depth_review_contract, ...
```

### Other rules that WERE re-evaluated correctly
In the same gate run, other rules show changed status:
- `reference_format` — previously had 200+ violations, now has 0 (fixed → re-evaluated → passed)
- `reference_index_coverage` — previously failed, now passed (after _INDEX.md fix)
- `per_topic_ref_md_count_floor` — previously 0 countable, now 40 countable (fixed → passed)

Only `per_topic_depth_review_contract` is stuck — suggesting fatigue affects rules individually, not uniformly.

## Why This Is Fatal

The gate is the ONLY legal path to advance phases. When fatigue caches a failure:
1. `check.passed = false`
2. `check.next = null` — no handoff, not even degraded
3. `routing.kind = "no_transition"` — framework refuses to advance
4. `--attempt N` flag doesn't bypass fatigue (tried with `--attempt 10`)

The phase boundary becomes permanently impassable. The Agent cannot advance to wave2 or HITL2 through any legal path.

## Suspected Mechanism

The gate likely tracks per-rule attempt counts or per-rule failure streaks. When a rule fails N consecutive times, it enters a "fatigue" state where the gate stops evaluating it (presumably to prevent infinite repair loops). But the fatigue state doesn't clear when the Agent fixes the underlying issue — the gate simply skips evaluation and keeps the cached failure.

The `degraded_not_eligible` message suggests there's a degraded pass mechanism, but it's gated on fatigue status. If fatigue is reached, degraded pass is disabled ("not eligible").

## Expected Behavior

1. When Agent fixes content, the next gate run should re-evaluate ALL rules — fatigue should limit repair attempts, not limit evaluation
2. Or: fatigue should reset when the inspect output for a rule shows zero violations
3. Or: `--attempt N` with a high N should force full re-evaluation
4. Or: there should be a `--reset-fatigue` or `--force-reevaluate` flag

## Workaround (Partial)

The Agent discovered that fatigue is per-gate-run-sequence, not permanent. In wave0, the gate eventually passed after all rules were fixed — fatigue didn't prevent re-evaluation there (8 attempts). In wave1, fatigue kicked in after ~10 attempts. The different thresholds suggest a configurable or phase-specific limit.

The ONLY workaround is: don't let the gate fail more than ~8 times. Fix as many issues as possible per attempt to stay under the fatigue threshold. But this requires knowing ALL requirements upfront — which BUG-120 makes impossible.

## Suggested Fix

In the gate evaluation engine (likely `DPT_FRAMEWORK/engine/helpers/gate-helpers-serial.mjs` or gate runner):
1. Fatigue should track REPAIR ATTEMPTS for a specific issue, not GATE RUNS
2. When a rule's inspect items drop to zero (all previous violations resolved), reset that rule's fatigue counter
3. `--attempt N` with N > fatigue_threshold should force full re-evaluation
4. Or: add a `--revalidate-all` flag that clears fatigue state
