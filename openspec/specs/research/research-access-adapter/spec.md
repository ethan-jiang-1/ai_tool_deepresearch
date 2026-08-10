# Research-Access Adapter Specification

> req: REA-001, REA-002, REA-003

## Purpose

定义 HITL1 可使用的单一、显式选择的 research-access adapter，使 Agent 能以真实 search 结果和同 URL
page fetch 区分可用能力、host 权限边界与不诚实的成功声明。

## Requirements

### Requirement: Selected adapter declares semantic capability boundary

The system SHALL expose one selected HITL1 research-access adapter through an
Agent-readable contract. The selected adapter is the Claude CLI launched by
`claude-deepseek.mjs` with `deepseek_anthropic_compatible` routing. That contract
SHALL name its host owner, generic non-bypass launcher invocation, Agent-native
`WebSearch` and `WebFetch` invocation surfaces, the provider-scoped evidence form
that binds the two operations, and the launcher routing fact that identifies the
selected host runtime. It SHALL distinguish `surface_absent` and
`permission_required` from a search or fetch result.

The selected adapter contract is the Source of Record for what the Agent may invoke;
launcher `--check`, a shell executable, and chat text SHALL NOT establish research
access or tool permission. The system SHALL NOT introduce a provider registry, adapter
priority list, environment-variable selection protocol, or background capability
controller. The adapter SHALL NOT add or pass a caller-supplied permission-bypass
option; that is a separate host/user authorization decision.

#### Scenario: Selected adapter surface is absent

- **WHEN** the selected Claude CLI runtime exposes no callable declared search/fetch
  surface
- **THEN** the Agent SHALL record the existing honest unavailable observation with a
  `surface_absent` direct reason and rerun boundary
- **AND** it SHALL NOT construct a search URL, treat a fetch surface as search, or
  advance through the existing Gate

#### Scenario: A selected adapter has an unavailable host permission

- **WHEN** the declared adapter requires a host permission that the current Agent
  does not have
- **THEN** the Agent SHALL expose `permission_required` as the smallest external
  boundary before the same probe rerun
- **AND** user approval of research semantics SHALL NOT grant that host permission

#### Scenario: Selected generic invocation has no bypass

- **WHEN** the selected adapter launches its native Claude runtime
- **THEN** it SHALL use the generic `claude-deepseek.mjs` invocation without a
  caller-supplied permission-bypass option
- **AND** it SHALL report `permission_required` rather than escalate that option when
  the host declines the operation

### Requirement: Adapter probe binds search result to fetch target

The selected adapter contract SHALL direct one bounded neutral probe-agent
execution. The Phase Agent SHALL spawn that one isolated agent after the
recorded HITL1 decision; the probe agent's search operation returns actual
candidate HTTP(S) URLs in provider order and its fetch operation receives only
the currently selected URL returned by that search. The probe agent SHALL
return the existing compact `research_access` observation, and the Phase Agent
SHALL establish the accepted profile write and same Gate path from that return.

A thin host bridge MAY launch or normalize the selected native probe-agent
runtime, but SHALL NOT choose a query/candidate, perform search/fetch in place
of that agent, mutate a bundle, write an observation, or retry. The probe agent
does not read or write bundle state. The adapter retains one search, at most the
first three syntactically eligible candidates in order, native-first and one
permitted same-URL fallback. It SHALL not use model-invented URLs, snippets,
out-of-contract redirects, challenge shells, or command success as content.

#### Scenario: Probe-agent search and fetch establish available access

- **WHEN** the selected adapter returns an eligible candidate and the isolated probe
  agent fetches real requested-page content for that exact URL
- **THEN** its return SHALL contain the existing schema-valid available branch with
  actual surface labels
- **AND** the Phase Agent SHALL write it and rerun the existing HITL1 Gate without
  a new transition

#### Scenario: Fetch cannot use a different URL

- **WHEN** provider-scoped execution evidence cannot establish that a probe-agent
  fetch target was the current search-returned candidate
- **THEN** the probe agent SHALL return an honest unavailable direct failure
- **AND** the Phase Agent SHALL not write available access or continue to Setup

### Requirement: Adapter evidence is bounded to the observed provider runtime

The direct production profile observation remains distinct from external
provider evidence. Production HITL1 SHALL retain no query text, candidate lists,
page bytes, credentials, or raw provider transcripts. The selected real
agent-flow case SHALL retain only its declared isolated probe-agent prompt,
transcript, and result at the experiment run root. That evidence proves the
provider-scoped search/fetch/return-map claim only; it SHALL not enter the
production bundle or claim that the probe agent wrote profile state or ran a
Gate. Engine validation continues to validate only the direct profile observation.

The broad real canary MAY pass an honest unavailable branch, but it SHALL not
satisfy an available-path claim without retained evidence of an available
same-URL branch. It SHALL use the selected generic non-bypass invocation; an
explicit permission-bypass run is not availability evidence. Deterministic
fixtures may prove Phase relay, profile/Gate mechanics, adapter shape, or
unavailable routing, but never provider availability or real Agent behavior.

#### Scenario: Isolated canary does not impersonate Phase ownership

- **WHEN** case-115 observes a real probe agent
- **THEN** it SHALL assess public search/fetch events and the returned observation
  against the selected adapter bounds
- **AND** it SHALL not attribute `rb_profile.yaml` writes or HITL1 Gate execution to
  that isolated agent

#### Scenario: Production probe excludes raw provider material

- **WHEN** the Phase Agent records a returned available or unavailable observation
- **THEN** only accepted direct `research_access` fields SHALL enter the run bundle
- **AND** query, candidate list, page bytes, credentials, and transcript remain outside
  research evidence and control surfaces
