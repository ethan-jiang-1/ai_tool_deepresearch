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
---

# Selected Research-Access Adapter

This is the one selected HITL1 adapter. Its host is the Claude CLI started through
`DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs`, with the routing fact
`deepseek_anthropic_compatible`. The selected invocation is the generic launcher
mode. It does not add, accept, or rely on a caller-supplied permission-bypass option.

This contract is limited to selected-host invocation facts. The Phase Agent
actor-delivers those facts with the independent
`shared-hitl1-research-access-envelope.md` controller to one isolated probe after
the recorded HITL1 decision. That controller owns the sub-agent's bounded work and
compact observation guidance; it is separate from this adapter and does not change
the selected host's permission or operation surface.

The provider-scoped evidence form binds a selected native `WebSearch` result to its
selected native `WebFetch` target. Tool names, launcher `--check`, a shell
executable, chat text, command exit, a search snippet, or an empty/challenge/error
body are not evidence of available research access.
