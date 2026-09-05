# Design — Admit Zero-Append Wave0 Source Contributions

## Context

- Wave0 delegated intakes always submit a `source_contribution` (`{target, direct_contract, validated_length, semantic_digest}`) derived at submit time from the validated `source.yaml` snapshot (`engine/work-unit-submit.mjs` `deriveSourceContribution`). There is no "no contribution" shape for a current-contract intake.
- `engine/work-unit-projection.mjs` `evaluateDeclaredContributionGroup` walks ledger-ordered contributions per canonical topic + target and requires strictly increasing `validated_length`. Equal length → `submitted_source_contribution_non_monotonic` with `repair_kind: missing_contract`. Because `collectSubmittedWave0ContributionProjection` returns `passed:false` for the whole projection when any group fails, one zero-append row poisons every shared-reference backing resolution bundle-wide.
- No terminal operation can retract a submitted row: `supersede` denies hash-valid rows (`semantic_boundary`), `recover-declaration` only rewrites schema-invalid rows, `fail`/`abandon`/`replace` require non-submitted status. Verified live on bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` (2026-09-05).
- The owner spec's only rerun scenario covers "strictly longer source array"; the zero-append outcome is unspecified, and the engine's fail-closed choice makes an honest research outcome structurally undeliverable.

## Approach

Single evaluation branch change in `evaluateDeclaredContributionGroup`:

```text
current behavior:
  if (previousLength !== null && contribution.validated_length <= previousLength) → non_monotonic root

new behavior:
  if (previousLength !== null && contribution.validated_length <= previousLength) {
    const isZeroAppend =
      contribution.validated_length === previousLength &&
      previousDigest !== null &&
      contribution.semantic_digest === previousDigest;
    if (!isZeroAppend) → non_monotonic root (unchanged shape/repair boundary)
    // zero-append: admit as no-op — push NO interval, do NOT update previousLength
    continue;
  }
```

- Track the previous contribution's `semantic_digest` alongside `previousLength` (the running retained length). The digest compared against is the previous contribution's declared digest — i.e., the digest over the shared retained prefix — which is exactly what an unchanged array reproduces.
- The no-op row contributes no `intervals` entry, so `sourceCandidatesForInterval` never exposes an identity for it; `previousLength` stays at the prior contribution's length, so a subsequent strictly-longer contribution still evaluates correctly against the retained prefix.
- Prefix-drift and prefix-shortening checks are untouched: they run before the monotonic check per contribution and still bind every retained prefix to the current array. A zero-append row whose prefix has since drifted still fails via the existing `prefix_drift`/`prefix_shortened` roots — admission never masks content drift.

## Non-goals

- No change to `deriveSourceContribution`, submit-time validation, ledger schema, or queue/work-unit terminal operations.
- No special-casing by `rerun_count`, topic, or queue-item id — the rule is purely digest/length-based and applies identically on first run and reruns.
- No repair operation for already-poisoned bundles other than the evaluation change itself (the existing row in `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` becomes a legal no-op automatically once the engine change applies; no bundle bytes are touched).

## Risks / Trade-offs

- The zero-append row keeps its ledger row and receipt: provenance stays truthful (the attempt ran and found nothing), it just owns no source identities. This matches the spec's "owns no ordinal range, exposes no identity".
- A hypothetical future engine consumer that assumed strict length increase for interval math must use `intervals` (already the only exported ownership surface); verified `intervals` is the sole ownership derivation in this module.

## Open Questions

(none — resolved with user 2026-09-05: fix via OpenSpec engine change rather than leaving the rerun blocked.)
