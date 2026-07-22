## Context

`BUNDLE_MAP.md` already names the active runtime bundle root, the shared
framework, direct runtime control files and reentry pointers. It is correctly
passive, but it does not explicitly serve the person who has only this bundle
in front of them in a new Agent conversation. `RUN.md`, by contrast, is a
one-time front door for creating a new research run. Reusing it as an
existing-run bootstrap would blur two different selections.

The referenced simulation-framework proposal adds a portable card plus
run-local Agent bridges. This framework has a stronger existing passive-map
contract, canonical `RUN.md`/`COMMANDS.md` entry surfaces, and a deterministic
`check-reentry` plus post-final recovery path. The design retains the portable
card idea while routing every dynamic decision to those existing owners.

The paired Evolution Directions review finds no new state, validator, retry
tree, controller or authority layer is warranted. The direct sources remain
bundle control files and Engine outputs; a card only reduces the discovery
step before the existing legal loop.

## Goals / Non-Goals

**Goals:**

- Let a user attach `BUNDLE_MAP.md` or its containing bundle to a new Agent
  conversation and describe the intended continuation in ordinary language.
- Make the attached map identify the candidate bundle root and point to one
  canonical framework-owned continuation procedure.
- Give the Agent a short, ordered reload path that uses current direct facts,
  existing diagnostics and existing lifecycle/recovery owners.
- Preserve bundle isolation and historical readability without production-run
  migration.

**Non-Goals:**

- Do not create run-local `AGENTS.md` or `CLAUDE.md`, a copied framework,
  a second command menu, a new lifecycle node, a status field, or a card
  schema/version marker.
- Do not make attachment, card text, `bundle_name`, framework version or a
  user phrase prove identity, authorize a mutation, or select a lifecycle
  route.
- Do not add a generic resume CLI, a card parser, automatic reentry/recovery,
  or a validator that duplicates `validate-bundle`, `inspect-bundle` or
  `check-reentry`.
- Do not change Final semantics: a material post-final request remains subject
  to the accepted post-final recovery contract.

## Decisions

### 1. Extend the existing map rather than add a new root file

The instantiator will render a concise `## Continue This Bundle` section near
the start of `BUNDLE_MAP.md`. It will state that the containing directory is
the candidate active bundle root, invite attachment plus a plain-language
request, expose the static `bundle_name` and creation framework version, and
link to the framework-owned continuation playbook.

The remaining research/control/diagnostics maps stay in their present roles.
The card must say that static identity is navigation only: the Agent must
confirm a reachable directory and read current control files before treating
it as selected runtime truth. This keeps `BUNDLE_MAP.md` one map with one
authority boundary, instead of producing a README/card/map trio that can
drift.

Alternatives rejected:

- A new `RUN_BUNDLE.md` would duplicate bundle-root discovery and split the
  human's first-read surface.
- A run-local `AGENTS.md`/`CLAUDE.md` bridge would create auto-loaded
  instruction copies whose lifecycle wording can drift from the framework.
- Mutable card fields would become a second state projection requiring new
  writers and validators.

### 2. One framework-owned continuation playbook owns procedure prose

`DPT_FRAMEWORK/command_playbook/continue-run-bundle.md` will be the only
procedural surface. The card and command index point to it; they do not copy
its commands. Its ordered Agent loop is:

1. Resolve the attached map's containing directory as a candidate bundle and
   resolve its declared shared framework relation. If either cannot be reached
   in the current workspace, report that direct boundary rather than treating
   attachment text as a path token.
2. Read the map plus direct bundle controls; run the existing structural and
   reentry diagnostics appropriate to the observed state.
3. When a non-null `rb_status.json.current_node` and clean existing reentry
   result agree, load the existing lifecycle Markdown coordinate and follow its
   current contract. It must not infer a phase from `current_gate` alone.
4. When direct facts are missing, conflicted or blocked, consume the returned
   check/inspect/advice and use the named existing repair/diagnostic owner.
   Do not create state or retry by guesswork.
5. Classify a user message only at existing authority boundaries: factual
   questions can be answered from verified facts; active non-HITL execution
   retains its autonomous contract; a material Final-after request follows the
   accepted post-final recovery playbook after its required semantic decision.

This is Agent-flow prose, not an Engine state machine. Existing CLIs remain
the only deterministic verdict/mutation owners and continue to return feedback
to the Agent context.

### 3. Separate new-run selection from existing-run identification

`RUN.md` remains the framework-selection and new-research front door. Card
attachment identifies a candidate already-existing bundle and therefore routes
to the continuation playbook, not `start-research`. The framework entry docs
will state that neither surface makes a user an ordinary command runner, and
that card attachment does not silently initiate a rerun.

This resolves the otherwise ambiguous interpretation of “continue”: it means
reload and inspect the named run first. Whether work is then legal is decided
only by the existing lifecycle, Gate, reentry and post-final contracts.

### 4. Compatibility is content-level and non-blocking

New bundles receive the expanded template and creation framework version.
Existing bundles keep their existing `BUNDLE_MAP.md`; the continuation
playbook can still use its current map/control/reentry pointers. There is no
manifest migration, card schema field or production bundle rewrite. Framework
docs will not claim that an old map lacks all continuation value merely
because it predates the invitation text.

### 5. Verification proves deterministic card contract and real Agent use

The integration test will instantiate a temporary production-shaped bundle
through the real CLI and assert the rendered card, static identity values and
single canonical playbook pointer while checking that no additional root
bridge/control file is created. A real Agent-flow playbook will supply a
card-backed disposable bundle and a plain-language continuation request; its
trace-backed verdict will prove the Agent consumes existing diagnostics and
does not manufacture a lifecycle/reentry authority. It will not represent
chat readability as a deterministic Engine fact.

## Risks / Trade-offs

- [Attachment loses its filesystem relationship] -> The playbook treats an
  unreachable parent/framework path as a direct context boundary and never
  trusts copied text as runtime identity.
- [Card drifts into a second operating manual] -> Requirements limit it to
  static identity, invitation and pointer; the integration contract rejects
  copied lifecycle command prose.
- [“Continue” is read as authorization] -> Both card and playbook explicitly
  retain current lifecycle/Gate/recovery owners, and Agent-flow proof checks
  that no card-derived state is written.
- [Old bundles lack the new section] -> Existing map/reentry compatibility
  remains positive; no historical data is altered or rejected.
- [Additional documentation feels redundant] -> The card replaces scattered
  path handoff instructions with one discoverable root surface, while the
  framework retains one procedure instead of per-bundle bridges. This is the
  net simplification.

## Migration Plan

1. Before target edits, register pending `BUM-005`, `ACS-005` and `RUE-006`
   in the existing capability groups and pass verification-plan routing mode.
2. Add focused integration and Agent-flow assets, then render the card through
   the real instantiator and update framework entry/command/playbook surfaces.
3. Run selected native verification plus framework/package and governance
   checks; update `CHANGELOG.md` and `RUN.md` to v0.43.
4. Do not rewrite active or historical bundles. Rollback restores the
   framework template/docs/playbook; old maps remain usable as the same
   passive navigation surface.

## Open Questions

None. Apply should verify the exact existing diagnostic invocations before
writing the playbook, but that is a mechanical documentation alignment task,
not an open semantic decision.
