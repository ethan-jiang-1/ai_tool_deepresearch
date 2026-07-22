## ADDED Requirements

### Requirement: Existing bundle continuation has one Agent-owned playbook

The framework SHALL provide one canonical Agent-facing playbook for continuing
an already existing run bundle. `COMMANDS.md`, `BUNDLE_MAP.md` and relevant
entry guidance SHALL point to that playbook instead of maintaining independent
resume procedures.

On a supplied map/bundle, the playbook SHALL direct the Agent to resolve the
candidate bundle root and shared framework, read direct bundle controls, and
use existing structural/reentry diagnostics. A non-null
`rb_status.json.current_node` is the preferred lifecycle Markdown coordinate;
the Agent SHALL consume existing diagnostic output before loading it. If it is
null, absent, inconsistent or blocked, the playbook SHALL use the returned
trace/diagnostic advice and SHALL NOT infer the phase from `current_gate`.

The playbook SHALL distinguish reload from mutation. It SHALL keep ordinary
authorized diagnostics and repair with the Agent, retain existing HITL and
`stop` placement, answer an already-current factual user turn from verified
facts without creating authority, and route a material post-Final request only
through accepted post-final recovery. A natural-language continuation request
or card attachment SHALL NOT grant host permission, override an Engine verdict
or create a missing reentry/mutation path.

#### Scenario: Agent reloads a reachable existing bundle through direct facts

- **WHEN** a user supplies a reachable bundle map and the existing reentry
  diagnostic confirms a non-null current node
- **THEN** the playbook SHALL direct the Agent to load that existing lifecycle
  Markdown coordinate and follow its current contract
- **AND** it SHALL not start a new research bundle or synthesize a route from
  a static map value

#### Scenario: Missing current node stays diagnostic

- **WHEN** the supplied bundle has no usable `current_node` or existing
  diagnostics return a blocker
- **THEN** the playbook SHALL direct the Agent to the closest existing
  check/inspect/advice or repair owner
- **AND** it SHALL not guess from `current_gate`, write state by hand or ask a
  human to run ordinary repair commands

#### Scenario: Continuation request preserves existing decision boundaries

- **WHEN** a user asks in ordinary language to continue, question, supplement
  or change an existing bundle
- **THEN** the Agent SHALL first classify the request against current verified
  lifecycle facts and existing legal routes
- **AND** it SHALL not make the request a third HITL, generic permission token
  or automatic rerun
- **AND** a material Final-after request SHALL use only accepted post-final
  recovery after the existing required semantic decision
