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

The contract SHALL declare the unavailable classification as two independent axes
rather than one flat list of roots.

The boundary-location axis SHALL be a closed enumeration in which each value names
exactly one owning boundary:

- an absent callable declared surface on the selected host runtime;
- a selected-host policy denial of a declared operation;
- a network path that cannot reach a declared source class while the host surface
  and host policy both permit the operation; and
- a failure of the Phase Agent to spawn the isolated probe or to obtain a valid
  return from it.

Each boundary-location value SHALL resolve to exactly one owner, and the projected
repair kind SHALL be derived from that owner rather than declared independently
alongside it. The first three values SHALL resolve to boundaries outside the Agent;
the probe-relay value SHALL resolve to the Agent and SHALL NOT be presented as an
external prerequisite for the user to resolve.

The boundary-extent axis SHALL be a closed enumeration distinguishing a boundary
that applies to every declared source class from one that applies only to a subset
of them.

The contract SHALL declare a bounded static source-class set used by the bounded
probe. That set SHALL be a framework declaration rather than prompt-embedded text,
SHALL be fixed width, and SHALL be revisable as declaration data without changing
the classification axes or the admission rule.

The selected adapter contract SHALL NOT require every honest unavailable observation
to assert a boundary-location value. An observation that establishes no owning
boundary SHALL remain honest and SHALL be reported as explicitly unclassified.
Classification SHALL be carried as a direct validated value; it SHALL NOT be derived
from reason prose, its position, or a textual prefix.

The selected adapter contract is the Source of Record for what the Agent may invoke;
launcher `--check`, a shell executable, and chat text SHALL NOT establish research
access or tool permission. The system SHALL NOT introduce a provider registry, adapter
priority list, environment-variable selection protocol, or background capability
controller. The adapter SHALL NOT add or pass a caller-supplied permission-bypass
option; that is a separate host/user authorization decision.

#### Scenario: Selected adapter surface is absent

- **WHEN** the selected Claude CLI runtime exposes no callable declared search/fetch
  surface
- **THEN** the Agent SHALL record the existing honest unavailable observation carrying
  the absent-surface boundary location, its universal extent, and the rerun boundary
- **AND** it SHALL NOT construct a search URL, treat a fetch surface as search, or
  advance through the existing Gate

#### Scenario: A selected adapter has an unavailable host permission

- **WHEN** the declared adapter requires a host permission that the current Agent
  does not have
- **THEN** the Agent SHALL expose the host-policy boundary location as the smallest
  external boundary before the same probe rerun
- **AND** user approval of research semantics SHALL NOT grant that host permission

#### Scenario: Network path cannot reach some declared source classes

- **WHEN** the host surface is callable and host policy permits the declared
  operation, but no legal attempt for a subset of declared source classes returns
  real requested page content
- **THEN** the observation SHALL carry the network-path boundary location with the
  class-scoped extent
- **AND** it SHALL NOT be recorded as an absent surface or a host policy denial

#### Scenario: Probe relay failure is owned by the Agent

- **WHEN** the Phase Agent cannot spawn the isolated probe or receives no valid
  return from it
- **THEN** the recorded observation SHALL carry the probe-relay boundary location
- **AND** its derived repair SHALL address the Agent rather than present an external
  prerequisite for the user to resolve

#### Scenario: Honest observation without an established boundary

- **WHEN** a direct failure observation establishes no owning boundary
- **THEN** the observation SHALL remain honest with its direct non-empty reason and no
  boundary-location value
- **AND** the reason prose, its position, or a textual prefix SHALL NOT be parsed to
  assign a boundary

#### Scenario: Selected generic invocation has no bypass

- **WHEN** the selected adapter launches its native Claude runtime
- **THEN** it SHALL use the generic `claude-deepseek.mjs` invocation without a
  caller-supplied permission-bypass option
- **AND** it SHALL report the host-policy boundary location rather than escalate that
  option when the host declines the operation

### Requirement: Adapter probe binds search result to fetch target

The selected adapter contract SHALL direct one bounded neutral probe-agent
execution. The Phase Agent SHALL spawn that one isolated agent after the
recorded HITL1 decision; the probe agent's search operation returns actual
candidate HTTP(S) URLs in provider order and its fetch operation receives only
the currently selected URL returned by that search. The probe agent SHALL
return the existing compact `research_access` observation, and the Phase Agent
SHALL establish the accepted profile write and same Gate path from that return.

The probe SHALL traverse the declared source classes in their declared order and
SHALL stop at the first class for which it obtains real requested page content.
Availability SHALL require real requested page content for at least one declared
source class; it SHALL NOT require content for every declared class. For each class
the probe SHALL retain only one closed-enumeration reachability result. The probe
SHALL NOT retain per-class attempt histories, response bodies, HTTP status codes, or
query text, and SHALL NOT add a search, fallback tier, or retry beyond the bounds
already declared for a single class.

A thin host bridge MAY launch or normalize the selected native probe-agent
runtime, but SHALL NOT choose a query/candidate, perform search/fetch in place
of that agent, mutate a bundle, write an observation, or retry. The probe agent
does not read or write bundle state. The adapter retains one search per declared
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

#### Scenario: First reachable declared class ends the probe

- **WHEN** the probe obtains real requested page content for the first declared
  source class it attempts
- **THEN** it SHALL return the available branch without attempting any later declared
  class
- **AND** the unattempted classes SHALL be recorded as not attempted rather than as
  unreachable

#### Scenario: Later declared class establishes availability

- **WHEN** an earlier declared source class returns no real requested page content and
  a later declared class does
- **THEN** the observation SHALL be available and SHALL retain the reachable class and
  its final considered URL
- **AND** the earlier class SHALL be retained as unreachable without becoming a
  blocking result

#### Scenario: Fetch cannot use a different URL

- **WHEN** provider-scoped execution evidence cannot establish that a probe-agent
  fetch target was the current search-returned candidate
- **THEN** the probe agent SHALL return an honest unavailable direct failure
- **AND** the Phase Agent SHALL not write available access or continue to Setup
