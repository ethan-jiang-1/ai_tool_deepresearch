---
title: "Gate - Wave 0 Complete"
role: "gate specification"
scope: "shared foundation gate before Wave 1"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/METHODOLOGY.md"
writes: []
---

# Gate - Wave 0 Complete

Wave 0 establishes shared ground truth: common terms, core objects, source buckets, constraints, and reliable starting points for every topic.

## Gate Items

The `Wave 0 Foundation Gate Audit` in `STATUS_PATH` must check:

- accepted shared references meet `wave0_shared_doc_floor`.
- `derived_topic_count > 0`; Wave 0 cannot pass with zero confirmed topics, even if shared-reference floors are otherwise satisfied.
- high-trust shared references are a majority of the configured floor: at least `floor(wave0_shared_doc_floor / 2) + 1`.
- constraint, limitation, or risk coverage has at least one accepted reference.
- comparison, practice review, or failure analysis coverage has at least one accepted reference, or an explicit row in `Unavailable-After-Search Records` with attempted route, attempted queries or source routes, excluded inventory refs or notes, confidence effect, and queue consequence.
- every topic has a Wave 1 starting point, source entry points, and core terms ready enough for deep dive.
- setup-stage `seed_topic_intake_ready=gap_queue_backed` has been resolved to `yes`; unresolved queue-backed intake or original-topic context repair remains a failing topic-start condition, not a Wave 0 pass condition.
- README and `REFERENCE_DIR/_INDEX.md` navigation support 30-second local evidence retrieval.
- the Wave 0 accepted shared reference inventory backs every counted shared reference.
- every counted shared reference resolves under `REFERENCE_DIR`, is an Authoritative Copy with reusable body, and uses a provenance-preserving filename beginning `00-shared-`.
- counted webpage or webpage-derived shared references expose webpage diagnostic fields, acceptable content retention decision, and required cross-verification status.
- reviewed-but-uncounted sources that affected search, exclusion, or gate reasoning remain visible in an excluded inventory.
- `TRACE_PATH` has a distinct Wave 0 transition checkpoint with exact `gate_transition` field value `wave0_complete` when the gate closes, and `STATUS_PATH -> Trace Pointer.last_trace_entry` names that checkpoint.

`Foundation Sufficiency Check` is the qualitative topic-readiness portion of this audit, not a separate gate.

## Pass Rules

Pass only when `derived_topic_count > 0`, every global item and every topic row is `pass`, except the comparison/practice/failure item may carry an explicit structured `Unavailable-After-Search Records` row. Free text in a rationale note, a bare `yes`, a `0 / 0` topic-start denominator, or a generic scarcity sentence does not authorize Wave 0 passage.

Wave 0 passage is not a user-visible stop point. A valid closeout keeps `stop_authorization_state=unauthorized_continue_required`, keeps `safe_to_interrupt=no`, sets `unauthorized_stop_next_action` to the next concrete Wave 1 tool/file/search/check/refill/promotion action, promotes or starts that non-chat Wave 1 continuation action, and records the distinct Wave 0 transition checkpoint whose `gate_transition` value is `wave0_complete` in `TRACE_PATH`. Asking whether to continue, asking whether to adjust direction, or reporting only that Wave 0 is complete is invalid while Wave 1 queue work is executable.

## Fail Rules

Fail if Wave 1 can start without a passing Wave 0 audit, `seed_topic_intake_ready` is not `yes`, `derived_topic_count=0`, any confirmed topic lacks a passing topic-start row, shared reference counts lack local-path inventory backing, counted shared reference files are summary-only or use opaque `ref-NNN` names, retrieval navigation is not locally testable, unresolved intake gaps are treated as ready topic starts, topic-specific deep dives compensate for missing shared foundation, counted webpage evidence fails diagnostic requirements, the Wave 0 gate transition lacks a distinct trace checkpoint/pointer update with `gate_transition` value `wave0_complete`, or the closeout authorizes a user-visible recap/review/continue prompt instead of starting Wave 1 continuation work.
