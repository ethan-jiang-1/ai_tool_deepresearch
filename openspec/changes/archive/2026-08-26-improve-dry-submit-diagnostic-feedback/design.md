## Context

See `proposal.md - Why`. Current state that shapes the approach:

- All dry-submit diagnostics are produced inside `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs`.
- Cache-URL mismatch (BUG-242): `validateSubmitSourceClaims` already computes
  `normalizedClaimUrl` and `mapping.urls` (the normalized recorded leaf urls from
  `cacheLeafMapping(meta)`); the thrown message only embeds `claim.url` and `trail`.
  `validationRepairError(message, repair)` attaches `error.repair_contract = repair`,
  so `details`/`missing_fact` fields already flow to the surface.
- Receipt schema failure (BUG-243): `validateSubmitRuntimeReceipt` loops lines and throws at the
  **first** schema-failing line (`WorkUnitRuntimeReceiptEventSchema.safeParse`), embedding only
  `ts: Invalid datetime` and `error.receipt_line = index + 1`. The raw offending value and other
  affected lines are discarded.
- The verdicts are deterministic and correct; only the carried diagnostic values are insufficient.

## Goals / Non-Goals

**Goals:**
- Cache-URL mismatch: include the recorded leaf urls (and declared accepted urls for the
  no-match case) in the message + `details`, so the Agent repairs without reading `meta.json`.
- Receipt schema failure: include the raw failing value, every affected line, and the legal
  format expectation (datetime → ISO 8601 UTC), collecting all schema-failing lines instead of
  stopping at the first.
- Update regressions to assert the new diagnostic fields; no verdict change.

**Non-Goals:**
- No change to any validation verdict, schema, normalization, or formal submit behavior.
- No new feedback vocabulary or new repair_kind values (use existing `details`/`missing_fact`).
- No change to cache leaf layout or `cacheLeafMapping` itself.

## Decisions

**D1 — Enrich the existing `validationRepairError` payload rather than adding a new feedback shape.**

BUG-242: at the mismatch throw, append to the message the recorded leaf urls
(`mapping.urls` joined) and pass `details: { claim_url, cache_trail: trail, recorded_leaf_urls: mapping.urls }`.
For the `accepted_source_urls[]` no-match throw, add `details` carrying the mismatching url and the
declared accepted claim urls. Rationale: the values are already computed at the throw site; the
existing `repair_contract.details` surface already reaches the dry-submit output.
*Alternative:* a dedicated new feedback field — rejected (would add vocabulary churn for no
verdict benefit).

**D2 — Collect all receipt schema-failing lines, then throw once with values.**

BUG-243: inside `validateSubmitRuntimeReceipt`, on a `safeParse` failure push
`{ line: index + 1, issues, raw }` (raw = the parsed line's value for each failing top-level
field path, e.g. `parsed.ts`), continue scanning the remaining lines, and after the loop throw a
single error listing every affected line with its raw value, plus an expected-format hint for
datetime issues (`Expected ISO 8601 UTC, e.g. YYYY-MM-DDTHH:mm:ss.sssZ`). Keep `error.receipt_line`
for backward compatibility and add `error.receipt_lines` with all line numbers.
Rationale: one reject verdict with complete repair info beats N rejects; schema-failed lines skip
the later per-event binding checks (lines 389-393) unchanged because those only run on success.
*Alternative:* keep first-failure semantics — rejected, it is exactly the misleading `#line=1`
behavior BUG-243 reports.

## Risks / Trade-offs

- [Collecting all schema-failing lines could surface more issues at once than the first-failure
  mode.] → That is the intended repair win; the verdict is identical (still reject) and each
  reported issue is real.
- [Longer messages in `details`.] → Bounded: leaf url lists are small (≤4 mapping fields per leaf);
  no unbounded content is introduced.
- [Other callers of the two functions may parse the exact message text.] → The reason prefix is
  preserved; only appended detail is added. Regressions are updated to match.

## Migration Plan

Implement in `work-unit-validation.mjs` (two throw sites + one loop), update the focused
unit/integration assertions for cache-trail and runtime-receipt diagnostics to assert the carried
values, then run `node --test` and the OpenSpec governance checkers before sync/archive.

## Open Questions

None — the carried-value fields and all-lines collection are resolved above.
