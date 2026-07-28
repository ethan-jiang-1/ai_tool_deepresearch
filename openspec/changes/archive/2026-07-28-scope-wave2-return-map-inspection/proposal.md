## Why

BUG-134 shows that `inspect-wave2-output` currently sends the independently
owned `artifacts/wave2/synthesis.md` and `cross-topic-ledger.md` through the
five-field Seed Topic return-map parser. A valid narrative and six-section
ledger are therefore rejected unless they carry an unsupported `## Return Map`
workaround. The incident record is
`_backlog/bugs/BUG-134-wave2-inspect-misclassifies-synthesis-ledger-as-return-map.md`.

The relevant reader question is bounded: which Wave2 files are return-map
parser inputs? Seed Topic Wave2 projection sections own that shape; the
three Wave2 artifacts retain their own narrative, ledger, and structured-index
contracts. This preserves the distinction that changes the verdict while
giving the Agent a normal stop point at the existing Wave2 inspect.

## What Changes

- Restrict Wave2 return-map inspection to plan-bound Seed Topic Wave2
  projection families and retain their existing W2F identity, required-field,
  concrete-reference, and root-first behavior.
- Remove the Wave2 artifact branch that parses `synthesis.md` and
  `cross-topic-ledger.md` as return-map entries; remove only any guidance that
  teaches their unsupported workaround.
- Keep the independent Wave2 artifact evaluators and their established rule
  IDs for synthesis links, ledger sections, and finding-index binding.
- Add focused unit and production-inspect integration proof for the corrected
  input scope, artifact failures, and Seed Topic failures.
- Release this framework behavior as v0.56, updating `CHANGELOG.md` and the
  `DPT_FRAMEWORK/RUN.md` banner during apply.

This is a net simplification: it removes one false parser route and avoids a
second artifact-compatible return-map format, new state, checker, controller,
or fallback path. The shortest legal loop remains direct Seed/Artifact facts
-> their existing evaluator -> one root finding -> legal repair -> rerun the
same inspect.

The user has already selected the scope and release work. The Agent performs
the ordinary proposal, implementation, and same-check verification work; the
Engine continues to determine the inspect verdict. No user decision, override,
or new mutation authority is introduced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `wave2-synthesis`: the three Wave2 artifacts retain independent validation
  contracts without an additional return-map section. Existing RRM-007 remains
  the controlling Seed Topic projection authority.

## Impact

- Code: `DPT_FRAMEWORK/cli/inspect-wave2-output.mjs`,
  `DPT_FRAMEWORK/engine/helpers/return-map.mjs`, and only an artifact-specific
  evaluator if the existing finding-index diagnostic needs relocation.
- Guidance: the Wave2 phase or shared return-map guidance only where it
  currently requires the workaround.
- Tests: focused tests under `tests/engine/` and `tests/integration/` using
  real production inspect paths and disposable bundles.
- Specs: delta spec for `wave2-synthesis` (WTS-004, WTS-007); existing RRM-007
  defines the unchanged Seed Topic return-map boundary. No dependencies added.
