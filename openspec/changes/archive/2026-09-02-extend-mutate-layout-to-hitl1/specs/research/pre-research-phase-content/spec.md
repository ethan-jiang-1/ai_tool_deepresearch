> req: PRP-011

## ADDED Requirements

### Requirement: HITL1 body routes structural topic re-adjustment through the complete layout target

`phase-hitl1.md` SHALL instruct that, after a first approved canonical topic change set has committed inside the legal HITL1 window, a user-directed structural re-adjustment — splitting one committed topic into several, removing a no-longer-wanted topic, reordering, renumbering, or correcting a misleading slug stem — SHALL be applied by submitting one complete `mutate_layout` target through the same existing `operate-topic-state apply` within the same `hitl1_recorded -> setup_ready` window, based on the copy-ready `inspect` layout baseline. The body SHALL state that the user owns title/order/remove semantics while the Agent owns the mechanical target edits, the retained input, and apply/recover execution, and that safe-remove history/dependency checks, `expected_plan_sha256`, and the atomic prepared workspace are Engine-owned boundaries.

The body SHALL NOT instruct direct editing of `rb_plan.md` topic-registry frontmatter, seed files, or seed frontmatter to achieve structural re-adjustment, and SHALL NOT present degrading a removed topic's title or scope role into a stale placeholder as the removal path. A committed layout target that changes registry length SHALL be followed by consuming the returned style-projection handoff through the existing `apply-research-style.mjs` owner before the `hitl1-recorded` gate.

#### Scenario: Split-topic re-adjustment commits through legal sequential applies

- **WHEN** the user asks to split one committed combined topic into independent topics during the same HITL1 window
- **THEN** the body's path SHALL keep the apply forms unmixed: one apply commits the replacement `add_topic` change set, and a subsequent apply submits one complete `mutate_layout` target that removes the combined UID and reorders/renumbers, carrying `expected_plan_sha256` from a fresh post-add inspect
- **AND** Engine derives continuous ids/slugs, cleans superseded seed files atomically, and the body SHALL NOT instruct hand-editing registry frontmatter, seed file names, or seed frontmatter

#### Scenario: Window closure ends HITL1 layout authority

- **WHEN** the `hitl1-recorded` gate has passed and the bundle has advanced beyond the `hitl1_recorded -> setup_ready` window
- **THEN** the same structural request SHALL no longer be legal in HITL1 and the body SHALL point to the sanctioned rerun path, or a new bundle for already-researched topics
- **AND** the closed window SHALL NOT be reopened by caller-declared context or `human-directed` wording

#### Scenario: Style handoff follows a length-changing HITL1 layout commit

- **WHEN** a HITL1 layout target changes canonical registry length
- **THEN** the phase body SHALL consume the returned style-projection handoff through the existing style CLI before running the `hitl1-recorded` gate
- **AND** it SHALL NOT hand-compute or hand-write style parameters
