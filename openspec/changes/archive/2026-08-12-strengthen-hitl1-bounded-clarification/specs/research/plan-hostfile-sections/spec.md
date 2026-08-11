> req: PHS-002, PHS-005

## MODIFIED Requirements

### Requirement: Goal section provides north-star anchor for Agent

For a newly instantiated `rb_plan.md` template, the `## Goal` section SHALL contain
four sub-sections: `### Purpose` (one-paragraph summary of the research),
`### Research Questions` (numbered list of core questions), `### Scope`, and a
template-owned `### HITL1 Alignment Snapshot`. The `### Scope` sub-section SHALL be
further structured as:

- **In scope:** — what the research covers. Required-fill marker `(待填充 — …)`; Agent MUST replace after HITL1.
- **Out of scope:** — what is explicitly excluded, preventing Agent over-search. Required-fill marker `(待填充 — …)`; Agent MUST replace after HITL1.
- **待定:** — gray areas depending on future user input. Intentionally-allowed marker `(待 HITL2 确认 — …)`; gate SHALL NOT flag.

New templates SHALL place `### HITL1 Alignment Snapshot` after `### Scope` and give
it a required-fill marker. After HITL1 resolves its existing decision boundary, the
Agent SHALL replace that marker with a concise narrative of the user-confirmed or
explicitly delegated goal, the Agent's final object/use/scope understanding, material
forks and transparent defaults, and the relationship to accepted profile,
must-answer, and Topic decisions. The subsection is narrative context for reload; it
is not PlanSchema frontmatter, a profile field, Topic identity, User Research
Controls, a parser target, or a Gate semantic input.

At minimum, `### Purpose` SHOULD be filled after HITL1 completes (an Agent behavior
convention, not gate-enforced). `phase-hitl1.md` instructions SHALL direct the Agent
to write here; missing or incomplete sub-sections SHALL NOT create a new independent
structural Gate rule.

**Placeholder marker convention.** Template sections use markers to signal fill
status to both Agent and gate. Two marker classes exist:

- **Required-fill markers** — `(待填充…)` and `(尚无话题…)`. These mean "must fill before proceeding." The `setup-ready` gate SHALL fail if any required-fill marker remains in the body. Used in `## Goal` sub-sections; after HITL1 the Agent MUST replace them with real content.
- **Intentionally-allowed markers** — `(待 HITL1 填充 — …)`, `(由 Engine — …)`, `(待 HITL2 确认 — …)`. These mean "deferred to a future phase, intentionally left as-is." The gate SHALL NOT flag them. Used in `## Constraints`, `## Topic Registry` body table, and `## Goal` sub-sections deferred to HITL2.

The existing required-fill scan only detects whether one of its marker patterns
remains in the host-file body after a valid URC-001 literal snapshot is excluded. It
SHALL NOT be represented as proof that a named snapshot heading remains, that a
replacement is non-empty, or that the prose faithfully captures user intent.
Existing/legacy bundles without this new template marker remain readable and do not
need migration or reconstructed historical intent.

#### Scenario: Agent reads Goal section during reground

- **WHEN** a new Agent session loads `rb_plan.md` for context reground
- **THEN** the `## Goal` section SHALL provide a single authoritative source for the research objective, without requiring the Agent to consult conversation history or `rb_profile.yaml`

#### Scenario: Alignment snapshot explains an accepted or delegated route

- **WHEN** HITL1 resolves its existing decision through user acceptance, correction,
  or explicit delegation
- **THEN** `### HITL1 Alignment Snapshot` SHALL record the resulting narrative
  understanding and its relation to existing structured decisions
- **AND** it SHALL not become a profile, Topic, controls, Gate, or parser authority

#### Scenario: Goal section remains empty before HITL1

- **WHEN** a newly instantiated bundle has not yet gone through HITL1
- **THEN** the `## Goal` section MAY contain placeholder text indicating it should be filled during HITL1

#### Scenario: Legacy missing Goal remains non-structural

- **WHEN** a legacy or non-template `rb_plan.md` body is non-empty and contains no required-fill marker, but `## Goal` or the alignment snapshot is absent
- **THEN** the `setup-ready` gate SHALL preserve its existing non-structural behavior
- **AND** it SHALL not infer historical intent or require migration

### Requirement: Gate checks plan body for minimum content

The `setup-ready` gate SHALL verify that `rb_plan.md` body is non-empty (at least one character after stripping frontmatter) and that template-owned content outside a valid URC-001 literal snapshot does not contain required-fill template markers—the prefix patterns `(待填充` and `(尚无话题`. These two markers signal "Agent must replace before proceeding." Other markers such as `(待 HITL1 填充 — …)`, `(由 Engine — …)`, and `(待 HITL2 确认 — …)` are intentionally allowed and SHALL NOT cause gate failure.

The new template-owned `### HITL1 Alignment Snapshot` marker is one ordinary
required-fill marker under this existing scan. The Gate SHALL not add a named-heading
lookup, snapshot parser, content-quality rule, semantic comparison, or additional
verdict. Removing the marker or heading can therefore not be presented as proof of
alignment; the Gate continues to decide only its existing body/marker facts.

Gate rules remain:
- `plan_body_non_empty` (`field_non_empty` on `rb_plan.md` body, after stripping frontmatter) — catches "Agent wrote nothing." The control snapshot does not by itself establish Goal/section completeness beyond this existing minimum.
- `plan_body_no_unfilled_marker` (`pattern_match` with negate, pattern `\((?:待填充|尚无话题)`) — catches a required-fill marker in template-owned content. Its implementation SHALL use PHS-007's canonical locator/opaque-region interpretation before applying the existing pattern.

#### Scenario: Non-empty body without required-fill markers passes gate
- **WHEN** `rb_plan.md` body has content and no template-owned line matches the required-fill prefixes
- **THEN** both plan-body rules SHALL pass even if a valid user snapshot contains those literal strings

#### Scenario: Alignment placeholder uses the existing marker rule
- **WHEN** a new template's alignment snapshot still contains its required-fill marker
- **THEN** the existing `plan_body_no_unfilled_marker` rule SHALL fail
- **AND** no additional Gate rule or snapshot semantic verdict SHALL be produced

#### Scenario: Required-fill markers cause gate failure
- **WHEN** a template-owned Goal or other required position still contains `(待填充 — …)` or `(尚无话题 — …)`
- **THEN** `plan_body_no_unfilled_marker` SHALL fail with inspect listing the detected marker prefix

#### Scenario: Empty body fails gate
- **WHEN** `rb_plan.md` body is empty or contains only whitespace after stripping frontmatter
- **THEN** the `plan_body_non_empty` rule SHALL fail with inspect pointing to the empty body

#### Scenario: Intentionally-allowed markers do NOT cause gate failure
- **WHEN** template-owned `rb_plan.md` content contains `(待 HITL1 填充 — …)`, `(由 Engine — …)`, or `(待 HITL2 确认 — …)` but no required-fill marker
- **THEN** `plan_body_no_unfilled_marker` SHALL pass

#### Scenario: malformed controls form is not an escape hatch
- **WHEN** a user-controls subsection uses an incomplete fence, wrong supplied-controls label, or other non-URC-001 form
- **THEN** its text SHALL not be treated as an opaque snapshot
- **AND** any required-fill marker there remains visible to the existing check
