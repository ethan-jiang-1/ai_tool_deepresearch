> req: RWE-013

## ADDED Requirements

### Requirement: Degraded-handoff requalification case retains one bounded real-Agent observation

The manifest SHALL register one heavy `agent_flow_e2e` case that starts from a
current production degraded Wave0 Gate handoff, loads the legal Wave1 surface,
and reaches the Wave2 new-evidence decision in the same disposable bundle and
one independent real Subject session. The case SHALL preserve the Subject
prompt, transcript, and result together with the Wave0 Gate JSON, before/after
bundle status and trace, and a retained exact Wave2 surface snapshot. The
adapter SHALL re-load that target surface only after the first turn establishes
the legal Wave2 entry; it SHALL not choose a phase or change a lifecycle fact.

For a launched case, native completion SHALL be the only `PASS`, `FAIL`, or
`NOT_RUN` authority. If native completion is absent, the retained Supervisor
report/audit SHALL be the authority for its cancellation, error, or budget
boundary. The case SHALL not treat a static test, launcher configuration,
partial transcript, or Playbook-Agent-authored content as Subject behavior
evidence.
It SHALL NOT change the production handoff, search policy, host behavior,
Engine lifecycle, or delegated-work authority.

#### Scenario: Real Subject reaches the bounded degraded-handoff observation

- **WHEN** the selected host provides the required Subject, child, and external
  research capabilities within the declared envelope
- **THEN** the case SHALL retain the real degraded Wave0 handoff, Wave1 and
  Wave2 entry facts, Subject evidence, and the native terminal completion
- **AND** the retained transcript and tool-call facts SHALL support closeout
  review of whether that Subject initiated a prohibited user choice, phase
  skip, or direct Phase-Agent research call

#### Scenario: Wave2 new evidence remains delegated

- **WHEN** the reloaded Wave2 surface presents the named emergent finding with
  `gap_status: needs_search`
- **THEN** the Subject SHALL retain its `explore_search` or `exploit_search`
  decision and route the finding through one submitted
  `wave2_targeted_evidence` work unit
- **AND** the retained Subject transcript SHALL contain no direct `WebSearch`
  or `WebFetch` invocation; any such direct invocation SHALL make the
  case-owned check fail

#### Scenario: Required capability is unavailable

- **WHEN** the required Subject, child, external research capability, or legal
  bundle path is unavailable
- **THEN** the case SHALL finalize native `NOT_RUN` with a non-empty reason
- **AND** it SHALL not claim Agent compliance, a production defect, or a
  substitute Playbook-Agent result

#### Scenario: Supervisor ends before native completion

- **WHEN** the exact case is cancelled, errors, or exhausts its declared
  budget before native completion
- **THEN** the retained Supervisor report/audit SHALL state that lifecycle
  boundary and native completion SHALL remain absent
- **AND** the outcome SHALL not admit a direct-root repair or claim Subject
  behavior

#### Scenario: Static contract coverage remains non-behavioral

- **WHEN** the case registration and Markdown contract are checked under
  `tests/integration/`
- **THEN** that coverage SHALL verify the declared proof and evidence boundary
- **AND** it SHALL not be reported as `agent_flow_e2e` execution evidence
