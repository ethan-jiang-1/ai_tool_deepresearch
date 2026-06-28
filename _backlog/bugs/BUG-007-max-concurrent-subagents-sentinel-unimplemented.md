# BUG-007: MAX_CONCURRENT_SUBAGENTS sentinel -1 documented but not implemented

**Status:** open
**Discovered:** 2026-06-29
**Severity:** high — spec claims a feature that the engine silently rejects

## What the spec says

`openspec/specs/subagent-dispatch/spec.md` § SUD-002:

> #### Scenario: MAX_CONCURRENT_SUBAGENTS = -1 means unlimited
> - **WHEN** `MAX_CONCURRENT_SUBAGENTS` is `-1`
> - **THEN** all current-task batch payload items SHALL be dispatched in a single batch
> - **AND** the concurrency cap check SHALL be bypassed

`DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` line 143:

| Value | Meaning |
|---|---|
| `-1` | Unlimited — all current-task batch items dispatched in a single batch |

## What the engine actually does

Two independent blockers prevent `-1` from working:

### Blocker 1: createDispatchManifest has no sentinel check

`DPT_FRAMEWORK/engine/subagent-relay.mjs` lines 531-532:

```js
if (configs.length > MAX_CONCURRENT_SUBAGENTS) {
    throw new Error(`Subagent concurrency cap exceeded: ${configs.length} > ${MAX_CONCURRENT_SUBAGENTS}`);
}
```

If `MAX_CONCURRENT_SUBAGENTS = -1`, the check becomes `configs.length > -1`, which is **true for any array of length ≥ 1**. Only empty arrays would pass. Every real dispatch would throw.

### Blocker 2: Zod schema rejects -1

`DPT_FRAMEWORK/engine/subagent-relay.mjs` line 146:

```js
concurrencyCap: z.number().int().positive(),
```

`z.number().positive()` requires `> 0`. Even if the sentinel check were fixed, committing a manifest with `concurrencyCap: -1` would fail schema validation.

## Root cause

`MAX_CONCURRENT_SUBAGENTS` is a `const` literal (line 116), not a config read from runtime state:

```js
export const MAX_CONCURRENT_SUBAGENTS = 8;
```

There is no mechanism for a phase node, bundle, or CLI to override this value. The `-1` sentinel was documented as aspirational intent — "planned but not implemented" per `guidelines/agentic-subagent-mechanism.md` line 382 — but the spec treats it as a requirement.

## What needs to change

1. **createDispatchManifest** must check for sentinel before comparing: `if (MAX_CONCURRENT_SUBAGENTS > 0 && configs.length > MAX_CONCURRENT_SUBAGENTS)`
2. **DispatchManifest schema** must accept `-1`: change `z.number().int().positive()` to `z.number().int().min(-1)` or add a union/refine
3. **MAX_CONCURRENT_SUBAGENTS** must become runtime-configurable (env var, phase frontmatter, or bundle config) for the sentinel to be useful — a hardcoded `const` that equals `-1` permanently defeats the purpose of having a cap

Or: deprecate the `-1` scenario from the spec if it's not actually needed. The current cap of 8 has not been a bottleneck in any experiment or production run.

## Related

- `openspec/specs/subagent-dispatch/spec.md` — SUD-002 scenario (lines 84-88)
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` — concurrency table (line 143)
- `guidelines/agentic-subagent-mechanism.md` — line 382 acknowledges "sentinel planned but not implemented"
