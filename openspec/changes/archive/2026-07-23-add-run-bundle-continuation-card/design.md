## Context

`BUNDLE_MAP.md` already names the active runtime bundle root, the shared
framework, direct runtime control files and reentry pointers. It is correctly
passive, but its hard-coded `../DPT_FRAMEWORK/` relation is false when either
creator uses `--target-dir`, and it does not explicitly serve a person with one
reachable bundle in a new Agent conversation.

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

- Let a user provide reachable `BUNDLE_MAP.md` or its containing bundle to an
  Agent and describe the intended continuation in ordinary language.
- Make the map identify the candidate root and creation-time framework/repo
  relative navigation coordinates, then point to one canonical procedure.
- Give the Agent a short, ordered reload path that uses current direct facts,
  existing diagnostics and existing lifecycle/recovery owners.
- Preserve bundle isolation and historical readability without production-run
  migration.

**Non-Goals:**

- Do not create run-local `AGENTS.md` or `CLAUDE.md`, a copied framework,
  a second command menu, a new lifecycle node, a status field, or a card
  schema/version marker.
- Do not make attachment, card text, `bundle_name`, or a
  user phrase prove identity, authorize a mutation, or select a lifecycle
  route.
- Do not add a generic resume CLI, a card parser, automatic reentry/recovery,
  or a validator that duplicates `validate-bundle`, `inspect-bundle` or
  `check-reentry`.
- Do not change Final semantics: a material post-final request remains subject
  to the accepted post-final recovery contract.

## Decisions

### 1. Extend the existing map with creator-rendered navigation coordinates

Both creators will render a concise `## Continue This Bundle` section near the
start of `BUNDLE_MAP.md`. It will state that the containing directory is the
candidate active bundle root, invite a plain-language request, expose the
static bundle name, and link to the playbook. It will render `framework_root`
and `repo_command_root` as paths relative to the bundle directory, computed
from the actual framework/repository source locations used at creation.

These are creation-time navigation facts, not current authority or framework
authentication. The Agent may use them only after a DPT framework source tree
is already selected in its current workspace, and must reject a coordinate
outside that selected project context. If moved or unreachable, it reports the
direct boundary; it does not use map text as a guessed path token.

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

1. Resolve the supplied map's containing directory as a candidate bundle and
   resolve its creator-rendered framework/repo coordinates. If either cannot
   be reached, report that direct boundary rather than treating attachment as
   a trigger or path token.
2. Read the map plus direct bundle controls. For a non-Final loaded node, run
   existing structural and target-specific reentry diagnostics using that node.
3. When a non-Final `rb_status.json.current_node` and clean existing reentry
   result agree, load the existing lifecycle Markdown coordinate and follow its
   current contract. It must not infer a phase from `current_gate` alone.
4. When direct facts are missing, conflicted or blocked, consume the returned
   check/inspect/advice and use the named existing repair/diagnostic owner.
   Do not create state or retry by guesswork.
5. A null/absent `current_node` has no generic card-owned reentry path. Expose
   the existing diagnostic/start-entry boundary; never derive a target from
   `current_gate`.
6. For `phases/phase-final.md`, do not call target-specific `check-reentry`:
   Final has no gate while terminal status correctly remains
   `readiness_passed -> none`. Read its direct terminal facts; a material
   post-Final request uses existing post-final inspection/recovery only.
7. Classify a user message only at existing authority boundaries: factual
   questions can be answered from verified facts; active non-HITL execution
   retains its autonomous contract; a material Final-after request follows the
   accepted post-final recovery playbook after its required semantic decision.

This is Agent-flow prose, not an Engine state machine. Existing CLIs remain
the only deterministic verdict/mutation owners and continue to return feedback
to the Agent context.

### 3. Compatibility is content-level and non-blocking

New bundles receive the expanded template and creator-rendered coordinates.
Existing bundles keep their existing `BUNDLE_MAP.md`; the continuation
playbook can still use its current map/control/reentry pointers. There is no
manifest migration, card schema field or production bundle rewrite. Framework
docs will not claim that an old map lacks all continuation value merely
because it predates the invitation text.

### 4. Explicit existing-card routing wins before the new-run default

The root and framework-local Agent instruction pairs already route research
intent to `RUN.md` / `start-research`. That default would make the card
unreachable and can create a second bundle. They must therefore recognize one
narrow higher-precedence condition: the user explicitly supplies or opens a
reachable existing `BUNDLE_MAP.md` in the selected DPT workspace and requests
continuation/inspection of that bundle. That condition routes to
`continue-run-bundle.md`.

This is not a host attachment protocol. A mere filename elsewhere, a map
discovered by scanning, or an unreachable/copied map does not select a run.
Without the explicit existing-card condition, `RUN.md` remains the entry for a
new research request. The same narrow distinction is repeated in the synced
`AGENTS.md` / `CLAUDE.md` pairs and framework README/command index rather than
creating a run-local bridge.

### 5. Verification proves deterministic creator/map contracts only

Focused integration tests will invoke both real creators in non-sibling target
roots and assert rendered coordinates, card boundaries and absence of bridge/
control files. They can prove creator output, not host attachment triggering
or whether an Agent read prose, so this change makes no fabricated
`agent_flow_e2e` behavior claim.

## Risks / Trade-offs

- [Attachment loses its filesystem relationship] -> The playbook treats an
  unreachable parent/framework path as a direct context boundary and never
  trusts copied text as runtime identity.
- [`--target-dir` breaks a fixed sibling relation] -> Both creators render
  actual relative framework/repo coordinates and tests use non-sibling targets.
- [Card path is treated as framework authentication] -> Coordinates are usable
  only inside an already-selected workspace source tree; a stale/out-of-context
  coordinate is a reported boundary, not a command target.
- [Card drifts into a second operating manual] -> Requirements limit it to
  static identity, invitation and pointer; the integration contract rejects
  copied lifecycle command prose.
- [“Continue” is read as authorization] -> Card and playbook retain current
  lifecycle/Gate/recovery owners; no test overclaims that prose controls state.
- [Old bundles lack the new section] -> Existing map/reentry compatibility
  remains positive; no historical data is altered or rejected.
- [Additional documentation feels redundant] -> The card replaces scattered
  path handoff instructions with one discoverable root surface, while the
  framework retains one procedure instead of per-bundle bridges. This is the
  net simplification.

## Migration Plan

1. Before target edits, register pending `BUM-005`, `ACS-005`, `CMI-009` and
   `EXS-004` / `RUE-006` in existing capability groups and pass verification-plan mode.
2. Add focused integration assets, then render the card through both creators
   and update the synchronized routing, command and playbook surfaces.
3. Run selected native verification plus framework/package and governance
   checks; update `CHANGELOG.md` and `RUN.md` to v0.43.
4. Do not rewrite active or historical bundles. Rollback restores the
   framework template/docs/playbook; old maps remain usable as the same
   passive navigation surface.

## Open Questions

None. The null-node boundary is intentional: no accepted generic diagnostic
currently selects a legal target for it, and this change must not invent one.
