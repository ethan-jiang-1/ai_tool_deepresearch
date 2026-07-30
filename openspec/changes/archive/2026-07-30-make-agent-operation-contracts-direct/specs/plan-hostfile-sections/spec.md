> req: PHS-007

## MODIFIED Requirements

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
