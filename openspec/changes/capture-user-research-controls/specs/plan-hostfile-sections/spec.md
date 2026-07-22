## ADDED Requirements

> req: PHS-007, PHS-008

### Requirement: Canonical host-file structure excludes bounded user snapshot content

New `rb_plan.md` templates SHALL place `### User Research Controls` after the existing Constraints presentation items. A supplied control snapshot SHALL use a deterministic literal region whose closing delimiter cannot be terminated by an equal-or-shorter delimiter in its content. Canonical host-file readers and writers SHALL locate the template-owned top-level sections in fixed template order and treat this literal region as opaque user content.

Topic Registry refresh, Progress mutation, and setup-ready required-fill inspection SHALL use the same canonical locator/opaque-region interpretation. They SHALL NOT select, replace, or fail on `## Topic Registry`, `## Progress`, `## Decisions`, registry-looking rows, gate-checkbox-looking lines, or `(待填充` / `(尚无话题` literals inside the snapshot. The existing non-empty whole-body minimum remains unchanged, and actual template-owned required-fill markers remain blocking.

#### Scenario: user heading cannot redirect a canonical writer
- **WHEN** a captured snapshot contains a literal `## Topic Registry`, `## Progress`, or `## Decisions` heading
- **THEN** canonical Topic Registry and Progress operations address only their template-owned sections
- **AND** the captured heading remains user content

#### Scenario: user marker does not create false setup failure
- **WHEN** a snapshot contains literal `(待填充` or `(尚无话题` text
- **THEN** setup-ready required-fill inspection ignores that literal region
- **AND** it still fails when the same marker remains in a template-owned required position

### Requirement: Progress reports only its actual bounded write outcome

The shared Progress writer SHALL operate only on the canonical `## Progress` section and SHALL return a direct `committed`, `unchanged`, or `failed` outcome to its caller. A failed outcome SHALL leave the complete pre-write plan bytes intact and SHALL NOT be represented as a checked Progress claim. An unchanged outcome SHALL mean the resulting bytes already express the requested checked state; it SHALL NOT conceal an inability to locate the canonical section.

#### Scenario: Progress write failure leaves no false claim
- **WHEN** the bounded Progress writer cannot durably write the plan
- **THEN** the original plan bytes remain intact
- **AND** its caller can distinguish failure from a committed or already-unchanged checked line
