## ADDED Requirements

> req: SWE-005

### Requirement: Stop:no surfacing intent SHALL be recorded before any prohibited user-facing pause when the Agent can identify the intent

During a non-terminal lifecycle phase with `stop: no`, the Agent SHALL NOT ask the user questions, request confirmation, present progress, deliver partial findings, offer A/B choices, or pause for user input. If the Agent nevertheless detects that it is about to surface to the user during such a phase, it SHALL first record a diagnostic `surfacing_intent` trace/log event naming the active node, active bundle, intended surfacing type, and reason, then continue repair, strategy change, degradation, or silent hold according to the silent execution contract.

This requirement is an observability contract for Agent-facing control surfaces. It SHALL NOT claim deterministic interception of every chat message; if the model emits prohibited chat without logging intent, post-run diagnostics MAY report missing surfacing-intent evidence or illegal surfacing suspicion.

#### Scenario: Agent logs known surfacing intent before prohibited pause

- **WHEN** the Agent is in a non-terminal `stop: no` phase
- **AND** it intends to ask the user whether to continue, present partial findings, or wait for input
- **THEN** it SHALL write a diagnostic `surfacing_intent` event before surfacing
- **AND** the event SHALL include active bundle, node, intent type, and reason
- **AND** the Agent SHALL follow the silent execution contract instead of pausing for user input

#### Scenario: No tool access does not create permission to surface

- **WHEN** the Agent cannot write a `surfacing_intent` event because no trace/log tool is available
- **THEN** it SHALL still not surface during non-terminal `stop: no`
- **AND** it SHALL hold silently or continue through the allowed autonomous path

#### Scenario: Post-run diagnostics can flag missing intent evidence

- **WHEN** trace and status indicate the Agent surfaced or attempted to treat a non-HITL phase as interactive
- **AND** no prior `surfacing_intent` event exists
- **THEN** diagnostics MAY report illegal surfacing suspicion or missing intent evidence
- **AND** the absence of an event SHALL NOT make the surfacing valid

#### Scenario: HITL and Final exceptions remain narrow

- **WHEN** the current lifecycle node is HITL1 or HITL2
- **THEN** interactive user input MAY occur through that node's accepted HITL contract
- **WHEN** the current lifecycle node is Final
- **THEN** terminal delivery MAY occur after final artifacts exist
- **AND** these exceptions SHALL NOT permit progress reports or user prompts inside non-terminal `stop: no` phases
