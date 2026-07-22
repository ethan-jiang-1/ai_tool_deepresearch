## ADDED Requirements

> req: PHS-004, PHS-005, PHS-006, PHS-007, PHS-008

### Requirement: Canonical host-file structure excludes bounded user snapshot content

New `rb_plan.md` templates SHALL place `### User Research Controls` after the existing Constraints presentation items. A supplied control snapshot SHALL use a deterministic literal region whose closing delimiter cannot be terminated by an equal-or-shorter delimiter in its content. One shared helper SHALL identify only that valid literal region and expose bounded canonical-target location/replacement for its callers; it SHALL NOT parse a general Markdown AST or create a full-document semantic section tree. Canonical host-file readers and writers SHALL use that helper to distinguish their own template-owned target from opaque user content. This boundary SHALL retain existing advisory treatment for a missing or non-standard Topic Registry presentation; it SHALL NOT turn presentation drift into a new layout blocker.

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

## MODIFIED Requirements

### Requirement: Constraints and Decisions sections preserve bounded user controls

The `## Constraints` and `## Decisions` sections SHALL be present in the template.

`## Constraints` SHALL retain its five presentation categories as a bullet list, each using the intentionally-allowed marker `(待 HITL1 填充 — …)` where the value needs HITL1 input:

- **语言** — source language preference (仅中文源/中英混合/不限)
- **时间预算** — time constraint (default: no hard deadline)
- **地域** — geographic scope (中国大陆/港澳台/海外)
- **方法** — default `open` (Agent selects search/synthesis/fetch freely)
- **来源偏好** — source priority (一手源优先/学术优先/无偏好)

After these items, new templates SHALL contain `### User Research Controls` with exactly the no-controls form defined by URC-001. HITL1 MAY replace that form only with URC-001's exact supplied-controls label plus complete literal snapshot. The subsection is Agent/user narrative guidance, not a Gate input or parsed semantic authority. No Gate SHALL evaluate the truth or completeness of Constraints prose; PHS-005 only retains its direct required-fill-marker check outside a valid opaque snapshot.

`## Decisions` SHALL be marked as `(append-only — 关键决策记录，最新在上)`. No Gate SHALL check its content in this change.

#### Scenario: no-controls template remains non-blocking
- **WHEN** a new bundle passes through gates with the template no-controls form and intentionally-allowed Constraints markers
- **THEN** Constraints prose alone SHALL NOT cause a gate failure

#### Scenario: supplied controls remain guidance rather than Gate facts
- **WHEN** HITL1 replaces the no-controls form with a valid literal user snapshot
- **THEN** the snapshot guides Agent work without becoming a profile field, source-floor exception, or Gate pass fact

### Requirement: Gate checks plan body for minimum content

The `setup-ready` gate SHALL verify that `rb_plan.md` body is non-empty (at least one character after stripping frontmatter) and that template-owned content outside a valid URC-001 literal snapshot does not contain required-fill template markers—the prefix patterns `(待填充` and `(尚无话题`. These two markers signal "Agent must replace before proceeding." Other markers such as `(待 HITL1 填充 — …)`, `(由 Engine — …)`, and `(待 HITL2 确认 — …)` are intentionally allowed and SHALL NOT cause gate failure.

Gate rules remain:
- `plan_body_non_empty` (`field_non_empty` on `rb_plan.md` body, after stripping frontmatter) — catches "Agent wrote nothing." The control snapshot does not by itself establish Goal/section completeness beyond this existing minimum.
- `plan_body_no_unfilled_marker` (`pattern_match` with negate, pattern `\((?:待填充|尚无话题)`) — catches a required-fill marker in template-owned content. Its implementation SHALL use PHS-007's canonical locator/opaque-region interpretation before applying the existing pattern.

#### Scenario: non-empty body without template-owned required-fill marker passes
- **WHEN** `rb_plan.md` body has content and no template-owned line matches the required-fill prefixes
- **THEN** both plan-body rules SHALL pass even if a valid user snapshot contains those literal strings

#### Scenario: required-fill marker in template-owned content fails
- **WHEN** a template-owned Goal or other required position still contains `(待填充 — …)` or `(尚无话题 — …)`
- **THEN** `plan_body_no_unfilled_marker` SHALL fail with inspect listing the detected marker prefix

#### Scenario: malformed controls form is not an escape hatch
- **WHEN** a user-controls subsection uses an incomplete fence, wrong supplied-controls label, or other non-URC-001 form
- **THEN** its text SHALL not be treated as an opaque snapshot
- **AND** any required-fill marker there remains visible to the existing check

### Requirement: Engine writes Progress on gate pass

The `## Progress` section SHALL contain a pre-populated checklist of all workflow gates in lifecycle order, initially all unchecked (`- [ ] <gate-name>`). When a gate passes, the Engine SHALL attempt to flip the corresponding canonical checkbox to `- [x] <gate-name> (<ISO8601 timestamp>)`. This write is idempotent (re-running the same gate updates the timestamp, does not duplicate the line). If the canonical Progress section exists but the gate is not pre-listed, the Engine SHALL append one new checked line there.

The shared `writePlanProgress()` helper SHALL use the canonical host-file locator and return `committed`, `unchanged`, or `failed` to its caller. A `failed` outcome SHALL leave the full pre-write plan bytes unchanged and SHALL NOT be represented as a checked Progress claim. Progress is presentation: a failure to update it SHALL NOT reverse the already-evaluated deterministic gate content result or independently create a new Gate rule. For setup-ready, the existing pass is consumable only when the actual remaining bytes can still be covered by the required route-bound checkpoint and trace contract; this is a handoff-audit prerequisite, not a Progress presentation verdict.

Gate list source: the template pre-populates gates from the known workflow manifest lifecycle. `check-gate-setup-ready.mjs` remains the first caller; other gate CLIs integrate in follow-up changes.

#### Scenario: Gate pass flips canonical Progress checkbox
- **WHEN** `check-gate-setup-ready.mjs` evaluates all rules and the gate passes
- **THEN** the Engine attempts to flip the canonical `- [ ] setup-ready` line to `- [x] setup-ready (<ISO8601 ts>)` in `rb_plan.md## Progress`
- **AND** a successful write is reported as `committed` or `unchanged`

#### Scenario: Re-running the same gate is idempotent
- **WHEN** the setup-ready gate is evaluated and passes a second time on the same bundle
- **THEN** the Engine updates the timestamp on the existing canonical `- [x] setup-ready` line without duplicating it

#### Scenario: Progress write failure does not fabricate or reverse a verdict
- **WHEN** `writePlanProgress()` cannot write (for example disk full or permission error)
- **THEN** the plan retains its pre-write bytes and no checked Progress claim is emitted
- **AND** the deterministic setup-ready content evaluation remains its actual result
- **AND** only the route-bound checkpoint/trace contract determines whether that passed result can be consumed
