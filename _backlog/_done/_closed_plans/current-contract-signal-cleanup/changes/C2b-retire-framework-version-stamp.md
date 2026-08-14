# C2b: Retire the `framework_version` Bundle Stamp

> Candidate change: `retire-framework-version-stamp`
>
> Status: governed-archived as `2026-08-13-retire-framework-version-stamp`; C2c's target-edit precondition is satisfied
>
> Risk: L2

## One question

Should a newly instantiated run bundle keep receiving
`rb_plan.md#/framework_version`, when no current Engine decision reads that
field?

## Verified boundary

The production write chain is narrow:

```text
CHANGELOG.md
  -> engine/helpers/framework-version.mjs
  -> cli/instantiate-run-bundle.mjs
  -> rb_templates/rb_plan.md.tmpl
```

The accepted `bundle/cmd-bundle-instantiation` contract and focused tests make
the stamp a positive requirement. Search found no parser router, Gate, CLI
decision, migration reader, or execution path that branches on it. Existing
stamps persist only because canonical and legacy plan schemas use
`.passthrough()` and topic-state writes preserve unknown frontmatter.

## Proposed current-only result

- New bundles do not write `framework_version`.
- Remove the dedicated helper, template placeholder, writer path, positive
  tests, accepted requirement, and CMI-007 references in the same change.
- An old bundle that already carries the field remains readable and keeps the
  field when a current mutation round-trips its frontmatter.
- The Engine neither rejects, upgrades, nor selects a behavior based on the
  old value.

That last bullet is deliberate: generic unknown-frontmatter preservation is a
current plan-mutation property, not a compatibility promise for this stamp.

## Expected effect

New bundle creation stops treating the root changelog as a runtime input. The
bundle becomes less likely to imply that its creator version is an executable
compatibility selector when it is not.

## Risk and side effects

- **Likely low risk:** current creation and current topic mutation continue
  with the same schema-valid plan; only one unused field disappears from new
  output.
- **Do not do:** tighten `CanonicalPlanSchema` from `.passthrough()` to
  `.strict()` as part of this cleanup. That would change unrelated current
  frontmatter preservation and could reject existing bundles.
- **User-visible historic effect:** a human opening a newly created bundle no
  longer sees the internal version stamp. Old bundles retain whatever they
  already recorded.
- **Dependency:** C2c has selected option A, which removes changelog/version
  authority. C2b must therefore Apply, sync, and governed-archive before C2c
  begins target edits, so no new bundle can stamp a stale historical heading.

## Decision record

Recommended: approve the proposed result above. It removes a writer-only
release stamp while preserving current artifact readability and avoiding any
migration scheme.

## Proposal gate

- [x] Current writer chain mapped.
- [x] No current decision reader found.
- [x] Generic old-frontmatter preservation identified as protected current behavior.
- [x] C2c has selected option A; the required target-edit order is C2b
  proposal -> Apply -> sync -> archive, then C2c Apply. C2b's eventual
  proposal and tasks must carry that precondition.
- [x] User approved this bounded policy on 2026-08-13; the OpenSpec change is planning-complete and its plan validation passed.
- [x] Apply, delta/main sync, focused verification, closeout review, and governed archive completed on 2026-08-13 as `2026-08-13-retire-framework-version-stamp`.

## Verification record

The governed archive recorded 60 focused passing tests plus workflow-package
and governance checks. Its boundary regression proves that an old arbitrary
frontmatter key still round-trips, without naming `framework_version` as a
current positive contract.
