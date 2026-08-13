## MODIFIED Requirements

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
boundary; a current direct observation that establishes no owner remains explicitly
unclassified.

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
