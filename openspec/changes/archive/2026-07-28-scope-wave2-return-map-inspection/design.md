## Context

`inspect-wave2-output.mjs` already composes three direct fact families:

1. `evaluateWave2Contract()` validates the Wave2 artifact group through its
   existing narrative, ledger, and finding-index contracts.
2. `evaluateSeedTopicProjectionReadiness(..., { wave: 'wave2' })` validates
   plan-bound Seed Topic Wave2 projection families and their exact W2F binding.
3. `inspectWaveArtifactReturnMaps(..., 'wave2')` wrongly applies the generic
   five-field return-map parser to `synthesis.md` and
   `cross-topic-ledger.md`.

The third path duplicates neither the first nor the second contract. It adds a
false requirement whose workaround pollutes the two artifact owners. BUG-134
records a real bundle instance of this behavior.

## Goals / Non-Goals

**Goals:**

- Keep Wave2 Seed Topic return-map validation strict and scoped to its existing
  plan-bound entry family.
- Let Wave2 artifact validation continue through its existing direct artifact
  evaluators and rule IDs.
- Remove unsupported `## Return Map` workaround guidance and prove the exact
  production inspect behavior with disposable bundles.

**Non-Goals:**

- Change W2F identity, finding-index, receipt, pure-synthesis, or Gate policy.
- Add a generic artifact parser, an artifact-compatible return-map format, a
  new CLI, state, queue item, retry path, or artifact writer.
- Relax malformed Seed Topic entry rejection or make artifact checks advisory.

## Decisions

### 1. Remove only the false Wave2 artifact return-map branch

`inspectWaveArtifactReturnMaps()` will no longer parse `synthesis.md` or
`cross-topic-ledger.md` for `wave2`. `inspect-wave2-output` will still merge
the existing Seed Topic and cross-reference return-map results with
`evaluateWave2Contract()`'s artifact findings.

The direct source of record remains distinct by owner: the Seed Topic family
for return-map entry shape, the artifact files for narrative and ledger shape,
and `finding-index.yaml` for structured findings. A completed inspect has no
new derived state.

**Alternative considered:** allow an optional artifact `## Return Map` shape.
This creates two formats for different owners and keeps an unrelated parser on
the control path, so it is rejected.

### 2. Retain existing artifact-specific finding-index diagnostics only when their owner is direct

Before removing the branch, apply will confirm that the existing Wave2 finding
index evaluator owns the diagnostic previously emitted by the artifact branch.
It will relocate only a useful direct finding-index check to that evaluator if
one is actually absent. It will not retain a synthetic artifact return-map
check merely to preserve a message.

**Alternative considered:** keep the branch solely for the old lineage
diagnostic. This preserves the false implication that the artifact triple is a
return map and is rejected.

### 3. Preserve one same-inspect repair loop

An invalid Seed Topic entry continues to name its exact seed coordinate and
reruns `inspect-wave2-output`. An invalid synthesis, ledger, or finding-index
artifact continues to name its existing owner and rule ID, then reruns that
same inspect. The Engine supplies the deterministic verdict; the Agent makes
the legal content repair; the user has no ordinary pipeline step.

This is net simplification: one incorrect parser route and its workaround are
removed, while existing evaluator paths remain the only truth paths.

## Risks / Trade-offs

- **A useful finding-index message could disappear** -> compare the old branch
  with `evaluateWave2Contract()` and retain only an artifact-owned direct
  diagnostic, with its own focused regression.
- **A broad deletion could weaken Seed Topic validation** -> integration tests
  include a valid artifact pair plus malformed Seed Topic W2F/field cases.
- **A test fixture could accidentally depend on the workaround** -> create a
  fixture that removes only `## Return Map` from otherwise valid artifacts and
  invokes the production CLI.

## Migration Plan

1. Apply the scoped parser change and any necessary wording removal.
2. Existing bundles may retain their harmless workaround section; no bulk
   rewrite is required because the new inspect accepts the documented artifact
   contracts without it.
3. If regression evidence finds a missing artifact-specific diagnostic, revert
   the scoped code change and keep the current contract until a smaller
   artifact-owned replacement is specified.

## Open Questions

None. The existing artifact evaluator and its focused tests decide whether the
old finding-index diagnostic is already covered.
