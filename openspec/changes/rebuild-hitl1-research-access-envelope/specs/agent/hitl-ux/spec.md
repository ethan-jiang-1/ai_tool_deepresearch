# agent/hitl-ux (delta)

## MODIFIED Requirements

### Requirement: HITL1 recommendation-first alignment prompt

HITL1 SHALL retain its existing recommendation-first brief: the Agent's scope
understanding, proposed must-answer set, minimum independent Topic map,
recommended research profile with impact, optional natural-language focus,
A/B/C shortcuts, direct natural-language acceptance/correction, and the
existing single HITL1 semantic decision boundary. The brief remains the
exact-text owner; accepted focus remains in the existing literal controls
snapshot, not a profile/Topic/Gate/parser field. Clear decisions still avoid a
blanket second confirmation, and the existing Gate-pass-only exit still states
the silent phase expectation. This change preserves every other HIU-002
requirement and scenario: one-or-more independent Topic maps without a numeric
target, reviewable larger maps, natural-language and letter selection, minimal
ambiguity clarification, uncertainty handling, focus capture, no-focus and
retired-search-preference behavior, honest host-rendering residual, and the
full existing post-Gate silent-phase expectation.

After the recorded decision, `brief/hitl1.md` SHALL own these exact user-facing
capability-check messages:

> 开始研究前，系统先快速检查一下联网搜索能力，大概几秒钟，请稍候。

> 联网能力正常，开始准备研究。

> 联网检查没通过。多数是网络问题——请检查网络连接后重试；网络正常的话稍后再试也行。你刚才的选择不会丢。

`brief/hitl1.md` SHALL additionally own one exact partial-reachability
disclosure rendered only alongside the available result when the recorded
observation reports one or more unreachable declared source classes:

> 联网能力正常，不过有部分来源这次够不着（<不可达来源类别>），研究会继续，用够得着的来源做。

The bracketed segment SHALL be filled from the recorded observation's unreachable
declared source classes and nothing else. This disclosure is information transfer
only: it SHALL NOT create a HITL checkpoint, ask the user for instructions, offer
options, block advance, or become permission or capability. It SHALL NOT be
rendered when every attempted declared source class was reachable.

PRP-002 controls their timing. The Phase Agent renders the first notice before
spawning the one isolated probe agent. It renders the second only after the
Phase has recorded the returned `available` observation, and the third only
after it has recorded `unavailable`; either result precedes the existing HITL1
Gate. The partial-reachability disclosure accompanies the second message and
does not replace it or move the Gate. “开始准备研究” is an observation message,
not a claim that the Gate has
passed or that silent execution has started. The unavailable message preserves
the recorded decision and same probe/Gate recovery path, creates no new HITL
checkpoint, and does not ask for the choices again.

These templates are framework Markdown only. They SHALL NOT promise to hide,
suppress, replace, or reinterpret selected-host-native tool calls, policy
failures, transport/security errors, or permitted fallback output. They SHALL
not promise a duration, host permission, provider success, or automatic retry.
The partial-reachability disclosure SHALL NOT promise that an unreachable class
will become reachable, that coverage is complete, or that the user can restore it.

#### Scenario: Recorded decision is followed by an explained non-decision check

- **WHEN** the user has made and the Agent has recorded a valid HITL1 decision
- **THEN** the Agent SHALL present the exact first message before spawning the
  isolated research-access probe
- **AND** it SHALL state no new research decision is needed

#### Scenario: Direct available result is not a Gate verdict

- **WHEN** the Phase Agent records returned `research_access.status: available`
- **THEN** it SHALL present the exact second message before the existing HITL1 Gate
- **AND** it SHALL not announce silent autonomous execution until that Gate passes

#### Scenario: Partial reachability is disclosed without a decision point

- **WHEN** the recorded available observation reports one or more unreachable
  declared source classes
- **THEN** the Agent SHALL present the exact partial-reachability disclosure naming
  only those recorded unreachable classes and continue to the existing Gate
- **AND** it SHALL not offer options, request instructions, add a checkpoint, or
  pause the run

#### Scenario: Full reachability renders no disclosure

- **WHEN** the recorded available observation reports no unreachable declared
  source class
- **THEN** the Agent SHALL present only the exact second message
- **AND** it SHALL not render the partial-reachability disclosure with an empty or
  invented class list

#### Scenario: Unavailable access does not reopen HITL1 semantics

- **WHEN** the Phase Agent records returned `research_access.status: unavailable`
- **THEN** it SHALL present the exact third message and preserve recorded choices
- **AND** it SHALL retain the same probe/Gate path rather than create a decision,
  checkpoint, retry tree, or repeated-choice prompt

#### Scenario: Selected-host-native rendering remains an honest residual

- **WHEN** the selected host renders a native tool call, policy failure,
  transport/security error, or permitted fallback output during the probe
- **THEN** the framework's notice/result contract SHALL remain additive and SHALL
  not claim that the host output is hidden, suppressed, or a framework verdict

#### Scenario: HITL1 exit sets silent phase expectation

- **WHEN** the recorded user decision and existing HITL1 Gate both pass
- **THEN** the Agent SHALL use the existing exit text before advancing to setup
- **AND** it SHALL not give a false precise duration estimate
