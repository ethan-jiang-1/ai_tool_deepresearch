# plan-hostfile-sections Specification

> req: PHS-001, PHS-002, PHS-003, PHS-004, PHS-005, PHS-006, PHS-007, PHS-008

## Purpose

`plan-hostfile-sections` defines the `rb_plan.md` host-file template,
human-readable sections and projections, Engine progress presentation, and
minimum setup-ready body checks without replacing structured runtime authority.
## Requirements
### Requirement: Plan template uses YAML frontmatter with structured body sections

The `rb_plan.md.tmpl` template SHALL render `rb_plan.md` as the bundle's host file using YAML frontmatter and a five-section structured body. The `rb_plan.md` file is the **host file**: the single Markdown artifact an Agent or human reads to get the complete research picture—goal, topics, constraints, progress, and decisions—without consulting conversation history or scattered control files. The host file pattern makes `rb_plan.md` the authoritative narrative surface for the research run, while `rb_status.json` / `rb_queue.json` / `rb_trace.jsonl` remain the machine-authoritative control files. It intentionally overlaps with `rb_profile.yaml` on topic and scope—same research intent, two audiences: Agent reads Markdown prose for task understanding, Engine reads YAML fields for gate validation. They complement without conflict.

The `rb_plan.md.tmpl` SHALL use YAML frontmatter (instead of JSON) for `plan_basename`, `derived_topic_count`, and `topic_registry` fields. The frontmatter field names SHALL remain unchanged from the current PlanSchema definition. The body SHALL contain five Markdown sections in fixed order: `## Goal`, `## Topic Registry`, `## Constraints`, `## Progress`, `## Decisions`.

#### Scenario: Production bundle instantiation with new template

- **WHEN** `instantiate-run-bundle.mjs` creates a new bundle with `{{name}}` substitution
- **THEN** the resulting `rb_plan.md` SHALL have YAML frontmatter parseable by `parseMdFrontmatter()` and a body containing all five section headers

#### Scenario: Existing JSON frontmatter remains parseable

- **WHEN** `parseMdFrontmatter()` reads an `rb_plan.md` with JSON frontmatter (from an older bundle or disposable path)
- **THEN** the function SHALL return the correct `{ plan_basename, derived_topic_count, topic_registry }` object (YAML 1.2 is a superset of JSON)

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

### Requirement: Topic Registry body section is human-readable table

The `## Topic Registry` section SHALL be a Markdown table with columns: `#`, `Slug`, `Title`, `Status`. The frontmatter `topic_registry` SHALL remain the authoritative source for topic identity and current layout. The body table is a derived human-readable view; conflicts SHALL be resolved in favor of frontmatter.

When topic-state apply renders a new plan and the body contains the recognized standard Topic Registry section/table shape, the same staged `rb_plan.md` replacement SHALL refresh its rows from the final current registry while preserving the Status value for rows that still bind the same UID when deterministically possible. Historical previous layouts SHALL not appear as current rows. If the body section/table is absent or non-standard, apply SHALL preserve the body and return advisory feedback; presentation drift SHALL NOT block mutation or create another identity authority.

#### Scenario: Topic Registry table reflects frontmatter topics
- **WHEN** Agent writes topics to `topic_registry` frontmatter during HITL1
- **THEN** the body `## Topic Registry` table SHALL list the same current topics with corresponding slugs and titles when the standard projection is rendered

#### Scenario: Layout mutation refreshes standard table
- **WHEN** mutate-layout changes current order, slug or title and the recognized standard table exists
- **THEN** the staged plan body SHALL show the final current rows without previous-layout aliases

#### Scenario: Status column tracks per-topic progress
- **WHEN** a wave completes for a specific topic
- **THEN** the Agent MAY update the Status column for that topic's row (frontmatter remains authoritative for identity)

#### Scenario: Body table out of sync with frontmatter does not block gate
- **WHEN** the `## Topic Registry` body table is missing or has different slugs than the frontmatter `topic_registry`
- **THEN** gates and topic-state operations SHALL use frontmatter as authority and SHALL NOT fail solely for body projection drift
- **AND** topic-state apply MAY preserve the non-standard body with advisory feedback

