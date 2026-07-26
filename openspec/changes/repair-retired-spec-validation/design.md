## Context

`openspec validate --specs` validates every main specification, including
retired capability records. `bundle-start-from-here` has one requirement whose
descriptive sentence is not normative, while `gate-content-dedup` has no
requirement at all. Both failures are specification hygiene, not runtime facts.

## Goals / Non-Goals

**Goals:**
- Preserve BUS-001..003 and GAC-001..009 as retired traceability anchors.
- Make both main specs valid under the current OpenSpec validator.

**Non-Goals:**
- Restore legacy boot-entry or content-dedup behavior.
- Change production code, workflow guidance, requirements registry, or version.

## Decisions

1. Retain each capability as a tombstone with one normative retirement boundary.
   The reader can answer the bounded question "is this retired behavior active?"
   directly from the spec: no. This preserves retirement versus active behavior
   without inventing a new lifecycle state or runtime check.
2. Amend the existing BUS requirement rather than adding a new one. Add one
   GAC tombstone requirement covering the already-registered retired IDs. This
   is the smallest valid shape and avoids a validator exception or a second
   retired-capability registry.
3. Prove the result through targeted and full OpenSpec spec validation. No
   test fixture or automation chain is justified for static Markdown grammar.

## Risks / Trade-offs

- [Retirement prose could be mistaken for active behavior] -> Each requirement
  explicitly SHALL NOT restore or require the retired capability.
- [A future validator changes tombstone rules] -> The normal full validation
  remains the direct feedback loop.

## Migration Plan

Edit only the two main spec requirement blocks, validate, then archive the
change. Rollback restores only the prior prose and has no runtime effect.

## Open Questions

None.
