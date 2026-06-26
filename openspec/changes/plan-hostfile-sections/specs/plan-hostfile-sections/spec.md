> req: PHS-001, PHS-002, PHS-003, PHS-004, PHS-005, PHS-006

## ADDED Requirements

### Requirement: Plan template uses YAML frontmatter with structured body sections

The `rb_plan.md` file is the **host file**: the single Markdown artifact an Agent or human reads to get the complete research picture—goal, topics, constraints, progress, and decisions—without consulting conversation history or scattered control files. The host file pattern makes `rb_plan.md` the authoritative narrative surface for the research run, while `rb_status.json` / `rb_queue.json` / `rb_trace.jsonl` remain the machine-authoritative control files. It intentionally overlaps with `rb_profile.yaml` on topic and scope—same research intent, two audiences: Agent reads Markdown prose for task understanding, Engine reads YAML fields for gate validation. They complement without conflict.

The `rb_plan.md.tmpl` SHALL use YAML frontmatter (instead of JSON) for `plan_basename`, `derived_topic_count`, and `topic_registry` fields. The frontmatter field names SHALL remain unchanged from the current PlanSchema definition. The body SHALL contain five Markdown sections in fixed order: `## Goal`, `## Topic Registry`, `## Constraints`, `## Progress`, `## Decisions`.

#### Scenario: Production bundle instantiation with new template

- **WHEN** `instantiate-run-bundle.mjs` creates a new bundle with `{{name}}` substitution
- **THEN** the resulting `rb_plan.md` SHALL have YAML frontmatter parseable by `parseMdFrontmatter()` and a body containing all five section headers

#### Scenario: Existing JSON frontmatter remains parseable

- **WHEN** `parseMdFrontmatter()` reads an `rb_plan.md` with JSON frontmatter (from an older bundle or disposable path)
- **THEN** the function SHALL return the correct `{ plan_basename, derived_topic_count, topic_registry }` object (YAML 1.2 is a superset of JSON)

### Requirement: Goal section provides north-star anchor for Agent

The `## Goal` section SHALL contain three sub-sections: `### Purpose` (one-paragraph summary of the research), `### Research Questions` (numbered list of core questions), and `### Scope`. The `### Scope` sub-section SHALL be further structured as:

- **In scope:** — what the research covers. Required-fill marker `(待填充 — …)`; Agent MUST replace after HITL1.
- **Out of scope:** — what is explicitly excluded, preventing Agent over-search. Required-fill marker `(待填充 — …)`; Agent MUST replace after HITL1.
- **待定:** — gray areas depending on future user input. Intentionally-allowed marker `(待 HITL2 确认 — …)`; gate SHALL NOT flag.

At minimum, `### Purpose` SHOULD be filled after HITL1 completes (an Agent behavior convention, not gate-enforced). `phase-hitl1.md` instructions SHALL direct the Agent to write here; missing or incomplete sub-sections SHALL NOT block gate passage.

**Placeholder marker convention.** Template sections use markers to signal fill status to both Agent and gate. Two marker classes exist:

- **Required-fill markers** — `(待填充…)` and `(尚无话题…)`. These mean "must fill before proceeding." The `setup-ready` gate SHALL fail if any required-fill marker remains in the body. Used in `## Goal` sub-sections; after HITL1 the Agent MUST replace them with real content.
- **Intentionally-allowed markers** — `(待 HITL1 填充 — …)`, `(由 Engine — …)`, `(待 HITL2 确认 — …)`. These mean "deferred to a future phase, intentionally left as-is." The gate SHALL NOT flag them. Used in `## Constraints`, `## Topic Registry` body table, and `## Goal` sub-sections deferred to HITL2.

This convention ensures the gate catches "Agent forgot to fill" without blocking legitimate deferrals.

#### Scenario: Agent reads Goal section during reground

- **WHEN** a new Agent session loads `rb_plan.md` for context reground
- **THEN** the `## Goal` section SHALL provide a single authoritative source for the research objective, without requiring the Agent to consult conversation history or `rb_profile.yaml`

#### Scenario: Goal section remains empty before HITL1

- **WHEN** a newly instantiated bundle has not yet gone through HITL1
- **THEN** the `## Goal` section MAY contain placeholder text indicating it should be filled during HITL1

#### Scenario: Missing Goal section does not block gate

- **WHEN** `rb_plan.md` body is non-empty and contains no placeholder tokens, but `## Goal` section is absent or unfilled
- **THEN** the `setup-ready` gate SHALL pass—the gate does not enforce section structure, only body non-emptiness

### Requirement: Topic Registry body section is human-readable table

The `## Topic Registry` section SHALL be a Markdown table with columns: `#`, `Slug`, `Title`, `Status`. The frontmatter `topic_registry` SHALL remain the authoritative source for topic identity (id/slug/title). The body table is a derived human-readable view; conflicts SHALL be resolved in favor of frontmatter.

#### Scenario: Topic Registry table reflects frontmatter topics

- **WHEN** Agent writes topics to `topic_registry` frontmatter during HITL1
- **THEN** the body `## Topic Registry` table SHALL list the same topics with corresponding slugs and titles

#### Scenario: Status column tracks per-topic progress

- **WHEN** a wave completes for a specific topic
- **THEN** the Agent MAY update the Status column for that topic's row (frontmatter remains authoritative for identity)

#### Scenario: Body table out of sync with frontmatter does not block gate

