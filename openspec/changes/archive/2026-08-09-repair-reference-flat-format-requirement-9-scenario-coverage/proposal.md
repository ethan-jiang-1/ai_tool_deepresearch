## Why

After REF-009 became parser-visible, OpenSpec reports
`bundle/reference-flat-format` `requirements.9.scenarios` as empty. Direct
inspection shows the existing REF-010 requirement is also truncated at `exact
seriali` before its Scenario blocks; the prior archived delta, current shared
template, and focused Engine tests consistently retain the complete requirement
and two Scenarios. This repair restores the accepted requirement block so the
main spec once again states the existing YAML/diagnostic contract completely.

## What Changes

- Restore the complete existing REF-010 requirement text in
  `openspec/specs/bundle/reference-flat-format/spec.md`, including its two
  existing YAML-safe serialization and offending-value Scenario blocks.
- Add a complete modified delta that preserves this restored requirement block
  for governed archival.
- Verify that the target spec passes and that repository-wide validation leaves
  only the separately named `check-inspect-feedback` Scenario debt.
- Do not change Engine behavior, the shared-reference template, tests, YAML
  metadata semantics, submitted-backing authority, runtime state, or Semantic
  Fact Closure families.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/reference-flat-format` | `openspec/specs/README.md`; current `openspec/specs/bundle/reference-flat-format/spec.md`; archived `2026-08-08-make-feedback-name-contract-roots` REF-010 delta | Modify | It owns the truncated REF-010 text and detached Scenario coverage. |
| `engine/check-inspect-feedback` | `openspec validate engine/check-inspect-feedback --type spec --json` | Excluded | Its `requirements.6.scenarios` failure is a separate named debt with its own planned change. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | A routing record is required, but static main-spec repair creates no native test-class claim. |
| `governance/semantic-fact-closure` | `openspec/specs/governance/semantic-fact-closure/spec.md`; `openspec/governance/semantic-fact-families.yaml` | Verify-only | The required closure declaration applies, but no deterministic runtime fact or verdict consumer changes. |

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `bundle/reference-flat-format`: restore complete parser-visible REF-010 YAML
  metadata and frontmatter-diagnostic Scenario coverage.

## Impact

- Main spec only: `openspec/specs/bundle/reference-flat-format/spec.md`.
- Change-local planning/governance records and the explicitly user-tracked
  named-debt ledger.
- No Harness code, runtime bundle, API, dependency, release, or Agent workflow
  changes.

## Boundaries And Reviews

The current main spec is the accepted behavior Source of Record; its truncation
is the defect. The archived delta is historical recovery evidence, corroborated
by the current shared template and focused Engine tests, for the exact existing
text to restore. The shortest legal loop is one requirement-block restoration
-> targeted validator -> global inventory; it avoids a new checker, runtime
state, recovery branch, or alternate metadata authority.

No named runtime state, projection, status, concept, module, command, or
reader-facing view is introduced or materially changed. The user selected the
named debt; the Agent may perform the reversible spec repair through Apply; and
the OpenSpec validator remains the deterministic grammar verdict owner.
