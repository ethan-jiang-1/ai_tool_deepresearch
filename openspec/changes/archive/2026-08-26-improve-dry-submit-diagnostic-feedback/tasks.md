## 1. Engine: cache-URL mismatch diagnostic carries recorded urls

- [x] 1.1 In `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs` (`validateSubmitSourceClaims`), enrich the `accepted source claim cache trail maps to a different URL` throw: append the recorded leaf urls (`mapping.urls`) to the message and add `details: { claim_url, cache_trail, recorded_leaf_urls }` to the repair contract (BUG-242).
- [x] 1.2 Enrich the `accepted_source_urls[] entry has no matching accepted source_claims[] entry` throw with `details` carrying the mismatching url and the declared accepted claim urls (BUG-242).

## 2. Engine: runtime-receipt schema diagnostic carries raw value, all lines, expected format

- [x] 2.1 In `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs` (`validateSubmitRuntimeReceipt`), collect every schema-failing receipt line (line number, failing field paths with raw values, issue messages) instead of throwing at the first failure; after the loop throw a single error listing all affected lines with raw values (BUG-243).
- [x] 2.2 Add an expected-format hint for datetime issues (`Expected ISO 8601 UTC, e.g. YYYY-MM-DDTHH:mm:ss.sssZ`) and expose `error.receipt_lines` (all affected line numbers) while keeping `error.receipt_line` for backward compatibility (BUG-243).

## 3. Regression tests

- [x] 3.1 Update/extend cache-trail dry-submit assertions (in `tests/engine/work-unit-submit.test.mjs` or the focused cache-trail test file) to assert the diagnostic now carries the recorded leaf urls (BUG-242).
- [x] 3.2 Update/extend runtime-receipt assertions to assert the raw invalid value, all affected line numbers, and the expected-format hint on schema failure (BUG-243).
- [x] 3.3 Run `node --test` (full suite) and confirm 0 failures.

## 4. Governance

- [x] 4.1 Run `node openspec/governance/check-semantic-closure.mjs --change improve-dry-submit-diagnostic-feedback --mode plan` and `node openspec/governance/check-verification-routing.mjs --change improve-dry-submit-diagnostic-feedback --mode plan` and confirm green before target edits.
- [x] 4.2 Ensure no new requirement IDs / prefixes are reserved (Verify-only capability; no `requirement-reservation.yaml` needed).
- [x] 4.3 openspec-feedback:plan-review — reviewed whole-change coherence (carried-value diagnostics must not change verdicts, raw ts value/affected-line/format coverage, `repair_contract.details` reachability through submit) before target edits; no open findings. openspec-feedback:closeout-review — reviewed the actual diff (work-unit-validation.mjs cache-URL + runtime-receipt diagnostics, unit + CLI regressions) and the full `node --test` 2829/2829 pass; no open findings.
