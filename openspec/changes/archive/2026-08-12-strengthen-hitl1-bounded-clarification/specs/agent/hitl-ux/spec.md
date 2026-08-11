> req: HIU-002

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
the silent phase expectation. This requirement preserves every other HIU-002
behavior and scenario: one-or-more independent Topic maps without a numeric
target, reviewable larger maps, natural-language and letter selection,
uncertainty handling, focus capture, no-focus and retired-search-preference
behavior, honest host-rendering residual, and the full existing post-Gate
silent-phase expectation.

Before the Agent writes the accepted `research_profile`, accepted
`root_must_answer_set`, canonical Topic state, or HITL1 status, the brief SHALL
render a concise Chinese **研究对齐草案**. The draft SHALL state the Agent's
current understanding of the user's goal, research object, decision or delivery
use, and scope; it SHALL show the recommended must-answer set, proposed minimum
independent Topic map, and recommended profile. These are recommendations, not
new structured state or a second decision boundary.

When the Agent judges that a currently answerable answer would materially change
one or more existing structured decisions -- the must-answer set, proposed Topic
map, research profile, explicit scope exclusion, source/evidence constraint, or
delivery emphasis -- it MAY present a bounded first batch of at most three
independent frontier questions. Each question SHALL state a recommendation or
transparent default and the structured decision it would change. A question that
depends on an unresolved answer SHALL wait for a later HITL1 turn. The batch is a
presentation shape, not a round counter: HITL1 SHALL NOT persist a question count,
queue, `clarification_mode`, sentinel, or hard maximum number of conversation
rounds.

This HITL1-specific qualification applies before the user has accepted the draft
and does not weaken HIU-001's minimum-confirmation rule for one already-expressed
ambiguous decision. Details that the Agent can handle with a transparent default,
or that do not change the research route, SHALL NOT create a proactive question.
The user MAY answer only part of a batch, directly accept the recommendation, make
a natural-language correction, or explicitly delegate remaining decisions to the
Agent. A clear acceptance, correction, or delegation SHALL use the existing HITL1
exit semantics; the Agent SHALL restate the resolved understanding and SHALL NOT
ask a blanket second confirmation.

After the recorded decision, `brief/hitl1.md` SHALL own these exact user-facing
current-observation messages:

> 开始研究前，我先直接检查当前环境对中国和海外公开页面的实际取用情况，请稍候。

> 当前环境的直接取用观察已经记录。它只反映这一次探测，不保证后续网络保持不变。

When the Phase Agent judges an observed group limitation material to the user's
explicit research semantics, it SHALL render this bounded Chinese prompt with the
bracketed values grounded only in the current observation and the already recorded
research semantics:

> 这次探测显示，和本轮研究相关的<来源范围或约束>目前存在直接取用限制（<当前观察>）。你可以调整网络后让我重新完整探测、修改来源范围，或明确“按当前取用范围继续”。

The prompt SHALL not use Chinese UI, user language, presumed country, VPN state, or
tool/provider name as evidence of source relevance. It SHALL not promise restoration,
coverage, a fixed duration, a provider result, automatic retry, or future stability.
It offers a user decision only when the Agent has established a material gap. A clear
request to retry after the user manages their own environment or to proceed under the
current scope is a normal HITL1 loop response, not a new checkpoint or a blanket
confirmation. The Agent does not verify, store, or infer the network change.

If no material gap exists, the Phase SHALL render the recorded-observation message
without asking the user another question. If a material gap exists, the Agent SHALL
not render a “normal access” claim or begin silent research before a clear resolution
and the existing Gate pass. Accepting current scope records a research limitation; it
does not assert that an unreachable source became available or erase a hard source
constraint.

PRP-002 controls their timing. The Phase Agent renders the first notice before
spawning the one isolated probe agent. It renders the second only after the
Phase has recorded a completed observation, and the bounded material-gap prompt
only after it has judged a limitation material. Either result precedes the
existing HITL1 Gate. “当前环境的直接取用观察已经记录” is an observation message,
not a claim that the Gate has passed or that silent execution has started.

These templates are framework Markdown only. They SHALL NOT promise to hide,
suppress, replace, or reinterpret selected-host-native tool calls, policy
failures, transport/security errors, or permitted fallback output. They SHALL
not promise a duration, host permission, provider success, or automatic retry.

#### Scenario: Independent material forks use one bounded first presentation

- **WHEN** the draft contains two independent, currently answerable interpretations
  whose answers would change different existing research decisions
- **THEN** HITL1 MAY present both questions in the same first batch, with one
  recommendation/default and stated impact for each
- **AND** it SHALL present no more than three independent questions in that batch
- **AND** it SHALL not create a counter, queue, state, or new checkpoint

#### Scenario: Dependent or non-material details do not make a questionnaire

- **WHEN** a candidate question depends on an unresolved answer, or its answer can
  be handled by a transparent default without changing the research route
- **THEN** HITL1 SHALL defer or omit that question
- **AND** it SHALL retain the direct acceptance, correction, and delegation exits

#### Scenario: Delegation resolves the existing HITL1 boundary

- **WHEN** the user says to proceed according to the displayed recommendation or
  delegates unresolved material decisions to the Agent
- **THEN** the Agent SHALL restate the resulting research understanding and use the
  existing accepted-owner and Gate path
- **AND** it SHALL not request a blanket second confirmation or create a new HITL

#### Scenario: Recorded decision is followed by an explained non-decision check

- **WHEN** the user has made and the Agent has recorded a valid HITL1 decision
- **THEN** the Agent SHALL present the exact first message before spawning the
  isolated direct-sample probe
- **AND** it SHALL state no new research decision is needed

#### Scenario: Completed observation is reported without a questionnaire

- **WHEN** the Phase Agent records a completed current direct-sample observation
  and judges no material gap
- **THEN** it SHALL present the exact recorded-observation message before the
  existing HITL1 Gate
- **AND** it SHALL not ask the user to approve a non-material network fact

#### Scenario: Material overseas limitation receives one bounded choice

- **WHEN** the current observation limits overseas samples and the user's recorded
  must-answer set or explicit source constraint makes that limitation material
- **THEN** the Agent SHALL render the bounded access-alignment prompt in Chinese
- **AND** it SHALL allow a fresh probe after user-managed environment adjustment, a
  source-semantics revision, or clear acceptance of the current scope

#### Scenario: Non-material limitation does not create a questionnaire

- **WHEN** a completed observation has a limitation that the Agent judges unrelated
  to the recorded question, must-answer set, Topic map, and controls
- **THEN** the Agent SHALL state only the current-observation message and continue
  through the existing Gate path
- **AND** it SHALL not ask the user to approve a non-material network fact

#### Scenario: Accepted limitation is not a false success claim

- **WHEN** the user says to proceed under the current access scope
- **THEN** the Agent SHALL retain the limitation in the controls snapshot and the
  truthful direct observation
- **AND** it SHALL not promise source completeness, restored access, or future
  network stability

#### Scenario: Selected-host-native rendering remains an honest residual

- **WHEN** the selected host renders a native tool call, policy failure,
  transport/security error, or permitted fallback output during the probe
- **THEN** the framework's notice/result contract SHALL remain additive and SHALL
  not claim that the host output is hidden, suppressed, or a framework verdict

#### Scenario: HITL1 exit sets silent phase expectation

- **WHEN** the recorded user decision and existing HITL1 Gate both pass
- **THEN** the Agent SHALL use the existing exit text before advancing to setup
- **AND** it SHALL not give a false precise duration estimate
