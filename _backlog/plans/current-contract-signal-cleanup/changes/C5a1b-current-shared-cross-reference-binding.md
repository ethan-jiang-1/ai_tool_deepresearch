# C5a-1b: Define the Current Shared and Cross-Topic Reference Binding

> Candidate change: `define-current-shared-cross-reference-binding`
>
> Status: evidence investigation closed; user policy/design decision pending
>
> Risk: L4

## One question

What one current metadata form binds a new rich reference to exactly one Topic,
all Topics, or a selected cross-Topic subset without relying on slug/id-based
`related_topic`?

## Verified boundary

- `related_topic_uid` currently accepts exactly one registered UID or `all`.
- Legacy `related_topic` accepts `all`, one current/previous id or slug, or a
  comma-separated exact list. The shared resolver turns it into a UID set.
- Wave0 shared materialization is genuinely all-Topic and can use `all`.
- Wave1 materialization is genuinely one-Topic and its current submitted
  backing exposes an exact UID.
- Wave2 `00-cross-*` projections can describe findings over a selected pair or
  subset in `finding-index.yaml#/affected_topics`; they are not inherently
  all-Topic references.
- This selected-subset behavior is current, not a historical fixture: the
  accepted Wave2 specification requires `affected_topics.length >= 2` for an
  emergent finding, uses that array to select each Topic's backfill, and
  requires a consumer-facing backed finding to materialize a `00-cross-*`
  projection unless it records an explicit omission reason.
- Current Wave2 guidance does not define a canonical metadata form for that
  selected subset. A focused fixture uses `related_topic: cross-topic`, which
  the resolver cannot bind. The focused Gate test passes only because Wave2
  projects cross-reference format findings as advisory; it is a current
  observability gap, not proof of a legal current reference binding.
- No `related_topic_uids` or equivalent multi-UID metadata form exists in the
  Harness, accepted specs, or tests. The shared resolver explicitly rejects a
  comma-separated UID value, while the legacy resolver normalizes a
  comma-separated id/slug list to a UID set.
- The identity paths are materially different: `finding-index.yaml` resolves
  `affected_topics` through the canonical Topic registry for backfill, whereas
  reference metadata is separately parsed by the shared binding resolver.
  `reference/_INDEX.md` classifies `00-cross-*` by path as `wave2_cross`, so
  its navigation row does not repair or prove the missing metadata binding.
- The result is an exact present inconsistency: a current consumer-facing
  Wave2 projection can pass the formal provenance/index Gate with
  `related_topic: cross-topic`, yet that same metadata is invalid to the
  common format/observability resolver. Do not treat the fixture's Gate pass
  as evidence that the token has a contract owner.

## Why this is not a spelling cleanup

Changing `related_topic` to scalar `related_topic_uid` without a subset policy
would lose attribution. Replacing a selected pair with `all` would broaden
file-observability/provenance facts and make a consumer-facing reference claim
relevance to Topics it does not actually cover. Leaving the old field as the
only multi-Topic writer form defeats the current-only objective.

## Plausible current contracts

| Option | New writer form | Benefit | Risk / cost |
|---|---|---|---|
| A | Require `all` for every cross reference | No new field | Semantically wrong whenever a finding is only about a subset; not recommended. |
| B | Add one canonical `related_topic_uids: [uid, ...]` form, retaining scalar UID and `all` for their respective cases | Exact durable identity for every cardinality | Changes resolver, format, index/observability/provenance contracts and needs careful historic-reader coexistence before C5a-2. |
| C | Materialize one separate per-Topic projection for each selected Topic | Keeps scalar field | Duplicates consumer artifacts and changes Wave2 projection/provenance semantics. |
| D | Add a typed `W2F-*` metadata binding and derive the subset only from that finding's canonical `affected_topics` | Avoids duplicating a UID set in every Wave2 projection | Introduces a Wave2-specific metadata/projection join and needs an explicit missing/stale-finding failure boundary. |
| E | Keep legacy `related_topic` as a current multi-Topic writer | No immediate behavior change | Continues an id/slug compatibility writer indefinitely. |

Options B and D are the only apparent current-only directions that preserve an
exact selected subset without duplicating it as `all`. Which is simpler depends
on whether a reference's Topic scope must remain independently self-contained
or is properly a projection of the Wave2 finding. This is a bounded OpenSpec
design decision, not an invitation to add a field or rewrite historic files.

## Protected behavior

- `related_topic_uid: all` for genuinely shared sources.
- Exact one-Topic UID binding and current `previous_layouts[]` lineage.
- Phase-owned Wave0/Wave1/Wave2 provenance and index synchronization.
- Human readability of historic reference Markdown; C5a-2 owns its Engine
  reader policy.

## Proposal gate

- [x] Scalar/all versus legacy-list capability difference identified.
- [x] Wave0 and Wave1 writer identities traced.
- [x] Wave2 fixture/gate observability gap recorded as evidence, not accepted
  as a current writer contract.
- [x] Determine from the accepted Wave2 finding/projection owner whether a
  selected multi-Topic reference remains a required current output shape:
  yes. It is required for eligible consumer-facing backed Wave2 findings, and
  its selected scope is used by current seed projection.
- [x] Trace writer/gate/index/observability consequences and record the
  `related_topic: cross-topic` advisory-only mismatch as a current contract
  gap rather than a valid compatibility form.
- [ ] User approves the current cardinality policy.
- [ ] Proposal specifies the one resolver/index/provenance behavior for each
  chosen cardinality, the formal-versus-advisory outcome for invalid Wave2
  metadata, and an explicit treatment for old `related_topic` files.
- [ ] Do not add a migration or silently convert old reference bytes.

## Expected verification

```bash
node --test tests/engine/helpers/topic-layout.test.mjs \
  tests/engine/helpers/file-observability.test.mjs \
  tests/engine/helpers/reference-index-sync.test.mjs \
  tests/integration/cli/check-gate-wave2-complete.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
