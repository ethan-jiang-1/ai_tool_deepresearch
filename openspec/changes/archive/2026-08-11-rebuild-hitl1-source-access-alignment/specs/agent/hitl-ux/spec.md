# agent/hitl-ux (delta)

## MODIFIED Requirements

### Requirement: HITL1 recommendation-first alignment prompt

HITL1 SHALL retain its existing recommendation-first brief, natural-language
acceptance/correction, one ordinary research-semantic decision boundary, Chinese-first
presentation, and Gate-pass-only silent execution. `brief/hitl1.md` SHALL also own
the following access-alignment messages, rendered only after the ordinary HITL1
decision and the relevant direct observation:

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
