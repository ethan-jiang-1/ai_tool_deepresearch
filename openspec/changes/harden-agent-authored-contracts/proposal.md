## Why

BUG-218 exposes a public authoring-contract drift: `operate-topic-state schema
--context wave_projection` names the `finding` discriminator but does not show
the conditional `finding_id` field needed for a Wave2 packet, so an Agent cannot
construct the CTS-010-required form from the public output alone. BUG-219
exposes a separate false pass: required reference sections containing raw HTML
document payloads satisfy the current non-empty check even though they are not
interpreted reference Markdown.

Both defects leave the Agent without the smallest direct contract it needs: a
complete legal packet form and an exact structural reference-format repair.
They share the same authoring boundary, but retain separate Sources of Record:
the existing `TopicApplyPlanSchema` owns packet validity and the existing
`checkReferenceFormatFiles` evaluator owns reference-format verdicts.

## What Changes

- Make the existing Zod-derived `wave_projection` schema output expose
  conditional `source_identity` forms per Wave/kind, including the Wave2
  `{ kind: "finding", finding_id }` form and an actually parseable
  `wave2_judgment` template. It remains a read-only authoring projection; it
  does not create a second validator, infer a bundle context, or authorize
  mutation.
- Extend existing `REF-002` reference-format behavior: in the body of every
  required semantic section, reject a bounded set of raw document-markup
  signatures (`<!doctype`, `html`, `head`, `body`, `script`, `style`, and
  `iframe` tags) while ignoring fenced code. The existing evaluator returns one
  ordinary `reference_format` root naming the reference file and section; it
  neither cleans bytes, judges research quality, nor evaluates ordinary inline
  Markdown/HTML presentation.
- Keep the current inspect/Gate route and Agent-owned same-check repair. Update
  the rich-reference guidance to require interpreted Markdown facts rather
  than copied document bytes, and add focused regression evidence for the CLI
  projection, valid Wave2 authoring packet, markup blocker, fenced-code
  exclusion, and Wave inspect/Gate feedback.
- Release the changed Harness behavior as `v0.88`, updating `CHANGELOG.md` and
  the `RUN.md` banner during Apply. No dependency, queue, work-unit, lifecycle,
  cache-cleanup, or historical-bundle migration is introduced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bundle/reference-flat-format`: extend `REF-002` so non-code required
  semantic-section bodies reject bounded raw document markup through the
  existing reference-format evaluator and feedback route.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md` (CTS-010), `canonical-topic-state.mjs`, public schema tests | Verify-only | CTS-010 already requires Wave-dependent source-identity forms and an author-constructible Wave2 packet; the change repairs its Zod-derived projection consumer without changing the accepted requirement. |
| `bundle/reference-flat-format` | `openspec/specs/bundle/reference-flat-format/spec.md` (REF-002), `checkReferenceFormatFiles`, helper and Gate tests | Modify | Current requirements demand non-empty semantic sections but do not reject raw document markup. This change adds only that bounded structural format rule. |
| `workflow/shared-node-content` | rich-reference guidance in `subagent-dpt-evidence-extractor.md` and its catalog entry | Verify-only | Guidance consumes the Reference contract and will clarify an already legal Agent output; it does not become a format authority. |
| `engine/check-inspect-feedback` | existing `checkerFinding` path and Wave contract evaluator | Verify-only | Existing deterministic feedback carries the new format root through the same evaluator; no new feedback protocol or validator is introduced. |
| `research/research-wave-gate-implementation` | existing `reference_format` rule dispatch in `wave-contract-evaluators.mjs` | Excluded | Wave Gate sequencing and transitions are unchanged; only its already-selected reference-format check receives one additional direct predicate. |
| `verification/verification-routing` | accepted routing spec and existing unit/integration assets | Verify-only | Focused deterministic tests prove contract/projection and evaluator behavior; this change creates no new proof class. |

## Impact

Apply will change the existing topic-state schema projection visitor and its
CLI-facing regression coverage, the shared reference-format evaluator and its
unit/integration coverage, one Agent-facing rich-reference instruction, the
`REF-002` delta specification, and the v0.88 release surfaces. `TopicApplyPlanSchema`
remains the sole packet validator, and `checkReferenceFormatFiles` remains the
sole raw-markup format verdict owner.

### Design Review

- **Semantic precision:** the authoring projection answers one bounded question:
  which exact source-identity form is legal for this selected Wave? The format
  check answers a different bounded question: whether a required reference
  section contains document markup rather than Markdown content. A complete
  conditional form preserves `submitted_work/work_id` versus
  `finding/finding_id`; the markup predicate preserves fenced-code literals as
  distinct from non-code document payload. An Agent can stop at the public
  schema or exact finding without reconstructing source code.
- **Simple reliable control:** no new state, validator, command, or Gate branch
  is added. The projection derives from the existing Zod root and verifies its
  template with it; the existing reference-format evaluator adds one direct,
  bounded syntax check and returns its existing same-check repair. This avoids
  a duplicate schema, HTML sanitizer, quality score, or retry controller.
- **Helper-oriented responsibility:** the Agent reads public schema/feedback,
  writes a legal retained input or reference Markdown, and reruns the existing
  checkpoint. The Engine remains the deterministic parser and verdict owner.
  The user makes no new semantic, permission, or risk decision, and the change
  does not invent one.
