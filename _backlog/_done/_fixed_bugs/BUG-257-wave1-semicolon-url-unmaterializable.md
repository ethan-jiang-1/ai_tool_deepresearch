---
id: BUG-257
slug: wave1-semicolon-url-unmaterializable
title: "Wave1 reference floor deadlock: submitted claim URL containing ';' cannot be materialized and cannot be corrected"
area: DEEP_RESEARCH_HARNESS (engine reference materialization)
severity: medium (gate-blocking for one topic; no data corruption)
status: fixed
observed: 2026-09-08 (run dpt_rb_enterprise-ai-org-reform, Wave1 gate)
fixed: 2026-09-09 (change `fix-source-url-semicolon-deadlock`, archived as `2026-09-09-fix-source-url-semicolon-deadlock`, finalizer 19/19, commit `ce1d9895b`)
related_rules:
  - "reference_source_url_parseable / checkReferenceSourceUrls (gate-helpers-checks.mjs) splits source_url on ';'"
  - "sourceUrlsFromMetadata (gate-helpers-checks.mjs) splits source_url on ';'"
  - "classifyReferenceAuthority -> urlsBound compares metadata URL to submitted claim URL verbatim"
---

## Resolution (2026-09-09)

Fixed by the archived OpenSpec change `2026-09-09-fix-source-url-semicolon-deadlock`
(commit `ce1d9895b`, `npm test` 3205/3205 green, finalizer checks 19/19):

1. **Delimiter contract (root cause)** — `splitSourceUrls()` in
   `DEEP_RESEARCH_HARNESS/engine/helpers/reference-url.mjs` is now the single
   deterministic `source_url` multi-URL split authority (REF-012 / EEX-001):
   `;` opens a new URL only before an `http(s)://` prefix (case-insensitive);
   a literal `;` inside a URL path stays opaque. The three ad-hoc
   `split(';')` sites (`sourceUrlsFromMetadata`, `checkReferenceSourceUrls`,
   `ref-count.mjs` isCountable) all route through it.
2. **Binding identity kept verbatim** — `normalizeWave1ReferenceUrl` remains
   hash-strip-only; the projection `source_url` must match the submitted claim
   URL verbatim, and a percent-encoded `%3B` deliberately does not bind
   (REF-012).
3. **Fail-fast for the sibling defect family** — dry-submit/submit now reject
   an accepted `source_claims[]` entry whose URL is absent from the row's
   `accepted_source_urls[]` (WUP-007; scoped for Wave1 rows in WAI-013),
   carrying BUG-242-style repair coordinates, instead of surfacing at gate
   time as the unrecoverable `submitted_backing_url_unaccepted` deadlock.
   The bug's suggested claim-level supersede/amend operation and floor
   limitation channel were evaluated and rejected (design D-decision; see the
   archived change's proposal/design).


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
