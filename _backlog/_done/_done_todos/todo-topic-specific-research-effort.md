# TODO: Topic-specific research effort

> Status: parked / policy exploration | Priority: low-medium | Captured: 2026-08-05
> Trigger: `BUG-175-count-floors-as-absolute-gate-blockers.md`
> This is not an Engine defect. It is a product-policy and semantic-design question.

## Problem

Wave0 currently applies one research-style-derived source-count floor to every
Topic. The Gate rule is named `per_topic_count_floor`; the actual scalar is
`rb_profile.yaml#/research_style_params/wave0_per_topic_source_floor`.

That is a useful baseline, but it makes a narrow supporting Topic and a broad,
central, contested Topic carry the same minimum source count. It also risks
using source count as an imprecise proxy for search breadth, analytical depth,
or evidence quality.

`BUG-175` has already established that a count-floor-only shortfall can reach a
legal degraded Wave0 handoff after the accepted fatigue threshold. It does not
settle whether the default floor, or a future per-Topic floor, is good policy.

## Existing Seams And Constraints

- Wave0 expands the `per_topic_count_floor` rule once per Topic and the shared
  evaluator already receives the current `target.topic`; only
  `resolveThreshold()` ignores that context and reads one profile scalar.
- The canonical `topic_registry` owns stable Topic identity and minimum durable
  intent. Its entries are strict, UID-bound, and atomically projected into
  matching seed files by `operate-topic-state`.
- Seed enrichment is also strict: it currently accepts exactly `hypothesis`,
  `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route`.
  A new structured field needs an explicit writer/schema change; it must not be
  slipped into arbitrary frontmatter and then treated as Gate authority.
- `research_style_params` is not a safe home for per-Topic overrides.
  `apply-research-style.mjs` is its sole writer and computes a complete exact
  projection; freshness and lineage checks compare that complete object.
- `scope_role` is a delivery/intention role, not a measure of evidence need.
  Mapping `primary`, `comparison`, or `supporting` directly to a source floor
  would create hidden policy coupling.

## Recommended First Slice

Do not introduce a generic numeric `weight` yet. Its meaning is ambiguous:
minimum evidence, search breadth, analysis depth, and priority are different
questions.

If real-run evidence supports changing behavior, add one optional canonical
Topic field with a bounded meaning:

```yaml
wave0_source_floor_override: <positive integer>
```

- Omitted means: use the existing research-style global default unchanged.
- Present means: this Topic's Wave0 Gate requires that exact source-array
  count, while retaining existing schema/provenance checks and degradation
  policy.
- The Wave0 task planner and Gate must use one shared resolver, so the Agent's
  candidate planning target matches the Engine's deterministic requirement.
- The field belongs to the canonical Topic and is projected to its seed file;
  it must travel by `topic_uid`, not by a standalone slug-keyed map.
- Do not automatically modify `wave0_shared_ref_total`. Shared-reference
  coverage is cross-Topic policy and needs its own evidence and decision.

This is deliberately an explicit count override, not a multiplier. A multiplier
introduces rounding rules and profile-coupling while hiding the actual Gate
requirement from the reader.

## Later, Separate Question

If the goal is genuinely different search breadth or analytical depth, design a
separate Agent-facing `research_intensity` or search-envelope concept only after
defining its bounded question, allowed values, and observable effect. It should
guide search and synthesis; the Engine must not pretend it can prove semantic
depth merely by counting sources.

## Decisions Needed Before A Change

1. Is the first outcome only per-Topic Wave0 source floors, or a durable
   cross-Wave research-intensity model?
2. Who selects a non-default floor: user at HITL1, the Agent under recorded
   guidance, or a future explicit policy table?
3. May an override both raise and lower the style default, and what real-bundle
   evidence establishes a reasonable calibration?
4. Should a future shared-reference policy use Topic effort at all, or remain
   independent of per-Topic intake floors?

## Non-Goals

- Do not treat a count floor as a quality, relevance, or depth score.
- Do not derive effort from `scope_role`, title length, queue priority, or an
  unreviewed LLM heuristic.
- Do not add a second profile writer, a hidden fallback map, a new lifecycle
  state, or a separate Gate/controller.
- Do not alter the current count-floor degradation policy without a focused
  OpenSpec change and qualifying real-bundle evidence.

## Next Step

Keep this parked until the first decision above is made and a real-bundle case
shows that a per-Topic source-floor override would improve the research result.
Then use `/opsx:explore` to settle ownership and calibration before proposing
any implementation change.
