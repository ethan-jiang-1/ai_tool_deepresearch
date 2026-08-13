# Research-Access Adapter Specification

> req: REA-001, REA-002, REA-003

## Purpose

定义 HITL1 可使用的单一、显式选择的 research-access adapter，使 Agent 能以真实 search 结果和同 URL
page fetch 区分可用能力、host 权限边界与不诚实的成功声明。

## Requirements

### Requirement: Selected adapter declares semantic capability boundary

Production HITL1 SHALL expose an Agent-readable, execution-neutral direct-page
retrieval boundary. The direct observation asks only whether the current executor
can obtain real content for one controller-declared public URL using a surface that
is already available and permitted in that executor. The current executor's tool
list, host policy, and network policy are the Source of Record for whether an
operation is callable; a framework Markdown file, launcher check, shell executable,
or chat text SHALL NOT establish that permission or availability.

The isolated `shared-hitl1-research-access-envelope.md` controller SHALL be
physically separate from that boundary and from the Phase body. It alone owns fixed
sample IDs and URLs, group ordering, bounded concurrency, timeout/confirmation
rules, classification, and the compact return map. It SHALL mention neither a
provider-specific tool name nor a provider selection rule. It does not change host
permission, runtime truth, or Gate authority.

The existing Claude CLI / `claude-deepseek.mjs` adapter remains a contract for that
launcher's own non-bypass invocation and optional executor-scoped experiment. It
SHALL NOT be delivered as a production HITL1 operation prerequisite, select an
operation for Codex or another Coding Agent, or claim that one executor's tools are
available in another. The system SHALL NOT introduce a provider registry, adapter
priority list, environment-variable selection protocol, background capability
controller, or caller-supplied permission bypass.

The adapter SHALL NOT map an old profile field, URL/fetch/search record,
source-class envelope, access-boundary location, reason prose, tool name, user
language, VPN state, IP/geography, or provider identity to a current repair owner
or classification. Unsupported profile shapes remain owned by the ProfileSchema
boundary; a current direct observation establishes no adapter owner.

#### Scenario: Codex and Claude use the same semantic controller

- **WHEN** Codex and a Claude runtime each run the HITL1 isolated probe
- **THEN** each MAY use only its own already permitted direct-page retrieval surface
- **AND** both SHALL follow the identical controller-declared samples, bounds, and
  compact return contract without requiring `WebSearch` or `WebFetch`

#### Scenario: Claude launcher is not a production selector

- **WHEN** the current HITL1 executor is not the Claude CLI launcher
- **THEN** absence of that launcher SHALL NOT make the probe unavailable or prevent
  direct retrieval through the current executor's legal surface
- **AND** no adapter registry or fallback provider selection is consulted

#### Scenario: A host policy denial remains external

- **WHEN** the current executor declines a direct retrieval operation by policy
- **THEN** the returned observation SHALL retain only its honest terminal outcome and
  required direct summary reason; it SHALL not invent a current `access_boundary`
  owner from that outcome
- **AND** the controller, Agent, and user SHALL NOT create permission by choosing a
  shell fallback or approving an otherwise unavailable operation

#### Scenario: Historical profile fields do not route an adapter repair

- **WHEN** a profile contains a historical boundary/location or other retired
  access-envelope field
- **THEN** the adapter SHALL not return an owner or repair action from it
- **AND** ProfileSchema validation remains the only current rejection boundary

### Requirement: Adapter probe binds search result to fetch target

After the recorded HITL1 research decision, the Phase Agent SHALL spawn one bounded
isolated probe and actor-deliver the dedicated controller plus the generic isolated
probe safety guidance. The probe SHALL directly retrieve only controller-declared
fixed public sample URLs. It SHALL NOT run a search, generate or retain search
queries/candidates, bind a fetch to a search result, substitute a URL, or infer a
sample from the user's topic.

For every requested URL, real requested-page content is the only direct-success
fact. Command exit, a search snippet, an empty body, a login page, a CAPTCHA or
challenge shell, and an HTTP error response are not content. The controller MAY
allow one same-URL extended confirmation solely after a transport-inconclusive
primary attempt and one same-group reserve sample under its declared round budget.
It SHALL prohibit automatic permission widening, unbounded retry, user-controlled
network mutation, a second full round without a new user response, and persistence
of probe material as research evidence.

The Phase Agent remains the only writer of the returned `research_access`
observation and remains the only actor that invokes the existing HITL1 Gate. A thin
host bridge MAY start an executor-specific experiment, but SHALL NOT perform the
probe, choose samples, mutate a bundle, write an observation, or retry on behalf of
the isolated probe.

#### Scenario: Direct content establishes a sample success

- **WHEN** the isolated probe obtains real content from a controller-declared sample
  URL through an already permitted current-executor surface
- **THEN** it SHALL return only the schema-valid compact sample terminal outcome and
  its truthful surface category
- **AND** the Phase Agent SHALL write that observation unchanged before applying the
  HITL1 access-alignment flow

#### Scenario: Search is unavailable or irrelevant

- **WHEN** the current executor has no search surface, or a search surface returns
  unrelated candidates
- **THEN** the probe SHALL still perform its controller-declared direct URL samples
- **AND** neither condition is a failure of the direct-page access observation

#### Scenario: Transport confirmation stays bounded

- **WHEN** a primary sample attempt ends in a transport-inconclusive outcome
- **THEN** the probe MAY make exactly one controller-authorized extended confirmation
  for that same URL within the shared round budget
- **AND** it SHALL not repeat login, challenge, denied, or rate-limited outcomes

### Requirement: Adapter evidence is bounded to the observed provider runtime

The production profile observation SHALL retain no page bytes, raw URLs, headers,
credentials, query/candidate history, HTTP matrix, retry history, transcript, or
claim that the current network will remain usable. It may retain only the fixed
sample IDs, their final compact outcomes, and the surface category of actual content
successes. Engine validation continues to validate structural observation facts only.

An executor-scoped real canary MAY retain the prompt, transcript, and result that its
own experiment contract requires, including that executor's operation-event names
when its observer needs them. Such names are canary-only metadata and SHALL NOT be
copied into the production controller, Phase prerequisite, profile observation, or
Gate predicate. The canary proves only that executor's observed direct retrieval
protocol and never a universal Coding-Agent capability, a production profile write, a
HITL1 Gate run, future access, or research coverage. `NOT_RUN` and an honest
unavailable result remain valid canary outcomes. Deterministic fixtures may prove
controller projection, schema, Phase relay, and Gate mechanics, but never actual
network reachability.

#### Scenario: Canary does not generalize across executors

- **WHEN** a Claude or Codex canary retains a direct-retrieval observation
- **THEN** its retained evidence SHALL be labelled as that executor's one observed
  run
- **AND** it SHALL not prove the other executor's tools, permission, or access

#### Scenario: Production observation excludes raw material

- **WHEN** the Phase Agent records a completed direct-sample observation
- **THEN** only accepted compact `research_access` fields enter the run bundle
- **AND** raw sample URLs, content, tool output, credentials, and transcript remain
  outside research evidence and control surfaces