- **WHEN** the `## Topic Registry` body table is missing or has different slugs than the frontmatter `topic_registry`
- **THEN** the gate SHALL NOT fail—frontmatter is authoritative, body table is a derived view

### Requirement: Constraints and Decisions sections are reserved for future use

The `## Constraints` and `## Decisions` sections SHALL be present in the template.

`## Constraints` SHALL be pre-populated with five constraint categories as a bullet list, each using the intentionally-allowed marker `(待 HITL1 填充 — …)` to signal the fill point without blocking the gate:

- **语言** — source language preference (仅中文源/中英混合/不限)
- **时间预算** — time constraint (default: no hard deadline)
- **地域** — geographic scope (中国大陆/港澳台/海外)
- **方法** — default `open` (Agent selects search/synthesis/fetch freely)
- **来源偏好** — source priority (一手源优先/学术优先/无偏好)

Categories with known defaults (方法) MAY be filled directly; categories needing HITL1 input SHALL use intentionally-allowed markers. No gate SHALL check Constraints content in Phase 1.

`## Decisions` SHALL be marked as `(append-only — 关键决策记录，最新在上)`. No gate SHALL check its content in Phase 1.

#### Scenario: Empty or marker-only sections do not cause gate failure

- **WHEN** a bundle passes through gates
- **THEN** `## Constraints` with only intentionally-allowed markers and empty `## Decisions` SHALL NOT cause any gate to fail

### Requirement: Engine writes Progress on gate pass

The `## Progress` section SHALL contain a pre-populated checklist of all workflow gates in lifecycle order, initially all unchecked (`- [ ] <gate-name>`). When a gate passes, the Engine SHALL flip the corresponding checkbox to `- [x] <gate-name> (<ISO8601 timestamp>)`. This write is idempotent (re-running the same gate updates the timestamp, does not duplicate the line). If a gate is not pre-listed in the checklist, the Engine SHALL append a new checked line. The write SHALL be wrapped in try/catch—failure to update Progress MUST NOT affect gate output or exit code.

Gate list source: the template pre-populates gates from the known workflow manifest lifecycle. The `writePlanProgress()` helper function SHALL be added to `gate-helpers.mjs` as a shared utility. Phase 1 integration: `check-gate-setup-ready.mjs` is the first caller; other gate CLIs integrate in follow-up changes.

#### Scenario: Gate pass flips Progress checkbox

- **WHEN** `check-gate-setup-ready.mjs` evaluates all rules and the gate passes
- **THEN** the Engine SHALL flip `- [ ] setup-ready` to `- [x] setup-ready (<ISO8601 ts>)` in `rb_plan.md## Progress`

#### Scenario: Re-running the same gate is idempotent

- **WHEN** the setup-ready gate is evaluated and passes a second time on the same bundle
- **THEN** the Engine SHALL update the timestamp on the existing `- [x] setup-ready` line without duplicating it

#### Scenario: Progress write failure does not affect gate output

- **WHEN** `writePlanProgress()` throws (e.g., disk full, permission error)
- **THEN** the gate SHALL still emit its normal result JSON and exit with the correct code; Progress write failure is silently caught

### Requirement: Gate checks plan body for minimum content

The `setup-ready` gate SHALL verify that `rb_plan.md` body is non-empty (at least one character after stripping frontmatter) and that it does not contain required-fill template markers—the prefix patterns `(待填充` and `(尚无话题`. These two markers signal "Agent must replace before proceeding." Other markers such as `(待 HITL1 填充 — …)`, `(由 Engine — …)`, and `(待 HITL2 确认 — …)` are intentionally allowed and SHALL NOT cause gate failure. See PHS-002 for the full marker convention.

Gate rules:
- `plan_body_non_empty` (`field_non_empty` on `rb_plan.md` body, after stripping frontmatter) — catches "Agent wrote nothing."
- `plan_body_no_unfilled_marker` (`pattern_match` with negate, pattern `\((?:待填充|尚无话题)`) — catches "Agent did not replace required-fill markers." The regex uses `(?:…)` non-capturing alternation and matches the literal opening parenthesis `\(` followed by either marker prefix. It matches template tokens in the form `(待填充 — description…)` where `— description…` is arbitrary guidance text.

#### Scenario: Non-empty body without required-fill markers passes gate

- **WHEN** `rb_plan.md` body has content and no line matches the required-fill marker prefixes `(待填充` or `(尚无话题`
- **THEN** both `plan_body_non_empty` and `plan_body_no_unfilled_marker` SHALL pass

#### Scenario: Empty body fails gate

- **WHEN** `rb_plan.md` body is empty or contains only whitespace after stripping frontmatter
- **THEN** the `plan_body_non_empty` rule SHALL fail with inspect pointing to the empty body

#### Scenario: Required-fill markers cause gate failure

- **WHEN** `rb_plan.md` body contains `(待填充 — …)` or `(尚无话题 — …)` with the guidance text still attached
- **THEN** the `plan_body_no_unfilled_marker` rule SHALL fail with inspect listing which marker prefix was detected

#### Scenario: Intentionally-allowed markers do NOT cause gate failure

- **WHEN** `rb_plan.md` body contains `(待 HITL1 填充 — …)`, `(由 Engine — …)`, or `(待 HITL2 确认 — …)` but NO `(待填充 — …)` or `(尚无话题 — …)` markers
- **THEN** the `plan_body_no_unfilled_marker` rule SHALL pass

