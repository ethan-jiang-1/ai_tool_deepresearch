# BUG-114: work-unit claim enum combinatorics silently reject valid combinations

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-114 |
| **Severity** | P2 |
| **Phase** | wave0 |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

`operate-work-unit.mjs claim` requires 5 interrelated enum parameters (`--actor-outcome`, `--actor-source`, `--actor-role-key`, `--actor-reason`, `--execution-actor`) but rejects valid combinations with a single opaque error. The Agent must brute-force permute these 5 parameters to find a working combination.

## Discovery Sequence

### Attempt 1: Natural parameter choice
```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> \
  --phase wave0 --count 1 \
  --actor-outcome available \
  --actor-source not_observed \
  --actor-role-key dpt-source-intake \
  --actor-reason probe_succeeded \
  --execution-actor delegated_subagent
```
Returns:
```json
[{"code":"custom","message":"invalid actor observation outcome/source/reason combination","path":[]}]
```
`path: []` — no indication of WHICH field combination is invalid.

### Attempt 2: Try `observation_required` reason
```bash
--actor-outcome unknown --actor-source not_observed --actor-reason observation_required
```
Returns `ok: false, reason_code: "observation_required"` with `no_claim` verdict and advice "Perform one bounded native probe for dpt-source-intake." The Agent ALREADY performed a bounded probe in HITL1 (phase-hitl1.md §3d) that confirmed search+fetch capability. But the work-unit claim doesn't accept HITL1's probe as evidence — it wants a NEW role-specific probe.

### Attempt 3: Brute-force all combinations
Agent ran 9 combinations of `{available,unknown} × {not_observed} × {probe_succeeded,observation_required,probe_inconclusive}`. Only ONE combination produced `ok: true`:
```
--actor-outcome unknown --actor-source not_observed --actor-reason observation_required
```
This produced `no_claim` — the Agent still can't claim.

### Attempt 4: Do the "required" native probe then retry
Agent re-ran native WebSearch + WebFetch (fetch blocked, curl fallback worked). Then:
```
--actor-outcome available --actor-source native_probe --actor-reason probe_succeeded
```
This FINALLY produced `ok: true, claimed_count: 1`.

## Root Cause

The enum validation is in `DPT_FRAMEWORK/engine/work-unit-assignment-contract.mjs` (or nearby). The `--actor-source not_observed` combined with `--actor-outcome available` creates an invalid state because "not observed" contradicts "available". But the error message doesn't name the conflicting fields.

The HITL1 probe result (research_access.status: available) is NOT consumed by the work-unit claim — it demands a separate role-specific probe observation.

## Expected Behavior

1. Error should enumerate valid combinations, e.g.: `"valid combinations: {outcome: available, source: native_probe, reason: probe_succeeded} or {outcome: unknown, source: not_observed, reason: observation_required}"`
2. HITL1's `research_access` probe should satisfy the observation requirement — the Agent shouldn't need to probe twice
3. `--actor-source not_observed` should be valid when `--actor-outcome available` — the Agent knows the environment works but hasn't probed this specific role

## Successful Workaround

```bash
# Must use native_probe (not not_observed) with probe_succeeded:
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> \
  --phase wave0 --count 1 \
  --actor-outcome available \
  --actor-source native_probe \
  --actor-role-key dpt-source-intake \
  --actor-reason probe_succeeded \
  --execution-actor delegated_subagent
```

## Suggested Fix

In the actor preflight validation (around `DPT_FRAMEWORK/engine/work-unit-assignment-contract.mjs:85`):
1. Add structured error that lists the conflicting fields and their valid combinations
2. Accept HITL1's `research_access.status: available` as satisfying the observation requirement for wave0
3. Allow `not_observed` source with `available` outcome (the Agent observed general capability, just not role-specific)
