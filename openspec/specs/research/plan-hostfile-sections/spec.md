# plan-hostfile-sections Specification

> req: PHS-001, PHS-002, PHS-003, PHS-004, PHS-005, PHS-006, PHS-007, PHS-008, PHS-009, PHS-010

> delta-synced: strengthen-user-intent-carry-through (PHS-009)

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

The `## Progress` section SHALL contain a pre-populated baseline checklist of all workflow gates in lifecycle order, initially all unchecked (`- [ ] <gate-name>`). Every gate pass SHALL cause the Engine to attempt to flip the corresponding canonical checkbox in the **current Progress block** to `- [x] <gate-name> (<ISO8601 timestamp>)`. This write is idempotent (re-running the same gate in the same block updates the timestamp, does not duplicate the line). If the canonical Progress section exists but the gate is not pre-listed in the current block, the Engine SHALL append one new checked line there.

The Progress section SHALL grow per rerun cycle: when the `rerun-ready` gate passes, after flipping `rerun-ready` in the current block the Engine SHALL append a new cycle block (`### Rerun cycle <N>`, `N` strictly increasing by 1) pre-populated with that cycle's re-executable gates in lifecycle order, all unchecked: `seed-topics-ready`, `wave0-complete`, `wave1-complete`, `wave2-complete`, `hitl2-recorded`, `readiness-passed`, `rerun-ready`. Spawn SHALL be a transition effect: the Engine SHALL append `### Rerun cycle <N+1>` only when the current block's `rerun-ready` line was flipped from unchecked to checked by this pass and no such block already exists, so re-running the `rerun-ready` gate against an already-checked line updates the timestamp without duplicating the block. The baseline block is the checklist pre-populated by the template; while no cycle block exists it is the current block, otherwise the current block is the last appended cycle block. A gate pass SHALL flip its line only in the current block.

The shared `writePlanProgress()` helper SHALL use the canonical host-file locator and return `committed`, `unchanged`, or `failed` to its caller. A `failed` outcome SHALL leave the full pre-write plan bytes unchanged and SHALL NOT be represented as a checked Progress claim. Progress is presentation: a failure to update it SHALL NOT reverse the already-evaluated deterministic gate content result or independently create a new Gate rule. For setup-ready, the existing pass is consumable only when the actual remaining bytes can still be covered by the required route-bound checkpoint and trace contract; this is a handoff-audit prerequisite, not a Progress presentation verdict.

Gate list source: the template pre-populates the baseline block from the known workflow manifest lifecycle. All gate CLIs (instantiation, hitl1, setup, seed-topics, wave0, wave1, wave2, hitl2, readiness, rerun-ready) SHALL invoke the shared Progress writer on pass; cycle blocks are Engine-runtime append-only and SHALL NOT appear in the template.

#### Scenario: Gate pass flips Progress checkbox
- **WHEN** any gate CLI evaluates all rules and the gate passes
- **THEN** the Engine attempts to flip the canonical `- [ ] <gate>` line to `- [x] <gate> (<ISO8601 ts>)` in the current block of `rb_plan.md## Progress`
- **AND** a successful write is reported as `committed` or `unchanged`

#### Scenario: Re-running the same gate is idempotent
- **WHEN** a gate is evaluated and passes a second time in the same cycle (for example a rerun cycle re-passes `seed-topics-ready`)
- **THEN** the Engine updates the timestamp on the existing canonical `- [x] <gate>` line of that block without duplicating it

#### Scenario: Rerun-ready pass grows a new cycle block
- **WHEN** the `rerun-ready` gate passes and no `### Rerun cycle <N+1>` block exists yet
- **THEN** the Engine flips `- [x] rerun-ready` in the current block and appends `### Rerun cycle <N+1>` with `seed-topics-ready`, `wave0-complete`, `wave1-complete`, `wave2-complete`, `hitl2-recorded`, `readiness-passed`, `rerun-ready` all unchecked
- **AND** the next gate pass within that cycle flips its line in the new block

#### Scenario: Re-running rerun-ready does not duplicate a cycle block
- **WHEN** the `rerun-ready` gate passes again while its line in the current block is already checked
- **THEN** the Engine updates the `rerun-ready` timestamp in the current block
- **AND** no additional cycle block is appended

