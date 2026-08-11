---
schema: research-access-adapter/v1
adapter_id: claude-deepseek-websearch-webfetch/v1
host_owner: selected Claude CLI host runtime
launcher:
  entry: DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs
  routing: deepseek_anthropic_compatible
  permission_mode: generic_non_bypass
operations:
  search:
    surface: WebSearch
  fetch:
    surface: WebFetch
evidence:
  form: retained provider-scoped Subject trace binding selected WebSearch output to the selected WebFetch target
scope: executor-scoped canary metadata only
---

# Execution-Neutral Direct Retrieval Boundary

Production HITL1 exposes one Agent-readable, execution-neutral direct-page retrieval
boundary. The direct observation asks only whether the **current executor** can
obtain real content for one controller-declared public URL using a surface that is
already available and permitted in that executor. The current executor's tool list,
host policy, and network policy are the Source of Record for whether an operation is
callable; this Markdown file, a launcher `--check`, a shell executable, or chat text
never establish that permission or availability.

The isolated `shared-hitl1-research-access-envelope.md` controller is the single
owner of the fixed sample IDs and URLs, group ordering, bounded concurrency,
timeout/confirmation rules, terminal classification, and the compact observation
shape. It is physically separate from this boundary and from the Phase body, and it
mentions neither a provider-specific tool name nor a provider selection rule. It
does not change host permission, runtime truth, or Gate authority.

## Retained Claude Launcher: Executor-Scoped Canary Only

The frontmatter above is the retained contract for the Claude CLI launcher
`claude-deepseek.mjs` with `deepseek_anthropic_compatible` routing, in generic
non-bypass invocation mode. It is executor-scoped canary metadata for that launcher's
own optional experiment: its `WebSearch` and `WebFetch` operation names describe that
launcher's own surfaces and never appear in the production controller, Phase
prerequisite, profile observation, or Gate predicate.

This launcher contract SHALL NOT be delivered as a production HITL1 operation
prerequisite, SHALL NOT select an operation for Codex or any other Coding Agent, and
SHALL NOT claim that one executor's tools are available in another. The system
introduces no provider registry, adapter priority list, environment-variable
selection protocol, background capability controller, or caller-supplied permission
bypass.

## Boundary Resolution

The boundary resolver maps only a schema-validated recorded legacy boundary location
to its owner and derives its repair kind from that owner. It never parses reason
prose, tool names, user language, VPN state, IP/geography, or a provider identity to
reconstruct classification. A direct observation that establishes no owner remains
explicitly unclassified.
