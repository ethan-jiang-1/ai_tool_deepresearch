# research/research-access-adapter (delta)

## MODIFIED Requirements

### Requirement: Selected adapter declares semantic capability boundary

The system SHALL expose one selected HITL1 research-access adapter through an
Agent-readable contract. The selected adapter is the Claude CLI launched by
`claude-deepseek.mjs` with `deepseek_anthropic_compatible` routing. That contract
SHALL name its host owner, generic non-bypass launcher invocation, Agent-native
`WebSearch` and `WebFetch` invocation surfaces, the provider-scoped evidence form
that binds the two operations, and the launcher routing fact that identifies the
selected host runtime.

The selected adapter contract SHALL own only selected-host invocation facts. It
SHALL NOT carry source-class declarations, neutral queries, boundary axes, reason
prefix taxonomy, first-success control flow, or the probe return map. Those
isolated-sub-agent constraints SHALL live in the actor-delivered
`shared-hitl1-research-access-envelope.md` controller, distinct from this host
adapter contract and from the Phase body. The controller is Agent-readable guidance
only; it does not change host permission, selected operation, runtime truth, or Gate
authority.

The adapter resolver implementation SHALL map only a schema-validated recorded
unavailable `access_boundary` location to its owning selected-host or Agent boundary
and derive the repair kind from that owner. It SHALL NOT parse reason prose, its
position, or a textual prefix to reconstruct classification. An observation that
establishes no owning boundary SHALL remain honest and explicitly unclassified. An
available class-scoped access boundary is not a resolver or Gate input.

The selected adapter contract is the Source of Record for what the Agent may invoke;
launcher `--check`, a shell executable, and chat text SHALL NOT establish research
access or tool permission. The system SHALL NOT introduce a provider registry, adapter
priority list, environment-variable selection protocol, or background capability
controller. The adapter SHALL NOT add or pass a caller-supplied permission-bypass
option; that is a separate host/user authorization decision.

#### Scenario: Dedicated controller remains separate from selected adapter

- **WHEN** the Phase Agent loads the selected adapter for one bounded probe
- **THEN** the adapter contract SHALL provide only host/launcher/operation facts
- **AND** the separate actor-delivered controller SHALL provide source-class,
  classification, and return-map guidance without becoming adapter or Gate authority

#### Scenario: Selected generic invocation has no bypass

- **WHEN** the selected adapter launches its native Claude runtime
- **THEN** it SHALL use the generic `claude-deepseek.mjs` invocation without a
  caller-supplied permission-bypass option
- **AND** it SHALL report the host-policy boundary location rather than escalate that
  option when the host declines the operation

### Requirement: Adapter probe binds search result to fetch target

The Phase Agent SHALL spawn one bounded isolated probe after the recorded HITL1
decision. The dedicated actor-delivered controller directs its neutral source-class
sequence and compact return map; this adapter contract supplies the selected host's
search/fetch operation facts used by that sequence. The probe agent's search operation
returns actual candidate HTTP(S) URLs in provider order and its fetch operation
receives only the currently selected URL returned by that search. The Phase Agent
SHALL establish the accepted profile write and same Gate path from the returned
existing `research_access` observation.

A thin host bridge MAY launch or normalize the selected native probe-agent
runtime, but SHALL NOT choose a query/candidate, perform search/fetch in place
of that agent, mutate a bundle, write an observation, or retry. The probe agent
does not read or write bundle state. The controller retains one search per declared
source class, at most the first three syntactically eligible candidates in order for
that class, native-first and one permitted same-URL fallback. It SHALL not use
model-invented URLs, snippets, out-of-contract redirects, challenge shells, or
command success as content.

#### Scenario: Probe-agent search and fetch establish available access

- **WHEN** the selected adapter returns an eligible candidate and the isolated probe
  agent fetches real requested-page content for that exact URL
- **THEN** its return SHALL contain the existing schema-valid available branch with
  actual surface labels
- **AND** the Phase Agent SHALL write it and rerun the existing HITL1 Gate without
  a new transition

#### Scenario: Controller drives the bounded source-class sequence

- **WHEN** the probe receives the required access-envelope controller with the
  selected adapter operation facts
- **THEN** it SHALL follow the controller's declared class order and first-success
  boundary while using only host operations declared by this adapter
- **AND** this adapter contract SHALL not duplicate the controller's class/query or
  return-map content

#### Scenario: Fetch cannot use a different URL

- **WHEN** provider-scoped execution evidence cannot establish that a probe-agent
  fetch target was the current search-returned candidate
- **THEN** the probe agent SHALL return an honest unavailable direct failure
- **AND** the Phase Agent SHALL not write available access or continue to Setup
