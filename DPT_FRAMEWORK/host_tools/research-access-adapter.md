---
schema: research-access-adapter/v1
adapter_id: claude-deepseek-websearch-webfetch/v1
host_owner: selected Claude CLI host runtime
launcher:
  entry: DPT_FRAMEWORK/host_tools/claude-deepseek.mjs
  routing: deepseek_anthropic_compatible
  permission_mode: generic_non_bypass
operations:
  search:
    surface: WebSearch
  fetch:
    surface: WebFetch
unavailable_roots:
  - surface_absent
  - permission_required
evidence:
  form: retained provider-scoped Subject trace with WebSearch -> returned URL -> same-URL WebFetch or permitted exact curl fallback
---

# Selected Research-Access Adapter

This is the one selected HITL1 adapter. Its host is the Claude CLI started through
`DPT_FRAMEWORK/host_tools/claude-deepseek.mjs`, with the routing fact
`deepseek_anthropic_compatible`. The selected invocation is the generic launcher
mode. It does not add, accept, or rely on a caller-supplied permission-bypass option.

The Phase Agent, not this host bridge, performs the bounded probe. It may invoke one
native `WebSearch`, use only returned eligible HTTP(S) URLs in provider order, and
invoke native `WebFetch` for the current returned URL. A native fetch that does not
return requested page content may use the existing phase-defined exact same-URL curl
fallback only when the host independently permits that fallback. The bridge does not
choose a query or candidate, run search/fetch, mutate a bundle, create retries, or
write a profile observation.

The direct result is ephemeral until the Phase Agent writes the existing
`rb_profile.yaml#/research_access` observation. An available observation requires a
real requested-page-content result for the same URL returned by this probe's search.
Tool names, launcher `--check`, a shell executable, command exit status, a search
snippet, or a deterministic fixture are not evidence of available research access.

When native search/fetch surfaces are absent, write the existing unavailable branch
with a reason beginning `surface_absent:`. When selected-host policy denies a declared
operation, write the existing unavailable branch with a reason beginning
`permission_required:`. Both preserve HITL1 choices and direct the Agent to rerun the
same bounded probe and existing Gate after the external boundary is resolved. Neither
root grants a fallback provider, permission escalation, user-run command, or profile
hand edit.

Only the retained case-115 Subject trace can support the selected host's available
claim. It must show `WebSearch`, a returned eligible URL, and native `WebFetch` or the
permitted exact curl fallback for that same URL. An unavailable or permission-denied
case-115 result remains an honest bounded-probe result but is not available-path proof.
