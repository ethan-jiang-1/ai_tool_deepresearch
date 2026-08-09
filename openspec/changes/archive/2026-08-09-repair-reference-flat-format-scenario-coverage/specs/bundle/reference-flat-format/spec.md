> req: REF-009

## MODIFIED Requirements

### Requirement: Wave0 Phase-owned shared references SHALL preserve exact submitted source backing

A current Wave0 `reference/00-shared-*.md` may be a Phase-owned consumer projection only after formal submit. Its normal metadata `source_url` and scannable body backing SHALL together bind to one exact retained submitted Wave0 source identity, `<work_id>/<ordinal>`, and to the authenticated source YAML, source URL, cache, result, and work-unit coordinates returned by the existing submitted-backing reader. For one current direct source array with retained prefix contributions, that reader SHALL preserve ledger-ordered accepted source-contribution ownership across prior and current rerun submissions; generic current-round work-unit eligibility SHALL NOT make a later append re-own an earlier ordinal. The body SHALL carry that exact coordinate with the returned backing refs; `source_url` alone is not a source selector. A compatible historical delegated reference continues to use its own submitted output declaration and need not be rewritten as a Phase-owned projection.

The reference file and `_INDEX.md` row SHALL remain reader navigation surfaces. They SHALL not become submitted authority, hide a source-identity collision, or authorize a projection from a URL-only, cache-only, unsubmitted, ambiguous, superseded, filesystem-only, or hand-edited backing claim. This requirement SHALL reuse the existing reference metadata/index format and artifact-persistence boundary; it SHALL not add a new metadata key, index column, source catalog, or reference authority.

#### Scenario: Phase-owned Wave0 reference is backed by one submitted identity

- **WHEN** the Phase Agent materializes a Wave0 shared reference from one authenticated `work-a/7` source identity
- **THEN** the reference metadata and body SHALL identify the submitted source URL and scannable source/cache/work-unit backing for `work-a/7`
- **AND** the reference may be synchronized into `_INDEX.md` without the index row becoming evidence authority

#### Scenario: URL equality alone cannot materialize a projection

- **WHEN** two submitted source contributions contain the same URL or an unsubmitted source YAML contains a matching URL
- **THEN** Phase-owned materialization SHALL require one exact authenticated source identity rather than URL equality alone
- **AND** ambiguous or unsubmitted backing SHALL not create a countable reference

#### Scenario: a later rerun append preserves its prior submitted source identity

- **WHEN** an accepted Wave0 contribution owns source identities `work-a/1` through `work-a/19` and a later rerun submits the retained array plus one new source
- **THEN** the submitted-backing reader SHALL continue to resolve the prior retained identities through `work-a`
- **AND** it SHALL resolve only ordinal `20` through the later work unit rather than re-owning `work-a/1` through the later submission

#### Scenario: legacy delegated reference remains readable

- **WHEN** a historical Wave0 shared reference is declared by a successfully submitted legacy work-unit row
- **THEN** it SHALL remain valid through the recorded delegated-output provenance path
- **AND** Phase materialization SHALL not require a rewrite or duplicate projection
