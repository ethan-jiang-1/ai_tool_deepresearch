> req: ACS-005

## ADDED Requirements

### Requirement: Existing bundle continuation has one Agent-owned playbook

The framework SHALL provide one canonical Agent-facing playbook for continuing
an already existing run bundle. `COMMANDS.md`, `BUNDLE_MAP.md` and relevant
entry guidance SHALL point to that playbook instead of maintaining independent
resume procedures.

On a supplied, reachable map/bundle, the playbook SHALL first require an
already-selected DPT source tree in the current workspace, then resolve the
candidate bundle root and creator-rendered coordinates only within that source
context. It SHALL read direct bundle controls. For a non-Final non-null
`rb_status.json.current_node`, it SHALL consume existing target-specific
structural/reentry diagnostics before loading that coordinate. If the node is
null, absent, inconsistent or blocked, the playbook SHALL use returned
trace/diagnostic advice and SHALL NOT infer the phase from `current_gate`.

For `phases/phase-final.md`, the playbook SHALL not invoke
`check-reentry --at phase-final`: Final has no gate while its legal terminal
status remains the readiness-passed window. It SHALL read direct terminal
facts; a material post-Final request uses only accepted post-final inspection/
recovery.

If `current_node` is null or absent, the playbook SHALL state that the card has
no generic legal target-selection capability. It MAY direct the Agent to the
existing diagnostic/start-entry surfaces, but SHALL NOT claim diagnostics can
always resume the bundle or derive a target from `current_gate`.

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

#### Scenario: Final uses its terminal contract rather than an impossible gate target

- **WHEN** a reachable bundle has `current_node: phases/phase-final.md`
- **THEN** the playbook SHALL inspect the existing terminal status/final facts
  without calling target-specific `check-reentry --at phase-final`
- **AND** it SHALL route a material post-Final request only to accepted
  post-final inspection/recovery

#### Scenario: Missing current node stays an explicit boundary

- **WHEN** the supplied bundle has no usable `current_node` or existing
  diagnostics return a blocker
- **THEN** the playbook SHALL direct the Agent to the closest existing
  diagnostic or start-entry surface while naming the missing legal coordinate
- **AND** it SHALL not guess from `current_gate`, write state by hand or ask a
  human to run ordinary repair commands

#### Scenario: Card coordinate does not choose a framework

- **WHEN** a card coordinate lies outside the DPT source tree already selected
  in the current workspace or no such source tree is available
- **THEN** the playbook SHALL report the framework-context boundary
- **AND** it SHALL not execute commands from the card-provided coordinate

#### Scenario: Continuation request preserves existing decision boundaries

- **WHEN** a user asks in ordinary language to continue, question, supplement
  or change an existing bundle
- **THEN** the Agent SHALL first classify the request against current verified
  lifecycle facts and existing legal routes
- **AND** it SHALL not make the request a third HITL, generic permission token
  or automatic rerun
- **AND** a material Final-after request SHALL use only accepted post-final
  recovery after the existing required semantic decision
