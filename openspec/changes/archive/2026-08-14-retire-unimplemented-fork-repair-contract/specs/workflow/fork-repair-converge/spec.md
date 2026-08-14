> Note: `FOR-001` is retired through the governed requirement registry during
> Apply. This delta retires the whole current capability and intentionally does
> not present the retired requirement as a live header.

## REMOVED Requirements

### Requirement: Multiple fail branches can converge to a shared repair checkpoint

**Reason**: No scoped current Harness, test, or experiment scan finds the named
`convergeRepair()` / `sharedRepairStep` implementation or caller that this
shared checkpoint requires. Keeping this requirement as a current capability
makes an unimplemented architecture promise appear executable.

**Migration**: Delete the live main spec and catalog navigation. Retain
`FOR-001` as `[DEPRECATED]` registry history under the retired no-spec-directory
`FOR` prefix. For current deterministic gate-failure handling, use the accepted
`workflow/repair-loop`, `engine/gate-fork-router`, and
`workflow/conditional-nodes` contracts. They do not provide or require a
`sharedRepairStep`; no runtime migration or compatibility path is created.

### Requirement: After repair checkpoint, state re-enters Gate for re-evaluation

**Reason**: The named fork-repair checkpoint has no current implementation or
caller. Its retained re-entry wording duplicates a promise that does not own the
accepted current repair-loop contract.

**Migration**: The accepted current repair re-evaluation requirement remains in
`workflow/repair-loop`. Consumers SHALL NOT treat the retired fork-repair
capability as an additional current Gate route.

### Requirement: convergeRepair guards deterministic repair loop termination

**Reason**: `convergeRepair()` does not exist in the current Harness. Its
iteration, stall, terminal-branch, and return-shape contract is therefore not a
current observable behavior.

**Migration**: The accepted deterministic termination and stalled-outcome
requirements remain in `workflow/repair-loop`; no replacement API, migration,
or versioned fallback is introduced for the retired name.
