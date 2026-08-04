# C1 Contract-Coherence Matrix

This is apply evidence for
`materialize-wave0-submitted-references-and-batch-projections`, not a runtime
registry or a behavior specification. The accepted delta specs and executable
contracts remain authoritative.

## Scope distinction

`collectEligibleWorkUnitProjection()` is the generic current-round reader for
Queue demand coverage. It deliberately excludes retained prior-round work and
therefore cannot answer who owns an existing Wave0 source-array ordinal.
`collectSubmittedWave0ContributionProjection()` is the separate Wave0
submitted-contribution lineage reader: it evaluates ledger-ordered accepted
prefixes through the current rerun for one canonical topic and direct target.
It assigns an earlier retained prefix to its original work unit and only a
strict later suffix to a later append. Neither reader is a source catalog or
an aggregate `submitted_work` authority.

| Boundary | Canonical fact and authority | Required reader-facing outcome | Drift rejected by this boundary | Verification-plan claim and direct asset |
| --- | --- | --- | --- | --- |
| Assignment | A new Wave0 work-unit attempt has a bound v2 source/cache contract; recorded v1 and markerless legacy attempts retain their recorded interpretation. | The actor receives only its assigned source/cache/result/receipt obligations. | Treating a current `reference/00-shared-*.md` as a delegated completion route or reclassifying legacy attempts from a path/default. | `current-wave0-claim-is-source-only` -- `tests/engine/work-unit-assignment-contract.test.mjs`; `markerless-legacy-wave0-attempt-remains-legacy` -- `tests/engine/work-unit-actor-submit.test.mjs` |
| Task delivery | The generated task and source-intake role express the bound current contract; Wave0 Phase guidance owns post-submit closeout. | A current actor cannot mistake a rich reference for assigned output. | Reintroducing the shared reference template or an actor-owned reference declaration into current source intake. | `wave0-guidance-uses-submitted-backing-closeout` -- `tests/integration/md/wave-producer-contract-guidance.test.mjs` |
| Submit and provenance | Formal submit creates the submitted ledger row and therefore the submitted Wave0 contribution; reference authority is classified from that exact backing. | Existing legacy delegated references remain readable, while a current Phase-owned reference must show submitted backing. | Treating a dry submit, filesystem file, index row, URL, or bare work ID as submitted authority. | `wave0-reference-authority-preserves-legacy-and-backed-projections` -- `tests/engine/helpers/gate-helpers-checks.test.mjs` |
| Materialization | One Wave0 submitted-contribution lineage reader resolves one exact source identity, `<work_id>/<ordinal>`, with authenticated source/cache/result/work-unit facts; unlike generic current-round eligibility, it preserves ledger-ordered retained prefix ownership through the current rerun. | The Phase can materialize one reader-facing consumer projection and rerun the same inspect. | URL-only selection, mutable-array inference, re-owning a retained prefix from a later append, or a second source catalog. | `submitted-wave0-backing-has-exact-source-identity` -- `tests/engine/work-unit-projection.test.mjs` |
| Topic-state packet | An explicit entry is `source_identity.work_id` plus `entry_id`; `submitted_work` in a deferred-contribution packet is only a contribution selector. | One semantic deferred intent is accepted without caller-selected ordinals or disposition fields. | Treating the wire discriminator or a work ID as aggregate source coverage. | `batch-deferred-packet-preserves-individual-identity` -- `tests/integration/cli/operate-topic-state-projection.test.mjs` |
| Topic-state result | The existing writer derives and persists individual Seed Projection entries for exact source identities. | Batch authoring preserves per-source coverage, collision rejection, and idempotent replay. | Persisting a work-unit-level deferred marker or silently covering a later contribution. | `batch-deferred-packet-preserves-individual-identity` -- `tests/integration/cli/operate-topic-state-projection.test.mjs` |
| Inspect and Gate | One pure Wave0 convergence result composes retained submitted-contribution lineage, reference authority, navigation, and floor facts; generic current-round demand coverage stays outside this ownership calculation. | Inspect, formal Gate, and persisted diagnostic return the same materialization root before only its dependent floor deficit. | A floor verdict before a legal materialization path, re-owning a historical prefix, or suppression of unrelated invalid backing. | `wave0-convergence-precedes-shared-reference-floor` -- `tests/integration/cli/check-gate-wave0-complete.test.mjs` |
| Markdown feedback | Phase guidance gives the nearest legal materialize-or-defer action and requires the same-inspect rerun. | The Agent sees a bounded next action without inventing evidence or a second controller. | Sending a current actor to the removed rich-reference route or treating a projection/index as authority. | `wave0-guidance-uses-submitted-backing-closeout` -- `tests/integration/md/wave-producer-contract-guidance.test.mjs` |

The selected assets are deterministic fixture or static-guidance evidence. They
prove the C1 contract boundaries, not that a current real Actor followed the
guidance; that observation remains the separately governed E2 remediation
track.
