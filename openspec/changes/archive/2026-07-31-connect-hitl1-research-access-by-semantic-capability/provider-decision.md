# Provider Decision

## Decision

The selected host runtime for this change is the existing Claude CLI launched by
`DPT_FRAMEWORK/host_tools/claude-deepseek.mjs`. Its launcher routing fact is
`deepseek_anthropic_compatible`; the configured model is deliberately not part of
the adapter identity. The selected invocation is that launcher's transparent generic
mode, with no caller-supplied permission-bypass option.

The user authorized this selection on 2026-07-31 by permitting either candidate
provider path and requiring this change to become apply-ready. No repository surface
named `damo`, `duolun`, `达摩`, or `多伦` exists. The selected runtime is therefore the
concrete, already configured host surface, rather than an inferred new provider or a
new provider-selection mechanism.

## Authoritative Facts And Limits

- `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` launches the Claude CLI with the
  configured DeepSeek Anthropic-compatible child environment.
- `DPT_FRAMEWORK/host_tools/lib/agent-cli-launcher.mjs` reports that routing as
  `deepseek_anthropic_compatible`.
- The accepted `local-deepseek-claude-launcher` contract and host-tools README state
  that the generic launcher does not add a permission bypass; the separate Autorun
  Headless mode owns its explicit bypass policy.
- `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md`
  already defines the provider-scoped real Subject route. Its deterministic observer
  checks public `WebSearch` results, returned order, and same-URL native `WebFetch`
  or the existing exact curl fallback.
- BUG-143 records that a prior run of this runtime was denied `WebSearch` host
  permission. Launcher configuration and tool names are not research-access proof.

The adapter contract will direct the launched Phase Agent to make one native
`WebSearch`, choose only an eligible returned HTTP(S) candidate in returned order,
and use native `WebFetch` on that exact URL. The existing independently permitted
same-URL curl fallback remains available only after native fetch has not returned
real page content. The Agent, not JavaScript, selects the neutral query and runs that
semantic sequence.

If the runtime has no callable search/fetch surface, or host policy denies it, the
contract returns `surface_absent` or `permission_required`, preserves HITL1, and
records the existing unavailable observation. Case 115's existing broad probe verdict
may still pass that honest branch; `apply-evidence.md` MUST record C5's narrower
available-path claim as `NOT_RUN` unless the retained trace proves an available
same-URL branch. This decision grants neither host tool permission nor a successful
research-access observation.

The current case-115 Subject runner supplies `--dangerously-skip-permissions` as an
experiment-specific argument. It is not evidence for this selected generic invocation
and must be removed or made unavailable for case 115 when the case is extended during
apply. A caller-supplied permission escalation is outside this adapter and requires a
separate user/host decision.

## Evidence Boundary

Case 115's retained Subject prompt, transcript, and result are the binding evidence
for the selected runtime only. Its observer derives the candidate sequence from the
public `WebSearch` `Links` payload and requires the profile result URL to equal the
returned candidate before accepting a native fetch or permitted curl branch. Raw query
text, candidate lists, page bytes, credentials, and transcripts remain outside the
production bundle, research evidence, receipt, and Gate authority.
