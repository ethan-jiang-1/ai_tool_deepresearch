---
id: 2026-09-08-wave1-semicolon-url-unmaterializable
title: "Wave1 reference floor deadlock: submitted claim URL containing ';' cannot be materialized and cannot be corrected"
area: DEEP_RESEARCH_HARNESS (engine reference materialization)
severity: medium (gate-blocking for one topic; no data corruption)
status: open
observed: 2026-09-08 (run dpt_rb_enterprise-ai-org-reform, Wave1 gate)
related_rules:
  - "reference_source_url_parseable / checkReferenceSourceUrls (gate-helpers-checks.mjs) splits source_url on ';'"
  - "sourceUrlsFromMetadata (gate-helpers-checks.mjs) splits source_url on ';'"
  - "classifyReferenceAuthority -> urlsBound compares metadata URL to submitted claim URL verbatim"
---

## Summary

A submitted `wave1_topic_deepening` supplementary claim URL legitimately contains a literal `;`
in its path: `https://www.wealthbriefingasia.com/article.php/First_dash_Quarter-2026-Net-Profit-Rises-At-DBS;-Wealth-Arm-Helps-Results-`
(submitted row `wu-w1-b000-deep-i0037`, topic `07_dbs-regulated-moderate-path`).

Three engine surfaces each make this claim un-materializable as a Phase-owned
`reference/{topic}-<qualifier>.md` projection:

1. `sourceUrlsFromMetadata` and `checkReferenceSourceUrls` split the metadata `source_url`
   on `;` (treated as the multi-URL delimiter). The literal `;` in the path therefore produces a
   second, non-parseable segment (`-Wealth-Arm-Helps-Results-`) -> `reference_source_url_parseable`
   fails for the file.
2. `urlsBound` (classifyReferenceAuthority) compares the metadata URL against the submitted
   accepted-URL index verbatim (normalize = strip hash only, no percent-decoding). Percent-encoding
   the `;` as `%3B` in the metadata makes it parseable but fails the backing match.
3. No engine operation can amend a submitted claim/URL list: `supersede` is rejected with
   `semantic_boundary` ("hash-valid; richer/later content alone does not authorize"), and there is
   no amend/edit operation on submitted rows.

Net effect: the topic's canonical-reference floor (`per_topic_ref_md_count_floor`) can never
resolve for this topic while that submitted claim exists, so the Wave1 gate cannot pass, and no
Agent-side data adjustment (reference file content, depth review row set, seed projections) closes
it. The engine's own feedback for the sibling cases (dirty rows) is `repair_kind: missing_contract`.

## Steps to reproduce

1. Submit a `wave1_topic_deepening` supplementary row whose accepted claim URL contains a literal
   `;` in the path and is listed in `accepted_source_urls[]`.
2. Run `inspect-wave1-output` and attempt to materialize the canonical projection named in the
   `materialize_projection` finding.
3. Observe: raw-`;` metadata fails `reference_source_url_parseable`; `%3B` metadata fails the
   submitted-backing URL match; `supersede` declines with `semantic_boundary`.

## Expected behavior (suggestions)

- Treat `;` inside the URL path as opaque (only split unencoded `;` that separates whole URLs,
  e.g. split on `; ` with a following `http`), or
- Percent-normalize both sides before comparison, or
- Provide a sanctioned operation to mark a single accepted claim EXCLUDED/deferred on a submitted
  row (e.g. an audited claim-level supersede or amend), or
- Permit a depth review / floor evaluation to carry a recorded limitation for a single
  un-materializable claim instead of a hard floor block.

## Workaround used in the run

None available (documented as engine boundary). Wave1 gate holds on this single topic.

## Notes

Related observed defect (same family): three primary rows (`wu-w1-b000-deep-i0004/-i0005/-i0012`)
and three first-round supplements (`-i0018/-i0019/-i0020`) carry accepted claims whose URL is
absent from `accepted_source_urls[]` (degraded captures marked accepted), which likewise blocks
depth-review binding with no sanctioned repair path (`semantic_boundary` on supersede;
`missing_contract` on inspect). A claim-acceptance validation at dry-submit time would have caught
both classes before formal submit.