#### Scenario: Non-standard body table does not block authority mutation
- **WHEN** the `## Topic Registry` body table is missing, non-standard or has different slugs than frontmatter
- **THEN** topic-state apply/gates SHALL preserve or tolerate the body, use frontmatter as authority and MAY return advisory feedback
- **AND** SHALL NOT fail layout mutation solely for presentation drift

### Requirement: Constraints and Decisions sections are reserved for future use

The `## Constraints` and `## Decisions` sections SHALL be present in the template.

`## Constraints` SHALL retain its five presentation categories as a bullet list, each using the intentionally-allowed marker `(待 HITL1 填充 — …)` where the value needs HITL1 input:

- **语言** — source language preference (仅中文源/中英混合/不限)
- **时间预算** — time constraint (default: no hard deadline)
- **地域** — geographic scope (中国大陆/港澳台/海外)
- **方法** — default `open` (Agent selects search/synthesis/fetch freely)
- **来源偏好** — source priority (一手源优先/学术优先/无偏好)

After these items, new templates SHALL contain `### User Research Controls` with exactly the no-controls form defined by URC-001. HITL1 MAY replace that form only with URC-001's exact supplied-controls label plus complete literal snapshot. The subsection is Agent/user narrative guidance, not a Gate input or parsed semantic authority. No Gate SHALL evaluate the truth or completeness of Constraints prose; PHS-005 only retains its direct required-fill-marker check outside a valid opaque snapshot.

`## Decisions` SHALL be marked as `(append-only — 关键决策记录，最新在上)`. No Gate SHALL check its content in this change.

#### Scenario: Empty or marker-only sections do not cause gate failure
- **WHEN** a new bundle passes through gates with the template no-controls form and intentionally-allowed Constraints markers
- **THEN** Constraints prose alone SHALL NOT cause a gate failure

#### Scenario: supplied controls remain guidance rather than Gate facts
- **WHEN** HITL1 replaces the no-controls form with a valid literal user snapshot
- **THEN** the snapshot guides Agent work without becoming a profile field, source-floor exception, or Gate pass fact

### Requirement: Engine writes Progress on gate pass

The `## Progress` section SHALL contain a pre-populated checklist of all workflow gates in lifecycle order, initially all unchecked (`- [ ] <gate-name>`). When a gate passes, the Engine SHALL attempt to flip the corresponding canonical checkbox to `- [x] <gate-name> (<ISO8601 timestamp>)`. This write is idempotent (re-running the same gate updates the timestamp, does not duplicate the line). If the canonical Progress section exists but the gate is not pre-listed, the Engine SHALL append one new checked line there.

The shared `writePlanProgress()` helper SHALL use the canonical host-file locator and return `committed`, `unchanged`, or `failed` to its caller. A `failed` outcome SHALL leave the full pre-write plan bytes unchanged and SHALL NOT be represented as a checked Progress claim. Progress is presentation: a failure to update it SHALL NOT reverse the already-evaluated deterministic gate content result or independently create a new Gate rule. For setup-ready, the existing pass is consumable only when the actual remaining bytes can still be covered by the required route-bound checkpoint and trace contract; this is a handoff-audit prerequisite, not a Progress presentation verdict.

Gate list source: the template pre-populates gates from the known workflow manifest lifecycle. `check-gate-setup-ready.mjs` remains the first caller; other gate CLIs integrate in follow-up changes.

#### Scenario: Gate pass flips Progress checkbox
- **WHEN** `check-gate-setup-ready.mjs` evaluates all rules and the gate passes
- **THEN** the Engine attempts to flip the canonical `- [ ] setup-ready` line to `- [x] setup-ready (<ISO8601 ts>)` in `rb_plan.md## Progress`
- **AND** a successful write is reported as `committed` or `unchanged`

#### Scenario: Re-running the same gate is idempotent
- **WHEN** the setup-ready gate is evaluated and passes a second time on the same bundle
- **THEN** the Engine updates the timestamp on the existing canonical `- [x] setup-ready` line without duplicating it

#### Scenario: Progress write failure does not affect gate output
- **WHEN** `writePlanProgress()` cannot write (for example disk full or permission error)
- **THEN** the plan retains its pre-write bytes and no checked Progress claim is emitted
- **AND** the deterministic setup-ready content evaluation remains its actual result
- **AND** only the route-bound checkpoint/trace contract determines whether that passed result can be consumed

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

