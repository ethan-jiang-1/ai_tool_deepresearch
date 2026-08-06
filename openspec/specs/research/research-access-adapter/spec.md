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

The selected adapter contract SHALL direct one bounded neutral Phase Agent probe in
which its search operation returns actual candidate HTTP(S) URLs in provider order and
its fetch operation receives only the currently selected URL returned by that search.
The Phase Agent SHALL establish that relationship before a successful
`research_access.available` observation is recorded. A thin host bridge MAY launch or
normalize the selected native Agent runtime, but SHALL NOT choose the query/candidate,
perform a search/fetch sequence in place of the Agent, mutate a bundle, or retry.

The adapter SHALL preserve the existing HITL1 bound of one search and at most the
first three syntactically eligible candidates in returned order. It SHALL retain the
existing native-first and one permitted same-URL fallback rules. It SHALL NOT use a
model-invented URL, a search snippet, a redirect target chosen outside the bounded
fetch contract, an HTTP/challenge shell, or command success as requested-page
content.

#### Scenario: Search and fetch establish available access

- **WHEN** the selected Claude CLI adapter returns an eligible candidate URL and its permitted
  fetch operation returns real requested-page content for that exact URL
- **THEN** HITL1 SHALL write the existing schema-valid available observation with
  the adapter's `search_surface` and actual `fetch_surface` labels
- **AND** it SHALL rerun the existing HITL1 Gate without adding a new transition

#### Scenario: Fetch cannot use a different URL

- **WHEN** provider-scoped execution evidence cannot establish that the fetch target
  was the current search-returned candidate URL
- **THEN** the Agent SHALL record an honest unavailable direct failure
- **AND** it SHALL not write an available observation or continue to Setup

### Requirement: Adapter evidence is bounded to the observed provider runtime

The system SHALL distinguish the direct production profile observation from external
provider evidence. Production HITL1 SHALL NOT retain query text, candidate lists,
page bytes, credentials, or raw provider transcripts. When the selected real
Agent-flow observation is run, the existing experiment case SHALL retain only its
declared Subject evidence roles at that experiment's run root; this evidence supports
the provider-scoped claim but SHALL NOT enter the production research bundle or its
evidence authority. Engine validation SHALL continue to validate only the direct
profile observation and SHALL NOT claim it independently proved an external tool call.

The selected case's broad bounded-probe verdict MAY pass an honest unavailable branch.
It SHALL NOT satisfy this change's available-path claim unless its retained trace
proves an available same-URL branch. `apply-evidence.md` SHALL record the available
claim as `NOT_RUN` for an unavailable or permission-denied execution even when that
broad protocol verdict passes.

The provider-scoped available-path observation SHALL use the same generic non-bypass
invocation as the selected adapter. An experiment run that supplies an explicit
permission-bypass option SHALL NOT be cited as availability evidence for this adapter.

Probe query text, candidate lists, page bytes, credentials, and raw provider
transcripts SHALL NOT enter reference, cache, work-unit, receipt, submitted output,
or Gate coverage authority. A deterministic fixture MAY validate adapter shape and
unavailable routing, but SHALL NOT establish that a provider was available.

#### Scenario: Fixture coverage does not prove provider access

- **WHEN** a deterministic test supplies a schema-valid available profile observation
- **THEN** the test SHALL prove only schema, adapter pairing, or Gate mechanics
- **AND** it SHALL not be reported as real provider or Agent-flow availability evidence

#### Scenario: Production probe excludes raw provider material

- **WHEN** a production HITL1 probe records an available or unavailable observation
- **THEN** only the accepted direct `research_access` fields SHALL enter the active
  research bundle
- **AND** query, candidate list, page bytes, credentials, and raw transcript SHALL
  remain outside its research evidence and control surfaces

#### Scenario: Provider returns no candidate

- **WHEN** the selected adapter returns no syntactically eligible candidate or its
  search operation is blocked or fails
- **THEN** HITL1 SHALL preserve the existing unavailable/not-attempted branch with
  no result URL and no candidate ordinal
- **AND** it SHALL not retry, fall through to an arbitrary fetch, or add research evidence
