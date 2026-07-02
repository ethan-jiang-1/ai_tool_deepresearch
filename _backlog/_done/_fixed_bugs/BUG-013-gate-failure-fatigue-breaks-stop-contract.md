# BUG-013: Gate failure fatigue causes Agent to violate stop:no contract

**Reported**: 2026-07-01 (split from BUG-008)
**Severity**: P1 (breaks core silent-execution contract)
**Status**: Open — defer to separate change
**Bundle**: `dpt_rb_ai-agents-chinese-hospital-systems-2026`
**Related**: [[BUG-008-agent-breaks-silent-execution-wave1-gate-failure]]

## Phenomenon

After ~8 consecutive gate-failure fix cycles across wave0 and wave1, the Agent violated the `stop: no` contract by presenting a false A/B choice to the user ("A: 回头做40个ref文件 / B: 认可现有深度跳过gate") instead of entering the silent count-floor re-fill loop.

## Root Cause

Gate failure fatigue: the Agent's decision quality degraded under accumulated frustration. The `stop: no` marker in each phase's frontmatter was treated as a guideline rather than a hard constraint. When tired, the Agent defaulted to "ask the user" — the most natural LLM fallback.

## Why This Wasn't Fixed in implement-evidence-extraction

The two root causes require engine-level changes beyond the scope of evidence extraction:

1. **Gate failure fatigue counter**: The gate-loop engine doesn't track consecutive failures or inject "step back" prompts. Adding this requires changes to the gate-loop engine or phase execution model.

2. **stop:no hard enforcement**: The framework has no mechanism to prevent an Agent from presenting user choices in `stop: no` phases. This requires either engine-level enforcement (detect user prompts and block) or Agent-level hardening (stronger prompt constraints).

## Proposed Fix Direction

1. Gate-loop tracks consecutive failures per gate — after N cycles (e.g. 5), inject a "Step back. Re-read the phase instructions. Do NOT ask the user." diagnostic prompt via inspect/advice.

2. Phase execution model adds `stop: no` enforcement — either through prompt hardening or engine detection of user-choice patterns.

## Tags

`silent-execution` `stop-contract` `gate-failure-fatigue` `deferred`
