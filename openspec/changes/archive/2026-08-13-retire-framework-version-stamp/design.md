## Context

See [proposal.md](proposal.md) for the policy decision. The only current
creation-time path that gives `rb_plan.md` a `framework_version` is:

```text
CHANGELOG.md
  -> engine/helpers/framework-version.mjs
  -> cli/instantiate-run-bundle.mjs
  -> rb_templates/rb_plan.md.tmpl
```

The field has no current decision reader: no Engine, Gate, CLI, migration, or
execution path selects behavior from it. Its positive contract is confined to
CMI-007, the helper/unit test, instantiation assertions, and a few static
contract assertions.

Existing plan mutation is a separate current behavior. `CanonicalPlanSchema`
uses `.passthrough()`, `buildMutation()` starts from
`structuredClone(parsedPlan)`, and `renderPlan()` serializes that mutation.
Those generic mechanics currently preserve a pre-existing unknown plan key.
They are not a `framework_version` compatibility protocol and are not changed
by this design.

C2c has already planned removal of the wider internal version choreography,
but its target edits are blocked until this change has been applied, its delta
has been synchronized, and its archive has been governed. Until then, the
accepted VEM-001 through VEM-004 rule still requires this Harness behavior
change to use the declared `v0.90` changelog/banner update.

## Goals / Non-Goals

**Goals:**

- Remove the complete new-bundle writer chain without replacing it with another
  version field, reader, router, migration, or compatibility adapter.
- Prove the two distinct current facts: a fresh bundle omits the retired field,
  and a normal canonical topic-state mutation still preserves an arbitrary
  pre-existing unknown frontmatter key.
- Retire CMI-007 and its focused positive assertions while keeping the accepted
  bundle-instantiation contract, requirement registry, and current VEM
  lifecycle internally consistent.

**Non-Goals:**

- Do not make `CanonicalPlanSchema` strict, enumerate permitted unknown keys,
  or add a `framework_version`-specific preservation promise.
- Do not modify, migrate, reject, normalize, or infer meaning from old bundle
  stamps. Existing bundles remain ordinary current plan inputs.
- Do not remove C2c's changelog/banner choreography, alter `RUN.md` routing
  prose beyond the temporary VEM-required version value, or change its active
  proposal/specs/tasks.
- Do not add a package release process, Git tag policy, state discriminator,
  Gate, trace fact, receipt, or Engine version verdict.

## Decisions

### 1. Delete the writer chain rather than render an empty substitute

Apply deletes `framework-version.mjs`, the instantiator import/read/replacement,
and the template field. A newly created plan therefore has no
`framework_version` key at all.

An empty string, `null`, an optional placeholder, or a second metadata file
would still advertise a version concept with no decision reader. Deletion is
the smallest shape that answers the new-bundle reader's bounded question:
which plan facts are current creation requirements? The answer remains the
existing plan contract, including `topic_registry_version`, and stops before a
release-history projection.

### 2. Protect the generic mutation boundary with an arbitrary-key behavior test

The actual canonical topic-state test will inject a neutral historical key such
as `legacy_metadata: retain-me` into an otherwise valid existing plan, execute
a real normal mutation, and assert that the serialized plan retains it. Static
contract tests will describe the same generic preservation mechanics without
using the retired stamp as a current success criterion.

Keeping the test key generic prevents an obsolete field name from becoming a
new dedicated compatibility contract. The alternative of only removing the
stamp tests risks silently narrowing `.passthrough()`/clone/render behavior;
the alternative of adding a named legacy schema or migration would add exactly
the compatibility branch this change is intended to avoid.

### 3. Make fresh-output absence and historic-input preservation independent proofs

The instantiation integration test will parse a production-created temporary
bundle and assert that `framework_version` is absent, without reading
`CHANGELOG.md`. The canonical topic-state unit test will independently prove
unknown-key preservation during a real mutation. Markdown contract tests will
stop presenting CMI-007 and the old name as current vocabulary.

This separates output policy from generic input tolerance. It avoids an
incorrect conclusion that continued readability of an old field authorizes new
writers, or that removing a new writer authorizes rejection of existing plans.

### 4. Retire the accepted requirement and honor the still-live interim VEM rule

The CMI-007 delta is synchronized by deleting the matching requirement and
scenarios from the main bundle-instantiation spec, removing it from that
spec's header, and marking its registry entry `[DEPRECATED]`; the retired ID is
never reused. The C2b delta remains the historical removal record.

Before C2c applies its separate governance change, C2b adds one concise
`v0.90` root history entry and updates the one current `RUN.md` banner to the
same value. This is a temporary compliance step under the currently accepted
version-management contract, not evidence that the stamp or changelog is a
runtime authority.

### Constitutional Review

- **Semantic precision:** no new semantic level is introduced. The removal
  makes the plan's creation facts answer a narrower question without implying
  that a historical heading is a compatibility selector. Historic plan input
  remains an existing generic schema/mutation concern with its own normal
  stop.
- **Simple reliable control:** the changelog-to-helper-to-template control path
  disappears. No check, fallback, retry, migration, or version state replaces
  it; current bundle validation continues to use the existing plan schema.
- **Helper-oriented responsibility:** the user chose the policy to stop new
  stamps while retaining ordinary old-plan readability. The Agent performs the
  bounded deletion, contract sync, and verification. The Engine gains no
  version interpretation or permission decision.

## Risks / Trade-offs

- [Risk] An unrecorded active consumer reads the field or helper. -> Before
  edits, scan current Harness, tests, accepted specs, and the registry; record
  any new positive consumer as an ordinary repair task or return to planning.
- [Risk] Removing the writer accidentally narrows historic plan mutation. ->
  Exercise one actual canonical mutation with an arbitrary unknown key; do not
  alter the schema, clone, or renderer as part of this change.
- [Risk] A static test continues to describe the field as current vocabulary.
  -> Replace its CMI-007 assertion with current-output/generic-boundary
  assertions and scan the current implementation/spec/test surfaces after
  synchronization.
- [Risk] C2c applies after its policy is accepted but before C2b has removed
  the writer. -> Treat the successful governed C2b archive as C2c's explicit
  precondition; do not edit C2c targets in this change.
- [Risk] The interim v0.90 update appears to recreate long-term version
  authority. -> Keep it to the concise VEM-required history/banner change and
  leave C2c as the sole owner of retiring that choreography.

## Migration Plan

1. Complete feedback review, active-consumer confirmation, and plan-stage
   governance checks before target edits.
2. Delete the helper and creation-time replacement path, then make fresh
   instantiation prove absence rather than a changelog-derived value.
3. Characterize generic old-frontmatter round-trip through the existing topic
   mutation path, without a field-specific migration or schema branch.
4. Synchronize CMI-007 retirement to the main spec and registry; make the
   single interim `v0.90` changelog/banner update required by the current VEM
   contract.
5. Run focused unit/integration/package/governance evidence, perform closeout
   review, and archive through the governed finalizer. Only that archive
   satisfies C2c's target-edit precondition.

Rollback restores the deleted writer chain, its accepted requirement and its
focused positive test as one coherent change. It requires no bundle migration:
bundles created during the removal interval simply remain valid plans without a
field that current readers require.
