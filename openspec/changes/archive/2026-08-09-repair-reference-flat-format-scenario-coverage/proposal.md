## Why

`openspec validate bundle/reference-flat-format --type spec --json` reports
`requirements.8.scenarios` as empty. The accepted Wave0 backing requirement
already has four Scenario blocks, but its heading starts with a stray `+`, so
the OpenSpec parser does not attach those blocks to the requirement. The named
debt `reference-flat-format-requirement-8-scenario` selects this narrow repair
now so repository-wide spec validation can become a reliable feedback surface.

## What Changes

- Correct the malformed Markdown heading for the existing Wave0
  Phase-owned-reference backing requirement in
  `openspec/specs/bundle/reference-flat-format/spec.md`.
- Preserve the requirement text and its existing four Scenario blocks, so they
  are parsed as one requirement instead of being detached document text.
- Add a delta specification that records the restored scenario coverage and
  verify that the direct OpenSpec validation no longer reports the original
  `requirements.8.scenarios` root before governed archival.
- Record any subsequently exposed requirement root as a separately named debt
  rather than broadening this one-character repair into another behavior change.
- Do not change Harness code, a runtime bundle contract, reference metadata,
  submitted-backing authority, a Gate verdict, or a Semantic Fact Closure
  family.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/reference-flat-format` | `openspec/specs/README.md`; `openspec/specs/bundle/reference-flat-format/spec.md`; `openspec validate bundle/reference-flat-format --type spec --json` | Modify | The accepted reference-format capability owns the malformed requirement heading and must regain parser-visible Scenario coverage without changing its behavior. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | Its change-local routing record is required, but this repair creates no native test-class claim. |
| `governance/semantic-fact-closure` | `openspec/specs/governance/semantic-fact-closure/spec.md`; `openspec/governance/semantic-fact-families.yaml` | Verify-only | The semantic-closure declaration is required governance evidence; no cataloged deterministic fact or verdict consumer changes. |
| `governance/requirement-traceability` | `openspec/governance/req-registry.yaml` | Verify-only | REF-009 already exists and is neither reallocated nor semantically changed. |

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `bundle/reference-flat-format`: restore parser-visible Scenario coverage for
  the existing Wave0 Phase-owned shared-reference backing requirement.

## Impact

- Main spec only:
  `openspec/specs/bundle/reference-flat-format/spec.md`.
- Change-local planning/governance records and the explicitly user-tracked
  named-debt ledger.
- No production JavaScript, Harness asset, runtime state, API, dependency,
  version, or Agent workflow changes.

## Boundaries And Reviews

The direct Source of Record is the accepted `reference-flat-format` main spec;
the direct validator finding identifies the malformed heading, and the shortest
legal loop is to repair that heading, rerun the same targeted validator, then
rerun repository-wide spec validation. A new root exposed only after this
repair remains a separately named successor debt, not evidence that the
original root persisted. This removes one accidental parser discontinuity and
avoids adding a checker, exception, fallback, control state, or alternate
reference authority.

No named runtime state, projection, status, concept, module, command, or
reader-facing view is introduced or materially changed, so a
semantic-precision reflection is not applicable. The user selected this named
debt; the Agent may perform the reversible document repair through Apply; and
the existing OpenSpec validator remains the deterministic verdict owner. This
proposal does not grant an Agent authority to materialize references or change
submitted-backing facts.
