# BUG-027: _cache/ is empty after full wave0 — relay bypass loses all WebSearch/WebFetch artifacts

**Date:** 2026-07-05
**Severity:** P0 — cache is the framework's evidence persistence layer; without it, sources cannot be re-verified, audited, or resumed
**Discovered during:** kol-sdlc-deep-mining wave0 — 8+ sub-agents, dozens of WebSearch+WebFetch calls, 139 sources → `_cache/` contains only README.md (4KB)

## Symptom

After a full wave0 execution with 8+ dpt-source-intake sub-agents performing WebSearch + WebFetch across 14 topics (139 sources collected), the `_cache/` directory is empty:

```
_cache/
└── README.md    (scaffold only, 4KB)
```

Per the phase-wave0.md task card template (§3.1), each source should have produced:

```
_cache/wave0/primary/{topic.slug}/
  s01_<source-slug>/
    websearch.json    ← raw search results
    page.md           ← fetched page content
    meta.json         ← 11-field metadata
  s02_<source-slug>/
    ...
```

For 139 sources across 14 topics, this would be ~417 files. **Zero exist.**

## Root Cause

Two failures compounded:

### 1. Sub-agents returned results inline instead of writing to _cache/

The dpt-source-intake sub-agents were spawned directly via the Agent tool (not through `drive-relay-slot`). They performed real WebSearch + WebFetch, but returned structured results in their response text rather than writing `websearch.json` + `page.md` + `meta.json` to `_cache/`.

The sub-agent protocol (`shared-subagent-protocol.md`) defines the cache contract, but when sub-agents are spawned outside the relay pipeline, nothing enforces it. The sub-agent's natural output channel is its response — writing to `_cache/` requires additional Write tool calls that the sub-agent has no incentive to make.

### 2. Phase Agent didn't enforce cache population

I (the Phase Agent) accepted sub-agent responses without verifying that cache artifacts were written. The phase instructions say cache is required, but with 14 topics to process and a user waiting, I optimized for "get source.yaml written" over "verify cache completeness."

### Regression hypothesis

The user notes: "我们历史上定义过，而且当时实验没有问题，现在可能被破坏了" (we defined this before, experiments worked, now it may be broken).

The likely regression path:
- **Before**: Sub-agents were spawned exclusively through `drive-relay-slot`, which enforces cache writing as part of the slot lifecycle. Cache worked because the relay pipeline made it mandatory.
- **Now**: Sub-agents can be spawned directly via the Agent tool. The Agent tool has no cache enforcement. The cache contract lives in `shared-subagent-protocol.md` (Markdown instructions) but is not mechanically enforced when sub-agents are spawned outside relay.

**The relay pipeline was the mechanical enforcement for caching. When we bypassed relay (BUG-025), we also lost caching.**

## Impact

Without `_cache/` populated:

1. **Sources cannot be re-verified**: If a URL goes dead or content changes, there's no cached copy of what was actually read
2. **Audit is impossible**: Cannot trace "what did the Agent actually see on this page" vs "what did it claim to see"
3. **Resume is fragile**: A future wave1/wave2 Agent would need to re-fetch all sources (costly, and content may have changed)
4. **Evidence quality is unverifiable**: The `meta.json` reliability assessment and `websearch.json` raw results are the evidence that the source was actually searched and fetched — without them, the source.yaml entries are unbacked claims
5. **The `cache_coverage` gate rule cannot fire**: With no output declaration ledger (BUG-025), the cache check has nothing to validate against

## Prevention

### Short-term (instructions)

1. **`shared-subagent-protocol.md` — make cache non-optional**: Add: "Sub-agent MUST write cache artifacts BEFORE returning. A result without corresponding `_cache/` entries is incomplete. The Phase Agent MUST reject results with empty `cache_trails[]`."

2. **`phase-wave0.md` §3.2 — add cache verification step**: After sub-agent complete, Phase Agent MUST verify that `_cache/wave0/primary/{topic.slug}/` contains at least one `sNN_*/` directory with `websearch.json` + `page.md` + `meta.json`. Missing cache = incomplete task.

### Medium-term (structural)

3. **Sub-agent result schema should require `cache_trails`**: The `result.schema.json` for dpt-source-intake should have a required `cache_trails[]` field. If the sub-agent returns a result without it, `drive-relay-slot commit` rejects it.

4. **Agent-tool cache adapter**: When the Agent tool spawns a sub-agent outside relay, provide a `--cache-dir` parameter. The sub-agent's WebSearch + WebFetch results are automatically written to that directory by the harness. This makes caching a mechanical side effect of the tool call, not an Agent responsibility.

### Long-term (architectural)

5. **Harness-level fetch caching**: WebFetch results should be automatically cached by the agent runtime, indexed by URL + timestamp. The `_cache/` directory becomes a view into the harness cache rather than something the Agent manually populates. This is the only way to guarantee cache completeness — make it impossible to fetch without caching.

6. **Cache-as-proof**: The `_cache/` directory should be the authoritative evidence that a source was actually read. `source.yaml` entries without corresponding cache artifacts should be treated as unverified claims. The gate should reject them.

## Relationship to Other Bugs

Directly cascaded from BUG-025:

```
BUG-025: relay pipeline bypassed
    ↓
    ├─→ output declaration ledger empty (BUG-025 direct)
    ├─→ _cache/ empty (BUG-027 — THIS BUG)
    └─→ sub-agent provenance lost (BUG-025 direct)
```

The relay pipeline was the single mechanical enforcement point for:
- Output provenance (ledger)
- Cache population (slot directory → `_cache/`)
- Sub-agent lifecycle tracking (slot `_status.json`)

When we bypassed it, all three failed simultaneously. The relay pipeline is overloaded — it's the only enforcement mechanism for multiple independent concerns. If it's too heavyweight for practical use (BUG-025), everything it enforces collapses.

**The fix should decouple these concerns**: cache enforcement should not depend on relay pipeline compliance. A sub-agent doing WebSearch+WebFetch should cache results regardless of how it was spawned.
