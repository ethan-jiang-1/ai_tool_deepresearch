# C5a-2: Decide Historic Reference Reader Policy

> Candidate change: `decide-historic-reference-reader-policy`
>
> Status: decision blocked by C5a-1 and user policy; no proposal created
>
> Risk: L4

## One question

After current authors write only UID bindings, should the current Engine still
use historical Markdown references with `related_topic` as Gate/index/
provenance input?

## Verified boundary

`resolveReferenceTopicBinding()` accepts `related_topic_uid` and
`related_topic`. Its result feeds Gate checks, reference index synchronization,
file observability, provenance, rerun behavior, and reference convergence.
The legacy form resolves current and `previous_layouts[]` id/slug values.

So deleting one metadata key changes evidence attribution and countability; it
is not a display cleanup. Historical references are immutable evidence objects
in the practical sense even if a human can edit Markdown, so silent mass
rewriting would make provenance less honest.

## Choices

| Choice | Engine treatment of old `related_topic` references | Consequence |
|---|---|---|
| A. Retain reader | Old evidence remains countable under current Gate/index/provenance | Retains one historic reader branch |
| B. Explicitly reject (recommended for strict current-only) | Current readers return one stable unsupported-current-contract result | Old evidence no longer contributes to current rerun/Gates; clear boundary |
| C. Human-only opaque | Engine ignores old files as evidence but may list them diagnostically | Requires a precise no-count/no-provenance model; risks a hidden third state |

## Recommendation

For the stated goal, choose **B** only after C5a-1 proves all current output is
UID-only and after reviewing the impact on retained evidence. It is the clean
current-only result, but the risk is real: an existing rerun may lose valid
evidence countability. Do not decide this by token scanning alone.

## Protected current behavior

- UID binding, including `all`.
- `previous_layouts[]` current lineage for UID-bound records and other current
  provenance paths.
- `_INDEX.md` projection semantics.
- Manual readability of old reference Markdown.

## Proposal gate

- [ ] C5a-1 has archived and new current output is UID-only.
- [x] Per-reader fanout mapped.
- [ ] User selects A, B, or C.
- [ ] Current Wave0/Wave1/rerun and reference-provenance characterization identifies exact changed consequences.
- [ ] One selected boundary is represented in Gate/index/file-observability/provenance tests; no silent rewrite task exists.

## Expected verification

```bash
node --test tests/engine/helpers/topic-layout.test.mjs \
  tests/engine/helpers/reference-index-sync.test.mjs \
  tests/engine/helpers/gate-helpers-provenance.test.mjs \
  tests/integration/cli/check-gate-wave0-complete.test.mjs \
  tests/integration/cli/reference-evidence-map.test.mjs \
  tests/e2e/wave1-target-receipt-wave2-closure.test.mjs
```
