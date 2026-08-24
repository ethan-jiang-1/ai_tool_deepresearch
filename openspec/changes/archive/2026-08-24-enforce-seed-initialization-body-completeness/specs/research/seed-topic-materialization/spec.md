> req: STM-010

## ADDED Requirements

### Requirement: Seed topics ready gate SHALL reject an un-enriched initialization body

For a seed rendered with the current canonical initialization markers, the
`seed-topics-ready` gate SHALL additionally verify that the single
`seed-initialization` region contains no renderer-owned template pending
placeholder line. A placeholder line SHALL mean any trimmed line that is
byte-equal to one of the default pending content lines of the shared seed
initialization descriptor (`SEED_TOPIC_INITIALIZATION.sections`), so a section
whose content was never replaced is distinguishable from Agent-authored content
without any prose-quality judgment.

A current-marker seed whose initialization region retains any such placeholder
line SHALL fail the gate with feedback that identifies the bounded
initialization edit surface (`seed_topics/<slug>.md#seed-initialization`),
states that every placeholder line must be replaced, and reruns the same gate.
A current-marker seed whose initialization region replaces every placeholder
line — with Agent-authored content, or with an explicit non-empty gap that
rephrases the specific missing fact instead of copying the template
instruction — SHALL be eligible to pass the gate.

The Gate SHALL NOT judge research prose quality, treat the body as a second
canonical registry, require semantic completeness, or fail a legacy seed
without current markers for historical duplicate prose. The appendix tokens,
their Wave writers, and the frontmatter enrichment contract remain unchanged.
Deterministic checks may prove the placeholder boundary, but only
native completion from a real Agent-flow run may evidence the semantic quality
of the Agent's authored body.

#### Scenario: Rendered template skeleton fails until enriched

- **WHEN** a current-marker seed contains the rendered initialization skeleton whose sections still hold the default pending placeholder lines
- **THEN** `seed-topics-ready` SHALL return a `seed_initialization_structure` root
- **AND** feedback SHALL identify `seed_topics/<slug>.md#seed-initialization` and the same gate rerun

#### Scenario: Enriched body passes

- **WHEN** every placeholder line inside the initialization region has been replaced with Agent-authored content derived from recorded Topic/profile facts
- **THEN** `seed-topics-ready` SHALL NOT fail for a retained placeholder
- **AND** the existing structural and binding rules SHALL decide the verdict

#### Scenario: Explicit rephrased gap passes

- **WHEN** a section records an explicit non-empty gap such as `**缺口**：pending — 上游未提供 X 的定义，Wave0 evidence intake 需建立该事实。` instead of the raw template instruction line
- **THEN** the gate SHALL NOT fail that line as a placeholder
- **AND** neither Agent nor Engine SHALL fabricate a more specific interpretation

#### Scenario: Frontmatter enriched but body still pending fails

- **WHEN** `operate-topic-state apply --context seed_topics` has written complete structured enrichment frontmatter while the initialization body still retains the default pending placeholder lines
- **THEN** `seed-topics-ready` SHALL fail for each affected current-marker seed
- **AND** feedback SHALL direct the Agent to edit only the bounded initialization region and rerun the same gate

#### Scenario: Legacy seed remains read-compatible

- **WHEN** a seed lacks current initialization markers and contains legacy duplicate prose
- **THEN** the gate SHALL preserve existing compatibility behavior
- **AND** it SHALL not infer a second topic registry, evidence fact, or metadata repair path

#### Scenario: Gate does not judge prose quality

- **WHEN** a current-marker seed contains short, terse, or imperfect Agent-authored prose that replaces every placeholder line
- **THEN** the gate SHALL NOT fail the seed for prose quality or semantic completeness
- **AND** placeholder detection SHALL remain the only new deterministic body condition