#### Scenario: Gate pass within a rerun cycle updates the current block
- **WHEN** a rerun cycle block exists and a cycle gate (for example `wave0-complete`) passes
- **THEN** the Engine flips that gate's line in the last cycle block, not in the baseline block

#### Scenario: Progress write failure does not affect gate output
- **WHEN** `writePlanProgress()` cannot write (for example disk full or permission error)
- **THEN** the plan retains its pre-write bytes and no checked Progress claim is emitted
- **AND** the deterministic gate content evaluation remains its actual result
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

### Requirement: Decisions SHALL retain accepted rerun intent revisions newest-first

`rb_plan.md## Decisions` SHALL be the existing host-file history for accepted
post-HITL1 research-intent revisions. A complete revision SHALL use the heading
`### Rerun intent revision: <target_rerun_count>` and these fixed visible labels:
`Target rerun count`, `This-round delta`, `Affected canonical Topics`,
`Superseded or withdrawn requirements`, `Accepted Agent interpretation`,
`Current active amendments relative to HITL1 baseline`, and
`Accepted user wording`. An empty set SHALL be stated explicitly rather than
inferred.

The first six labels and values SHALL each occupy one bounded bullet line; a
missing or empty set SHALL use explicit `none`. Only `Accepted user wording` MAY
be multiline. Every accepted wording line SHALL remain under that label as
Markdown blockquote content: a non-empty line is prefixed with `> ` and an empty
line with `>`. A user-supplied heading, checkbox-looking line, Decisions heading,
or other Markdown structure SHALL therefore remain quoted content and SHALL NOT
become a host-file section or revision entry. This containment is an Agent
authoring rule; it SHALL NOT add an Engine parser, decoder, or semantic check.

Complete accepted revisions SHALL be newest-first and immutable. The newest
complete revision is the current amendment set; readers SHALL combine it with
the HITL1 controls baseline and SHALL NOT merge older deltas back into current
intent. Older entries preserve what was accepted at that revision, including a
requirement later withdrawn or replaced. Unaccepted conversation drafts and
presentation-only Final feedback SHALL NOT be written as revisions.

The section remains Agent-readable Markdown. No Engine parser, schema field,
Gate rule, lifecycle state, or semantic-equivalence check SHALL be added for
revision prose. Existing canonical host-file writers SHALL preserve every
accepted revision while refreshing only their already-owned plan surfaces.
Legacy bundles without revision entries remain readable and SHALL NOT receive
reconstructed history.

#### Scenario: Second rerun preserves first-round history

- **WHEN** rerun 1 accepts amendments A and B, then rerun 2 replaces A with A2 and withdraws B
- **THEN** the rerun 2 entry SHALL appear above rerun 1 and state current active amendments as A2
- **AND** the unchanged rerun 1 entry SHALL still show that A and B were accepted at that earlier revision

#### Scenario: Current reader stops at baseline plus newest revision

- **WHEN** an Agent resumes a bundle with two complete Decisions revisions
- **THEN** it SHALL use the HITL1 baseline plus the newest revision's complete active amendments as current research intent
- **AND** it SHALL NOT scan chat or union superseded requirements from older revisions into the current set

#### Scenario: User Markdown remains inside the accepted-wording field

- **WHEN** accepted user wording contains `## Progress`, `## Decisions`, a checkbox-looking line, or a blank line
- **THEN** every such line SHALL remain inside the revision's linewise blockquote
- **AND** none of that wording SHALL be interpreted as a host-file section, revision heading, or progress item

#### Scenario: Topic-state replacement preserves revision history

- **WHEN** canonical topic-state apply refreshes plan frontmatter and the standard Topic Registry presentation after one or more accepted revisions exist
- **THEN** every Decisions revision SHALL remain byte-preserved outside the writer's existing owned target
- **AND** no revision SHALL be moved into profile, Topic, Gate, or Engine authority

#### Scenario: Legacy plan does not invent history

- **WHEN** a readable legacy bundle has no rerun intent revision in Decisions
- **THEN** existing controls, profile, and direction compatibility behavior SHALL remain available
- **AND** the Agent SHALL NOT infer or backfill historical revisions from artifacts, filenames, or chat