### Requirement: Canonical host-file structure excludes bounded user snapshot content

New `rb_plan.md` templates SHALL place `### User Research Controls` after the existing Constraints presentation items. A supplied control snapshot SHALL use a deterministic literal region whose closing delimiter cannot be terminated by an equal-or-shorter delimiter in its content. One shared helper SHALL identify only that valid literal region and expose bounded canonical-target location/replacement for its callers; it SHALL NOT parse a general Markdown AST or create a full-document semantic section tree. Canonical host-file readers and writers SHALL use that helper to distinguish their own template-owned target from opaque user content. This boundary SHALL retain existing advisory treatment for a missing or non-standard Topic Registry presentation; it SHALL NOT turn presentation drift into a new layout blocker.

Topic Registry refresh, Progress mutation, and setup-ready required-fill inspection SHALL use the same canonical locator/opaque-region interpretation. They SHALL NOT select, replace, or fail on `## Topic Registry`, `## Progress`, `## Decisions`, registry-looking rows, gate-checkbox-looking lines, or `(待填充` / `(尚无话题` literals inside the snapshot. The existing non-empty whole-body minimum remains unchanged, and actual template-owned required-fill markers remain blocking.

The framework SHALL expose the existing exact controls renderers through one
pure Agent-facing CLI: `plan-hostfile-sections.mjs render-no-controls` and
`plan-hostfile-sections.mjs render-supplied-controls --input <snapshot-path>`.
The first form SHALL print only the exact no-controls section; the second SHALL
read only the explicitly selected UTF-8 snapshot input and print the exact
fenced supplied-controls section. The CLI SHALL not resolve or inspect a bundle,
write `rb_plan.md`, infer an owner, create a snapshot, or turn rendered prose
into Engine authority. `--help`/`-h` SHALL be side-effect-free code `0`; an
invalid subcommand or input shape SHALL be a direct code-`2` invocation error.
The HITL1 Agent remains the existing writer of the rendered output at its
already authorized host-file coordinate.

The renderer accepts only a standalone `--help`/`-h`, `render-no-controls` with
no options, or `render-supplied-controls --input <snapshot-path>` with exactly
one input option. It SHALL reject a bundle flag, a positional snapshot, a
duplicate input, mixed help, or any other shape with code `2` before it reads a
snapshot.

#### Scenario: user heading cannot redirect a canonical writer
- **WHEN** a captured snapshot contains a literal `## Topic Registry`, `## Progress`, or `## Decisions` heading
- **THEN** canonical Topic Registry and Progress operations address only their template-owned sections
- **AND** the captured heading remains user content

#### Scenario: user marker does not create false setup failure
- **WHEN** a snapshot contains literal `(待填充` or `(尚无话题` text
- **THEN** setup-ready required-fill inspection ignores that literal region
- **AND** it still fails when the same marker remains in a template-owned required position

#### Scenario: Renderer supplies exact controls text without writing a bundle

- **WHEN** an Agent invokes either documented controls-renderer form
- **THEN** stdout SHALL contain the exact corresponding section rendered by the
  shared helper
- **AND** no bundle path, host-file write, profile write, lifecycle mutation, or
  new authority SHALL be required or produced

#### Scenario: Renderer invocation failure remains outside host-file authority

- **WHEN** the controls renderer receives an unknown subcommand or lacks its
  required supplied-snapshot input
- **THEN** it SHALL exit `2` with direct invocation feedback and leave every
  bundle surface unchanged
- **AND** feedback SHALL not suggest editing a canonical Engine-owned surface

### Requirement: Progress reports only its actual bounded write outcome

The shared Progress writer SHALL operate only on the canonical `## Progress` section and SHALL return a direct `committed`, `unchanged`, or `failed` outcome to its caller. A failed outcome SHALL leave the complete pre-write plan bytes intact and SHALL NOT be represented as a checked Progress claim. An unchanged outcome SHALL mean the resulting bytes already express the requested checked state; it SHALL NOT conceal an inability to locate the canonical section.

#### Scenario: Progress write failure leaves no false claim
- **WHEN** the bounded Progress writer cannot durably write the plan
- **THEN** the original plan bytes remain intact
- **AND** its caller can distinguish failure from a committed or already-unchanged checked line
