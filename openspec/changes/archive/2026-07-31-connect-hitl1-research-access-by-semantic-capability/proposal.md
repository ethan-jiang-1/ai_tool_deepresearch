## Why

BUG-143 shows that HITL1 currently has a valid fail-closed Gate but no DPT-owned
semantic entry for a host whose research tools are named differently from
`WebSearch` / `WebFetch`. Node `fetch`, bounded `curl`, or a launcher preflight can
each establish only a partial fact; none can honestly establish research access
without a real search result and a fetch of that same URL.

This change makes that missing integration boundary explicit for the selected Claude
CLI host launched through `claude-deepseek.mjs` and routed through the existing
DeepSeek Anthropic-compatible configuration. The selection is recorded in
[provider-decision.md](provider-decision.md); host permission remains an external
runtime fact, not an implementation assumption.

## What Changes

- Add one `research-access-adapter` capability that declares the selected, named
  host protocol for the Phase Agent's two native operations: search returns actual
  candidate HTTP(S) URLs in provider order, and fetch receives only a URL returned
  by that search and returns real requested-page content or an honest direct failure.
  It uses the generic `claude-deepseek.mjs` invocation without a caller-supplied
  permission-bypass option.
- Add a single HITL1-facing discovery/preflight route that identifies the selected
  adapter and the smallest unavailable boundary (absent surface or host permission),
  then directs the Agent to the same bounded probe
  and existing HITL1 Gate. It does not introduce a second Gate, lifecycle state,
  retry service, or status tree.
- Update HITL1 phase and Gate feedback so tool names and launcher configuration
  are never treated as capability proof, while an observed `search -> returned
  URL -> same-URL fetch` sequence can populate the existing direct
  `research_access` profile observation.
- Preserve the current unavailable branch and evidence boundary: probe URLs,
  query text, page bytes, and provider credentials remain outside research
  evidence, cache, receipts, submitted output, and Gate coverage.
- Reserve `v0.65` for the implementation release. The selected runtime is concrete,
  but apply SHALL not infer tool permission or provider availability from its
  launcher configuration.

## Capabilities

### New Capabilities

- `research-access-adapter`: The selected semantic search/fetch adapter contract,
  its direct facts, and its honest unavailable boundary.

### Modified Capabilities

- `pre-research-phase-content`: HITL1 guidance discovers and uses the selected
  semantic adapter without turning ordinary user confirmation into tool
  permission or pipeline execution.
- `pre-research-gate-implementation`: Existing Gate feedback names the direct
  adapter/provider boundary and retains the same Gate rerun path.

## Impact

- Expected implementation surfaces: `DPT_FRAMEWORK/host_tools/`, HITL1 phase and
  shared guidance, the existing profile observation writer path, and
  `check-gate-hitl1-recorded.mjs` feedback.
- Expected verification: focused `node:test` contract coverage plus a
  provider-scoped real Agent-flow observation. Deterministic fixtures may prove
  adapter and Gate mechanics, but cannot prove provider availability.
- No dependencies will be added. This does not create a generic provider
  registry, host scheduler, background retry loop, alternate Setup transition,
  or evidence authority.
