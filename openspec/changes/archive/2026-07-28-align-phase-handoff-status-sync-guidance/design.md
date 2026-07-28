## Context

`enter-phase` and `advance-status` already have separate, accepted durable
ownership. The former consumes `check.next`, writes the route-bound
`load_complete` witness, and records `rb_status.current_node`; the latter
synchronizes the just-passed source gate's `current_gate` / `next_gate` window
and appends `phase_transition`. `RUN.md`, `COMMANDS.md`, and phase-node §6
guidance preserve that distinction.

The generic loop in `command_playbook/start-research.md` omitted the second
operation. Because it is the normal entry playbook, the omission can cause an
Agent to execute a correctly loaded target phase before source-gate status sync.
The resulting later gate rejection is real drift, but the repair is not to
change the state model.

## Goals / Non-Goals

**Goals:**

- Present the complete normal handoff chain at the generic entry point.
- Preserve the distinctions between entry witnessing, status synchronization,
  and target-phase work completion.
- Add a focused deterministic documentation regression for that sequence.

**Non-Goals:**

- No change to CLI behavior, status/trace/schema authority, phase-node logic,
  or Gate diagnostics.
- No merged writer, automatic synchronization, repair path, controller,
  override, interaction state, or host-liveness promise.
- No claim that static coverage proves a real Agent executes the loaded phase.

## Decisions

### State the source-gate sequence where the generic flow is introduced

The numbered gate-pass step in `start-research.md` will instruct the Agent to
read `check.next`, run `enter-phase`, then immediately run
`advance-status --to <source_gate_enum>`, and only then continue from the
loaded Markdown. It will say that the source gate is the gate that just passed.

This reuses direct Engine facts already available in the gate response and does
not ask the reader to infer a gate window from the target node.

**Alternative rejected:** make `enter-phase` mutate the gate window. That
would erase the accepted separation between entry witnessing and status
synchronization, change runtime behavior, and broaden the repair beyond the
observed Markdown omission.

### Reuse the existing phase-boundary contract

The delta modifies CPT-008 rather than creating a new capability or
requirement. It makes explicit that normal-entry playbooks must present the
existing normal chain and must not describe either lifecycle writer as target
work completion.

**Alternative rejected:** document only the literal command without a spec
delta. The omission occurred in a public Agent control surface; the accepted
capability contract should make the required delivery testable and durable.

### Use static documentation coverage

Extend `tests/engine/command-contract-docs.test.mjs`, which already scans
`start-research.md`, with exact ordered markers. This proves the deterministic
Markdown contract and guards against future drift; it intentionally makes no
actor-liveness claim.

## Risks / Trade-offs

- [Agent ignores correct guidance] -> The change only repairs the deterministic
  handoff interface. Real-Agent compliance remains separately observable under
  BUG-099/106 and is not represented as test closure here.
- [Documentation overstates command ownership] -> The wording retains the
  existing meanings: `enter-phase` witnesses entry, `advance-status`
  synchronizes the source gate, and the target phase owns work completion.
- [Duplicated lifecycle truth] -> The playbook points to the existing command
  sequence and CPT-008; it adds no derived state or duplicate validator.

## Migration Plan

1. Update the generic entry playbook and the existing static contract test.
2. Run the verification-routing plan check and focused test.
3. No runtime-data migration, rollback procedure, version bump, or compatibility
   branch is needed; reverting the Markdown/test commit restores prior wording
   without changing bundle truth.

## Open Questions

None. The normal source-gate order and ownership boundary are already accepted.
