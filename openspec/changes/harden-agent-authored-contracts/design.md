## Context

See `proposal.md` for motivation and the `bundle/reference-flat-format` delta
for the changed REF-002 behavior. Two existing direct contracts have drifted
at their Agent-facing boundaries:

- `TopicApplyPlanSchema` accepts two strict `source_identity` union branches,
  but the schema projection visitor aggregates their `kind` literals then
  descends only into the first branch. Its `wave_rules` prose knows Wave2 uses
  a finding, but does not supply the branch's required `finding_id` shape or a
  usable full packet.
- `checkReferenceFormatFiles` already owns shared metadata, binding, and
  required-section checks. It treats a raw HTML document dump as non-empty
  section content and the existing Wave evaluator simply projects that result
  into inspect/Gate feedback.

The existing Zod root and reference-format evaluator are the Sources of Record.
Neither `schema` output nor extractor Markdown becomes a second authority.

## Goals / Non-Goals

**Goals:**

- Return enough Zod-derived conditional-form detail for an Agent to construct
  a valid Wave2 `wave2_judgment` packet from public schema output alone.
- Reject only bounded raw document-markup signatures in the non-code body of a
  required reference section and expose the existing `reference_format` repair
  route with the exact reference/section coordinate.
- Preserve projection purity, packet-validator singularity, inspect/Gate
  routing, presentation tolerance, no-mutation inspection, and release
  coherence at `v0.88`.

**Non-Goals:**

- No new `TopicApplyPlanSchema`, context inference, bundle state lookup,
  apply authorization, source-identity alias, or Wave2 authority resolver.
- No generic HTML parser, sanitizer, content cleanup, bulk migration, research
  quality/readability score, extra Gate, Gate route, queue kind, or retry loop.
- No behavior change for document-like literals inside fenced code, ordinary
  Markdown, or non-document inline HTML presentation.

## Decisions

### 1. Add Zod-derived conditional forms to the existing projection

Keep the existing top-level form fields for compatibility. For
`apply_seed_projection`, add a backward-compatible conditional-form collection
whose entries identify the selected Wave and `source_identity.kind`, expose
that branch's required paths/value shapes, and provide a complete illustrative
packet template. The Wave2 entry must visibly contain
`{ kind: "finding", finding_id: "W2F-001" }` and a matching `entry_id`.

The projection builder will inspect the existing discriminated-union branches
rather than hand-maintaining a second field schema. It may use the current
wave-to-allowed-kind mapping only to select a branch already legal for that
Wave. Each conditional template is admitted only after the unchanged top-level
`TopicApplyPlanSchema.safeParse` accepts it. If the supported branch graph
cannot yield an accepted template, the existing schema command fails closed
with its current framework-configuration boundary.

This keeps one authoritative validator and turns the current hidden
union-branch distinction into an explicit read-only authoring projection.
Alternatives rejected:

- Adding `finding_id` to global `required_fields` would falsely require both
  union branch identities at once.
- Hard-coding an independently maintained Wave2 sample would drift from Zod.
- Teaching the Agent to merge `wave_rules` prose with source code fails CTS-010's
  normal stopping point.

### 2. Detect document markup with a small fenced-code-excluded predicate

For each existing required section body returned by the shared Markdown section
parser, remove fenced-code spans for the purpose of this check only. Apply one
case-insensitive, bounded signature matcher for `<!doctype` and `html`,
`head`, `body`, `script`, `style`, or `iframe` tags. A match emits one existing
`checkerFinding` with the current rule ID, reference relative path, and section
repair coordinate; a section that is already missing remains its existing
missing-section root rather than adding a dependent markup symptom.

The predicate belongs inside `checkReferenceFormatFiles`, so every existing
Wave evaluator and inspect/Gate consumer receives the same outcome. It does
not parse or alter HTML, inspect metadata/frontmatter, or decide whether
ordinary prose is factually useful. The writer repair is to replace copied
document bytes with Agent-interpreted Markdown and rerun the same checkpoint.

Alternatives rejected:

- A separate linter/validator would duplicate the reference-format verdict and
  introduce a second repair route.
- A broad angle-bracket or HTML parser rule would block harmless presentation
  and exceed the bounded copied-document defect.
- Automatic stripping or migration would mutate evidence/reference bytes and
  hide the direct format root.

### 3. Use focused direct evidence plus existing cross-surface routes

The topic-state integration test will select the Wave2 conditional form from
the schema output, build its packet without source-derived fields, and prove
the existing validator accepts its shape. The public CLI integration test will
place the packet in a legal disposable Wave2 bundle and assert the result is
not `input_invalid`, separating schema correctness from later lifecycle or
finding-authority checks.

The reference helper unit test will cover a blocker for each bounded signature
class, fenced-code exclusion, ordinary non-document inline presentation, exact
path/section feedback, and no source mutation. A Wave1 or Wave2 inspect/Gate
integration test will prove the same `reference_format` finding travels through
the existing evaluator to Agent-facing feedback. Existing history fixtures stay
unmodified; a future inspection may report their actual format state.

### 4. Release behavior as v0.88 without a migration

The Harness's public schema output and deterministic reference-format verdict
change, so Apply updates `CHANGELOG.md` and the `RUN.md` banner to `v0.88`.
The release language will state the bounded authoring/format rules and their
non-goals. Rollback is a normal code/spec revert; there is no data migration,
rewrite, cache cleanup, or generated runtime artifact to reverse.

## Responsibility Review

- **Semantic precision:** the conditional form answers only which identity
  object is legal for a selected Wave. The markup predicate answers only
  whether a required section is a copied document payload. It preserves the
  distinctions that change those answers and supplies normal stopping points.
- **Simple reliable control:** direct Zod inspection plus top-level parse and
  one existing evaluator plus one local predicate are the shortest legal loops.
  They replace the current Agent source-code reconstruction and raw-markup
  false pass without adding state, fallback, or a duplicate checker.
- **Helper-oriented responsibility:** the Agent uses public output/feedback to
  write the legal retained input or reference Markdown and reruns the same
  command. The Engine keeps deterministic parsing and verdict ownership. No
  user decision, permission, or lifecycle capability is created.

## Risks / Trade-offs

- [Risk] Conditional templates could falsely advertise a legal packet. ->
  Generate them from existing branch structure and require actual top-level
  Zod acceptance before emitting them.
- [Risk] A markup matcher could block code examples or harmless presentation.
  -> Exclude fenced code and match only the named document signatures; test
  ordinary Markdown and non-document inline HTML explicitly.
- [Risk] A new section root could cascade into duplicate feedback. -> Retain
  missing-section precedence and emit one direct root per contaminated section.
- [Risk] Release wording could imply content-quality enforcement. -> State
  structural copied-document exclusion, no sanitization, and no quality verdict
  in both release surfaces.

## Migration Plan

1. Add/refine the projection and reference-format predicate with focused tests.
2. Update the Agent-facing reference instruction, REF-002 delta, and v0.88
   release surfaces.
3. Run focused tests, the selected CLI checks, full `npm test`, OpenSpec strict
   validation, verification-routing, semantic-closure, requirement, and main
   spec governance checks.
4. Existing files are neither rewritten nor grandfathered. On a later normal
   inspect/Gate, a contaminated reference receives the ordinary same-check
   format repair. Revert the code/spec/release commit to roll back.