### Requirement: Progress checkbox states are Engine-owned and tamper-evident

The Engine remains the only legal writer that flips canonical `## Progress` checkboxes on gate pass. A canonical `- [x] <gate>` line whose gate lacks a passed `gate_attempt` with its route-bound consumption witness in `rb_trace.jsonl` SHALL be tamper evidence; for a line in a cycle block, the witness SHALL be a passed `gate_attempt` for that gate recorded at or after that block's spawn, except that a cycle block's `rerun-ready` line SHALL be witnessed only by a LATER `rerun-ready` pass — the pass that spawned the block witnesses the PREVIOUS block's `rerun-ready` line, never its own. The phase status audit SHALL report tamper as `plan_progress_tamper_suspected` naming the affected gate lines and their blocks. A passed `gate_attempt` (consumed gate) whose line in the block that was current at that attempt is unchecked SHALL be surfaced by the audit as advisory presentation staleness, naming the gate and its block; staleness SHALL be non-blocking and SHALL NOT appear among blocking integrity outcomes. Tamper evidence and staleness SHALL remain presentation facts: they SHALL NOT substitute for trace truth in any gate verdict, SHALL NOT authorize any phase, delivery, or completion conclusion, and SHALL NOT be repairable by editing the checkbox alone. Progress SHALL NOT become a second lifecycle authority, and the canonical locator SHALL continue to exclude user-snapshot content from checkbox interpretation.

A reconcile tool MAY rebuild Progress state (including cycle blocks) for a bundle whose Progress lagged; it SHALL derive every checked line and every cycle block from `rb_trace.jsonl` route-bound `gate_attempt` witnesses and the canonical baseline checklist, so every line it writes satisfies the same witness rule as a gate-pass flip (checked only when a passed `gate_attempt` with route-bound consumption exists). Its writes SHALL count as Engine writes subject to the same tamper evidence.

#### Scenario: Hand-checked gate without a pass is tamper evidence

- **WHEN** `rb_plan.md## Progress` contains `- [x] wave1-complete` and `- [x] wave2-complete`
- **AND** trace contains no passed wave1/wave2 gate attempt with route-bound consumption
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming both gate lines

#### Scenario: Cycle-block line without a witnessed pass in its cycle is tamper evidence

- **WHEN** a `### Rerun cycle <N>` block contains `- [x] wave0-complete`
- **AND** no passed `wave0-complete` gate attempt with route-bound consumption exists at or after that block's spawn
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming that line and its block

#### Scenario: Cycle-block rerun-ready line is witnessed only by a later rerun pass

- **WHEN** a `### Rerun cycle <N>` block contains `- [x] rerun-ready`
- **AND** the only `rerun-ready` pass with route-bound consumption is the one that spawned that block
- **THEN** the audit SHALL report `plan_progress_tamper_suspected` naming that line and its block
- **AND** the audit SHALL NOT treat the block's own spawner pass as its `rerun-ready` witness

#### Scenario: Engine flip remains the only legal checked state

- **WHEN** a gate passes and the Engine flips its canonical line in the current block
- **THEN** the audit SHALL NOT report tamper evidence for that line

#### Scenario: Consumed gate without a checked line is advisory staleness

- **WHEN** a passed `gate_attempt` with route-bound consumption exists for a gate
- **AND** the line for that gate in the block current at that attempt is unchecked
- **THEN** the audit SHALL surface advisory presentation staleness naming the gate and its block
- **AND** staleness SHALL be non-blocking and SHALL NOT appear among blocking integrity outcomes

#### Scenario: Engine write failure is staleness, not tamper

- **WHEN** a gate passed but the Progress write reported `failed`
- **THEN** the unchecked line SHALL be surfaced as advisory presentation staleness
- **AND** it SHALL NOT be reported as tamper evidence

#### Scenario: Checked lines never substitute for trace truth

- **WHEN** a canonical line is checked without a passed gate witness
- **THEN** no gate, entry, or delivery surface SHALL treat it as completion or authorization evidence
- **AND** the deterministic gate content evaluation SHALL continue to use trace and runtime truth only
