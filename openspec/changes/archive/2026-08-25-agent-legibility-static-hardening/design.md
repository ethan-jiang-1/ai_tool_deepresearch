## Context

See `proposal.md` for the measured motivation and the borrowed DSH
「borrowing-harness-idea」 three-question framework. The controlling modified behavior is GCO-008 in
`openspec/specs/governance/guidance-constitution/spec.md`; this change adds only a change-placement
route (a descriptive participation ladder) to the existing demand-driven control map.

Facts that shape the approach (verified this session):

- `openspec/README.md` (Control Map) already routes "what to read next"; it has no row for "where
  does a new behavior attach".
- `openspec/guidance/models/` is the non-authoritative model root (GCO-008 role roots; GCO-009
  forbids normative MUST/MUST-NOT in model documents).
- `check-guidance-pointer-targets.mjs` scans `openspec/guidance/models/` Markdown and fails on
  unresolvable path references, so the ladder's links are already covered with no new test.

## Goals / Non-Goals

**Goals:**

- Give the control map a change-placement route so a fresh agent can answer "where does this new
  behavior attach" before guessing code positions.

**Non-Goals:**

- Do not touch the entry files (`AGENTS.md`/`CLAUDE.md`): `agent/agent-context-routing` already
  enforces the byte-synchronized pair with a deterministic guard test, and the borrowed symlink
  shape would violate ACR's tool-identity accepted behavior.
- Do not add a checker, a test, a dependency, or any `DEEP_RESEARCH_HARNESS/` runtime change.
- Do not make the ladder a behavior authority or a second terminology canon.

## Decisions

### 1. The ladder lives in `openspec/guidance/models/` as a descriptive model

`openspec/guidance/models/where-new-behavior-goes.md` maps four change radii to this repo's seams:
L0 configuration (`openspec/config.yaml`, profile/parameter, run-bundle template) → L1 capability
contract (delta spec + gate/check/CLI under `openspec/specs/<domain>/<capability>`) → L2 full
capability seam (replaceable implementation + stable interface) → L3 core loop
(`DEEP_RESEARCH_HARNESS/` Engine/Agent Flow). It is phrased descriptively (no normative MUST) per
GCO-009, and states that normative effect is owned by the applicable accepted spec.

- **Why models over `docs/adr/`**: it is a navigation convention, not a durable architecture
  decision; the control map already routes to models for system understanding.

### 2. The control map gets one Route By Trigger row, not a new document type

`openspec/README.md` gains one row routing "where does a new behavior attach" to the ladder. This
keeps GCO-008's demand-driven contract (smallest applicable surface per trigger) without inventing a
new navigation tier or a second glossary.

### 3. No new checker or test — existing pointer-targets coverage is the executable feedback

The ladder's path references are scanned by `check-guidance-pointer-targets.mjs` (already in
`check-all.mjs` and the finalizer's drift-guard set), so a seam rename that breaks a ladder link
fails the existing check. This honors the borrowed "mechanically checkable rules land in execution"
without adding a new surface for a pure navigation document.

### Semantic-precision / simple-reliable-control / helper-oriented reflection

- **Semantic precision**: the single new reader-facing surface has one bounded question ("where does
  a new behavior attach?"), the essential distinction (L0–L3 radius + upgrade condition), and a
  normal reasoning stop (the ladder's chosen entry point).
- **Simple reliable control**: the shortest legal loop is `check-guidance-pointer-targets` failing
  on a broken ladder link; no new state, controller, or recovery path is introduced.
- **Helper-oriented responsibility**: writing the ladder and the control-map row is ordinary
  authorized Agent work; the ladder grants no permission and its normative effect stays with the
  accepted spec (Engine/Agent boundary unchanged).

## Risks / Trade-offs

- [The ladder could drift from the real seams it describes] → Mitigation: it lives under
  `openspec/guidance/models/`, which `check-guidance-pointer-targets.mjs` scans; a seam rename that
  breaks a ladder link fails that check.
- [A descriptive ladder may still be read as a behavior authority] → Mitigation: the document
  states its non-authoritative role, and GCO-009 already forbids normative MUST phrasing in model
  documents.
